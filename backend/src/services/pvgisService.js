/**
 * PVGIS Solar Resource Service (Chunk 9)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 *
 * Fetches real solar irradiation data from the PVGIS API (European Commission JRC).
 * Uses the PVcalc endpoint which returns H(i)_m monthly irradiation values.
 *
 * PVGIS API endpoint used:
 *   https://re.jrc.ec.europa.eu/api/v5_2/PVcalc
 *   Parameters: lat, lon, peakpower=1, loss=14, outputformat=json
 *
 * Response fields extracted:
 *   outputs.monthly.fixed[].H(i)_m  → monthly irradiation (kWh/m²/month)
 *   outputs.monthly.fixed[].H(i)_d  → avg daily irradiation (kWh/m²/day) per month
 *   outputs.totals.fixed.H(i)_d     → annual avg daily irradiation = Peak Sun Hours
 *   outputs.totals.fixed.H(i)_y     → annual irradiation (kWh/m²/year)
 *
 * NOTE: Does NOT calculate solar system capacity, generation, savings or payback.
 * Those remain the responsibility of the Chunk 8 deterministic calculation engine.
 */

const PVGIS_BASE_URL = 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc';
const PVGIS_REQUEST_TIMEOUT_MS = 15000; // 15 seconds



const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Validate coordinate values before sending to PVGIS.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string|null} error message, or null if valid
 */
export function validateCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (latitude === undefined || latitude === null || latitude === '') {
    return 'Latitude is required.';
  }
  if (longitude === undefined || longitude === null || longitude === '') {
    return 'Longitude is required.';
  }
  if (isNaN(lat)) {
    return `Latitude must be a valid number. Received: "${latitude}"`;
  }
  if (isNaN(lon)) {
    return `Longitude must be a valid number. Received: "${longitude}"`;
  }
  if (lat < -90 || lat > 90) {
    return `Latitude must be between -90 and 90. Received: ${lat}`;
  }
  if (lon < -180 || lon > 180) {
    return `Longitude must be between -180 and 180. Received: ${lon}`;
  }

  return null;
}

/**
 * Fetch and normalize solar resource data from PVGIS.
 *
 * @param {number} latitude  - Location latitude (-90 to 90)
 * @param {number} longitude - Location longitude (-180 to 180)
 * @returns {Promise<Object>} Normalized solar resource data object
 */
