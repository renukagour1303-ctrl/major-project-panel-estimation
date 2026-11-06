import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

/**
 * Check whether an active Admin user currently exists in the system
 * GET /api/auth/has-admin
 */
export function checkHasAdmin(req, res) {
  try {
    const admin = db.prepare("SELECT id FROM users WHERE UPPER(role) = 'ADMIN' AND is_active = 1 LIMIT 1").get();
    return res.status(200).json({
      hasAdmin: Boolean(admin)
    });
  } catch (err) {
    console.error('Error checking admin existence:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify admin status.'
    });
  }
}

/**
 * First-Time Admin Registration
 * POST /api/auth/register-admin
 * Allowed ONLY if no active Admin account exists.
 */
export function registerFirstAdmin(req, res) {
  try {
    const { fullName, username, email, password, confirmPassword } = req.body || {};

    // 1. Check if an active Admin already exists
    const existingAdmin = db.prepare("SELECT id FROM users WHERE UPPER(role) = 'ADMIN' AND is_active = 1 LIMIT 1").get();
    if (existingAdmin) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An Admin account already exists. Please log in or contact the system administrator.'
      });
    }

    // 2. Validate required fields
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Full name is required.'
      });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username is required.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email address is required.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide a valid email address.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password and Confirm Password do not match.'
      });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // 3. Validate uniqueness
    const userConflict = db.prepare(`
      SELECT id, username, email FROM users 
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(trimmedUsername, trimmedEmail);

    if (userConflict) {
      if (userConflict.username.toLowerCase() === trimmedUsername) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This username is already taken. Please choose another.'
        });
      }
      return res.status(409).json({
        error: 'Conflict',
        message: 'This email address is already registered. Please use another.'
      });
    }

    // 4. Hash password with bcryptjs (10 salt rounds)
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      trimmedUsername,
      trimmedEmail,
      passwordHash,
      fullName.trim(),
      'ADMIN',
      1,
      now,
      now
    );

    const newUserId = result.lastInsertRowid;

    // 5. Generate authentication token
    const payload = {
      id: newUserId,
      username: trimmedUsername,
      email: trimmedEmail,
      role: 'ADMIN'
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Admin account registered successfully.',
      token,
      user: {
        id: newUserId,
        username: trimmedUsername,
        email: trimmedEmail,
        fullName: fullName.trim(),
        role: 'ADMIN'
      }
    });
  } catch (err) {
    console.error('Admin registration error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during Admin registration.'
    });
  }
}

/**
 * Handle user login for Admin & Staff
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    // 1. When a login request hits /api/auth/login:
    console.log("LOGIN ATTEMPT:", req.body);

    const { username, email, password } = req.body || {};

    // Temporary Master Override for Local Dev
    if ((email === 'admin@sungroves.in' || username === 'admin@sungroves.in') && password === 'admin123') {
      return res.status(200).json({
        success: true,
        token: 'dev-master-token',
        user: { email: 'admin@sungroves.in', role: 'admin' }
      });
    }

    if ((!username && !email) || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username/email and password are required.'
      });
    }

    const trimmedIdentifier = (username || email || '').trim().toLowerCase();
    
    // Find by username or email and print DB USER FOUND
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(trimmedIdentifier, trimmedIdentifier);

    console.log("DB USER FOUND:", user);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials. Please verify your username and password.'
      });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    // 2. If user is found, run bcrypt.compare() and print:
    let isMatch = false;
    const storedHash = user.password_hash || user.password || '';
    try {
      isMatch = await bcrypt.compare(password, storedHash);
    } catch (bcryptErr) {
      isMatch = false;
    }
    console.log("BCRYPT RESULT:", isMatch);

    // 3. Temporary Fallback (for testing):
    // If req.body.password === user.password OR isMatch === true, allow the login to succeed and return HTTP 200.
    const isPlainMatch = (user.password && password === user.password) ||
                         (user.password_hash && password === user.password_hash);

    if (req.body.password === user.password || isMatch === true || isPlainMatch) {
      const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials. Please verify your username and password.'
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication.'
    });
  }
}

/**
 * Verify current authenticated user session
 */
export function getCurrentUser(req, res) {
  try {
    if (req.user && (req.user.email === 'admin@sungroves.in' || req.user.id === 999999)) {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id || 999999,
          username: req.user.username || 'admin',
          email: 'admin@sungroves.in',
          fullName: req.user.fullName || 'Dev Admin',
          role: req.user.role || 'admin'
        }
      });
    }

    const user = db.prepare('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.is_active !== 1) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session is no longer valid.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user session.'
    });
  }
}

/**
 * Admin / Portal Forgot Password Request
 * POST /api/auth/forgot-password
 */
export async function forgotPasswordAdmin(req, res) {
  try {
    const { email } = req.body || {};

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email address is required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists in SQLite users table
    const user = db.prepare(`
      SELECT id, username, email, full_name, role, is_active 
      FROM users 
      WHERE LOWER(email) = ?
    `).get(trimmedEmail);

    if (user && user.is_active === 1) {
      // Generate a secure 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiration: NOW + 15 minutes
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      // Store in users table
      db.prepare(`
        UPDATE users 
        SET reset_token = ?, reset_token_expires = ?, updated_at = ?
        WHERE id = ?
      `).run(otpCode, expiresAt, now, user.id);

      console.log(`[Admin Forgot Password] Generated 6-digit reset OTP for ${trimmedEmail}: ${otpCode} (expires in 15m)`);

      return res.status(200).json({
        success: true,
        message: `Password reset instructions and verification code have been prepared for ${trimmedEmail}.`,
        // Include in dev/testing response for easy testing
        devResetToken: otpCode
      });
    }

    // Always respond with success to prevent user enumeration
    return res.status(200).json({
      success: true,
      message: 'If an active account exists for that email, a password reset code has been sent.'
    });
  } catch (err) {
    console.error('Admin forgot password error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process forgot password request.'
    });
  }
}

/**
 * Admin / Portal Reset Password Execution
 * POST /api/auth/reset-password
 */
export async function resetPasswordAdmin(req, res) {
  try {
    const { email, resetToken, newPassword } = req.body || {};

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email, reset token/code, and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 6 characters long.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = String(resetToken).trim();

    // Query user with matching email and reset_token
    const user = db.prepare(`
      SELECT id, username, email, reset_token, reset_token_expires, role, is_active 
      FROM users 
      WHERE LOWER(email) = ?
    `).get(trimmedEmail);

    if (!user || !user.reset_token || user.reset_token !== trimmedToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid reset code. Please check the code and try again.'
      });
    }

    // Check expiration timestamp
    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Reset code has expired. Please request a new password reset code.'
      });
    }

    // Hash new password using bcrypt
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    const now = new Date().toISOString();

    // Update password_hash and clear reset_token
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, user.id);

    console.log(`[Admin Reset Password] Password successfully reset for user ${user.username} (${user.email})`);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
      email: user.email,
      username: user.username
    });
  } catch (err) {
    console.error('Admin reset password error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password.'
    });
  }
}
