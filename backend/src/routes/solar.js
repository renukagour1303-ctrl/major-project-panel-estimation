import { Router } from 'express';
import { getSolarResource } from '../controllers/pvgisController.js';

const router = Router();

/**
 * GET /api/solar/pvgis
 * Fetches real solar irradiation data from PVGIS based on coordinates.
 * Query params: lat, lon
 */
router.get('/pvgis', getSolarResource);

export default router;
