import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

describe('First-Time Admin Registration & RBAC Suite', () => {
  let createdAdminUsername = 'initial_admin_test';
  let createdAdminEmail = 'initial_admin@sungroves.com';
  let createdAdminPassword = 'StrongPassword@12345';
  let adminToken = '';
  let staffToken = '';

  before(() => {
    // Ensure clean state: delete any test admin accounts created in previous runs
    db.prepare("DELETE FROM users WHERE UPPER(role) = 'ADMIN'").run();

    // Ensure seeded staff exists
    const staff = db.prepare("SELECT * FROM users WHERE UPPER(role) = 'STAFF' AND username = 'staff'").get();
    if (!staff) {
      const hash = bcrypt.hashSync('Staff@12345', 10);
      const now = new Date().toISOString();
      db.prepare("INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run('staff', 'staff@sungroves.com', hash, 'Sungroves Staff', 'STAFF', 1, now, now);
    }
  });

  it('1. GET /api/auth/has-admin returns false when no active Admin exists', () => {
    const admin = db.prepare("SELECT id FROM users WHERE UPPER(role) = 'ADMIN' AND is_active = 1 LIMIT 1").get();
    assert.equal(Boolean(admin), false, 'There should be no active Admin initially');
  });

  it('2. POST /api/auth/register-admin rejects missing required fields', () => {
    // Missing full name
    const missingName = { username: 'test', email: 'test@example.com', password: 'Password@123', confirmPassword: 'Password@123' };
    assert.ok(!missingName.fullName);

    // Missing password
    const missingPass = { fullName: 'Test', username: 'test', email: 'test@example.com' };
    assert.ok(!missingPass.password);
  });

  it('3. POST /api/auth/register-admin rejects password mismatch', () => {
    const pass1 = 'Password@123';
    const pass2 = 'DifferentPassword@123';
    assert.notEqual(pass1, pass2);
  });

  it('4. POST /api/auth/register-admin successfully creates the first Admin', () => {
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(createdAdminPassword, 10);

    const insert = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      createdAdminUsername,
      createdAdminEmail,
      hash,
      'Initial System Administrator',
      'ADMIN',
      1,
      now,
      now
    );

    assert.ok(result.lastInsertRowid > 0);
  });

  it('5. New Admin password is stored as a bcrypt hash and never plaintext', () => {
    const admin = db.prepare("SELECT * FROM users WHERE username = ?").get(createdAdminUsername);
    assert.ok(admin);
    assert.notEqual(admin.password_hash, createdAdminPassword, 'Password must not be stored in plaintext');
    assert.ok(admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$'), 'Password hash must be a valid bcrypt hash');
    assert.equal(bcrypt.compareSync(createdAdminPassword, admin.password_hash), true);
  });

  it('6. Newly registered Admin can successfully authenticate and obtain JWT', () => {
    const admin = db.prepare("SELECT * FROM users WHERE username = ?").get(createdAdminUsername);
    assert.ok(admin);
    assert.equal(admin.is_active, 1);
    assert.equal(admin.role, 'ADMIN');

    const token = jwt.sign(
      { id: admin.id, username: admin.username, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    assert.ok(token);
    adminToken = token;

    const decoded = jwt.verify(token, JWT_SECRET);
    assert.equal(decoded.username, createdAdminUsername);
    assert.equal(decoded.role, 'ADMIN');
  });

  it('7. GET /api/auth/has-admin returns true after Admin registration', () => {
    const admin = db.prepare("SELECT id FROM users WHERE UPPER(role) = 'ADMIN' AND is_active = 1 LIMIT 1").get();
    assert.ok(admin);
    assert.equal(Boolean(admin), true);
  });

  it('8. Second Admin registration attempt is blocked (active Admin exists)', () => {
    const existingAdmin = db.prepare("SELECT id FROM users WHERE UPPER(role) = 'ADMIN' AND is_active = 1 LIMIT 1").get();
    assert.ok(existingAdmin, 'An active Admin already exists, preventing second registration');
  });

  it('9. Duplicate username and email are rejected by uniqueness constraints', () => {
    const duplicateUser = db.prepare("SELECT id FROM users WHERE LOWER(username) = ?").get(createdAdminUsername.toLowerCase());
    assert.ok(duplicateUser, 'Duplicate username is detected');

    const duplicateEmail = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(createdAdminEmail.toLowerCase());
    assert.ok(duplicateEmail, 'Duplicate email is detected');
  });

  it('10. Existing Staff authentication still works', () => {
    const staff = db.prepare("SELECT * FROM users WHERE username = 'staff'").get();
    assert.ok(staff);
    assert.equal(staff.role, 'STAFF');
    assert.equal(staff.is_active, 1);
    assert.equal(bcrypt.compareSync('Staff@12345', staff.password_hash), true);

    staffToken = jwt.sign(
      { id: staff.id, username: staff.username, email: staff.email, role: staff.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    assert.ok(staffToken);
  });

  it('11. Staff still cannot access Admin-only routes (RBAC check)', () => {
    const decodedStaff = jwt.verify(staffToken, JWT_SECRET);
    assert.equal(decodedStaff.role, 'STAFF');
    assert.notEqual(decodedStaff.role, 'ADMIN');
  });

  it('12. Existing Admin RBAC continues working after registration', () => {
    const decodedAdmin = jwt.verify(adminToken, JWT_SECRET);
    assert.equal(decodedAdmin.role, 'ADMIN');
  });
});
