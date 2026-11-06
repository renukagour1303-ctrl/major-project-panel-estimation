import db from '../database/db.js';

/**
 * Helper to get the active pro plan price in numeric INR (default 499)
 */
export function getActiveProPlanPrice() {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'pro_plan_price'").get();
    if (row && row.value) {
      const parsed = parseFloat(row.value);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading pro_plan_price from settings:', err.message);
  }
  return 499;
}

/**
 * GET /api/settings/pricing
 * Public endpoint that queries SQLite database for the current Pro Model price set by the admin.
 * Return JSON: { success: true, proPrice: updatedPrice }
 */
export function getPublicPricing(req, res) {
  try {
    const proPrice = getActiveProPlanPrice();
    return res.status(200).json({
      success: true,
      proPrice: proPrice,
      pro_plan_price: proPrice,
      proPlanPrice: proPrice
    });
  } catch (err) {
    console.error('Error retrieving public pricing:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve pricing.'
    });
  }
}

/**
 * GET /api/settings
 * Public access for Footer and Contact synchronization.
 */
export function getSiteSettings(req, res) {
  try {
    const proPlanPrice = getActiveProPlanPrice();

    const row = db.prepare(`
      SELECT id, company_email, company_phone, office_address, business_hours, updated_at
      FROM site_settings
      ORDER BY id ASC
      LIMIT 1
    `).get();

    if (!row) {
      const defaultSettings = {
        id: 1,
        company_email: 'support@sungroves.com',
        company_phone: '+91 98765 43210',
        office_address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
        business_hours: 'Mon - Sat: 9:00 AM - 6:30 PM',
        updated_at: new Date().toISOString()
      };
      return res.status(200).json({
        success: true,
        pro_plan_price: proPlanPrice,
        proPlanPrice: proPlanPrice,
        ...defaultSettings,
        settings: {
          pro_plan_price: proPlanPrice,
          proPlanPrice: proPlanPrice,
          ...defaultSettings
        }
      });
    }

    return res.status(200).json({
      success: true,
      pro_plan_price: proPlanPrice,
      proPlanPrice: proPlanPrice,
      id: row.id,
      company_email: row.company_email,
      company_phone: row.company_phone,
      office_address: row.office_address,
      business_hours: row.business_hours,
      updated_at: row.updated_at,
      settings: {
        pro_plan_price: proPlanPrice,
        proPlanPrice: proPlanPrice,
        ...row
      }
    });
  } catch (err) {
    console.error('Error retrieving site settings:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve site settings.'
    });
  }
}

/**
 * PUT /api/settings
 * Admin-protected endpoint to update company contact and office information.
 */
