/**
 * Solar Calculation API Client Service (Chunk 11)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Send calculation request to the backend.
 * 
 * @param {Object} payload
 * @param {number} payload.latitude
 * @param {number} payload.longitude
 * @param {string} [payload.cityName]
 * @param {number} payload.tracedRoofArea
 * @param {number} payload.usableRoofArea
 * @param {number|string} [payload.monthlyBill]
 * @param {number|string} [payload.tariffRate]
 * @param {number|string} [payload.directMonthlyConsumption]
 * @param {Object} [payload.selectedPanel]
 * @param {number} [payload.panelWattage]
 * @returns {Promise<Object>} Backend calculation response
 */
export async function calculateSolarEstimate(payload) {
  try {
    const response = await axios.post(`${API_BASE_URL}/solar/calculate`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30s timeout for external solar data API calls
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      // Backend returned a structured error response
      const errData = error.response.data;
      return {
        success: false,
        status: error.response.status,
        error: errData?.error || 'SERVER_ERROR',
        message: errData?.message || 'Calculation request failed on the server.'
      };
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        success: false,
        error: 'REQUEST_TIMEOUT',
        message: 'The calculation request timed out. Please check your connection and try again.'
      };
    } else {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: "We couldn't complete the calculation right now. Please check your connection and try again."
      };
    }
  }
}
