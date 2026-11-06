import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import db from './database/db.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/authMiddleware.js';
import { server } from './server.js';

const baseUrl = 'http://127.0.0.1:5000';


// Helper for making json fetch requests
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

describe('Feature 1 & 2: Customer Registration, Login & Forgot Password', () => {
  const testEmail = `test_customer_${Date.now()}@example.com`;
  const initialPassword = 'Password123!';
  const updatedPassword = 'NewSecretPassword890!';
  let customerToken = '';
  let customerId = null;

  test('POST /api/customer/register - Validation checks', async () => {
    // Missing fields
    let res = await api('/api/customer/register', {
      method: 'POST',
      body: { name: 'Test' }
    });
    assert.strictEqual(res.status, 400);

    // Invalid email
    res = await api('/api/customer/register', {
      method: 'POST',
      body: { name: 'Test', email: 'invalid-email', password: 'password123' }
    });
    assert.strictEqual(res.status, 400);

    // Password < 8 characters
    res = await api('/api/customer/register', {
      method: 'POST',
      body: { name: 'Test', email: testEmail, password: 'short' }
    });
    assert.strictEqual(res.status, 400);
  });

  test('POST /api/customer/register - Successful registration', async () => {
    const res = await api('/api/customer/register', {
      method: 'POST',
      body: {
        name: 'Aarav Sharma',
        email: testEmail,
        password: initialPassword
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.message, 'Registration successful');

    // Duplicate registration should fail with 409 Conflict
    const dupRes = await api('/api/customer/register', {
      method: 'POST',
      body: {
        name: 'Aarav Sharma',
        email: testEmail,
        password: initialPassword
      }
    });
    assert.strictEqual(dupRes.status, 409);
  });

  test('POST /api/customer/login - Successful & unsuccessful logins', async () => {
    // Wrong password
    let res = await api('/api/customer/login', {
      method: 'POST',
      body: { email: testEmail, password: 'WrongPassword' }
    });
    assert.strictEqual(res.status, 401);

    // Correct credentials
    res = await api('/api/customer/login', {
      method: 'POST',
      body: { email: testEmail, password: initialPassword }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.token, 'Should return JWT token');
    assert.strictEqual(res.data.customer.email, testEmail);
    assert.strictEqual(res.data.customer.plan, 'free');
    assert.strictEqual(res.data.customer.password_hash, undefined, 'Never return password_hash');

    customerToken = res.data.token;
    customerId = res.data.customer.id;
  });

  test('GET /api/customer/me - Protected route', async () => {
    // Unauthenticated
    let res = await api('/api/customer/me');
    assert.strictEqual(res.status, 401);

    // Authenticated
    res = await api('/api/customer/me', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.id, customerId);
    assert.strictEqual(res.data.email, testEmail);
  });

  test('POST /api/customer/forgot-password & reset-password', async () => {
    // Request forgot password
    const forgotRes = await api('/api/customer/forgot-password', {
      method: 'POST',
      body: { email: testEmail }
    });
    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(forgotRes.data.message, 'If an account exists with that email, a reset link has been sent.');

    // Verify token was generated in database
    const customerInDb = db.prepare('SELECT reset_token_hash, reset_token_expires FROM customers WHERE id = ?').get(customerId);
    assert.ok(customerInDb.reset_token_hash, 'Reset token hash must be set');
    assert.ok(customerInDb.reset_token_expires, 'Reset token expires must be set');

    // Create a known raw token and hash it in DB to test reset-password
    const crypto = await import('crypto');
    const testRawToken = 'abc123def456testtoken789xyz000000';
    const testHash = crypto.createHash('sha256').update(testRawToken).digest('hex');
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare('UPDATE customers SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?').run(testHash, futureExpiry, customerId);

    // Invalid token reset attempt
    let resetRes = await api('/api/customer/reset-password', {
      method: 'POST',
      body: { token: 'invalid_token_here', newPassword: updatedPassword }
    });
    assert.strictEqual(resetRes.status, 400);

    // Valid reset
    resetRes = await api('/api/customer/reset-password', {
      method: 'POST',
      body: { token: testRawToken, newPassword: updatedPassword }
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.message, 'Password reset successful');

    // Token should now be cleared in DB
    const clearedCustomer = db.prepare('SELECT reset_token_hash, reset_token_expires, password_changed_at FROM customers WHERE id = ?').get(customerId);
    assert.strictEqual(clearedCustomer.reset_token_hash, null);
    assert.ok(clearedCustomer.password_changed_at, 'password_changed_at must be set');

    // Old JWT token should now be rejected by JWT invalidation middleware
    const meWithOldToken = await api('/api/customer/me', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(meWithOldToken.status, 401);
    assert.ok(meWithOldToken.data.message.includes('Session expired'));

    // Customer can now log in with the new password
    const newLoginRes = await api('/api/customer/login', {
      method: 'POST',
      body: { email: testEmail, password: updatedPassword }
    });
    assert.strictEqual(newLoginRes.status, 200);
    customerToken = newLoginRes.data.token;
  });
});

describe('Feature 3: Reviews with Images', () => {
  let customerToken = '';
  let adminToken = '';
  let createdReviewId = null;

  before(async () => {
    // Generate valid customer token
    const customerPayload = { id: 9999, name: 'Pooja Verma', email: 'pooja@example.com', role: 'customer' };
    customerToken = jwt.sign(customerPayload, JWT_SECRET, { expiresIn: '1h' });

    // Insert dummy customer in DB so middleware finds it
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO customers (id, name, email, password_hash, plan, created_at, updated_at)
      VALUES (9999, 'Pooja Verma', 'pooja@example.com', 'dummyhash', 'free', ?, ?)
    `).run(now, now);

    // Generate valid admin token
    // First ensure an admin exists in users table
    let adminUser = db.prepare("SELECT id, username, email FROM users WHERE role = 'ADMIN' AND is_active = 1 LIMIT 1").get();
    if (!adminUser) {
      db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES ('test_admin', 'test_admin@sungroves.com', 'hash', 'Test Administrator', 'ADMIN', 1, ?, ?)
      `).run(now, now);
      adminUser = db.prepare("SELECT id, username, email FROM users WHERE role = 'ADMIN' AND is_active = 1 LIMIT 1").get();
    }

    adminToken = jwt.sign({ id: adminUser.id, username: adminUser.username, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
  });

  test('POST /api/reviews - Validation', async () => {
    // Missing auth
    let res = await api('/api/reviews', { method: 'POST' });
    assert.strictEqual(res.status, 401);

    // Invalid rating (> 5)
    res = await api('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { rating: 6, comment: 'Great service' }
    });
    assert.strictEqual(res.status, 400);

    // Empty comment
    res = await api('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { rating: 5, comment: '   ' }
    });
    assert.strictEqual(res.status, 400);
  });

  test('POST /api/reviews - Successful creation', async () => {
    const res = await api('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { rating: 5, comment: 'Excellent solar installation and feasibility analysis!' }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.customer_name, 'Pooja Verma');
    assert.strictEqual(res.data.rating, 5);
    assert.strictEqual(res.data.comment, 'Excellent solar installation and feasibility analysis!');
    assert.ok(res.data.id);
    createdReviewId = res.data.id;
  });

  test('GET /api/reviews - Public paginated list', async () => {
    const res = await api('/api/reviews?page=1');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.reviews));
    assert.ok(res.data.reviews.length >= 1);
    assert.ok(res.data.totalCount >= 1);
    assert.strictEqual(res.data.page, 1);
  });

  test('DELETE /api/reviews/:id - Admin only deletion', async () => {
    // Non-admin token attempt
    let res = await api(`/api/reviews/${createdReviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.ok(res.status === 401 || res.status === 403, `Customer cannot delete review (got ${res.status})`);

    // Admin deletion
    res = await api(`/api/reviews/${createdReviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status !== 200) {
      console.error('Admin delete failed with status:', res.status, res.data);
    }
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.message, 'Review deleted');

    // Verify it is removed from database
    const checkDeleted = db.prepare('SELECT id FROM reviews WHERE id = ?').get(createdReviewId);
    assert.strictEqual(checkDeleted, undefined);
  });

  after(() => {
    try {
      server.close();
    } catch {}
  });
});
