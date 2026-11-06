import { Router } from 'express';
import { getSiteSettings, updateSiteSettings, getPublicPricing } from '../controllers/settingsController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/settings/pricing (Public endpoint for dynamic pricing sync)
router.get('/pricing', getPublicPricing);

// GET /api/settings (public access for Footer/Contact sync)
router.get('/', getSiteSettings);

// PUT /api/settings (admin-protected update)
router.put('/', authenticateToken, requireAdmin, updateSiteSettings);
router.post('/', authenticateToken, requireAdmin, updateSiteSettings);

export default router;