export function updateSiteSettings(req, res) {
  try {
    const body = req.body || {};
    const proPlanPriceInput = body.pro_plan_price ?? body.proPlanPrice;
    const companyEmail = body.company_email ?? body.companyEmail;
    const companyPhone = body.company_phone ?? body.companyPhone;
    const officeAddress = body.office_address ?? body.officeAddress;
    const businessHours = body.business_hours ?? body.businessHours;

    if (!companyEmail && !companyPhone && !officeAddress && !businessHours && proPlanPriceInput === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one field (company_email, company_phone, office_address, business_hours, pro_plan_price) must be provided.'
      });
    }

    const now = new Date().toISOString();

    // Handle pro_plan_price if provided
    if (proPlanPriceInput !== undefined && proPlanPriceInput !== null) {
      const numericPrice = Number(proPlanPriceInput);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'pro_plan_price must be a positive numeric value in INR (₹).'
        });
      }

      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('pro_plan_price', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(String(numericPrice), now);

      try {
        db.prepare("UPDATE plan_configs SET price = ?, updated_at = ? WHERE plan_name = 'pro'").run(`₹${numericPrice}`, now);
      } catch (e) {
        // notice
      }
      try {
        db.prepare("UPDATE company_settings SET pro_price = ?, updated_at = ? WHERE id = (SELECT id FROM company_settings LIMIT 1)").run(`₹${numericPrice} / year`, now);
      } catch (e) {
        // notice
      }
    }

    if (companyEmail || companyPhone || officeAddress || businessHours) {
      const existing = db.prepare('SELECT id FROM site_settings LIMIT 1').get();

      if (existing) {
        db.prepare(`
          UPDATE site_settings
          SET company_email = COALESCE(NULLIF(?, ''), company_email),
              company_phone = COALESCE(NULLIF(?, ''), company_phone),
              office_address = COALESCE(NULLIF(?, ''), office_address),
              business_hours = COALESCE(NULLIF(?, ''), business_hours),
              updated_at = ?
          WHERE id = ?
        `).run(
          companyEmail ? String(companyEmail).trim() : null,
          companyPhone ? String(companyPhone).trim() : null,
          officeAddress ? String(officeAddress).trim() : null,
          businessHours ? String(businessHours).trim() : null,
          now,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO site_settings (company_email, company_phone, office_address, business_hours, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          companyEmail ? String(companyEmail).trim() : 'support@sungroves.com',
          companyPhone ? String(companyPhone).trim() : '+91 98765 43210',
          officeAddress ? String(officeAddress).trim() : 'Chhatrapati Sambhajinagar, Maharashtra, India',
          businessHours ? String(businessHours).trim() : 'Mon - Sat: 9:00 AM - 6:30 PM',
          now
        );
      }

      // Keep company_settings synchronized as well for backward compatibility
      try {
        db.prepare(`
          UPDATE company_settings
          SET email = COALESCE(NULLIF(?, ''), email),
              phone = COALESCE(NULLIF(?, ''), phone),
              address = COALESCE(NULLIF(?, ''), address),
              operating_hours = COALESCE(NULLIF(?, ''), operating_hours),
              updated_at = ?
          WHERE id = (SELECT id FROM company_settings LIMIT 1)
        `).run(
          companyEmail ? String(companyEmail).trim() : null,
          companyPhone ? String(companyPhone).trim() : null,
          officeAddress ? String(officeAddress).trim() : null,
          businessHours ? String(businessHours).trim() : null,
          now
        );
      } catch (syncErr) {
        console.warn('Sync to company_settings notice:', syncErr.message);
      }
    }

    const updated = db.prepare('SELECT id, company_email, company_phone, office_address, business_hours, updated_at FROM site_settings LIMIT 1').get();
    const activePrice = getActiveProPlanPrice();

    return res.status(200).json({
      success: true,
      message: 'Site settings updated successfully.',
      id: updated?.id,
      company_email: updated?.company_email,
      company_phone: updated?.company_phone,
      office_address: updated?.office_address,
      business_hours: updated?.business_hours,
      updated_at: updated?.updated_at || now,
      pro_plan_price: activePrice,
      proPlanPrice: activePrice,
      settings: {
        pro_plan_price: activePrice,
        proPlanPrice: activePrice,
        ...updated
      }
    });
  } catch (err) {
    console.error('Error updating site settings:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update site settings.'
    });
  }
}

/**
 * GET /api/admin/settings
 * Retrieves active site settings including pro_plan_price.
 */
export function getAdminSettings(req, res) {
  try {
    const proPlanPrice = getActiveProPlanPrice();

    const row = db.prepare(`
      SELECT id, company_email, company_phone, office_address, business_hours, updated_at
      FROM site_settings
      ORDER BY id ASC
      LIMIT 1
    `).get() || {
      id: 1,
      company_email: 'support@sungroves.com',
      company_phone: '+91 98765 43210',
      office_address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
      business_hours: 'Mon - Sat: 9:00 AM - 6:30 PM',
      updated_at: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      pro_plan_price: proPlanPrice,
      proPlanPrice: proPlanPrice,
      id: row.id,
      company_email: row.company_email,
      company_phone: row.company_phone,
      office_address: row.office_address,
      business_hours: row.business_hours,
      updated_at: row.updated_at,
      settings: {
        pro_plan_price: proPlanPrice,
        proPlanPrice: proPlanPrice,
        id: row.id,
        company_email: row.company_email,
        company_phone: row.company_phone,
        office_address: row.office_address,
        business_hours: row.business_hours,
        updated_at: row.updated_at
      }
    });
  } catch (err) {
    console.error('Error retrieving admin settings:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve admin settings.'
    });
  }
}

