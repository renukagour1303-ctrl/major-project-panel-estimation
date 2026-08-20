import areaModule from '@turf/area';

// Support both ES module default export and named export formats
const area = typeof areaModule === 'function' ? areaModule : (areaModule?.default || areaModule?.area);

/**
 * Calculates geodesic roof area metrics using Turf.js based on a Leaflet / GeoJSON polygon.
 * 
 * @param {Object} geojson - GeoJSON Feature or Geometry object of the drawn roof polygon.
 * @returns {Object} Calculated metrics:
 *   - tracedAreaSqM: Traced roof area in square meters (m²)
 *   - tracedAreaSqFt: Traced roof area in square feet (ft²)
 *   - usableAreaSqM: Usable roof area in m² after 25% setback reduction (75% usable)
 *   - usableAreaSqFt: Usable roof area in ft²
 */
export function calculateRoofArea(geojson) {
  const emptyResult = {
    tracedAreaSqM: 0,
    tracedAreaSqFt: 0,
    usableAreaSqM: 0,
    usableAreaSqFt: 0
  };

  if (!geojson) return emptyResult;

  try {
    // Turf.js area() expects a GeoJSON Feature, FeatureCollection, or Geometry
    const calculatedAreaM2 = area(geojson);

    if (typeof calculatedAreaM2 !== 'number' || isNaN(calculatedAreaM2) || calculatedAreaM2 <= 0) {
      return emptyResult;
    }

    const tracedAreaSqM = Number(calculatedAreaM2.toFixed(2));
    const tracedAreaSqFt = Number((tracedAreaSqM * 10.7639).toFixed(2));
    
    // 25% setback reduction -> 75% usable rooftop area
    const usableAreaSqM = Number((tracedAreaSqM * 0.75).toFixed(2));
    const usableAreaSqFt = Number((usableAreaSqM * 10.7639).toFixed(2));

    return {
      tracedAreaSqM,
      tracedAreaSqFt,
      usableAreaSqM,
      usableAreaSqFt
    };
  } catch (err) {
    console.error('Error calculating roof area with Turf.js:', err);
    return emptyResult;
  }
}
