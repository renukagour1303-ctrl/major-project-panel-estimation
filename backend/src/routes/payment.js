import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import db from '../database/db.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/authMiddleware.js';
import { mockCheckout } from '../controllers/paymentsController.js';

const router = Router();

// Track custom Razorpay client if set for testing
let testingRazorpayClient = null;

export function setRazorpayClientForTesting(client) {
  testingRazorpayClient = client;
}

/**
 * Initialize Razorpay instance using process.env.RAZORPAY_KEY_ID and process.env.RAZORPAY_KEY_SECRET
 */
export function getRazorpayInstance() {
  if (testingRazorpayClient) {
    return testingRazorpayClient;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay configuration error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

/**
 * Helper to convert INR amount to paise
 * Accepts number or string, returns integer paise
 */
export function inrToPaise(amount) {
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    return Math.round(amount * 100);
  }
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/,/g, '').replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100);
    }
  }
  return 49900; // Default ₹499 in paise
}

/**
 * POST /api/payment/create-order
 * - Accepts amount (convert INR to paise: amount * 100).
 * - Calls razorpay.orders.create() and returns order_id, amount, and currency.
 */
router.post('/create-order', async (req, res) => {
  try {
    let razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch (cfgErr) {
      return res.status(503).json({
        error: 'Configuration Error',
        message: cfgErr.message
      });
    }

    // Accepts amount (convert INR to paise: amount * 100)
    let amountInPaise;
    if (req.body && req.body.amount !== undefined && req.body.amount !== null && req.body.amount !== '') {
      amountInPaise = inrToPaise(req.body.amount);
    } else {
      // Dynamic fallback to settings/plan_configs
      let defaultPaise = 49900;
      try {
        const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'pro_plan_price'").get();
        if (settingRow && settingRow.value) {
          const num = parseFloat(settingRow.value);
          if (!isNaN(num) && num > 0) defaultPaise = Math.round(num * 100);
        }
      } catch (e) {}
      amountInPaise = defaultPaise;
    }

    const currency = (req.body && req.body.currency) ? String(req.body.currency).toUpperCase() : 'INR';
    const receipt = (req.body && req.body.receipt) || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Optional user authentication extraction from Bearer token
    let authUser = req.user || null;
    if (!authUser) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          authUser = jwt.verify(token, JWT_SECRET);
        } catch (e) {}
      }
    }

    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: receipt,
      notes: {
        plan: 'pro',
        userEmail: authUser?.email || req.body?.email || '',
        userId: authUser?.id ? String(authUser.id) : ''
      }
    };

    const order = await razorpay.orders.create(options);

    // Save order record in SQLite
    const now = new Date().toISOString();
    try {
      const insertOrder = db.prepare(`
        INSERT INTO payment_orders (
          order_id, user_id, customer_id, account_type, user_email, amount, currency, receipt, plan, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)
      `);
      insertOrder.run(
        order.id,
        authUser?.role !== 'customer' ? authUser?.id || null : null,
        authUser?.role === 'customer' ? authUser?.id || null : null,
        authUser?.role === 'customer' ? 'customer' : (authUser?.id ? 'user' : 'guest'),
        authUser?.email || req.body?.email || null,
        order.amount,
        order.currency || 'INR',
        receipt,
        'pro',
        now,
        now
      );
    } catch (dbErr) {
      console.warn('SQLite payment_orders insert notice:', dbErr.message);
    }

    try {
      db.prepare(`
        INSERT INTO payments (order_id, amount, currency, status, created_at, updated_at)
        VALUES (?, ?, ?, 'created', ?, ?)
        ON CONFLICT(order_id) DO UPDATE SET amount = excluded.amount, status = 'created', updated_at = excluded.updated_at
      `).run(order.id, order.amount, order.currency || 'INR', now, now);
    } catch (e) {}

    // Return order_id, amount, and currency as requested
    return res.status(200).json({
      success: true,
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency || 'INR',
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Error creating payment order:', err);
    return res.status(500).json({
      error: 'Order Creation Failed',
      message: err.message || 'Failed to create Razorpay order'
    });
  }
});