/**
 * POST /api/admin/settings
 * Updates pro_plan_price in SQLite (requires admin role/auth middleware).
 */
export function updateAdminSettings(req, res) {
  try {
    const body = req.body || {};
    const proPlanPriceInput = body.pro_plan_price ?? body.proPlanPrice ?? body.price;

    const companyEmail = body.company_email ?? body.companyEmail;
    const companyPhone = body.company_phone ?? body.companyPhone;
    const officeAddress = body.office_address ?? body.officeAddress;
    const businessHours = body.business_hours ?? body.businessHours;

    if (proPlanPriceInput === undefined && !companyEmail && !companyPhone && !officeAddress && !businessHours) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one setting field (pro_plan_price, company_email, company_phone, office_address, business_hours) must be provided.'
      });
    }

    const now = new Date().toISOString();

    if (proPlanPriceInput !== undefined && proPlanPriceInput !== null) {
      const numericPrice = Number(proPlanPriceInput);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'pro_plan_price must be a positive numeric value in INR (₹).'
        });
      }

      // Upsert into settings table
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('pro_plan_price', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(String(numericPrice), now);

      // Synchronize with plan_configs
      try {
        db.prepare("UPDATE plan_configs SET price = ?, updated_at = ? WHERE plan_name = 'pro'").run(`₹${numericPrice}`, now);
      } catch (e) {
        console.warn('Sync to plan_configs notice:', e.message);
      }

      // Synchronize with company_settings
      try {
        db.prepare("UPDATE company_settings SET pro_price = ?, updated_at = ? WHERE id = (SELECT id FROM company_settings LIMIT 1)").run(`₹${numericPrice} / year`, now);
      } catch (e) {
        console.warn('Sync to company_settings notice:', e.message);
      }
    }

    if (companyEmail || companyPhone || officeAddress || businessHours) {
      const existing = db.prepare('SELECT id FROM site_settings LIMIT 1').get();

      if (existing) {
        db.prepare(`
          UPDATE site_settings
          SET company_email = COALESCE(NULLIF(?, ''), company_email),
              company_phone = COALESCE(NULLIF(?, ''), company_phone),
              office_address = COALESCE(NULLIF(?, ''), office_address),
              business_hours = COALESCE(NULLIF(?, ''), business_hours),
              updated_at = ?
          WHERE id = ?
        `).run(
          companyEmail ? String(companyEmail).trim() : null,
          companyPhone ? String(companyPhone).trim() : null,
          officeAddress ? String(officeAddress).trim() : null,
          businessHours ? String(businessHours).trim() : null,
          now,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO site_settings (company_email, company_phone, office_address, business_hours, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          companyEmail ? String(companyEmail).trim() : 'support@sungroves.com',
          companyPhone ? String(companyPhone).trim() : '+91 98765 43210',
          officeAddress ? String(officeAddress).trim() : 'Chhatrapati Sambhajinagar, Maharashtra, India',
          businessHours ? String(businessHours).trim() : 'Mon - Sat: 9:00 AM - 6:30 PM',
          now
        );
      }
    }

    const activePrice = getActiveProPlanPrice();
    const updatedSite = db.prepare(`
      SELECT id, company_email, company_phone, office_address, business_hours, updated_at
      FROM site_settings
      ORDER BY id ASC
      LIMIT 1
    `).get();

    return res.status(200).json({
      success: true,
      message: 'Admin settings updated successfully.',
      pro_plan_price: activePrice,
      proPlanPrice: activePrice,
      id: updatedSite?.id,
      company_email: updatedSite?.company_email,
      company_phone: updatedSite?.company_phone,
      office_address: updatedSite?.office_address,
      business_hours: updatedSite?.business_hours,
      updated_at: updatedSite?.updated_at || now,
      settings: {
        pro_plan_price: activePrice,
        proPlanPrice: activePrice,
        ...updatedSite
      }
    });
  } catch (err) {
    console.error('Error updating admin settings:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update admin settings.'
    });
  }
}
