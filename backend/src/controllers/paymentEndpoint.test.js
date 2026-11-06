import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import express from 'express';
import db from '../database/db.js';
import paymentRouter, { inrToPaise, setRazorpayClientForTesting } from '../routes/payment.js';

describe('Payment Router Tests (POST /api/payment/create-order & verify-payment)', () => {
  let app;
  let server;
  let baseUrl;
  const TEST_KEY = 'rzp_test_TuRBiItNnGfyot';
  const TEST_SECRET = 'P0GNhtfFhW0jzJ09h44x1Val';
  const prevEnv = { ...process.env };

  before(async () => {
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;

    app = express();
    app.use(express.json());
    app.use('/api/payment', paymentRouter);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/payment`;
        resolve();
      });
    });
  });

  after(async () => {
    process.env = { ...prevEnv };
    setRazorpayClientForTesting(null);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('inrToPaise converts INR amounts accurately', () => {
    assert.strictEqual(inrToPaise(499), 49900);
    assert.strictEqual(inrToPaise('499'), 49900);
    assert.strictEqual(inrToPaise('₹4,999'), 499900);
    assert.strictEqual(inrToPaise(999.50), 99950);
  });

  test('POST /api/payment/create-order accepts amount and returns order_id, amount, and currency', async () => {
    const mockOrderId = `order_test_${Date.now()}`;
    setRazorpayClientForTesting({
      orders: {
        create: async (opts) => ({
          id: mockOrderId,
          amount: opts.amount,
          currency: opts.currency || 'INR',
          status: 'created'
        })
      }
    });

    const res = await fetch(`${baseUrl}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 499 })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.order_id, mockOrderId);
    assert.strictEqual(data.amount, 49900);
    assert.strictEqual(data.currency, 'INR');

    // Verify SQLite persistence
    const orderRow = db.prepare('SELECT * FROM payment_orders WHERE order_id = ?').get(mockOrderId);
    assert.ok(orderRow);
    assert.strictEqual(orderRow.amount, 49900);
    assert.strictEqual(orderRow.status, 'created');
  });

  test('POST /api/payment/verify-payment validates HMAC SHA256 and updates SQLite payment status', async () => {
    const orderId = `order_verify_${Date.now()}`;
    const paymentId = `pay_${Date.now()}`;
    const now = new Date().toISOString();

    // Insert order into SQLite
    db.prepare(`
      INSERT INTO payment_orders (order_id, amount, currency, receipt, plan, status, created_at, updated_at)
      VALUES (?, 49900, 'INR', 'rcpt_1', 'pro', 'created', ?, ?)
    `).run(orderId, now, now);

    // Compute valid HMAC SHA256
    const signature = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const res = await fetch(`${baseUrl}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.order_id, orderId);

    // Verify SQLite update
    const updatedOrder = db.prepare('SELECT * FROM payment_orders WHERE order_id = ?').get(orderId);
    assert.strictEqual(updatedOrder.status, 'paid');
    assert.strictEqual(updatedOrder.razorpay_payment_id, paymentId);
    assert.strictEqual(updatedOrder.razorpay_signature, signature);
  });

  test('POST /api/payment/verify-payment rejects tampered signature', async () => {
    const res = await fetch(`${baseUrl}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_tampered_signature_hex'
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  test('POST /api/payment/verify-payment rejects missing fields', async () => {
    const res = await fetch(`${baseUrl}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: 'order_123'
      })
    });

    assert.strictEqual(res.status, 400);
  });
});
