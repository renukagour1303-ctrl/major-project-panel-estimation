import { Router } from 'express';
import { getPublicPricing } from '../controllers/settingsController.js';

const router = Router();

// Public: GET /api/pricing or GET /api/pricing/pricing
router.get('/', getPublicPricing);
router.get('/pricing', getPublicPricing);

export default router;

