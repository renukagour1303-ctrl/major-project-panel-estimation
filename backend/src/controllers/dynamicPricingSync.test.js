import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import db from '../database/db.js';
import { getPublicPricing, updateSiteSettings } from './settingsController.js';
import { createPaymentOrder, setRazorpayClientForTesting } from './paymentsController.js';

describe('Dynamic Pricing Sync Suite (Admin Portal -> Public Calculator -> Razorpay)', () => {
  before(() => {
    // Ensure settings table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  });

  it('1. Returns default 499 if no pro_plan_price is set', () => {
    db.prepare("DELETE FROM settings WHERE key = 'pro_plan_price'").run();

    let statusCode = null;
    let jsonResult = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      }
    };

    getPublicPricing({}, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.proPrice, 499);
  });

  it('2. Admin updates price to 799; public pricing endpoint returns 799', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('pro_plan_price', '799', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(now);

    let statusCode = null;
    let jsonResult = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      }
    };

    getPublicPricing({}, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.proPrice, 799);
  });

  it('3. Admin updates price via updateSiteSettings; public pricing endpoint syncs immediately', () => {
    const req = {
      body: {
        pro_plan_price: 1299
      }
    };

    let updateStatusCode = null;
    let updateJson = null;
    const updateRes = {
      status(code) {
        updateStatusCode = code;
        return this;
      },
      json(data) {
        updateJson = data;
        return this;
      }
    };

    updateSiteSettings(req, updateRes);
    assert.strictEqual(updateStatusCode, 200);
    assert.strictEqual(updateJson.success, true);
    assert.strictEqual(updateJson.pro_plan_price, 1299);

    // Verify GET /api/settings/pricing
    let pricingStatusCode = null;
    let pricingJson = null;
    const pricingRes = {
      status(code) {
        pricingStatusCode = code;
        return this;
      },
      json(data) {
        pricingJson = data;
        return this;
      }
    };

    getPublicPricing({}, pricingRes);
    assert.strictEqual(pricingStatusCode, 200);
    assert.strictEqual(pricingJson.success, true);
    assert.strictEqual(pricingJson.proPrice, 1299);
  });

  it('4. Razorpay order dynamically charges updated price in paise (1299 -> 129900 paise)', async () => {
    let capturedOptions = null;
    const mockOrderId = `test_order_${Date.now()}`;

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
        id: 9999,
        email: 'customer@example.com',
        accountType: 'customer'
      }
    };

    let statusCode = null;
    let responseBody = null;
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
    assert.strictEqual(responseBody.amount, 129900);
    assert.strictEqual(capturedOptions.amount, 129900);
  });

  it('5. Reset price to 499 for clean state', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('pro_plan_price', '499', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(now);

    let statusCode = null;
    let jsonResult = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      }
    };

    getPublicPricing({}, res);
    assert.strictEqual(jsonResult.proPrice, 499);
  });
});

