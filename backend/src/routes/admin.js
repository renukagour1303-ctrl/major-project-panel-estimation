import { Router } from 'express';
import { login, forgotPasswordAdmin, resetPasswordAdmin } from '../controllers/authController.js';
import { getPublicConfig, updateConfig } from '../controllers/configController.js';
import { getAllLeads, updateLeadStatus, getLeadStats, clearDummyLeads } from '../controllers/leadController.js';
import { getStaffList, createStaff, updateStaffStatus, deleteUser } from '../controllers/staffController.js';
import { getAdminSettings, updateAdminSettings } from '../controllers/settingsController.js';
import { authenticateToken, requireAdmin, requireStaffOrAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Auth login endpoint (ADMIN & STAFF)
router.post('/login', login);
router.post('/forgot-password', forgotPasswordAdmin);
router.post('/reset-password', resetPasswordAdmin);

// Settings endpoints
router.get('/settings', getAdminSettings);
router.post('/settings', authenticateToken, requireAdmin, updateAdminSettings);
router.put('/settings', authenticateToken, requireAdmin, updateAdminSettings);

// Company configuration endpoints
router.get('/config', getPublicConfig);
router.put('/config', authenticateToken, requireAdmin, updateConfig);

// Leads management endpoints (ADMIN & STAFF)
router.get('/leads', authenticateToken, requireStaffOrAdmin, getAllLeads);
router.get('/leads/stats', authenticateToken, requireStaffOrAdmin, getLeadStats);
router.put('/leads/:id/status', authenticateToken, requireStaffOrAdmin, updateLeadStatus);
router.delete('/leads/dummy', authenticateToken, requireAdmin, clearDummyLeads);
router.post('/leads/clear-dummy', authenticateToken, requireAdmin, clearDummyLeads);

// Staff & Admin user management endpoints (ADMIN ONLY)
router.get('/staff', authenticateToken, requireAdmin, getStaffList);
router.post('/staff', authenticateToken, requireAdmin, createStaff);
router.put('/staff/:id/status', authenticateToken, requireAdmin, updateStaffStatus);
router.delete('/staff/:id', authenticateToken, requireAdmin, deleteUser);

// Admin Users endpoints matching POST /api/admin/users and POST /api/admin/users/create
router.get('/users', authenticateToken, requireAdmin, getStaffList);
router.post('/users', authenticateToken, requireAdmin, createStaff);
router.post('/users/create', authenticateToken, requireAdmin, createStaff);
router.put('/users/:id/status', authenticateToken, requireAdmin, updateStaffStatus);
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);

export default router;
