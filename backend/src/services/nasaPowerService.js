/**
 * NASA POWER Solar Resource Service (Chunk 10 Fallback)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 *
 * Fetches solar irradiation data from NASA POWER API as a fallback to PVGIS.
 * Uses the temporal/monthly/point endpoint for parameter ALLSKY_SFC_SW_DWN.
 *
 * NASA POWER API returns data in kW-hr/m^2/day.
 * This service averages the data over multiple years and calculates the 
 * equivalent monthly total irradiation (kWh/m²/month) to match the PVGIS response contract.
 */

import { validateCoordinates } from './pvgisService.js';

const NASA_POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/monthly/point';
const NASA_REQUEST_TIMEOUT_MS = 15000; // 15 seconds
const START_YEAR = 2005;
const END_YEAR = 2020;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Days in each month (non-leap year, sufficient for long-term averages)
const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Fetch and normalize solar resource data from NASA POWER.
 *
 * @param {number} latitude  - Location latitude (-90 to 90)
 * @param {number} longitude - Location longitude (-180 to 180)
 * @returns {Promise<Object>} Normalized solar resource data object matching PVGIS structure
 */
export async function fetchNasaPowerSolarResource(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  const url = new URL(NASA_POWER_BASE_URL);
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('parameters', 'ALLSKY_SFC_SW_DWN');
  url.searchParams.set('community', 'RE');
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('start', START_YEAR.toString());
  url.searchParams.set('end', END_YEAR.toString());

  let response;
  let nasaData;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NASA_REQUEST_TIMEOUT_MS);

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
        source: 'NASA',
        error: 'NASA_TIMEOUT',
        message: `NASA POWER request timed out after ${NASA_REQUEST_TIMEOUT_MS / 1000} seconds.`,
        latitude: lat,
        longitude: lon
      };
    }

    return {
      success: false,
      source: 'NASA',
      error: 'NASA_NETWORK_FAILURE',
      message: `Network error reaching NASA POWER: ${err.message}`,
      latitude: lat,
      longitude: lon
    };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorBody = '';
    try { errorBody = await response.text(); } catch (_) {}
    return {
      success: false,
      source: 'NASA',
      error: 'NASA_HTTP_ERROR',
      message: `NASA POWER returned HTTP ${response.status}: ${response.statusText}`,
      httpStatus: response.status,
      nasaError: errorBody.substring(0, 500),
      latitude: lat,
      longitude: lon
    };
  }

  try {
    nasaData = await response.json();
  } catch (err) {
    return {
      success: false,
      source: 'NASA',
      error: 'NASA_INVALID_JSON',
      message: 'NASA POWER returned a response that could not be parsed as JSON.',
      latitude: lat,
      longitude: lon
    };
  }

  // Validate structure
  if (!nasaData || !nasaData.properties || !nasaData.properties.parameter || !nasaData.properties.parameter.ALLSKY_SFC_SW_DWN) {
    return {
      success: false,
      source: 'NASA',
      error: 'NASA_MISSING_DATA',
      message: 'NASA POWER response missing required ALLSKY_SFC_SW_DWN parameter data.',
      latitude: lat,
      longitude: lon
    };
  }

  const allskyData = nasaData.properties.parameter.ALLSKY_SFC_SW_DWN;
  
  // Aggregate data by month and year
  const monthlySums = Array(12).fill(0);
  const monthlyCounts = Array(12).fill(0);
  let annualSum = 0;
  let annualCount = 0;

  for (const [key, value] of Object.entries(allskyData)) {
    // NASA fill value is -999.0
    if (value === -999.0) continue;

    // Key format is YYYYMM (e.g. 201501 to 201512) or YYYY13 for annual
    const monthStr = key.slice(-2);
    const monthNum = parseInt(monthStr, 10);

    if (monthNum >= 1 && monthNum <= 12) {
      monthlySums[monthNum - 1] += value;
      monthlyCounts[monthNum - 1] += 1;
    } else if (monthNum === 13) {
      annualSum += value;
      annualCount += 1;
    }
  }

  // Check if we got any valid data
  if (monthlyCounts.some(count => count === 0)) {
    return {
      success: false,
      source: 'NASA',
      error: 'NASA_INCOMPLETE_MONTHLY_DATA',
      message: 'NASA POWER returned incomplete monthly data (some months have no valid values).',
      latitude: lat,
      longitude: lon
    };
  }

  const monthlyIrradiation = [];
  let derivedAnnualIrradiationKwhPerSqM = 0;

  for (let i = 0; i < 12; i++) {
    // This is the average daily irradiation for this month over the queried years
    const avgDailyIrradiationKwhPerSqM = monthlySums[i] / monthlyCounts[i];
    
    // Multiply by days in month to get total monthly irradiation
    const irradiationKwhPerSqM = avgDailyIrradiationKwhPerSqM * DAYS_IN_MONTH[i];
    
    derivedAnnualIrradiationKwhPerSqM += irradiationKwhPerSqM;

    monthlyIrradiation.push({
      month: i + 1,
      monthName: MONTH_NAMES[i],
      irradiationKwhPerSqM: Number(irradiationKwhPerSqM.toFixed(2)),
      avgDailyIrradiationKwhPerSqM: Number(avgDailyIrradiationKwhPerSqM.toFixed(4))
    });
  }

  // Peak Sun Hours is the annual average daily irradiation
  let peakSunHours = 0;
  if (annualCount > 0) {
    peakSunHours = Number((annualSum / annualCount).toFixed(4));
  } else {
    // Derivation fallback if YYYY13 wasn't present
    peakSunHours = Number((derivedAnnualIrradiationKwhPerSqM / 365).toFixed(4));
  }

  const elevation = nasaData.geometry?.coordinates?.[2] ?? null;

  return {
    success: true,
    source: 'NASA',
    latitude: lat,
    longitude: lon,
    elevation,
    radiationDatabase: 'NASA POWER',
    dataYearRange: `${START_YEAR}–${END_YEAR}`,
    monthlyIrradiation,
    annualIrradiationKwhPerSqM: Number(derivedAnnualIrradiationKwhPerSqM.toFixed(2)),
    peakSunHours,
    rawDataAvailable: true
  };
}
