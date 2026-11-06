/**
 * AI Auto-Tracing Roof & Solar Panel Boundary Controller
 */

/**
 * Checks if a point [lng, lat] is inside a polygon ring [[lng, lat], ...]
 */
function isPointInPolygon(point, vs) {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generates regular grid of solar panel polygons inside a roof polygon
 */
function generateSolarPanelPolygons(roofRingLngLat) {
  if (!Array.isArray(roofRingLngLat) || roofRingLngLat.length < 3) return [];

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const pt of roofRingLngLat) {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }

  // Panel size: ~1.7m x ~1.0m in lat/lng at ~20° latitude
  // 1 deg lat ≈ 111,000m -> 1.7m ≈ 0.0000153°
  // 1 deg lng ≈ 104,000m -> 1.0m ≈ 0.0000096°
  const panelLatSize = 0.0000153;
  const panelLngSize = 0.0000096;
  const gapLat = 0.000004;
  const gapLng = 0.000004;

  const panels = [];
  const maxPanels = 40;

  for (let lat = minLat + gapLat; lat + panelLatSize < maxLat - gapLat; lat += panelLatSize + gapLat) {
    for (let lng = minLng + gapLng; lng + panelLngSize < maxLng - gapLng; lng += panelLngSize + gapLng) {
      const center = [lng + panelLngSize / 2, lat + panelLatSize / 2];
      // Check if center and 4 corners are inside roof polygon
      if (
        isPointInPolygon(center, roofRingLngLat) &&
        isPointInPolygon([lng, lat], roofRingLngLat) &&
        isPointInPolygon([lng + panelLngSize, lat + panelLatSize], roofRingLngLat)
      ) {
        panels.push({
          type: 'Feature',
          properties: {
            type: 'solar_panel',
            panelIndex: panels.length + 1
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [lng, lat],
              [lng + panelLngSize, lat],
              [lng + panelLngSize, lat + panelLatSize],
              [lng, lat + panelLatSize],
              [lng, lat]
            ]]
          }
        });
        if (panels.length >= maxPanels) break;
      }
    }
    if (panels.length >= maxPanels) break;
  }

  return panels;
}

/**
 * POST or GET /api/solar/auto-trace
 * Fetches or detects roof boundaries and returns standard GeoJSON FeatureCollection.
 */
export async function autoTraceRoof(req, res) {
  try {
    const latRaw = req.query.lat ?? req.query.latitude ?? req.body?.lat ?? req.body?.latitude;
    const lonRaw = req.query.lon ?? req.query.lng ?? req.query.longitude ?? req.body?.lon ?? req.body?.lng ?? req.body?.longitude;

    if (!latRaw || !lonRaw) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Latitude and longitude coordinates are required.'
      });
    }

    const lat = parseFloat(latRaw);
    const lon = parseFloat(lonRaw);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Coordinates must be valid numbers between -90..90 and -180..180.'
      });
    }

    const query = `[out:json][timeout:8];way["building"](around:60,${lat},${lon});out geom;`;
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    let elements = [];
    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'SolarCalculator/1.0 (https://sungroves.com)',
            'Accept': 'application/json'
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const json = await resp.json();
          if (Array.isArray(json.elements) && json.elements.length > 0) {
            elements = json.elements;
            break;
          }
        }
      } catch (err) {
        // Try next endpoint
      }
    }

    // Filter valid building ways
    const validBuildings = [];
    for (const el of elements) {
      if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 3) {
        let sumLat = 0, sumLon = 0;
        for (const pt of el.geometry) {
          sumLat += pt.lat;
          sumLon += pt.lon;
        }
        const centroidLat = sumLat / el.geometry.length;
        const centroidLon = sumLon / el.geometry.length;
        const dLat = centroidLat - lat;
        const dLon = (centroidLon - lon) * Math.cos(lat * Math.PI / 180);
        const distSq = dLat * dLat + dLon * dLon;
        validBuildings.push({ way: el, distSq });
      }
    }

    if (validBuildings.length === 0) {
      return res.status(200).json({
        success: false,
        count: 0,
        type: 'FeatureCollection',
        features: [],
        message: '0 polygons detected for the given location/roof area.'
      });
    }

    // Pick closest building
    validBuildings.sort((a, b) => a.distSq - b.distSq);
    const chosen = validBuildings[0].way;

    // Standard GeoJSON Polygon coordinates are [longitude, latitude]
    const ringLngLat = chosen.geometry.map(p => [Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6))]);
    // Close ring if not closed
    const first = ringLngLat[0];
    const last = ringLngLat[ringLngLat.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ringLngLat.push([first[0], first[1]]);
    }

    const roofFeature = {
      type: 'Feature',
      properties: {
        type: 'roof',
        source: 'osm_building_autotrace',
        id: chosen.id
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ringLngLat]
      }
    };

    // Generate solar panel polygons inside the detected roof
    const panelFeatures = generateSolarPanelPolygons(ringLngLat);

    const featureCollection = {
      type: 'FeatureCollection',
      features: [roofFeature, ...panelFeatures],
      count: 1 + panelFeatures.length,
      success: true
    };

    return res.status(200).json(featureCollection);
  } catch (err) {
    console.error('Auto-trace roof error:', err);
    return res.status(500).json({
      success: false,
      count: 0,
      type: 'FeatureCollection',
      features: [],
      error: 'Internal Server Error',
      message: 'Failed to execute auto-tracing.'
    });
  }
}
