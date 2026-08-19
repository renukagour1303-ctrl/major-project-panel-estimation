import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Helper to extract the most relevant city or town name from Nominatim address details
 */
export function extractCityName(item) {
  if (!item) return '';
  const addr = item.address || {};
  return (
    addr.city ||
    addr.town ||
    addr.municipality ||
    addr.suburb ||
    addr.village ||
    addr.county ||
    addr.state_district ||
    item.name ||
    (item.display_name ? item.display_name.split(',')[0].trim() : 'Selected Location')
  );
}

/**
 * Formats a short location title (e.g. "Chhatrapati Sambhajinagar, Maharashtra")
 */
export function formatShortLocation(item) {
  if (!item) return '';
  const addr = item.address || {};
  const city = extractCityName(item);
  const state = addr.state || '';
  const country = addr.country || '';

  const parts = [city, state, country].filter(Boolean);
  // Remove duplicates if city === state
  const uniqueParts = Array.from(new Set(parts));
  return uniqueParts.length > 0 ? uniqueParts.join(', ') : (item.display_name || '');
}

/**
 * Checks if input is raw coordinates like "19.8762, 75.3433" or "19.8762 75.3433"
 * Returns parsed object or null.
 */
export function parseCoordinates(query) {
  if (!query || typeof query !== 'string') return null;

  const trimmed = query.trim();
  // Regex to match "lat, lon" or "lat lon" with optional signs and decimals
  const coordRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;

  if (coordRegex.test(trimmed)) {
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);

      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lon.toFixed(6)),
          lat: lat.toFixed(6),
          lng: lon.toFixed(6),
          displayName: `Coordinates: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
          cityName: `Location (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
          source: 'manual',
          isCoordinateInput: true
        };
      }
    }
  }
  return null;
}

/**
 * Search locations using Nominatim Geocoding API
 * @param {string} query City name, pincode, or coordinates
 * @returns {Promise<Array>} List of location candidate objects
 */
export async function searchLocation(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    throw new Error('Please enter a city name, pincode, or coordinates.');
  }

  // Check if query is directly typed coordinates
  const parsedCoord = parseCoordinates(trimmed);
  if (parsedCoord) {
    return [parsedCoord];
  }

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: trimmed,
        format: 'json',
        addressdetails: 1,
        limit: 5,
        'accept-language': 'en'
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 9000
    });

    const data = response.data;
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map((item) => {
      const latNum = parseFloat(item.lat);
      const lonNum = parseFloat(item.lon);
      return {
        latitude: Number(latNum.toFixed(6)),
        longitude: Number(lonNum.toFixed(6)),
        lat: item.lat,
        lng: item.lon,
        displayName: item.display_name,
        cityName: extractCityName(item),
        shortName: formatShortLocation(item),
        address: item.address || {},
        source: 'manual'
      };
    });
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Location search timed out. Please check your internet connection and try again.');
    }
    if (error.response && error.response.status >= 400) {
      throw new Error(`Location service returned error (${error.response.status}). Please try again.`);
    }
    throw new Error(error.message || 'Unable to connect to location service.');
  }
}

/**
 * Reverse geocodes latitude & longitude into a readable address using Nominatim
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<object>}
 */
export async function reverseGeocode(lat, lon) {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1,
        'accept-language': 'en'
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 8000
    });

    const data = response.data;
    if (data && data.display_name) {
      return {
        displayName: data.display_name,
        cityName: extractCityName(data),
        shortName: formatShortLocation(data),
        address: data.address || {}
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Browser GPS location detection using navigator.geolocation
 * @param {object} options Geolocation options
 * @returns {Promise<object>} { latitude, longitude, lat, lng, displayName, cityName, source: 'gps' }
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser. Please search manually.'));
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const latNum = Number(latitude.toFixed(6));
        const lonNum = Number(longitude.toFixed(6));

        let cityName = `GPS Location (${latNum.toFixed(4)}°, ${lonNum.toFixed(4)}°)`;
        let displayName = `GPS: ${latNum.toFixed(6)}, ${lonNum.toFixed(6)}`;
        let shortName = cityName;
        let address = {};

        // Attempt reverse geocoding for better place name
        try {
          const rev = await reverseGeocode(latNum, lonNum);
          if (rev) {
            cityName = rev.cityName || cityName;
            displayName = rev.displayName || displayName;
            shortName = rev.shortName || shortName;
            address = rev.address || {};
          }
        } catch (_) {
          // Keep GPS default fallback labels
        }

        resolve({
          latitude: latNum,
          longitude: lonNum,
          lat: latNum.toString(),
          lng: lonNum.toString(),
          cityName,
          displayName,
          shortName,
          address,
          source: 'gps',
          accuracyMeters: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null
        });
      },
      (error) => {
        let message = 'An unknown error occurred while retrieving GPS location.';
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            message = 'Location access was denied. Please allow GPS permissions in your browser or search your city/pincode manually below.';
            break;
          case 2: // POSITION_UNAVAILABLE
            message = 'Location information is currently unavailable from your device sensor. Please search manually.';
            break;
          case 3: // TIMEOUT
            message = 'GPS request timed out. Please try again or use the manual search below.';
            break;
          default:
            message = error.message || message;
        }
        const errObj = new Error(message);
        errObj.code = error.code;
        reject(errObj);
      },
      geoOptions
    );
  });
}
