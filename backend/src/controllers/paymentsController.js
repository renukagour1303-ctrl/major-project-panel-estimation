import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

let customRazorpayClient = null;

/**
 * Allows injecting a mock Razorpay client for automated tests.
 */
export function setRazorpayClientForTesting(client) {
  customRazorpayClient = client;
}

/**
 * Cleanly parse configured price string into integer paise.
 * For example:
 * - "₹499" -> 49900
 * - "₹4,999 / year" -> 499900
 * - 499 -> 49900
 * Falls back to defaultRupees (499) if missing or unparseable.
 */
export function parsePriceToPaise(priceValue, defaultRupees = 499) {
  if (typeof priceValue === 'number' && Number.isFinite(priceValue) && priceValue > 0) {
    return Math.round(priceValue * 100);
  }
  if (!priceValue || typeof priceValue !== 'string') {
    return defaultRupees * 100;
  }
  const cleaned = priceValue.replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (match) {
    const rupees = parseFloat(match[1]);
    if (!isNaN(rupees) && rupees > 0) {
      return Math.round(rupees * 100);
    }
  }
  return defaultRupees * 100;
}

/**
 * Validates Razorpay credentials and returns an initialized Razorpay SDK instance.
 */
export function getRazorpayClient() {
  if (customRazorpayClient) {
    return {
      razorpay: customRazorpayClient,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      keySecret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'
    };
  }

  const isEnabled = String(process.env.ENABLE_RAZORPAY).trim().toLowerCase() === 'true';
  const keyId = process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.trim() : '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : '';

  if (!isEnabled) {
    const err = new Error('Razorpay payment gateway is currently disabled by server configuration.');
    err.status = 503;
    err.code = 'RAZORPAY_DISABLED';
    throw err;
  }

  if (!keyId || !keySecret || keyId === 'rzp_test_placeholder' || keySecret === 'placeholder_secret') {
    const err = new Error('Razorpay configuration error: Valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.');
    err.status = 503;
    err.code = 'RAZORPAY_CREDENTIALS_MISSING';
    throw err;
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  return { razorpay, keyId, keySecret };
}

/**
 * POST /api/payments/create-order
 *
 * Requirements:
 * - Require an authenticated user (via req.user from authenticatePaymentUser).
 * - Check ENABLE_RAZORPAY and validate configured credentials.
 * - Read the active Pro price from plan_configs in SQLite (server-authoritative).
 * - Convert the configured INR amount to paise.
 * - Create a unique receipt for each order.
 * - Persist order ID, user/customer ID, amount, currency, and status in SQLite.
 * - Return only order_id, amount, currency, and public key_id.
 */
export async function createPaymentOrder(req, res) {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication is required to initiate a payment order.'
      });
    }

    let clientInfo;
    try {
      clientInfo = getRazorpayClient();
    } catch (cfgErr) {
      return res.status(cfgErr.status || 500).json({
        error: 'Payment Configuration Error',
        message: cfgErr.message,
        code: cfgErr.code || 'CONFIG_ERROR'
      });
    }

    const { razorpay, keyId } = clientInfo;

    // Read active pro_plan_price dynamically from SQLite settings table
    let dynamicAmountPaise = 49900;
    try {
      const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'pro_plan_price'").get();
      if (settingRow && settingRow.value) {
        const priceNum = parseFloat(settingRow.value);
        if (!isNaN(priceNum) && priceNum > 0) {
          dynamicAmountPaise = Math.round(priceNum * 100);
        }
      } else {
        // Fallback to plan_configs if setting key not found
        const proPlan = db.prepare("SELECT price FROM plan_configs WHERE plan_name = 'pro'").get();
        if (proPlan && proPlan.price) {
          dynamicAmountPaise = parsePriceToPaise(proPlan.price, 499);
        }
      }
    } catch (dbErr) {
      console.warn('Error reading pro_plan_price from settings table:', dbErr.message);
      dynamicAmountPaise = 49900;
    }

    // Generate unique receipt
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const orderOptions = {
      amount: dynamicAmountPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: String(user.id),
        userEmail: user.email,
        accountType: user.accountType || 'customer',
        plan: 'pro'
      }
    };

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: dynamicAmountPaise,
        currency: 'INR',
        receipt: receipt,
        notes: orderOptions.notes
      });
    } catch (orderErr) {
      console.error('Razorpay order creation failed:', orderErr.message || orderErr);
      return res.status(502).json({
        error: 'Gateway Error',
        message: 'Failed to create order with Razorpay payment gateway.'
      });
    }

    // Persist order in SQLite
    const now = new Date().toISOString();
    const insertOrder = db.prepare(`
      INSERT INTO payment_orders (
        order_id, user_id, customer_id, account_type, user_email, amount, currency, receipt, plan, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)
    `);

    insertOrder.run(
      razorpayOrder.id,
      user.accountType === 'user' ? user.id : null,
      user.accountType === 'customer' ? user.id : null,
      user.accountType || 'customer',
      user.email,
      razorpayOrder.amount,
      razorpayOrder.currency || 'INR',
      receipt,
      'pro',
      now,
      now
    );

    return res.status(200).json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || 'INR',
      key_id: keyId
    });
  } catch (err) {
    console.error('Create payment order unexpected error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create payment order.'
    });
  }
}