export async function fetchPVGISSolarResource(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  // Build URL with dynamic coordinates - never hardcoded
  const url = new URL(PVGIS_BASE_URL);
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lon);
  url.searchParams.set('peakpower', '1');      // 1 kWp reference system
  url.searchParams.set('loss', '14');           // 14% system loss (standard)
  url.searchParams.set('outputformat', 'json');
  url.searchParams.set('browser', '0');

  let response;
  let pvgisData;

  // Fetch with timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PVGIS_REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return {
        success: false,
        source: 'PVGIS',
        error: 'PVGIS_TIMEOUT',
        message: `PVGIS request timed out after ${PVGIS_REQUEST_TIMEOUT_MS / 1000} seconds. Please try again.`,
        latitude: lat,
        longitude: lon
      };
    }

    return {
      success: false,
      source: 'PVGIS',
      error: 'PVGIS_NETWORK_FAILURE',
      message: `Network error reaching PVGIS: ${err.message}`,
      latitude: lat,
      longitude: lon
    };
  } finally {
    clearTimeout(timeoutId);
  }

  // Check HTTP status
  if (!response.ok) {
    let errorBody = '';
    try { errorBody = await response.text(); } catch (_) {}
    return {
      success: false,
      source: 'PVGIS',
      error: 'PVGIS_HTTP_ERROR',
      message: `PVGIS returned HTTP ${response.status}: ${response.statusText}`,
      httpStatus: response.status,
      pvgisError: errorBody.substring(0, 500),
      latitude: lat,
      longitude: lon
    };
  }

  // Parse JSON
  try {
    pvgisData = await response.json();
  } catch (err) {
    return {
      success: false,
      source: 'PVGIS',
      error: 'PVGIS_INVALID_JSON',
      message: 'PVGIS returned a response that could not be parsed as JSON.',
      latitude: lat,
      longitude: lon
    };
  }

  // Validate top-level structure
  if (!pvgisData || typeof pvgisData !== 'object') {
    return {
      success: false,
      source: 'PVGIS',
      error: 'PVGIS_MISSING_DATA',
      message: 'PVGIS response was empty or not an object.',
      latitude: lat,
      longitude: lon
    };
  }

  if (!pvgisData.outputs) {
    return {
      success: false,
      source: 'PVGIS',
      error: 'PVGIS_MISSING_OUTPUTS',
      message: 'PVGIS response missing "outputs" field.',
      latitude: lat,
      longitude: lon
    };
  }

  // Validate monthly data - it lives at outputs.monthly.fixed[]
  const monthlyFixed = pvgisData.outputs?.monthly?.fixed;

  if (!Array.isArray(monthlyFixed) || monthlyFixed.length === 0) {
    return {
      success: false,
      source: 'PVGIS',
      error: 'PVGIS_MISSING_MONTHLY',
      message: 'PVGIS response missing or empty "outputs.monthly.fixed" array.',
      latitude: lat,
      longitude: lon
    };
  }

  // Extract and validate each month's H(i)_m value
  const monthlyIrradiation = [];
  const monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  for (const monthNum of monthNumbers) {
    const record = monthlyFixed.find(r => r.month === monthNum);

    if (!record) {
      return {
        success: false,
        source: 'PVGIS',
        error: 'PVGIS_MISSING_MONTH',
        message: `PVGIS response missing data for month ${monthNum} (${MONTH_NAMES[monthNum - 1]}).`,
        latitude: lat,
        longitude: lon
      };
    }

    const himValue = record['H(i)_m'];
    const hidValue = record['H(i)_d'];

    if (himValue === undefined || himValue === null) {
      return {
        success: false,
        source: 'PVGIS',
        error: 'PVGIS_MISSING_HIM',
        message: `PVGIS response missing "H(i)_m" field for month ${monthNum} (${MONTH_NAMES[monthNum - 1]}).`,
        latitude: lat,
        longitude: lon
      };
    }

    if (typeof himValue !== 'number' || isNaN(himValue)) {
      return {
        success: false,
        source: 'PVGIS',
        error: 'PVGIS_INVALID_HIM',
        message: `PVGIS "H(i)_m" value for month ${monthNum} is not a valid number: ${himValue}`,
        latitude: lat,
        longitude: lon
      };
    }

    monthlyIrradiation.push({
      month: monthNum,
      monthName: MONTH_NAMES[monthNum - 1],
      irradiationKwhPerSqM: Number(himValue.toFixed(2)),         // kWh/m²/month
      avgDailyIrradiationKwhPerSqM: hidValue !== undefined && typeof hidValue === 'number'
        ? Number(hidValue.toFixed(4))
        : null                                                     // kWh/m²/day
    });
  }

  // Extract annual totals from outputs.totals.fixed
  const totals = pvgisData.outputs?.totals?.fixed;

  // Annual avg daily irradiation (H(i)_d from totals) = Peak Sun Hours for calculation engine
  let peakSunHours = null;
  let annualIrradiationKwhPerSqM = null;

  if (totals) {
    const totalHid = totals['H(i)_d'];
    const totalHiy = totals['H(i)_y'];

    if (typeof totalHid === 'number' && !isNaN(totalHid) && totalHid > 0) {
      // H(i)_d from totals = annual average daily sum of irradiation = Peak Sun Hours
      peakSunHours = Number(totalHid.toFixed(4));
    }

    if (typeof totalHiy === 'number' && !isNaN(totalHiy) && totalHiy > 0) {
      annualIrradiationKwhPerSqM = Number(totalHiy.toFixed(2));
    }
  }

  // If PVGIS didn't provide annual avg daily, derive from monthly irradiation sum
  if (!peakSunHours) {
    const sumMonthly = monthlyIrradiation.reduce((acc, m) => acc + m.irradiationKwhPerSqM, 0);
    if (sumMonthly > 0) {
      annualIrradiationKwhPerSqM = annualIrradiationKwhPerSqM || Number(sumMonthly.toFixed(2));
      peakSunHours = Number((sumMonthly / 365).toFixed(4));
    }
  }

  if (!peakSunHours || peakSunHours <= 0) {
    return {
      success: false,
      source: 'PVGIS',
      error: 'PVGIS_CANNOT_DERIVE_PSH',
      message: 'Could not derive a valid Peak Sun Hours value from PVGIS response.',
      latitude: lat,
      longitude: lon
    };
  }

  // Extract location metadata returned by PVGIS
  const elevation = pvgisData.inputs?.location?.elevation ?? null;
  const radiationDb = pvgisData.inputs?.meteo_data?.radiation_db ?? 'PVGIS-ERA5';
  const yearMin = pvgisData.inputs?.meteo_data?.year_min ?? null;
  const yearMax = pvgisData.inputs?.meteo_data?.year_max ?? null;

  return {
    success: true,
    source: 'PVGIS',
    latitude: lat,
    longitude: lon,
    elevation,
    radiationDatabase: radiationDb,
    dataYearRange: yearMin && yearMax ? `${yearMin}–${yearMax}` : null,

    // Monthly irradiation array (12 months)
    monthlyIrradiation,

    // Annual totals
    annualIrradiationKwhPerSqM,

    /**
     * peakSunHours:
     * The annual average daily irradiation in kWh/m²/day from PVGIS.
     * This is the value that Chunk 8's calculateSolarSystem() expects as `peakSunHours`.
     * It represents the equivalent "full-sun hours" per day at this location.
     */
    peakSunHours,

    rawDataAvailable: true
  };
}
