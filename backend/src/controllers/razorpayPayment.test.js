import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET, authenticatePaymentUser } from '../middleware/authMiddleware.js';
import {
  parsePriceToPaise,
  createPaymentOrder,
  verifyPaymentSignature,
  mockCheckout,
  setRazorpayClientForTesting
} from './paymentsController.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

describe('Razorpay Secure Payment & Test Mode Integration Suite', () => {
  let customerUser = null;
  let customerToken = '';
  let otherCustomerUser = null;
  let otherCustomerToken = '';
  let staffUser = null;
  let staffToken = '';

  const TEST_SECRET = 'test_secret_for_unit_tests_123456';
  const originalEnv = { ...process.env };

  before(() => {
    const now = new Date().toISOString();

    // 1. Create primary test customer
    const email1 = `rzp_cust1_${Date.now()}@example.com`;
    const r1 = db.prepare(`
      INSERT INTO customers (name, email, password_hash, plan, created_at, updated_at)
      VALUES (?, ?, 'mock_hash', 'free', ?, ?)
    `).run('Razorpay Customer 1', email1, now, now);
    customerUser = { id: r1.lastInsertRowid, email: email1, name: 'Razorpay Customer 1' };
    customerToken = jwt.sign({ id: customerUser.id, email: email1, role: 'customer' }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Create secondary test customer (for ownership tests)
    const email2 = `rzp_cust2_${Date.now()}@example.com`;
    const r2 = db.prepare(`
      INSERT INTO customers (name, email, password_hash, plan, created_at, updated_at)
      VALUES (?, ?, 'mock_hash', 'free', ?, ?)
    `).run('Razorpay Customer 2', email2, now, now);
    otherCustomerUser = { id: r2.lastInsertRowid, email: email2, name: 'Razorpay Customer 2' };
    otherCustomerToken = jwt.sign({ id: otherCustomerUser.id, email: email2, role: 'customer' }, JWT_SECRET, { expiresIn: '1h' });

    // 3. Create staff/admin user
    const emailStaff = `rzp_staff_${Date.now()}@sungroves.com`;
    const r3 = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, plan, created_at, updated_at)
      VALUES (?, ?, 'mock_hash', 'Staff Tester', 'STAFF', 1, 'free', ?, ?)
    `).run(`staff_${Date.now()}`, emailStaff, now, now);
    staffUser = { id: r3.lastInsertRowid, email: emailStaff, full_name: 'Staff Tester' };
    staffToken = jwt.sign({ id: staffUser.id, email: emailStaff, role: 'STAFF' }, JWT_SECRET, { expiresIn: '1h' });
  });

  after(() => {
    process.env = { ...originalEnv };
    setRazorpayClientForTesting(null);
  });

  // ── 1. Pro Price and Paise Calculation Tests ───────────────────────────────
  describe('Price Extraction & Paise Conversion', () => {
    test('Converts standard ₹499 to 49900 paise', () => {
      assert.strictEqual(parsePriceToPaise('₹499'), 49900);
      assert.strictEqual(parsePriceToPaise('499'), 49900);
      assert.strictEqual(parsePriceToPaise(499), 49900);
    });

    test('Converts formatted strings like "₹4,999 / year" or "Rs. 4,999"', () => {
      assert.strictEqual(parsePriceToPaise('₹4,999 / year'), 499900);
      assert.strictEqual(parsePriceToPaise('Rs.4,999 / year'), 499900);
      assert.strictEqual(parsePriceToPaise('₹999.50'), 99950);
    });

    test('Falls back to default paise for unparseable input', () => {
      assert.strictEqual(parsePriceToPaise(null, 499), 49900);
      assert.strictEqual(parsePriceToPaise('', 499), 49900);
      assert.strictEqual(parsePriceToPaise('Free', 499), 49900);
    });
  });

  // ── 2. Authentication Middleware for Payments ──────────────────────────────
  describe('Payment User Authentication Middleware', () => {
    test('Rejects request without authorization header', () => {
      const req = { headers: {} };
      const res = createMockRes();
      let nextCalled = false;
      authenticatePaymentUser(req, res, () => { nextCalled = true; });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(nextCalled, false);
    });

    test('Authenticates customer token and populates req.user', () => {
      const req = { headers: { authorization: `Bearer ${customerToken}` } };
      const res = createMockRes();
      let nextCalled = false;
      authenticatePaymentUser(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true);
      assert.ok(req.user);
      assert.strictEqual(req.user.id, customerUser.id);
      assert.strictEqual(req.user.accountType, 'customer');
    });

    test('Authenticates staff/admin user token and populates req.user', () => {
      const req = { headers: { authorization: `Bearer ${staffToken}` } };
      const res = createMockRes();
      let nextCalled = false;
      authenticatePaymentUser(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true);
      assert.ok(req.user);
      assert.strictEqual(req.user.id, staffUser.id);
      assert.strictEqual(req.user.accountType, 'user');
    });
  });

  // ── 3. Configuration & Production Safeguards ──────────────────────────────
  describe('Configuration & Production Safeguards', () => {
    test('createPaymentOrder fails gracefully when ENABLE_RAZORPAY is false', async () => {
      process.env.ENABLE_RAZORPAY = 'false';
      setRazorpayClientForTesting(null);

      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' }
      };
      const res = createMockRes();
      await createPaymentOrder(req, res);

      assert.strictEqual(res.statusCode, 503);
      assert.ok(res.body.message.includes('disabled'));
    });

    test('createPaymentOrder fails gracefully when credentials are placeholder or missing', async () => {
      process.env.ENABLE_RAZORPAY = 'true';
      process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
      process.env.RAZORPAY_KEY_SECRET = 'placeholder_secret';
      setRazorpayClientForTesting(null);

      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' }
      };
      const res = createMockRes();
      await createPaymentOrder(req, res);

      assert.strictEqual(res.statusCode, 503);
      assert.ok(res.body.message.includes('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET'));
    });

    test('mockCheckout is strictly blocked in production mode', () => {
      const prevNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = {
        headers: { authorization: `Bearer ${customerToken}` },
        body: { plan: 'pro' }
      };
      const res = createMockRes();
      mockCheckout(req, res);

      process.env.NODE_ENV = prevNodeEnv;

      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('disabled in production'));
    });

    test('createPaymentOrder rejects unauthenticated user object', async () => {
      const req = { user: null };
      const res = createMockRes();
      await createPaymentOrder(req, res);

      assert.strictEqual(res.statusCode, 401);
    });
  });

  // ── 4. Order Creation & SQLite Persistence ────────────────────────────────
  describe('Order Creation & SQLite Persistence', () => {
    test('Successfully creates order and persists in SQLite', async () => {
      process.env.ENABLE_RAZORPAY = 'true';
      process.env.RAZORPAY_KEY_ID = 'rzp_test_unit_key';
      process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;

      const mockOrderId = `order_mock_${Date.now()}`;
      setRazorpayClientForTesting({
        orders: {
          create: async (opts) => ({
            id: mockOrderId,
            amount: opts.amount,
            currency: 'INR',
            status: 'created'
          })
        }
      });

      // Set pro price to ₹499 in plan_configs and clear or sync settings to verify exact ₹499 -> 49900 paise
      db.prepare("DELETE FROM settings WHERE key = 'pro_plan_price'").run();
      db.prepare("UPDATE plan_configs SET price = '₹499' WHERE plan_name = 'pro'").run();

      const req = {
        user: {
          id: customerUser.id,
          email: customerUser.email,
          accountType: 'customer'
        }
      };
      const res = createMockRes();
      await createPaymentOrder(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.order_id, mockOrderId);
      assert.strictEqual(res.body.amount, 49900);
      assert.strictEqual(res.body.currency, 'INR');
      assert.strictEqual(res.body.key_id, 'rzp_test_unit_key');

      // Verify SQLite record
      const dbOrder = db.prepare('SELECT * FROM payment_orders WHERE order_id = ?').get(mockOrderId);
      assert.ok(dbOrder, 'Order should be saved in payment_orders table');
      assert.strictEqual(dbOrder.amount, 49900);
      assert.strictEqual(dbOrder.status, 'created');
      assert.strictEqual(dbOrder.customer_id, customerUser.id);
      assert.strictEqual(dbOrder.account_type, 'customer');
    });

    test('Dynamically reads updated pro_plan_price from SQLite settings table (e.g. ₹799 -> 79900 paise)', async () => {
      process.env.ENABLE_RAZORPAY = 'true';
      process.env.RAZORPAY_KEY_ID = 'rzp_test_unit_key';
      process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;

      // Update pro_plan_price to 799 in settings table
      db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('pro_plan_price', '799', ?) ON CONFLICT(key) DO UPDATE SET value = '799'").run(new Date().toISOString());

      let capturedAmount = null;
      const customOrderId = `order_custom_${Date.now()}`;
      setRazorpayClientForTesting({
        orders: {
          create: async (opts) => {
            capturedAmount = opts.amount;
            return {
              id: customOrderId,
              amount: opts.amount,
              currency: 'INR',
              status: 'created'
            };
          }
        }
      });

      const req = {
        user: {
          id: customerUser.id,
          email: customerUser.email,
          accountType: 'customer'
        }
      };
      const res = createMockRes();
      await createPaymentOrder(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.amount, 79900);
      assert.strictEqual(capturedAmount, 79900, 'razorpay.orders.create must receive dynamicAmountPaise (79900)');

      // Reset back to 499
      db.prepare("UPDATE settings SET value = '499' WHERE key = 'pro_plan_price'").run();
    });
  });

  // ── 5. Signature & Payment Verification ───────────────────────────────────
  describe('Signature & Payment Verification', () => {
    let testOrderId = '';
    const testAmount = 49900;

    beforeEach(() => {
      process.env.ENABLE_RAZORPAY = 'true';
      process.env.RAZORPAY_KEY_ID = 'rzp_test_unit_key';
      process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;

      testOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO payment_orders (
          order_id, customer_id, account_type, user_email, amount, currency, receipt, plan, status, created_at, updated_at
        ) VALUES (?, ?, 'customer', ?, ?, 'INR', 'rcpt_123', 'pro', 'created', ?, ?)
      `).run(testOrderId, customerUser.id, customerUser.email, testAmount, now, now);
    });

    test('Rejects missing verification fields', async () => {
      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' },
        body: { razorpay_order_id: testOrderId }
      };
      const res = createMockRes();
      await verifyPaymentSignature(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('Missing required payment verification fields'));
    });

    test('Rejects payment order belonging to another customer (Ownership Safeguard)', async () => {
      const paymentId = `pay_mock_${Date.now()}`;
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(`${testOrderId}|${paymentId}`).digest('hex');

      const req = {
        user: { id: otherCustomerUser.id, email: otherCustomerUser.email, accountType: 'customer' }, // Other customer
        body: {
          razorpay_order_id: testOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        }
      };
      const res = createMockRes();
      await verifyPaymentSignature(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('does not belong'));
    });

    test('Rejects invalid or tampered HMAC signature (timing-safe check)', async () => {
      const paymentId = `pay_mock_${Date.now()}`;
      const wrongSignature = crypto.createHmac('sha256', 'wrong_secret').update(`${testOrderId}|${paymentId}`).digest('hex');

      setRazorpayClientForTesting({
        payments: {
          fetch: async () => ({ id: paymentId, order_id: testOrderId, amount: testAmount, currency: 'INR', status: 'captured' })
        }
      });

      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' },
        body: {
          razorpay_order_id: testOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: wrongSignature
        }
      };
      const res = createMockRes();
      await verifyPaymentSignature(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('verification failed'));
    });

    test('Handles authorized-but-not-captured payments as pending rather than successful', async () => {
      const paymentId = `pay_mock_${Date.now()}`;
      const validSignature = crypto.createHmac('sha256', TEST_SECRET).update(`${testOrderId}|${paymentId}`).digest('hex');

      setRazorpayClientForTesting({
        payments: {
          fetch: async () => ({
            id: paymentId,
            order_id: testOrderId,
            amount: testAmount,
            currency: 'INR',
            status: 'authorized' // Authorized, NOT captured
          })
        }
      });

      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' },
        body: {
          razorpay_order_id: testOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature
        }
      };
      const res = createMockRes();
      await verifyPaymentSignature(req, res);

      assert.strictEqual(res.statusCode, 202);
      assert.strictEqual(res.body.pending, true);

      // Verify that customer plan has NOT been changed to pro
      const c = db.prepare('SELECT plan FROM customers WHERE id = ?').get(customerUser.id);
      assert.strictEqual(c.plan, 'free');
    });

    test('Rejects amount or currency mismatch from Razorpay API', async () => {
      const paymentId = `pay_mock_${Date.now()}`;
      const validSignature = crypto.createHmac('sha256', TEST_SECRET).update(`${testOrderId}|${paymentId}`).digest('hex');

      setRazorpayClientForTesting({
        payments: {
          fetch: async () => ({
            id: paymentId,
            order_id: testOrderId,
            amount: 10000, // Wrong amount
            currency: 'INR',
            status: 'captured'
          })
        }
      });

      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' },
        body: {
          razorpay_order_id: testOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature
        }
      };
      const res = createMockRes();
      await verifyPaymentSignature(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('Payment amount mismatch'));
    });

    test('Successfully verifies captured payment and grants Pro plan transactionally', async () => {
      const paymentId = `pay_mock_${Date.now()}`;
      const validSignature = crypto.createHmac('sha256', TEST_SECRET).update(`${testOrderId}|${paymentId}`).digest('hex');

      setRazorpayClientForTesting({
        payments: {
          fetch: async () => ({
            id: paymentId,
            order_id: testOrderId,
            amount: testAmount,
            currency: 'INR',
            status: 'captured'
          })
        }
      });

      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' },
        body: {
          razorpay_order_id: testOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature
        }
      };
      const res = createMockRes();
      await verifyPaymentSignature(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.plan, 'pro');

      // Verify customer plan in SQLite
      const c = db.prepare('SELECT plan FROM customers WHERE id = ?').get(customerUser.id);
      assert.strictEqual(c.plan, 'pro');

      // Verify order status in SQLite
      const o = db.prepare('SELECT status, razorpay_payment_id FROM payment_orders WHERE order_id = ?').get(testOrderId);
      assert.strictEqual(o.status, 'paid');
      assert.strictEqual(o.razorpay_payment_id, paymentId);
    });

    test('Verification is idempotent: repeated verification returns success without error', async () => {
      const paymentId = `pay_mock_${Date.now()}`;
      const validSignature = crypto.createHmac('sha256', TEST_SECRET).update(`${testOrderId}|${paymentId}`).digest('hex');

      // Mark order as already paid
      db.prepare("UPDATE payment_orders SET status = 'paid' WHERE order_id = ?").run(testOrderId);

      const req = {
        user: { id: customerUser.id, email: customerUser.email, accountType: 'customer' },
        body: {
          razorpay_order_id: testOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature
        }
      };
      const res = createMockRes();
      await verifyPaymentSignature(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.plan, 'pro');
      assert.strictEqual(res.body.alreadyVerified, true);
    });
  });
});
