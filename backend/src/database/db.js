import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'sungroves.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STAFF', 'admin', 'staff')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    operating_hours TEXT NOT NULL,
    free_trial_info TEXT NOT NULL,
    pro_price TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    target_capacity TEXT,
    calculated_system_capacity REAL,
    panel_info TEXT,
    subsidy_amount REAL,
    estimated_net_cost REAL,
    estimated_annual_savings REAL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Audit Scheduled', 'Quote Sent', 'Closed')),
    source TEXT DEFAULT 'public',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    reset_token_hash TEXT,
    reset_token_expires TEXT,
    password_changed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    image_path TEXT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_email TEXT NOT NULL,
    company_phone TEXT NOT NULL,
    office_address TEXT NOT NULL,
    business_hours TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plan_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_name TEXT UNIQUE NOT NULL CHECK(plan_name IN ('free', 'pro')),
    display_name TEXT NOT NULL,
    allow_pdf_export INTEGER NOT NULL DEFAULT 0,
    allow_advanced_pvgis INTEGER NOT NULL DEFAULT 0,
    lock_pdf_export INTEGER NOT NULL DEFAULT 1,
    lock_advanced_financials INTEGER NOT NULL DEFAULT 0,
    lock_roof_tracing INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Migration for plan_configs columns
try {
  const planCols = db.prepare("PRAGMA table_info(plan_configs)").all();
  const colNames = planCols.map(c => c.name);
  if (!colNames.includes('lock_pdf_export')) {
    db.exec("ALTER TABLE plan_configs ADD COLUMN lock_pdf_export INTEGER NOT NULL DEFAULT 1");
    db.prepare("UPDATE plan_configs SET lock_pdf_export = 0 WHERE plan_name = 'pro'").run();
    db.prepare("UPDATE plan_configs SET lock_pdf_export = CASE WHEN allow_pdf_export = 1 THEN 0 ELSE 1 END WHERE plan_name = 'free'").run();
  }
  if (!colNames.includes('lock_advanced_financials')) {
    db.exec("ALTER TABLE plan_configs ADD COLUMN lock_advanced_financials INTEGER NOT NULL DEFAULT 0");
  }
  if (!colNames.includes('lock_roof_tracing')) {
    db.exec("ALTER TABLE plan_configs ADD COLUMN lock_roof_tracing INTEGER NOT NULL DEFAULT 0");
  }
} catch (migErr) {
  console.warn('[Database] plan_configs migration notice:', migErr.message);
}

// Safe cleanup of the previous default hardcoded seeded Admin ('admin' / 'admin@sungroves.com' / 'Sungroves Administrator')
// This ensures the first-time Admin registration flow is immediately accessible and functional.
// Custom admin accounts created by real users will NOT be removed.
try {
  const defaultSeededAdmin = db.prepare(`
    SELECT id FROM users 
    WHERE username = 'admin' 
      AND email = 'admin@sungroves.com' 
      AND full_name = 'Sungroves Administrator'
      AND role = 'ADMIN'
  `).get();

  if (defaultSeededAdmin) {
    db.prepare('DELETE FROM users WHERE id = ?').run(defaultSeededAdmin.id);
    console.log('[Database] Cleaned up legacy default seeded admin to enable initial Admin Registration flow.');
  }
} catch (cleanupErr) {
  console.warn('[Database] Seeded admin cleanup check notice:', cleanupErr.message);
}

// Seed default company settings if not exists
const existingSettings = db.prepare('SELECT id FROM company_settings LIMIT 1').get();
if (!existingSettings) {
  const insertSettings = db.prepare(`
    INSERT INTO company_settings (
      company_name, phone, email, address, operating_hours, free_trial_info, pro_price, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSettings.run(
    'Sungroves Innovations LLP',
    '+91 98765 43210',
    'support@sungroves.com',
    'Chhatrapati Sambhajinagar, Maharashtra, India',
    'Mon - Sat: 9:00 AM - 6:30 PM',
    '14-Day Free Feasibility Consultation & Remote Rooftop Assessment',
    '₹4,999 / year',
    new Date().toISOString()
  );
}

// Seed default staff user if not exists (Staff functionality is preserved)
const existingStaff = db.prepare('SELECT id FROM users WHERE username = ?').get('staff');
if (!existingStaff) {
  const staffPasswordHash = bcrypt.hashSync('Staff@12345', 10);
  const insertStaff = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  insertStaff.run('staff', 'staff@sungroves.com', staffPasswordHash, 'Sungroves Energy Consultant', 'STAFF', 1, now, now);
}


// Seed default plan configurations (free + pro) if not yet present
const existingFreePlan = db.prepare("SELECT id FROM plan_configs WHERE plan_name = 'free'").get();
if (!existingFreePlan) {
  const planNow = new Date().toISOString();
  const insertPlan = db.prepare(`
    INSERT INTO plan_configs (plan_name, display_name, price, allow_pdf_export, allow_advanced_pvgis, lock_pdf_export, lock_advanced_financials, lock_roof_tracing, description, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPlan.run('free', 'Free Plan', 'Free', 0, 0, 1, 0, 0, 'Basic solar feasibility estimation with online results.', planNow);
  insertPlan.run('pro', 'Pro Plan', 'Rs.4,999 / year', 1, 1, 0, 0, 0, 'Full access including PDF proposal export and advanced PVGIS data analytics.', planNow);
}

// Seed default site_settings if not yet present
const existingSiteSettings = db.prepare('SELECT id FROM site_settings LIMIT 1').get();
if (!existingSiteSettings) {
  const settingsNow = new Date().toISOString();
  const insertSiteSettings = db.prepare(`
    INSERT INTO site_settings (company_email, company_phone, office_address, business_hours, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertSiteSettings.run(
    'support@sungroves.com',
    '+91 98765 43210',
    'Chhatrapati Sambhajinagar, Maharashtra, India',
    'Mon - Sat: 9:00 AM - 6:30 PM',
    settingsNow
  );
}

// Seed default key 'pro_plan_price' in settings table if not yet present
try {
  const existingProPrice = db.prepare("SELECT value FROM settings WHERE key = 'pro_plan_price'").get();
  if (!existingProPrice) {
    const settingsNow = new Date().toISOString();
    const insertSetting = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    insertSetting.run('pro_plan_price', '499', settingsNow);
  }
} catch (settingsSeedErr) {
  console.warn('[Database] Settings table seed notice:', settingsSeedErr.message);
}

// Safely ensure users table has 'plan' column
try {
  const userColumns = db.pragma('table_info(users)');
  if (!userColumns.some(c => c.name === 'plan')) {
    db.exec("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'");
  }
  if (!userColumns.some(c => c.name === 'reset_token')) {
    db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
  }
  if (!userColumns.some(c => c.name === 'reset_token_expires')) {
    db.exec("ALTER TABLE users ADD COLUMN reset_token_expires TEXT");
  }
} catch (e) {
  // Column already present or migration handled
}

// Safely ensure reviews table has 'status' column
try {
  const reviewColumns = db.pragma('table_info(reviews)');
  if (!reviewColumns.some(c => c.name === 'status')) {
    db.exec("ALTER TABLE reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'");
  }
} catch (e) {
  // Column already present or migration handled
}

// Safely ensure payment_orders table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    customer_id INTEGER,
    account_type TEXT NOT NULL DEFAULT 'user',
    user_email TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    receipt TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'pro',
    status TEXT NOT NULL DEFAULT 'created',
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE,
    payment_id TEXT,
    signature TEXT,
    amount INTEGER,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export default db;

