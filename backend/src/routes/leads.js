import { Router } from 'express';
import { createLead, getAllLeads, updateLeadStatus, getLeadStats, clearDummyLeads } from '../controllers/leadController.js';
import { authenticateToken, requireStaffOrAdmin, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public: Submit inquiry or solar calculation lead
router.post('/', createLead);

// Protected (ADMIN & STAFF): Get lead metrics
router.get('/stats', authenticateToken, requireStaffOrAdmin, getLeadStats);

// Protected (ADMIN & STAFF): Get all leads with filtering
router.get('/', authenticateToken, requireStaffOrAdmin, getAllLeads);

// Protected (ADMIN & STAFF): Update lead status
router.put('/:id/status', authenticateToken, requireStaffOrAdmin, updateLeadStatus);

// Protected (ADMIN ONLY): Clear dummy / test leads
router.delete('/dummy', authenticateToken, requireAdmin, clearDummyLeads);
router.post('/clear-dummy', authenticateToken, requireAdmin, clearDummyLeads);

export default router;
