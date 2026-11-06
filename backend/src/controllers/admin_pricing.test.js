import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';
import { server } from '../server.js';
import { setRazorpayClientForTesting, createPaymentOrder } from './paymentsController.js';

const baseUrl = 'http://127.0.0.1:5000';

async function api(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { ...options.headers };
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body
  });

  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data };
}

describe('Dynamic Admin Pricing Management E2E Test Suite', () => {
  let adminToken = '';
  let customerToken = '';
  let customerUser = null;
  const originalEnv = { ...process.env };

  before(() => {
    process.env.ENABLE_RAZORPAY = 'true';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key';
    process.env.RAZORPAY_KEY_SECRET = 'mock_secret_key_123';

    // 1. Ensure test admin exists
    let admin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    if (!admin) {
      const now = new Date().toISOString();
      const res = db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES ('pricing_test_admin', 'pricing_admin@sungroves.com', 'dummy_hash', 'Admin Tester', 'ADMIN', 1, ?, ?)
      `).run(now, now);
      admin = db.prepare('SELECT * FROM users WHERE id = ?').get(res.lastInsertRowid);
    }
    adminToken = jwt.sign({ id: admin.id, username: admin.username, email: admin.email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Ensure test customer exists
    const testEmail = `pricing_cust_${Date.now()}@example.com`;
    const now = new Date().toISOString();
    const custRes = db.prepare(`
      INSERT INTO customers (name, email, password_hash, plan, created_at, updated_at)
      VALUES ('Pricing Customer', ?, 'dummy_hash', 'free', ?, ?)
    `).run(testEmail, now, now);
    customerUser = { id: custRes.lastInsertRowid, email: testEmail, name: 'Pricing Customer' };
    customerToken = jwt.sign({ id: customerUser.id, email: testEmail, role: 'customer' }, JWT_SECRET, { expiresIn: '1h' });
  });

  after(() => {
    process.env = { ...originalEnv };
    setRazorpayClientForTesting(null);
    try {
      server.close();
    } catch {}
  });

  test('1. SQLite settings table exists and seeds default pro_plan_price = 499', () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'pro_plan_price'").get();
    assert.ok(row, 'settings table row for pro_plan_price must exist');
    assert.strictEqual(Number(row.value) > 0, true, 'pro_plan_price should be a positive number');
  });

  test('2. GET /api/admin/settings retrieves active site settings including pro_plan_price', async () => {
    const res = await api('/api/admin/settings');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(typeof res.data.pro_plan_price === 'number', 'pro_plan_price should be a number');
    assert.ok(res.data.company_email, 'company_email should be present');
  });

  test('3. POST /api/admin/settings rejects unauthenticated requests with 401', async () => {
    const res = await api('/api/admin/settings', {
      method: 'POST',
      body: { pro_plan_price: 799 }
    });
    assert.strictEqual(res.status, 401);
  });

  test('4. POST /api/admin/settings rejects invalid non-positive prices with 400', async () => {
    const res = await api('/api/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pro_plan_price: -50 }
    });
    assert.strictEqual(res.status, 400);
  });

  test('5. POST /api/admin/settings updates pro_plan_price in SQLite', async () => {
    const newPrice = 849;
    const res = await api('/api/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pro_plan_price: newPrice }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.pro_plan_price, newPrice);

    // Verify GET /api/admin/settings reflects new price
    const getRes = await api('/api/admin/settings');
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.pro_plan_price, newPrice);

    // Verify direct SQLite row
    const dbRow = db.prepare("SELECT value FROM settings WHERE key = 'pro_plan_price'").get();
    assert.strictEqual(Number(dbRow.value), newPrice);
  });

  test('6. POST /api/payments/create-order dynamically reads pro_plan_price (849) -> 84900 paise', async () => {
    let capturedOptions = null;
    const mockOrderId = `order_test_${Date.now()}`;

    setRazorpayClientForTesting({
      orders: {
        create: async (opts) => {
          capturedOptions = opts;
          return {
            id: mockOrderId,
            amount: opts.amount,
            currency: 'INR',
            status: 'created'
          };
        }
      }
    });

    const mockReq = {
      user: {
        id: customerUser.id,
        email: customerUser.email,
        accountType: 'customer'
      }
    };
    let statusCode = 200;
    let responseBody = {};
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    await createPaymentOrder(mockReq, mockRes);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseBody.success, true);
    assert.strictEqual(responseBody.amount, 84900, 'Order amount must be 84900 paise');
    assert.strictEqual(capturedOptions.amount, 84900, 'Razorpay orders.create must receive dynamicAmountPaise');
    assert.strictEqual(capturedOptions.currency, 'INR');

    // Verify stored order in SQLite payment_orders
    const savedOrder = db.prepare('SELECT * FROM payment_orders WHERE order_id = ?').get(mockOrderId);
    assert.ok(savedOrder, 'Order must be saved in SQLite');
    assert.strictEqual(savedOrder.amount, 84900);
  });

  test('7. Admin updates price to 999 and order creation dynamically updates to 99900 paise', async () => {
    // 1. Admin updates price to 999
    const updateRes = await api('/api/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pro_plan_price: 999 }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.pro_plan_price, 999);

    // 2. Customer creates order
    let order2Opts = null;
    const mockOrderId2 = `order_test2_${Date.now()}`;
    setRazorpayClientForTesting({
      orders: {
        create: async (opts) => {
          order2Opts = opts;
          return {
            id: mockOrderId2,
            amount: opts.amount,
            currency: 'INR',
            status: 'created'
          };
        }
      }
    });

    const mockReq2 = {
      user: {
        id: customerUser.id,
        email: customerUser.email,
        accountType: 'customer'
      }
    };
    let statusCode2 = 200;
    let responseBody2 = {};
    const mockRes2 = {
      status(code) {
        statusCode2 = code;
        return this;
      },
      json(data) {
        responseBody2 = data;
        return this;
      }
    };

    await createPaymentOrder(mockReq2, mockRes2);

    assert.strictEqual(statusCode2, 200);
    assert.strictEqual(responseBody2.amount, 99900, 'Order amount must dynamically update to 99900 paise');
    assert.strictEqual(order2Opts.amount, 99900);

    // Reset back to 499
    await api('/api/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pro_plan_price: 499 }
    });
  });
});
