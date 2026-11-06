import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public Customer Registration
 * POST /api/customer/register
 */
export function registerCustomer(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, email, and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Check if customer email already exists
    const existingCustomer = db.prepare('SELECT id FROM customers WHERE LOWER(email) = ?').get(trimmedEmail);
    if (existingCustomer) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Hash password (10 salt rounds)
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO customers (name, email, password_hash, plan, created_at, updated_at)
      VALUES (?, ?, ?, 'free', ?, ?)
    `);

    insertStmt.run(trimmedName, trimmedEmail, passwordHash, now, now);

    return res.status(201).json({
      message: 'Registration successful'
    });
  } catch (err) {
    console.error('Customer registration error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during registration.'
    });
  }
}

/**
 * Public Customer Login
 * POST /api/customer/login
 */
export function loginCustomer(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query customer
    const customer = db.prepare(`
      SELECT id, name, email, plan, password_hash, password_changed_at 
      FROM customers 
      WHERE LOWER(email) = ?
    `).get(trimmedEmail);

    if (!customer) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const isMatch = bcrypt.compareSync(password, customer.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials. Please verify your email and password.'
      });
    }

    // Sign customer JWT payload
    const payload = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      role: 'customer'
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        plan: customer.plan
      }
    });
  } catch (err) {
    console.error('Customer login error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login.'
    });
  }
}

/**
 * Authenticated Customer Profile
 * GET /api/customer/me
 */
export function getCustomerProfile(req, res) {
  try {
    const customer = req.customer;
    if (!customer) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Customer session not found.'
      });
    }

    return res.status(200).json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      plan: customer.plan
    });
  } catch (err) {
    console.error('Get customer profile error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve customer profile.'
    });
  }
}

/**
 * Customer Forgot Password Request
 * POST /api/customer/forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email address is required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find customer
    const customer = db.prepare('SELECT id, name, email FROM customers WHERE LOWER(email) = ?').get(trimmedEmail);

    if (customer) {
      // 1. Generate secure random 32-byte hex token
      const rawToken = crypto.randomBytes(32).toString('hex');

      // 2. Hash token using SHA-256 for database storage
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // 3. Expiry: NOW + 15 minutes
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      // 4. Save to customers table
      db.prepare(`
        UPDATE customers 
        SET reset_token_hash = ?, reset_token_expires = ?, updated_at = ?
        WHERE id = ?
      `).run(tokenHash, expiresAt, now, customer.id);

      // 5. Construct reset URL
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      // 6. Send email asynchronously or log for dev
      await sendPasswordResetEmail({
        toEmail: customer.email,
        name: customer.name,
        resetUrl
      });
    }

    // ALWAYS return exact same response to prevent email enumeration
    return res.status(200).json({
      message: 'If an account exists with that email, a reset link has been sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    // Still return the generic message for security
    return res.status(200).json({
      message: 'If an account exists with that email, a reset link has been sent.'
    });
  }
}

/**
 * Customer Reset Password
 * POST /api/customer/reset-password
 */
export function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !token.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Hash incoming token with SHA-256
    const incomingTokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Query customer with matching token
    const customer = db.prepare(`
      SELECT id, reset_token_hash, reset_token_expires 
      FROM customers 
      WHERE reset_token_hash = ?
    `).get(incomingTokenHash);

    // Validate token exists
    if (!customer || !customer.reset_token_hash) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    }

    // Validate token expiry (must be in the future)
    const expiryTime = new Date(customer.reset_token_expires).getTime();
    if (isNaN(expiryTime) || expiryTime <= Date.now()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password with bcrypt 10 rounds
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    const now = new Date().toISOString();

    // Update customer: set new hash, record password_changed_at, clear reset token
    db.prepare(`
      UPDATE customers 
      SET password_hash = ?,
          password_changed_at = ?,
          reset_token_hash = NULL,
          reset_token_expires = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(newPasswordHash, now, now, customer.id);

    return res.status(200).json({
      message: 'Password reset successful'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while resetting your password.'
    });
  }
}