/**
 * POST /api/payments/verify-signature
 *
 * Requirements:
 * 1. Require an authenticated user.
 * 2. Find stored order in SQLite and verify it belongs to this user.
 * 3. Compute HMAC-SHA256 signature using RAZORPAY_KEY_SECRET over order_id + "|" + payment_id.
 * 4. Compare signatures using crypto.timingSafeEqual.
 * 5. Verify payment details against Razorpay API using official SDK (amount, currency, captured).
 * 6. Reject mismatched orders, wrong amounts, wrong currency, invalid signatures, wrong user.
 * 7. Transactionally update payment status and users/customers.plan = 'pro'.
 * 8. Make verification idempotent.
 * 9. Return { success: true, plan: 'pro' }.
 * 10. Never log or leak secrets.
 */
export async function verifyPaymentSignature(req, res) {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication is required to verify payment.'
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature).'
      });
    }

    // 1. Retrieve stored order from SQLite
    const order = db.prepare('SELECT * FROM payment_orders WHERE order_id = ?').get(razorpay_order_id);
    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No corresponding order record found for this order ID.'
      });
    }

    // 2. Authorization check: order must belong to authenticated user
    const matchesUser = (
      (order.account_type === 'customer' && order.customer_id === user.id) ||
      (order.account_type === 'user' && order.user_id === user.id) ||
      (order.user_email && user.email && order.user_email.toLowerCase() === user.email.toLowerCase())
    );

    if (!matchesUser) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Payment order does not belong to the currently authenticated user.'
      });
    }

    // 3. Idempotency check: if order is already marked as paid
    if (order.status === 'paid') {
      const now = new Date().toISOString();
      return res.status(200).json({
        success: true,
        plan: 'pro',
        alreadyVerified: true,
        message: 'Payment was already verified and Pro plan is active.'
      });
    }

    // 4. Retrieve secret key for HMAC computation
    let clientInfo;
    try {
      clientInfo = getRazorpayClient();
    } catch (cfgErr) {
      return res.status(cfgErr.status || 500).json({
        error: 'Payment Configuration Error',
        message: cfgErr.message
      });
    }

    const { razorpay, keySecret } = clientInfo;

    // 5. Compute HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // 6. Timing-safe comparison of signatures
    if (
      typeof razorpay_signature !== 'string' ||
      razorpay_signature.length !== expectedSignature.length
    ) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payment signature format or length.'
      });
    }

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(razorpay_signature, 'utf8');

    const signatureValid = crypto.timingSafeEqual(expectedBuf, providedBuf);
    if (!signatureValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment signature verification failed. Tampered or invalid credentials.'
      });
    }

    // 7. Verify payment against Razorpay's API via official SDK
    let payment;
    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (fetchErr) {
      console.error('Failed to fetch payment details from Razorpay:', fetchErr.message || fetchErr);
      return res.status(502).json({
        error: 'Gateway Verification Error',
        message: 'Unable to verify payment with Razorpay servers.'
      });
    }

    if (!payment) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment record could not be found on Razorpay.'
      });
    }

    // Confirm order ID matches
    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment order ID does not match expected order.'
      });
    }

    // Confirm expected amount and currency
    if (Number(payment.amount) !== Number(order.amount)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Payment amount mismatch. Expected ${order.amount} paise, received ${payment.amount} paise.`
      });
    }

    if (String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Payment currency mismatch. Expected ${order.currency}, received ${payment.currency}.`
      });
    }

    // Handle payment status: must be captured before granting Pro
    if (payment.status === 'authorized') {
      // Authorized but not captured: handle as pending
      return res.status(202).json({
        success: false,
        pending: true,
        status: 'authorized',
        message: 'Payment is authorized but not yet captured. Pro plan will be activated once captured.'
      });
    }

    if (payment.status !== 'captured') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Payment status is "${payment.status}". Only captured payments can unlock Pro features.`
      });
    }

    // 8. Transactionally update payment order and user/customer plan to 'pro'
    const now = new Date().toISOString();
    const updateTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE payment_orders
        SET status = 'paid',
            razorpay_payment_id = ?,
            razorpay_signature = ?,
            verified_at = ?,
            updated_at = ?
        WHERE order_id = ?
      `).run(razorpay_payment_id, razorpay_signature, now, now, razorpay_order_id);

      if (order.account_type === 'customer' || order.customer_id) {
        db.prepare(`UPDATE customers SET plan = 'pro', updated_at = ? WHERE id = ?`)
          .run(now, order.customer_id || user.id);
      }

      if (order.account_type === 'user' || order.user_id) {
        db.prepare(`UPDATE users SET plan = 'pro', updated_at = ? WHERE id = ?`)
          .run(now, order.user_id || user.id);
      }

      if (order.user_email) {
        try {
          db.prepare(`UPDATE users SET plan = 'pro', updated_at = ? WHERE LOWER(email) = ?`)
            .run(now, order.user_email.toLowerCase());
          db.prepare(`UPDATE customers SET plan = 'pro', updated_at = ? WHERE LOWER(email) = ?`)
            .run(now, order.user_email.toLowerCase());
        } catch (e) {
          // Safe ignore if duplicate check
        }
      }
    });

    updateTransaction();

    // 9. Fetch updated profile for token/context refresh
    let updatedCustomer = null;
    let updatedUser = null;

    if (order.account_type === 'customer' || order.customer_id) {
      updatedCustomer = db.prepare('SELECT id, name, email, plan FROM customers WHERE id = ?').get(order.customer_id || user.id);
    }
    if (order.account_type === 'user' || order.user_id) {
      updatedUser = db.prepare('SELECT id, username, email, full_name, role, plan FROM users WHERE id = ?').get(order.user_id || user.id);
    }

    return res.status(200).json({
      success: true,
      plan: 'pro',
      customer: updatedCustomer || updatedUser,
      user: updatedUser || updatedCustomer,
      message: 'Payment verified successfully. Welcome to Sungroves Pro!'
    });
  } catch (err) {
    console.error('Verify payment signature unexpected error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Payment verification failed due to an internal error.'
    });
  }
}

