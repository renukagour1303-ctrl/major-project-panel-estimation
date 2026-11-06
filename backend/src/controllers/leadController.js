import db from '../database/db.js';

const VALID_STATUSES = ['New', 'Audit Scheduled', 'Quote Sent', 'Closed', 'pending', 'contacted'];

/**
 * Public endpoint: Submit a customer inquiry or solar calculation lead
 */
export function createLead(req, res) {
  try {
    const {
      customerName,
      phone,
      email,
      address,
      targetCapacity,
      calculatedSystemCapacity,
      panelInfo,
      subsidyAmount,
      estimatedNetCost,
      estimatedAnnualSavings,
      message,
      source
    } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Customer name is required.'
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone number is required.'
      });
    }

    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO leads (
        customer_name, phone, email, address, target_capacity,
        calculated_system_capacity, panel_info, subsidy_amount,
        estimated_net_cost, estimated_annual_savings, message,
        status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      customerName.trim(),
      phone.trim(),
      email ? email.trim() : null,
      address ? address.trim() : null,
      targetCapacity ? String(targetCapacity).trim() : null,
      calculatedSystemCapacity !== undefined && calculatedSystemCapacity !== null ? Number(calculatedSystemCapacity) : null,
      panelInfo ? String(panelInfo).trim() : null,
      subsidyAmount !== undefined && subsidyAmount !== null ? Number(subsidyAmount) : null,
      estimatedNetCost !== undefined && estimatedNetCost !== null ? Number(estimatedNetCost) : null,
      estimatedAnnualSavings !== undefined && estimatedAnnualSavings !== null ? Number(estimatedAnnualSavings) : null,
      message ? message.trim() : null,
      'New',
      source || 'public',
      now,
      now
    );

    return res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. A Sungroves solar specialist will contact you soon.',
      leadId: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record customer inquiry.'
    });
  }
}

/**
 * Protected endpoint (ADMIN & STAFF): Get all leads with optional filtering and search
 */
export function getAllLeads(req, res) {
  try {
    const { status, search } = req.query;

    let query = 'SELECT * FROM leads';
    const params = [];
    const conditions = [];

    if (status && status !== 'All') {
      const lower = status.toLowerCase();
      if (lower === 'pending') {
        conditions.push("(status = 'pending' OR status = 'New')");
      } else if (lower === 'contacted') {
        conditions.push("(status = 'contacted' OR status = 'Audit Scheduled' OR status = 'Quote Sent')");
      } else {
        conditions.push('status = ?');
        params.push(status);
      }
    }

    if (search && search.trim()) {
      conditions.push('(customer_name LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id DESC';

    const rows = db.prepare(query).all(...params);

    const formattedLeads = rows.map(row => ({
      id: row.id,
      customerName: row.customer_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      targetCapacity: row.target_capacity,
      calculatedSystemCapacity: row.calculated_system_capacity,
      panelInfo: row.panel_info,
      subsidyAmount: row.subsidy_amount,
      estimatedNetCost: row.estimated_net_cost,
      estimatedAnnualSavings: row.estimated_annual_savings,
      message: row.message,
      status: row.status,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return res.status(200).json({
      success: true,
      count: formattedLeads.length,
      data: formattedLeads
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve leads list.'
    });
  }
}

/**
 * Protected endpoint (ADMIN & STAFF): Update status of a specific lead
 */
export function updateLeadStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`
      });
    }

    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
    if (!lead) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Lead with ID ${id} not found.`
      });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    return res.status(200).json({
      success: true,
      message: `Lead status updated to '${status}'.`,
      leadId: Number(id),
      status,
      updatedAt: now
    });
  } catch (err) {
    console.error('Error updating lead status:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update lead status.'
    });
  }
}

/**
 * Protected endpoint (ADMIN & STAFF): Get lead metrics summary
 */
export function getLeadStats(req, res) {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const newLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('New').count;
    const auditScheduled = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('Audit Scheduled').count;
    const quoteSent = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('Quote Sent').count;
    const closed = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = ?').get('Closed').count;
    const totalCapacity = db.prepare('SELECT SUM(calculated_system_capacity) as totalKWp FROM leads').get().totalKWp || 0;

    return res.status(200).json({
      success: true,
      stats: {
        total,
        newLeads,
        auditScheduled,
        quoteSent,
        closed,
        totalCapacityKWp: Number(totalCapacity.toFixed(2))
      }
    });
  } catch (err) {
    console.error('Error getting lead stats:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve lead metrics.'
    });
  }
}

/**
 * Protected endpoint (ADMIN ONLY): Clear dummy / test leads and clean up sample data
 */
export function clearDummyLeads(req, res) {
  try {
    const { all } = req.body || req.query || {};

    let result;
    if (all === true || all === 'true') {
      result = db.prepare('DELETE FROM leads').run();
    } else {
      result = db.prepare(`
        DELETE FROM leads 
        WHERE LOWER(customer_name) LIKE '%test%'
           OR LOWER(customer_name) LIKE '%dummy%'
           OR LOWER(customer_name) LIKE '%sample%'
           OR LOWER(email) LIKE '%test%'
           OR LOWER(email) LIKE '%example%'
           OR phone LIKE '%0000%'
           OR phone LIKE '%12345%'
           OR LOWER(source) = 'test'
           OR LOWER(message) LIKE '%test lead%'
      `).run();
    }

    const remainingCount = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.changes} test/dummy lead(s) successfully.`,
      clearedCount: result.changes,
      remainingCount
    });
  } catch (err) {
    console.error('Error clearing dummy leads:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear dummy leads.'
    });
  }
}

