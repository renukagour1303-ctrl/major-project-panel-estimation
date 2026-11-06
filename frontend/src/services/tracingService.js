import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Validates and normalizes GeoJSON coordinates to standard [lng, lat] format
 * avoiding coordinate inversion issues that cause shapes to render off-screen.
 */
export function normalizeGeoJsonCoordinates(coords) {
  if (!Array.isArray(coords)) return coords;

  // If array of rings (Polygon coordinates)
  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    return coords.map(ring => normalizeRing(ring));
  }

  // Single ring
  if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
    return [normalizeRing(coords)];
  }

  return coords;
}

function normalizeRing(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return ring;

  const normalized = ring.map(pt => {
    if (!Array.isArray(pt) || pt.length < 2) return pt;
    const a = Number(pt[0]);
    const b = Number(pt[1]);

    // Check if coordinates were inadvertently passed as [lat, lng] instead of GeoJSON [lng, lat]
    // In India (lat: 8..37, lng: 68..97), if a is in [8..37] and b is in [68..97], they are [lat, lng]
    if (a >= -40 && a <= 40 && (b < -40 || b > 40)) {
      // Inverted [lat, lng] -> convert to GeoJSON [lng, lat]
      return [b, a];
    }
    return [a, b];
  });

  // Ensure closed ring
  if (normalized.length >= 3) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      normalized.push([first[0], first[1]]);
    }
  }

  return normalized;
}

/**
 * Converts GeoJSON coordinates [lng, lat] to Leaflet [lat, lng] format
 */
export function geoJsonToLeafletLatLngs(geojsonGeometry) {
  if (!geojsonGeometry) return [];
  const coords = geojsonGeometry.coordinates;
  if (!coords || !Array.isArray(coords)) return [];

  // Polygon has ring array
  const outerRing = Array.isArray(coords[0]) && Array.isArray(coords[0][0]) ? coords[0] : coords;
  return outerRing.map(pt => [pt[1], pt[0]]); // [lat, lng]
}

/**
 * Executes AI Auto-Tracing for rooftop geometry and solar panel polygons.
 * Tries the backend proxy first, falling back to direct Overpass client-side query.
 */
export async function fetchAutoTracedRoof(lat, lon) {
  // 1. Try Backend auto-trace endpoint
  try {
    const res = await axios.post(`${API_BASE}/solar/auto-trace`, {
      latitude: lat,
      longitude: lon
    }, { timeout: 10000 });

    if (res.data && res.data.type === 'FeatureCollection') {
      return normalizeTraceResponse(res.data);
    }
    if (res.data && (res.data.type === 'Polygon' || res.data.type === 'Feature')) {
      return normalizeTraceResponse({
        type: 'FeatureCollection',
        features: [res.data.type === 'Feature' ? res.data : { type: 'Feature', geometry: res.data, properties: { type: 'roof' } }]
      });
    }
  } catch (err) {
    console.warn('Backend auto-trace endpoint notice, falling back to direct Overpass client query:', err.message);
  }

  // 2. Client-side Overpass Fallback
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  const query = `[out:json][timeout:8];way["building"](around:60,${lat},${lon});out geom;`;

  for (const ep of endpoints) {
    try {
      const response = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.elements) && data.elements.length > 0) {
          const validBuildings = [];
          for (const el of data.elements) {
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
              validBuildings.push({ way: el, distSq: dLat * dLat + dLon * dLon });
            }
          }

          if (validBuildings.length > 0) {
            validBuildings.sort((a, b) => a.distSq - b.distSq);
            const chosen = validBuildings[0].way;
            const ring = chosen.geometry.map(p => [Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6))]);
            if (ring.length >= 3) {
              const first = ring[0];
              const last = ring[ring.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                ring.push([first[0], first[1]]);
              }
            }

            return normalizeTraceResponse({
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: { type: 'roof', id: chosen.id, source: 'client_overpass' },
                geometry: {
                  type: 'Polygon',
                  coordinates: [ring]
                }
              }]
            });
          }
        }
      }
    } catch (e) {
      // Try next
    }
  }

  // If 0 buildings found across all providers
  return {
    success: false,
    count: 0,
    type: 'FeatureCollection',
    features: [],
    message: '0 polygons detected for the given location/roof area.'
  };
}

function normalizeTraceResponse(featureCollection) {
  const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
  if (features.length === 0) {
    return {
      success: false,
      count: 0,
      type: 'FeatureCollection',
      features: [],
      message: '0 polygons detected for the given location/roof area.'
    };
  }

  const normalizedFeatures = features.map(f => {
    if (f.geometry && f.geometry.type === 'Polygon') {
      return {
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: normalizeGeoJsonCoordinates(f.geometry.coordinates)
        }
      };
    }
    return f;
  });

  const roofFeature = normalizedFeatures.find(f => f.properties?.type === 'roof') || normalizedFeatures[0];
  const panelFeatures = normalizedFeatures.filter(f => f.properties?.type === 'solar_panel');

  return {
    success: true,
    count: normalizedFeatures.length,
    type: 'FeatureCollection',
    features: normalizedFeatures,
    roofFeature,
    panelFeatures
  };
}
