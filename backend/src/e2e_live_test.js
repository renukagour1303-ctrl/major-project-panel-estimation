import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import db from './database/db.js';
import './server.js';

const API_BASE = 'http://localhost:5000/api';

test('Live Backend E2E Test Suite (With Admin Registration Flow)', async () => {
  console.log('--- STARTING LIVE BACKEND E2E TEST SUITE (WITH ADMIN REGISTRATION FLOW) ---');

  // 0. Ensure clean setup state: remove any existing admin to test initial registration
  db.prepare("DELETE FROM users WHERE UPPER(role) = 'ADMIN'").run();

  // 1. Health check
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthJson = await healthRes.json();
  assert.equal(healthRes.status, 200);
  assert.equal(healthJson.status, 'ok');
  console.log('✔ 1. Health endpoint returns 200 OK');

  // 2. Initial has-admin returns false
  const hasAdminRes1 = await fetch(`${API_BASE}/auth/has-admin`);
  const hasAdminJson1 = await hasAdminRes1.json();
  assert.equal(hasAdminRes1.status, 200);
  assert.equal(hasAdminJson1.hasAdmin, false);
  console.log('✔ 2. GET /api/auth/has-admin returns false before initial Admin is created');

  // 3. Register Admin Validation: Missing fields rejected
  const missingFieldRes = await fetch(`${API_BASE}/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test', password: 'Password@123' })
  });
  assert.equal(missingFieldRes.status, 400);
  console.log('✔ 3. POST /api/auth/register-admin rejects missing fields with 400');

  // 4. Register Admin Validation: Password mismatch rejected
  const mismatchRes = await fetch(`${API_BASE}/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Anand Deshmukh',
      username: 'anand_admin',
      email: 'anand@sungroves.com',
      password: 'Password@123',
      confirmPassword: 'MismatchPassword@123'
    })
  });
  assert.equal(mismatchRes.status, 400);
  console.log('✔ 4. POST /api/auth/register-admin rejects password mismatch with 400');

  // 5. First-Time Admin Registration Successful
  const regAdminRes = await fetch(`${API_BASE}/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Anand Deshmukh',
      username: 'anand_admin',
      email: 'anand@sungroves.com',
      password: 'CustomAdminPassword@123',
      confirmPassword: 'CustomAdminPassword@123'
    })
  });
  const regAdminJson = await regAdminRes.json();
  assert.equal(regAdminRes.status, 201);
  assert.ok(regAdminJson.token);
  assert.equal(regAdminJson.user.role, 'ADMIN');
  assert.equal(regAdminJson.user.username, 'anand_admin');
  console.log('✔ 5. POST /api/auth/register-admin successfully created first Admin: anand_admin');

  // 6. has-admin now returns true
  const hasAdminRes2 = await fetch(`${API_BASE}/auth/has-admin`);
  const hasAdminJson2 = await hasAdminRes2.json();
  assert.equal(hasAdminRes2.status, 200);
  assert.equal(hasAdminJson2.hasAdmin, true);
  console.log('✔ 6. GET /api/auth/has-admin returns true after registration');

  // 7. Second Admin registration attempt rejected with 409 Conflict
  const secondRegRes = await fetch(`${API_BASE}/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Second Admin Attempt',
      username: 'second_admin',
      email: 'second@sungroves.com',
      password: 'Password@123',
      confirmPassword: 'Password@123'
    })
  });
  assert.equal(secondRegRes.status, 409);
  console.log('✔ 7. Second Admin registration attempt blocked with 409 Conflict');

  // 8. Newly Registered Admin Login
  const adminLoginRes = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'anand_admin', password: 'CustomAdminPassword@123' })
  });
  const adminLoginJson = await adminLoginRes.json();
  assert.equal(adminLoginRes.status, 200);
  assert.ok(adminLoginJson.token);
  assert.equal(adminLoginJson.user.role, 'ADMIN');
  const adminToken = adminLoginJson.token;
  console.log('✔ 8. Newly registered Admin logged in successfully with custom credentials');

  // 9. Existing Staff Login
  const staffLoginRes = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'staff', password: 'Staff@12345' })
  });
  const staffLoginJson = await staffLoginRes.json();
  assert.equal(staffLoginRes.status, 200);
  assert.ok(staffLoginJson.token);
  assert.equal(staffLoginJson.user.role, 'STAFF');
  const staffToken = staffLoginJson.token;
  console.log('✔ 9. Default Staff login verified (staff / Staff@12345)');

  // 10. RBAC: Staff Cannot Update Company Config
  const staffConfigRes = await fetch(`${API_BASE}/admin/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    },
    body: JSON.stringify({ phone: '+91 00000 00000' })
  });
  assert.equal(staffConfigRes.status, 403);
  console.log('✔ 10. Staff blocked from updating company configuration (403 Forbidden)');

  // 11. Admin Updates Company Profile & Pro Pricing
  const updateRes = await fetch(`${API_BASE}/admin/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      companyName: 'Sungroves Innovations LLP',
      phone: '+91 91234 56789',
      email: 'support@sungroves.com',
      address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
      operatingHours: 'Mon - Sat: 9:00 AM - 6:30 PM',
      freeTrialInfo: '14-Day Free Feasibility Consultation & Remote Rooftop Assessment',
      proPrice: '₹5,499 / year'
    })
  });
  const updateJson = await updateRes.json();
  assert.equal(updateRes.status, 200);
  assert.equal(updateJson.data.phone, '+91 91234 56789');
  assert.equal(updateJson.data.proPrice, '₹5,499 / year');
  console.log('✔ 11. Admin updated company profile and pricing in SQLite');

  // 12. Public Config Reflects Admin Changes
  const publicConfigRes = await fetch(`${API_BASE}/config`);
  const publicConfigJson = await publicConfigRes.json();
  assert.equal(publicConfigRes.status, 200);
  assert.equal(publicConfigJson.data.phone, '+91 91234 56789');
  assert.equal(publicConfigJson.data.proPrice, '₹5,499 / year');
  console.log('✔ 12. Public /api/config reflects updated configuration');

  // 13. Public Customer Inquiry Lead
  const leadRes = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Kavita Joshi',
      phone: '+91 98888 77777',
      email: 'kavita@example.com',
      address: 'Chhatrapati Sambhajinagar',
      message: 'Need residential solar survey',
      source: 'contact_modal'
    })
  });
  const leadJson = await leadRes.json();
  assert.equal(leadRes.status, 201);
  const leadId = leadJson.leadId;
  console.log('✔ 13. Public inquiry recorded as Lead ID:', leadId);

  // 14. Staff Transitions Lead Status
  const statusRes = await fetch(`${API_BASE}/admin/leads/${leadId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    },
    body: JSON.stringify({ status: 'Audit Scheduled' })
  });
  assert.equal(statusRes.status, 200);
  console.log("✔ 14. Staff updated lead status to 'Audit Scheduled'");

  // 15. Core Solar Engine Run
  const calcRes = await fetch(`${API_BASE}/solar/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: 19.8762,
      longitude: 75.3433,
      cityName: 'Chhatrapati Sambhajinagar',
      tracedRoofArea: 80,
      usableRoofArea: 60,
      monthlyBill: 3500,
      tariffRate: 8.5
    })
  });
  const calcJson = await calcRes.json();
  assert.equal(calcRes.status, 200);
  const finalSize = calcJson.system?.finalSystemSize || calcJson.data?.system?.finalSystemSize;
  const finalSubsidy = calcJson.financial?.subsidy || calcJson.data?.financial?.subsidy;
  assert.ok(finalSize > 0);
  assert.ok(finalSubsidy > 0);
  console.log(`✔ 15. Solar Calculation Engine verified (${finalSize} kWp, Subsidy: ₹${finalSubsidy})`);

  console.log('\n🎉 ALL FIRST-TIME ADMIN SETUP & RBAC E2E TESTS PASSED SUCCESSFULLY!');

  // Restore master admin after test run
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync('Admin@12345', 10);
  const existing = db.prepare("SELECT id FROM users WHERE LOWER(username) = 'admin' OR LOWER(email) = 'admin@sungroves.in'").get();
  if (existing) {
    db.prepare("UPDATE users SET username = 'admin', email = 'admin@sungroves.in', password_hash = ?, full_name = 'Sungroves Master Admin', role = 'admin', is_active = 1, updated_at = ? WHERE id = ?")
      .run(hash, now, existing.id);
  } else {
    db.prepare("INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at, plan) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'pro')")
      .run('admin', 'admin@sungroves.in', hash, 'Sungroves Master Admin', 'admin', now, now);
  }
});
