import db from '../database/db.js';

/**
 * GET /api/plans/config
 * Returns public plan descriptions and feature-lock information.
 * Does NOT expose secrets or sensitive user information.
 */
export function getPlansConfig(req, res) {
  try {
    const plans = db.prepare(`
      SELECT plan_name, display_name, price, allow_pdf_export, allow_advanced_pvgis,
             lock_pdf_export, lock_advanced_financials, lock_roof_tracing, description, updated_at
      FROM plan_configs
      ORDER BY id ASC
    `).all();

    if (!plans || plans.length === 0) {
      return res.status(200).json({
        success: true,
        plans: [
          {
            plan_name: 'free',
            display_name: 'Free Plan',
            price: 'Free',
            allow_pdf_export: false,
            allow_advanced_pvgis: false,
            lock_pdf_export: true,
            lock_advanced_financials: false,
            lock_roof_tracing: false,
            description: 'Basic solar feasibility estimation with online results.'
          },
          {
            plan_name: 'pro',
            display_name: 'Pro Plan',
            price: '₹4,999 / year',
            allow_pdf_export: true,
            allow_advanced_pvgis: true,
            lock_pdf_export: false,
            lock_advanced_financials: false,
            lock_roof_tracing: false,
            description: 'Full access including PDF proposal export and advanced PVGIS data analytics.'
          }
        ]
      });
    }

    const formatted = plans.map((p) => ({
      plan_name: p.plan_name,
      display_name: p.display_name,
      price: p.price,
      allow_pdf_export: Boolean(p.allow_pdf_export),
      allow_advanced_pvgis: Boolean(p.allow_advanced_pvgis),
      lock_pdf_export: Boolean(p.lock_pdf_export !== undefined ? p.lock_pdf_export : (p.allow_pdf_export ? 0 : 1)),
      lock_advanced_financials: Boolean(p.lock_advanced_financials),
      lock_roof_tracing: Boolean(p.lock_roof_tracing),
      description: p.description
    }));

    return res.status(200).json({ success: true, plans: formatted });
  } catch (err) {
    console.error('Error fetching plans config:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve plan configuration.' });
  }
}

/**
 * PUT /api/plans/config (ADMIN ONLY)
 * Update plan prices and feature locking rules.
 */
