import { fetchPVGISSolarResource, validateCoordinates } from '../services/pvgisService.js';
import { fetchNasaPowerSolarResource } from '../services/nasaPowerService.js';

/**
 * Controller for GET /api/solar/pvgis
 */
export async function getSolarResource(req, res) {
  try {
    const { lat, lon } = req.query;

    // 1. Validate inputs
    const validationError = validateCoordinates(lat, lon);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_COORDINATES',
        message: validationError
      });
    }

    // 2. Fetch data from primary source (PVGIS)
    const pvgisResult = await fetchPVGISSolarResource(lat, lon);

    // 3. Return PVGIS if successful
    if (pvgisResult.success) {
      return res.status(200).json(pvgisResult);
    }

    // 4. PVGIS failed - Log the failure
    console.warn(`PVGIS failed for (${lat}, ${lon}): ${pvgisResult.message}. Falling back to NASA POWER.`);

    // 5. Fetch from fallback source (NASA POWER)
    const nasaResult = await fetchNasaPowerSolarResource(lat, lon);

    // 6. Return NASA if successful
    if (nasaResult.success) {
      return res.status(200).json(nasaResult);
    }

    // 7. Both sources failed
    console.error(`NASA POWER fallback also failed for (${lat}, ${lon}): ${nasaResult.message}`);
    
    // Map service errors to appropriate HTTP status codes based on NASA's failure
    const status = nasaResult.error === 'NASA_TIMEOUT' ? 504 :
                   nasaResult.error === 'NASA_HTTP_ERROR' ? 502 : 500;
                   
    return res.status(status).json({
      success: false,
      error: 'SOLAR_RESOURCE_UNAVAILABLE',
      message: 'Solar data could not be retrieved right now. Please try again later.',
      details: {
        primary: pvgisResult,
        fallback: nasaResult
      }
    });

  } catch (error) {
    console.error('Unexpected error in getSolarResource controller:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while processing the solar resource request.'
    });
  }
}