/**
 * POST /api/payment/verify-payment
 * - Validates razorpay_order_id, razorpay_payment_id, and razorpay_signature using HMAC SHA256 crypto check.
 * - Updates payment status in SQLite upon verification.
 */
router.post(['/verify-payment', '/verify-signature'], async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature).'
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'RAZORPAY_KEY_SECRET is not configured on the server.'
      });
    }

    // Validates razorpay_order_id, razorpay_payment_id, and razorpay_signature using HMAC SHA256 crypto check
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isSignatureValid = (
      typeof razorpay_signature === 'string' &&
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature, 'utf8'), Buffer.from(razorpay_signature, 'utf8'))
    );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        error: 'Verification Failed',
        message: 'Payment signature verification failed. HMAC SHA256 mismatch.'
      });
    }

    // Optional user authentication extraction from Bearer token
    let authUser = req.user || null;
    if (!authUser) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          authUser = jwt.verify(token, JWT_SECRET);
        } catch (e) {}
      }
    }

    // Updates payment status in SQLite upon verification
    const now = new Date().toISOString();

    const updateTx = db.transaction(() => {
      // 1. Update payment_orders
      db.prepare(`
        UPDATE payment_orders
        SET status = 'paid',
            razorpay_payment_id = ?,
            razorpay_signature = ?,
            verified_at = ?,
            updated_at = ?
        WHERE order_id = ?
      `).run(razorpay_payment_id, razorpay_signature, now, now, razorpay_order_id);

      // 2. Update payments table
      try {
        db.prepare(`
          INSERT INTO payments (order_id, payment_id, signature, status, created_at, updated_at)
          VALUES (?, ?, ?, 'paid', ?, ?)
          ON CONFLICT(order_id) DO UPDATE SET
            payment_id = excluded.payment_id,
            signature = excluded.signature,
            status = 'paid',
            updated_at = excluded.updated_at
        `).run(razorpay_order_id, razorpay_payment_id, razorpay_signature, now, now);
      } catch (e) {}

      // 3. Update customer or user plan in SQLite to 'pro'
      const existingOrder = db.prepare('SELECT * FROM payment_orders WHERE order_id = ?').get(razorpay_order_id);
      const targetUserId = existingOrder?.user_id || (authUser?.role !== 'customer' ? authUser?.id : null);
      const targetCustomerId = existingOrder?.customer_id || (authUser?.role === 'customer' ? authUser?.id : null);
      const targetEmail = existingOrder?.user_email || authUser?.email || req.body?.email;

      if (targetCustomerId) {
        db.prepare(`UPDATE customers SET plan = 'pro', updated_at = ? WHERE id = ?`).run(now, targetCustomerId);
      }
      if (targetUserId) {
        db.prepare(`UPDATE users SET plan = 'pro', updated_at = ? WHERE id = ?`).run(now, targetUserId);
      }
      if (targetEmail) {
        try {
          db.prepare(`UPDATE customers SET plan = 'pro', updated_at = ? WHERE LOWER(email) = ?`).run(now, targetEmail.toLowerCase().trim());
          db.prepare(`UPDATE users SET plan = 'pro', updated_at = ? WHERE LOWER(email) = ?`).run(now, targetEmail.toLowerCase().trim());
        } catch (e) {}
      }
    });

    updateTx();

    return res.status(200).json({
      success: true,
      plan: 'pro',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      message: 'Payment verified successfully. Welcome to Sungroves Pro!'
    });
  } catch (err) {
    console.error('Error verifying payment:', err);
    return res.status(500).json({
      success: false,
      error: 'Verification Error',
      message: err.message || 'Payment verification failed due to internal error.'
    });
  }
});

// POST /api/payment/mock-checkout (Development only fallback)
router.post('/mock-checkout', mockCheckout);

export default router;

