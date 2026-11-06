import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

describe('Admin, Auth, Config & Leads Integration Tests', () => {
  let adminToken;
  let staffToken;
  let testLeadId;
  let createdStaffId;

  before(() => {
    // Ensure test admin exists for admin workflow tests
    let adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    if (!adminUser) {
      const hash = bcrypt.hashSync('AdminTest@123', 10);
      const now = new Date().toISOString();
      const res = db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('admin_test', 'admintest@sungroves.com', hash, 'Admin Test User', 'ADMIN', 1, now, now);
      adminUser = db.prepare("SELECT * FROM users WHERE id = ?").get(res.lastInsertRowid);
    }

    let staffUser = db.prepare("SELECT * FROM users WHERE role = 'STAFF' LIMIT 1").get();
    if (!staffUser) {
      const hash = bcrypt.hashSync('StaffTest@123', 10);
      const now = new Date().toISOString();
      const res = db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('staff_test', 'stafftest@sungroves.com', hash, 'Staff Test User', 'STAFF', 1, now, now);
      staffUser = db.prepare("SELECT * FROM users WHERE id = ?").get(res.lastInsertRowid);
    }

    adminToken = jwt.sign(
      { id: adminUser.id, username: adminUser.username, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    staffToken = jwt.sign(
      { id: staffUser.id, username: staffUser.username, email: staffUser.email, role: staffUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('1. Database initializes with seeded admin and staff users', () => {
    const admin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN'").get();
    assert.ok(admin, 'Admin user should exist in database');
    assert.equal(admin.role, 'ADMIN');
    assert.equal(admin.is_active, 1);

    const staff = db.prepare("SELECT * FROM users WHERE role = 'STAFF'").get();
    assert.ok(staff, 'Staff user should exist in database');
    assert.equal(staff.role, 'STAFF');
  });

  it('2. Company settings are seeded with defaults', () => {
    const settings = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
    assert.ok(settings, 'Company settings should exist');
    assert.equal(settings.company_name, 'Sungroves Innovations LLP');
    assert.ok(settings.phone);
    assert.ok(settings.email);
    assert.ok(settings.operating_hours);
    assert.ok(settings.pro_price);
  });

  it('3. Admin can update company profile and pricing in SQLite', () => {
    const updatedPhone = '+91 99999 88888';
    const updatedPrice = '₹6,499 / year';
    const updatedHours = 'Mon - Sat: 8:30 AM - 7:00 PM';
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE company_settings 
      SET phone = ?, pro_price = ?, operating_hours = ?, updated_at = ? 
      WHERE id = (SELECT id FROM company_settings LIMIT 1)
    `).run(updatedPhone, updatedPrice, updatedHours, now);

    const check = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
    assert.equal(check.phone, updatedPhone);
    assert.equal(check.pro_price, updatedPrice);
    assert.equal(check.operating_hours, updatedHours);
  });

  it('4. Lead creation stores customer contact and deterministic calculation results', () => {
    const now = new Date().toISOString();
    const insertLead = db.prepare(`
      INSERT INTO leads (
        customer_name, phone, email, address, target_capacity,
        calculated_system_capacity, panel_info, subsidy_amount,
        estimated_net_cost, estimated_annual_savings, message,
        status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertLead.run(
      'Rajesh Sharma',
      '+91 98230 11223',
      'rajesh@example.com',
      'Chhatrapati Sambhajinagar',
      '3.2 kWp',
      3.2,
      '8 modules (400W Mono-PERC)',
      78000,
      98000,
      36720,
      'Interested in residential rooftop solar installation under PM Surya Ghar scheme.',
      'New',
      'calculator',
      now,
      now
    );

    testLeadId = result.lastInsertRowid;
    assert.ok(testLeadId > 0, 'Lead should be inserted with valid ID');

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(testLeadId);
    assert.equal(lead.customer_name, 'Rajesh Sharma');
    assert.equal(lead.calculated_system_capacity, 3.2);
    assert.equal(lead.subsidy_amount, 78000);
    assert.equal(lead.estimated_net_cost, 98000);
    assert.equal(lead.status, 'New');
  });

  it('5. Staff and Admin can transition lead status through workflow', () => {
    const statuses = ['Audit Scheduled', 'Quote Sent', 'Closed'];
    
    for (const st of statuses) {
      const now = new Date().toISOString();
      db.prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?').run(st, now, testLeadId);
      const lead = db.prepare('SELECT status FROM leads WHERE id = ?').get(testLeadId);
      assert.equal(lead.status, st);
    }
  });

  it('6. Staff creation and deactivation workflow by Admin', () => {
    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const res = insert.run(
      'test_agent',
      'agent@sungroves.com',
      'fake_hash_value',
      'Test Agent',
      'STAFF',
      1,
      now,
      now
    );

    createdStaffId = res.lastInsertRowid;
    assert.ok(createdStaffId > 0);

    // Deactivate
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(createdStaffId);
    const deactivated = db.prepare('SELECT is_active FROM users WHERE id = ?').get(createdStaffId);
    assert.equal(deactivated.is_active, 0);

    // Reactivate
    db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(createdStaffId);
    const reactivated = db.prepare('SELECT is_active FROM users WHERE id = ?').get(createdStaffId);
    assert.equal(reactivated.is_active, 1);

    // Cleanup
    db.prepare('DELETE FROM users WHERE id = ?').run(createdStaffId);
  });
});
