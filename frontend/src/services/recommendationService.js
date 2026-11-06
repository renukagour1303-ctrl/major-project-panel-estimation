/**
 * Solar Recommendation API Service (Chunk 14)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Request an AI recommendation/explanation for a calculated solar estimation.
 * 
 * @param {Object} calculationPayload Structured calculation results
 * @returns {Promise<Object>} { success: boolean, summary: string, source: string }
 */
export async function fetchSolarRecommendation(calculationPayload) {
  try {
    const response = await axios.post(`${API_BASE_URL}/solar/recommendation`, calculationPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    console.warn('Recommendation API call failed:', error.message);
    // Return graceful fallback object without throwing
    return {
      success: true,
      source: 'fallback',
      summary: null,
      error: error.message
    };
  }
}
