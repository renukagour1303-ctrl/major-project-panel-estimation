import { Router } from 'express';
import { 
  login, 
  getCurrentUser, 
  checkHasAdmin, 
  registerFirstAdmin, 
  forgotPasswordAdmin, 
  resetPasswordAdmin 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public: Check whether an active Admin exists
router.get('/has-admin', checkHasAdmin);

// Public (setup only): Register the first Admin
router.post('/register-admin', registerFirstAdmin);

// Public: Login for Admin & Staff (POST /api/auth/login)
router.post('/login', (req, res, next) => {
  const { email, username, password } = req.body || {};

  // Temporary Master Override for Local Dev
  if ((email === 'admin@sungroves.in' || username === 'admin@sungroves.in') && password === 'admin123') {
    return res.status(200).json({
      success: true,
      token: 'dev-master-token',
      user: { email: 'admin@sungroves.in', role: 'admin' }
    });
  }

  return login(req, res, next);
});

// Public: Forgot Password & Reset Password for Admin & Staff
router.post('/forgot-password', forgotPasswordAdmin);
router.post('/reset-password', resetPasswordAdmin);

// Authenticated: Current user profile
router.get('/me', authenticateToken, getCurrentUser);

export default router;