export function updatePlanConfig(req, res) {
  try {
    const body = req.body || {};
    const now = new Date().toISOString();

    // Helper to format a plan row
    const formatPlan = (p) => ({
      plan_name: p.plan_name,
      display_name: p.display_name,
      price: p.price,
      allow_pdf_export: Boolean(p.allow_pdf_export),
      allow_advanced_pvgis: Boolean(p.allow_advanced_pvgis),
      lock_pdf_export: Boolean(p.lock_pdf_export !== undefined ? p.lock_pdf_export : (p.allow_pdf_export ? 0 : 1)),
      lock_advanced_financials: Boolean(p.lock_advanced_financials),
      lock_roof_tracing: Boolean(p.lock_roof_tracing),
      description: p.description
    });

    // 1. Direct Paywall / Tier Config Payload: { pro_price, lock_pdf_export, lock_advanced_financials, lock_roof_tracing }
    if (body.pro_price !== undefined || body.lock_pdf_export !== undefined || body.lock_advanced_financials !== undefined || body.lock_roof_tracing !== undefined) {
      if (body.pro_price) {
        db.prepare(`
          UPDATE plan_configs
          SET price = ?, updated_at = ?
          WHERE plan_name = 'pro'
        `).run(String(body.pro_price).trim(), now);
      }

      // Update Free plan locks
      const freePlan = db.prepare("SELECT * FROM plan_configs WHERE plan_name = 'free'").get();
      if (freePlan) {
        const lockPdf = body.lock_pdf_export !== undefined ? (body.lock_pdf_export ? 1 : 0) : freePlan.lock_pdf_export;
        const lockAdvFin = body.lock_advanced_financials !== undefined ? (body.lock_advanced_financials ? 1 : 0) : freePlan.lock_advanced_financials;
        const lockRoof = body.lock_roof_tracing !== undefined ? (body.lock_roof_tracing ? 1 : 0) : freePlan.lock_roof_tracing;
        const allowPdf = lockPdf === 1 ? 0 : 1;

        db.prepare(`
          UPDATE plan_configs
          SET lock_pdf_export = ?,
              lock_advanced_financials = ?,
              lock_roof_tracing = ?,
              allow_pdf_export = ?,
              updated_at = ?
          WHERE plan_name = 'free'
        `).run(lockPdf, lockAdvFin, lockRoof, allowPdf, now);
      }

      const allPlans = db.prepare('SELECT * FROM plan_configs ORDER BY id ASC').all();
      return res.status(200).json({
        success: true,
        message: 'Plan configurator rules updated successfully.',
        plans: allPlans.map(formatPlan)
      });
    }

    const updateSinglePlan = (p) => {
      const planName = p.planName || p.plan_name;
      const displayName = p.displayName || p.display_name;
      const price = p.price;
      
      let lockPdfExport = p.lock_pdf_export !== undefined ? p.lock_pdf_export : p.lockPdfExport;
      let allowPdfExport = p.allowPdfExport !== undefined ? p.allowPdfExport : p.allow_pdf_export;
      
      if (lockPdfExport !== undefined && allowPdfExport === undefined) {
        allowPdfExport = !lockPdfExport;
      } else if (allowPdfExport !== undefined && lockPdfExport === undefined) {
        lockPdfExport = !allowPdfExport;
      }

      const lockAdvancedFinancials = p.lock_advanced_financials !== undefined ? p.lock_advanced_financials : (p.lockAdvancedFinancials || false);
      const lockRoofTracing = p.lock_roof_tracing !== undefined ? p.lock_roof_tracing : (p.lockRoofTracing || false);
      const allowAdvancedPvgis = p.allowAdvancedPvgis !== undefined ? p.allowAdvancedPvgis : p.allow_advanced_pvgis;
      const description = p.description;

      if (!planName || !['free', 'pro'].includes(planName)) return null;

      const existing = db.prepare('SELECT id FROM plan_configs WHERE plan_name = ?').get(planName);
      if (existing) {
        db.prepare(`
          UPDATE plan_configs
          SET display_name = COALESCE(NULLIF(?, ''), display_name),
              price = COALESCE(NULLIF(?, ''), price),
              allow_pdf_export = ?,
              allow_advanced_pvgis = ?,
              lock_pdf_export = ?,
              lock_advanced_financials = ?,
              lock_roof_tracing = ?,
              description = COALESCE(NULLIF(?, ''), description),
              updated_at = ?
          WHERE plan_name = ?
        `).run(
          displayName || null,
          price || null,
          allowPdfExport ? 1 : 0,
          allowAdvancedPvgis ? 1 : 0,
          lockPdfExport ? 1 : 0,
          lockAdvancedFinancials ? 1 : 0,
          lockRoofTracing ? 1 : 0,
          description || null,
          now,
          planName
        );
      } else {
        db.prepare(`
          INSERT INTO plan_configs (plan_name, display_name, price, allow_pdf_export, allow_advanced_pvgis, lock_pdf_export, lock_advanced_financials, lock_roof_tracing, description, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          planName,
          displayName || planName,
          price || 'Free',
          allowPdfExport ? 1 : 0,
          allowAdvancedPvgis ? 1 : 0,
          lockPdfExport ? 1 : 0,
          lockAdvancedFinancials ? 1 : 0,
          lockRoofTracing ? 1 : 0,
          description || '',
          now
        );
      }
      return db.prepare('SELECT * FROM plan_configs WHERE plan_name = ?').get(planName);
    };

    if (Array.isArray(body.plans)) {
      body.plans.forEach(updateSinglePlan);
      const allPlans = db.prepare('SELECT * FROM plan_configs ORDER BY id ASC').all();
      return res.status(200).json({
        success: true,
        message: 'All plan configurations updated successfully.',
        plans: allPlans.map(formatPlan)
      });
    }

    const planName = body.planName || body.plan_name;
    if (!planName || !['free', 'pro'].includes(planName)) {
      return res.status(400).json({ error: 'Bad Request', message: 'planName must be "free" or "pro".' });
    }

    const updated = updateSinglePlan(body);
    return res.status(200).json({
      success: true,
      message: `Plan configuration for "${planName}" updated.`,
      plan: formatPlan(updated)
    });
  } catch (err) {
    console.error('Error updating plan config:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update plan configuration.' });
  }
}
