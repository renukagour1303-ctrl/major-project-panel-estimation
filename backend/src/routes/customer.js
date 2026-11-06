import { Router } from 'express';
import {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  forgotPassword,
  resetPassword
} from '../controllers/customerController.js';
import { authenticateCustomerToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public: Customer Registration
router.post('/register', registerCustomer);

// Public: Customer Login
router.post('/login', loginCustomer);

// Protected: Current Customer Profile
router.get('/me', authenticateCustomerToken, getCustomerProfile);

// Public: Request Password Reset
router.post('/forgot-password', forgotPassword);

// Public: Reset Password with Token
router.post('/reset-password', resetPassword);

export default router;
