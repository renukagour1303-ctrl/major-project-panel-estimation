import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  mockCheckout
} from '../controllers/paymentsController.js';
import { authenticatePaymentUser } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/payments/create-order (Protected: requires customer or user auth token)
router.post('/create-order', authenticatePaymentUser, createPaymentOrder);

// POST /api/payments/verify-signature (Protected: requires customer or user auth token)
router.post('/verify-signature', authenticatePaymentUser, verifyPaymentSignature);

// POST /api/payments/mock-checkout (Development only - blocked in production)
router.post('/mock-checkout', mockCheckout);

export default router;
