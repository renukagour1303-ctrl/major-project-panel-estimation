import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';
import { server } from '../server.js';

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

describe('Settings, Plans Config & Mock Payments Integration Suite', () => {
  let adminToken = '';
  let customerToken = '';
  let testCustomerId = null;

  before(() => {
    // 1. Ensure test admin exists
    let admin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    if (!admin) {
      const now = new Date().toISOString();
      const res = db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES ('test_admin_suite', 'admin_suite@sungroves.com', 'dummy_hash', 'Admin Suite', 'ADMIN', 1, ?, ?)
      `).run(now, now);
      admin = db.prepare('SELECT * FROM users WHERE id = ?').get(res.lastInsertRowid);
    }
    adminToken = jwt.sign({ id: admin.id, username: admin.username, email: admin.email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Ensure test customer exists on free plan
    const testEmail = `cust_plan_test_${Date.now()}@example.com`;
    const now = new Date().toISOString();
    const custRes = db.prepare(`
      INSERT INTO customers (name, email, password_hash, plan, created_at, updated_at)
      VALUES (?, ?, ?, 'free', ?, ?)
    `).run('Plan Test Customer', testEmail, 'dummy_hash', now, now);
    testCustomerId = custRes.lastInsertRowid;
    customerToken = jwt.sign({ id: testCustomerId, email: testEmail, role: 'customer' }, JWT_SECRET, { expiresIn: '1h' });
  });

  // ── TASK 1: Dynamic Site Settings ──────────────────────────────────────────
  test('GET /api/settings - Returns public company site settings', async () => {
    const res = await api('/api/settings');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.company_email, 'company_email should exist');
    assert.ok(res.data.company_phone, 'company_phone should exist');
    assert.ok(res.data.office_address, 'office_address should exist');
    assert.ok(res.data.business_hours, 'business_hours should exist');
  });

  test('PUT /api/settings - Rejects unauthenticated request', async () => {
    const res = await api('/api/settings', {
      method: 'PUT',
      body: { company_phone: '+91 99999 00000' }
    });
    assert.strictEqual(res.status, 401);
  });

  test('PUT /api/settings - Admin updates site settings in SQLite', async () => {
    const updatedPhone = '+91 91122 33445';
    const updatedEmail = 'info-updated@sungroves.com';
    const updatedAddress = 'MIDC Waluj, Chhatrapati Sambhajinagar, Maharashtra';
    const updatedHours = 'Mon - Sat: 8:00 AM - 7:00 PM';

    const res = await api('/api/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        company_phone: updatedPhone,
        company_email: updatedEmail,
        office_address: updatedAddress,
        business_hours: updatedHours
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.company_phone, updatedPhone);
    assert.strictEqual(res.data.company_email, updatedEmail);
    assert.strictEqual(res.data.office_address, updatedAddress);
    assert.strictEqual(res.data.business_hours, updatedHours);

    // Verify GET reflects the changes
    const getRes = await api('/api/settings');
    assert.strictEqual(getRes.data.company_phone, updatedPhone);
    assert.strictEqual(getRes.data.office_address, updatedAddress);
  });

  // ── TASK 2 & 3: Plan Configurator & Feature Locking ────────────────────────
  test('GET /api/plans/config - Returns plan configuration with allow_pdf_export', async () => {
    const res = await api('/api/plans/config');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.plans));
    const freePlan = res.data.plans.find(p => p.plan_name === 'free');
    const proPlan = res.data.plans.find(p => p.plan_name === 'pro');
    assert.ok(freePlan, 'Free plan should exist');
    assert.ok(proPlan, 'Pro plan should exist');
    assert.strictEqual(typeof freePlan.allow_pdf_export, 'boolean');
    assert.strictEqual(typeof proPlan.allow_pdf_export, 'boolean');
  });

  test('PUT /api/plans/config - Admin can toggle allow_pdf_export and update prices', async () => {
    const res = await api('/api/plans/config', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        planName: 'pro',
        price: '₹5,499 / year',
        allowPdfExport: true
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.plan.plan_name, 'pro');
    assert.strictEqual(res.data.plan.price, '₹5,499 / year');
    assert.strictEqual(res.data.plan.allow_pdf_export, true);
  });

  // ── TASK 3: Mock Checkout Flow ─────────────────────────────────────────────
  test('POST /api/payments/mock-checkout - Instantly upgrades customer to pro plan', async () => {
    // Verify initially free
    const initialCustomer = db.prepare('SELECT plan FROM customers WHERE id = ?').get(testCustomerId);
    assert.strictEqual(initialCustomer.plan, 'free');

    const res = await api('/api/payments/mock-checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { plan: 'pro' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.mock, true);
    assert.strictEqual(res.data.customer.plan, 'pro');

    // Verify in SQLite database
    const dbCustomer = db.prepare('SELECT plan FROM customers WHERE id = ?').get(testCustomerId);
    assert.strictEqual(dbCustomer.plan, 'pro');
  });

  test('POST /api/payments/mock-checkout - Guest upgrade creates/returns pro session', async () => {
    const res = await api('/api/payments/mock-checkout', {
      method: 'POST',
      body: { plan: 'pro' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.customer.plan, 'pro');
    assert.ok(res.data.token, 'Should return active token for immediate session use');
  });

  test('PUT /api/plans/config - Admin can customize tier rules with Pro price and Free feature locks', async () => {
    const res = await api('/api/plans/config', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        pro_price: '₹5,999 / year',
        lock_pdf_export: true,
        lock_advanced_financials: true,
        lock_roof_tracing: true
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.plans));
    const freePlan = res.data.plans.find(p => p.plan_name === 'free');
    const proPlan = res.data.plans.find(p => p.plan_name === 'pro');
    assert.strictEqual(proPlan.price, '₹5,999 / year');
    assert.strictEqual(freePlan.lock_pdf_export, true);
    assert.strictEqual(freePlan.lock_advanced_financials, true);
    assert.strictEqual(freePlan.lock_roof_tracing, true);
  });

  // ── TASK 4: Admin User Management & Role Delegation ────────────────────────
  test('POST /api/admin/users - Admin can create new staff or admin accounts', async () => {
    const testUsername = `staff_delegate_${Date.now()}`;
    const testEmail = `${testUsername}@sungroves.com`;

    const res = await api('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        username: testUsername,
        email: testEmail,
        fullName: 'Delegated Consultant',
        password: 'Password@123',
        role: 'staff'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.username, testUsername);
    assert.strictEqual(res.data.user.role.toLowerCase(), 'staff');

    // Test Deletion of created staff
    const deleteRes = await api(`/api/admin/users/${res.data.user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.data.success, true);
  });

  // ── TASK 5: Dummy Leads Cleanup ────────────────────────────────────────────
  test('DELETE /api/admin/leads/dummy - Admin can clear sample & test inquiries', async () => {
    // Insert a dummy test lead
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO leads (customer_name, phone, email, message, status, source, created_at, updated_at)
      VALUES ('Test Dummy Lead', '9900000000', 'test_dummy@example.com', 'Dummy test lead message', 'New', 'test', ?, ?)
    `).run(now, now);

    const res = await api('/api/admin/leads/dummy', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(typeof res.data.clearedCount === 'number');
  });

  // ── TASK 6: Dynamic Admin Pricing Management ──────────────────────────────
  test('GET /api/admin/settings - Retrieves active site settings including pro_plan_price', async () => {
    const res = await api('/api/admin/settings');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(typeof res.data.pro_plan_price === 'number', 'pro_plan_price should be numeric');
    assert.ok(res.data.company_email, 'company_email should exist');
  });

  test('POST /api/admin/settings - Requires admin auth token', async () => {
    const res = await api('/api/admin/settings', {
      method: 'POST',
      body: { pro_plan_price: 999 }
    });
    assert.strictEqual(res.status, 401);
  });

  test('POST /api/admin/settings - Updates pro_plan_price in SQLite', async () => {
    const testPrice = 999;
    const res = await api('/api/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pro_plan_price: testPrice }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.pro_plan_price, testPrice);

    // Verify GET /api/admin/settings reflects updated price
    const getRes = await api('/api/admin/settings');
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.pro_plan_price, testPrice);

    // Verify SQLite settings table record directly
    const row = db.prepare("SELECT value FROM settings WHERE key = 'pro_plan_price'").get();
    assert.ok(row, 'settings row must exist');
    assert.strictEqual(Number(row.value), testPrice);

    // Reset back to 499 for other tests
    await api('/api/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pro_plan_price: 499 }
    });
  });

  after(() => {
    try {
      server.close();
    } catch {}
  });
});