/**
 * POST /api/payments/mock-checkout (Development only)
 *
 * Simulated (mock) plan upgrade endpoint:
 * - Blocked in production (NODE_ENV === 'production').
 * - Preserved for dev/testing.
 */
export function mockCheckout(req, res) {
  try {
    // Production Safeguard: Never allow mock checkout in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Mock checkout is disabled in production. A verified Razorpay payment is required.'
      });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const { plan = 'pro', email: bodyEmail, customerId: bodyCustomerId } = req.body || {};

    const targetPlan = plan.toLowerCase() === 'free' ? 'free' : 'pro';
    const now = new Date().toISOString();

    let authenticatedCustomerId = null;
    let authenticatedUserId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'customer') {
          authenticatedCustomerId = decoded.id;
        } else if (decoded.id) {
          authenticatedUserId = decoded.id;
        }
      } catch (err) {
        // Token verify notice
      }
    }

    // 1. Check if authenticated as a customer
    if (authenticatedCustomerId) {
      db.prepare(`UPDATE customers SET plan = ?, updated_at = ? WHERE id = ?`).run(targetPlan, now, authenticatedCustomerId);
      const customer = db.prepare(`SELECT id, name, email, plan, created_at FROM customers WHERE id = ?`).get(authenticatedCustomerId);

      const refreshedToken = jwt.sign(
        { id: customer.id, email: customer.email, role: 'customer' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        mock: true,
        message: `[MOCK PAYMENT] Plan upgraded to "${targetPlan}". No real charge was made.`,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          plan: customer.plan
        },
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          plan: customer.plan
        },
        token: refreshedToken
      });
    }

    // 2. Check if authenticated as a staff/admin user
    if (authenticatedUserId) {
      try {
        db.prepare(`UPDATE users SET plan = ?, updated_at = ? WHERE id = ?`).run(targetPlan, now, authenticatedUserId);
      } catch (colErr) {
        // Ignored if column missing
      }
      const user = db.prepare(`SELECT id, username, email, full_name, role, is_active, plan FROM users WHERE id = ?`).get(authenticatedUserId);

      return res.status(200).json({
        success: true,
        mock: true,
        message: `[MOCK PAYMENT] User plan upgraded to "${targetPlan}". No real charge was made.`,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          plan: user.plan || targetPlan
        },
        customer: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          plan: user.plan || targetPlan
        }
      });
    }

    // 3. Fallback: by body customerId or body email
    if (bodyCustomerId) {
      const c = db.prepare('SELECT id, name, email, plan FROM customers WHERE id = ?').get(bodyCustomerId);
      if (c) {
        db.prepare('UPDATE customers SET plan = ?, updated_at = ? WHERE id = ?').run(targetPlan, now, c.id);
        const updatedC = db.prepare('SELECT id, name, email, plan FROM customers WHERE id = ?').get(c.id);
        const newToken = jwt.sign({ id: updatedC.id, email: updatedC.email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
          success: true,
          mock: true,
          message: `[MOCK PAYMENT] Plan upgraded to "${targetPlan}". No real charge was made.`,
          customer: updatedC,
          user: updatedC,
          token: newToken
        });
      }
    }

    if (bodyEmail) {
      const c = db.prepare('SELECT id, name, email, plan FROM customers WHERE LOWER(email) = ?').get(bodyEmail.toLowerCase().trim());
      if (c) {
        db.prepare('UPDATE customers SET plan = ?, updated_at = ? WHERE id = ?').run(targetPlan, now, c.id);
        const updatedC = db.prepare('SELECT id, name, email, plan FROM customers WHERE id = ?').get(c.id);
        const newToken = jwt.sign({ id: updatedC.id, email: updatedC.email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
          success: true,
          mock: true,
          message: `[MOCK PAYMENT] Plan upgraded to "${targetPlan}". No real charge was made.`,
          customer: updatedC,
          user: updatedC,
          token: newToken
        });
      }
    }

    // 4. Guest user upgrading directly from calculator: create or upgrade active demo session
    let guestCustomer = db.prepare("SELECT id, name, email, plan FROM customers WHERE email = 'pro.demo@sungroves.com'").get();
    if (!guestCustomer) {
      const insertGuest = db.prepare(`
        INSERT INTO customers (name, email, password_hash, plan, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const r = insertGuest.run('Pro Customer', 'pro.demo@sungroves.com', 'MOCK_HASH', targetPlan, now, now);
      guestCustomer = { id: r.lastInsertRowid, name: 'Pro Customer', email: 'pro.demo@sungroves.com', plan: targetPlan };
    } else {
      db.prepare('UPDATE customers SET plan = ?, updated_at = ? WHERE id = ?').run(targetPlan, now, guestCustomer.id);
      guestCustomer.plan = targetPlan;
    }

    const guestToken = jwt.sign(
      { id: guestCustomer.id, email: guestCustomer.email, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      mock: true,
      message: `[MOCK PAYMENT] Instant plan upgraded to "${targetPlan}". No real charge was made.`,
      customer: guestCustomer,
      user: guestCustomer,
      token: guestToken
    });
  } catch (err) {
    console.error('Mock checkout error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Mock checkout failed.' });
  }
}
