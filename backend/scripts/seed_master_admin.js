import db from '../src/database/db.js';
import bcrypt from 'bcryptjs';

async function seedMasterAdmin() {
  console.log('--- SEEDING MASTER ADMIN ---');

  // 1. Ensure table schema allows lowercase 'admin' and 'staff'
  try {
    const usersSql = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'users'").get()?.sql || '';
    if (!usersSql.includes("'admin'")) {
      db.exec(`
        PRAGMA foreign_keys=OFF;
        CREATE TABLE users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STAFF', 'admin', 'staff')),
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          plan TEXT NOT NULL DEFAULT 'free'
        );
        INSERT INTO users_migrated (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at, plan)
        SELECT id, username, email, password_hash, full_name, role, is_active, created_at, updated_at, COALESCE(plan, 'free') FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
        PRAGMA foreign_keys=ON;
      `);
      console.log('✔ Migrated users table CHECK constraint to include lowercase roles.');
    }
  } catch (err) {
    console.warn('Migration note:', err.message);
  }

  // Clean up legacy or duplicate test admin accounts (except primary admin)
  try {
    const deleteLegacy = db.prepare(`
      DELETE FROM users 
      WHERE (LOWER(email) IN ('master@sungroves.in', 'testadmin@sungroves.in', 'temp_admin@sungroves.com') 
         OR LOWER(username) IN ('admin_master', 'test_admin', 'temp_admin'))
        AND LOWER(email) != 'admin@sungroves.in'
    `);
    const result = deleteLegacy.run();
    if (result.changes > 0) {
      console.log(`✔ Cleaned up ${result.changes} temporary/duplicate test admin account(s).`);
    }
  } catch (cleanErr) {
    console.warn('Legacy account cleanup notice:', cleanErr.message);
  }

  // Permanent Master Admin credentials
  const username = 'admin';
  const email = 'admin@sungroves.in';
  const password = 'AdminPassword@2026';
  const role = 'admin';
  const fullName = 'Sungroves Master Administrator';

  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  // Find if username 'admin' or email 'admin@sungroves.in' already exists
  const existing = db.prepare(`
    SELECT id, username, email, role FROM users 
    WHERE LOWER(username) = ? OR LOWER(email) = ?
  `).get(username.toLowerCase(), email.toLowerCase());

  if (existing) {
    db.prepare(`
      UPDATE users 
      SET username = ?, email = ?, password_hash = ?, full_name = ?, role = ?, is_active = 1, updated_at = ?
      WHERE id = ?
    `).run(username, email, hash, fullName, role, now, existing.id);
    console.log(`✔ Updated existing user ID #${existing.id} to master admin:`);
  } else {
    const res = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at, plan)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'pro')
    `).run(username, email, hash, fullName, role, now, now);
    console.log(`✔ Created master admin user ID #${res.lastInsertRowid}:`);
  }

  // Force update any active 'admin' or 'ADMIN' role user's password_hash to the newly hashed Admin@123
  const updateAdminsResult = db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = ?
    WHERE LOWER(role) = 'admin' AND is_active = 1
  `).run(hash, now);
  console.log(`✔ Updated password_hash for ${updateAdminsResult.changes} active admin user(s).`);

  const verified = db.prepare(`SELECT id, username, email, role, is_active FROM users WHERE LOWER(username) = ?`).get(username.toLowerCase());
  console.log('Username:', verified.username);
  console.log('Email:', verified.email);
  console.log('Role:', verified.role);
  console.log('Active:', verified.is_active === 1);
  console.log('Password verified with bcrypt:', bcrypt.compareSync(password, db.prepare('SELECT password_hash FROM users WHERE id = ?').get(verified.id).password_hash));
  console.log(`🎉 Master admin credentials successfully reset to ${verified.email} / ${password}!`);
  process.exit(0);
}

seedMasterAdmin().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
