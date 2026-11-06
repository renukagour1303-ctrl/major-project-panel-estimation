/**
 * Recommendation Controller (Chunk 14)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 */

import { generateClaudeRecommendation } from '../services/claudeService.js';

/**
 * POST /api/solar/recommendation
 * Generates an AI-powered or deterministic pre-sales summary explanation
 * based strictly on calculated results.
 */
export async function getSolarRecommendation(req, res) {
  try {
    const calculationData = req.body;

    if (!calculationData || typeof calculationData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD',
        message: 'Calculation results payload is required to generate recommendation.'
      });
    }

    const recommendation = await generateClaudeRecommendation(calculationData);

    return res.status(200).json(recommendation);
  } catch (error) {
    console.error('Error generating recommendation:', error);
    return res.status(500).json({
      success: false,
      error: 'RECOMMENDATION_ERROR',
      message: 'Failed to generate recommendation.'
    });
  }
}
