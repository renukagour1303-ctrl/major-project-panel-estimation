import { Router } from 'express';
import { getSolarResource } from '../controllers/pvgisController.js';
import { calculateSolarEstimate } from '../controllers/solarCalculationController.js';
import { getSolarRecommendation } from '../controllers/recommendationController.js';
import { autoTraceRoof } from '../controllers/roofTracingController.js';

const router = Router();

/*
// AUTO-TRACING TEMPORARILY DISABLED
// router.get('/auto-trace', autoTraceRoof);
// router.post('/auto-trace', autoTraceRoof);
// router.post('/trace-roof', async (req, res) => { ... });
*/

/**
 * GET /api/solar/pvgis
 * Fetches real solar irradiation data from PVGIS based on coordinates.
 * Query params: lat, lon
 */
router.get('/pvgis', getSolarResource);

/**
 * POST /api/solar/calculate
 * End-to-end solar estimation calculation endpoint (Chunk 11).
 * Accepts user location, roof geometry, electricity inputs, panel preference,
 * fetches real solar resource, executes deterministic calculation engine, and returns results.
 */
router.post('/calculate', calculateSolarEstimate);

/**
 * POST /api/solar/recommendation
 * Generates an AI-powered executive summary / recommendation from deterministic results (Chunk 14).
 */
router.post('/recommendation', getSolarRecommendation);

export default router;
