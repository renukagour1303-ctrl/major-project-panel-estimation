import { Router } from 'express';
import { getPublicPricing } from '../src/controllers/settingsController.js';

const router = Router();

// Public: GET /api/settings/pricing or GET /api/pricing
router.get('/', getPublicPricing);
router.get('/pricing', getPublicPricing);

export default router;

