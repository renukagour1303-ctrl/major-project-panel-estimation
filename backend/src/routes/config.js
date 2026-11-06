import { Router } from 'express';
import { getPublicConfig, updateConfig } from '../controllers/configController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public: Fetch company profile & pricing
router.get('/', getPublicConfig);

// Protected (ADMIN ONLY): Update company profile & pricing
router.put('/', authenticateToken, requireAdmin, updateConfig);

export default router;
