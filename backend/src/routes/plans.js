import { Router } from 'express';
import { getPlansConfig, updatePlanConfig } from '../controllers/plansController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public: fetch plan descriptions and feature flags
router.get('/config', getPlansConfig);

// Protected (ADMIN ONLY): update plan prices and feature flags
router.put('/config', authenticateToken, requireAdmin, updatePlanConfig);

export default router;
