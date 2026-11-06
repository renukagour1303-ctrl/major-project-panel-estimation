import db from '../database/db.js';

/**
 * Public endpoint: Get company settings & dynamic pricing
 */
export function getPublicConfig(req, res) {
  try {
    const config = db.prepare(`
      SELECT 
        company_name as companyName,
        phone,
        email,
        address,
        operating_hours as operatingHours,
        free_trial_info as freeTrialInfo,
        pro_price as proPrice,
        updated_at as updatedAt
      FROM company_settings 
      ORDER BY id DESC 
      LIMIT 1
    `).get();

    if (!config) {
      return res.status(200).json({
        success: true,
        data: {
          companyName: 'Sungroves Innovations LLP',
          phone: '+91 98765 43210',
          email: 'support@sungroves.com',
          address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
          operatingHours: 'Mon - Sat: 9:00 AM - 6:30 PM',
          freeTrialInfo: '14-Day Free Feasibility Consultation & Remote Rooftop Assessment',
          proPrice: '₹4,999 / year',
          updatedAt: new Date().toISOString()
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (err) {
    console.error('Error fetching company config:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve company settings.'
    });
  }
}

/**
 * Protected endpoint (ADMIN ONLY): Update company settings & dynamic pricing
 */
export function updateConfig(req, res) {
  try {
    const {
      companyName,
      phone,
      email,
      address,
      operatingHours,
      freeTrialInfo,
      proPrice
    } = req.body;

    // Fetch existing configuration to allow partial updates
    const existing = db.prepare('SELECT * FROM company_settings ORDER BY id DESC LIMIT 1').get();

    const updatedCompanyName = (companyName !== undefined && companyName.trim()) ? companyName.trim() : (existing?.company_name || 'Sungroves Innovations LLP');
    const updatedPhone = (phone !== undefined && phone.trim()) ? phone.trim() : (existing?.phone || '+91 98765 43210');
    const updatedEmail = (email !== undefined && email.trim()) ? email.trim() : (existing?.email || 'support@sungroves.com');
    const updatedAddress = (address !== undefined && address.trim()) ? address.trim() : (existing?.address || 'Chhatrapati Sambhajinagar, Maharashtra, India');
    const updatedHours = (operatingHours !== undefined && operatingHours.trim()) ? operatingHours.trim() : (existing?.operating_hours || 'Mon - Sat: 9:00 AM - 6:30 PM');
    const updatedTrial = (freeTrialInfo !== undefined && freeTrialInfo.trim()) ? freeTrialInfo.trim() : (existing?.free_trial_info || '14-Day Free Feasibility Consultation');
    const updatedProPrice = (proPrice !== undefined && proPrice.trim()) ? proPrice.trim() : (existing?.pro_price || '₹4,999 / year');
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE company_settings
        SET company_name = ?, phone = ?, email = ?, address = ?, operating_hours = ?, free_trial_info = ?, pro_price = ?, updated_at = ?
        WHERE id = ?
      `).run(
        updatedCompanyName,
        updatedPhone,
        updatedEmail,
        updatedAddress,
        updatedHours,
        updatedTrial,
        updatedProPrice,
        now,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO company_settings (
          company_name, phone, email, address, operating_hours, free_trial_info, pro_price, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        updatedCompanyName,
        updatedPhone,
        updatedEmail,
        updatedAddress,
        updatedHours,
        updatedTrial,
        updatedProPrice,
        now
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Company configuration successfully updated.',
      data: {
        companyName: updatedCompanyName,
        phone: updatedPhone,
        email: updatedEmail,
        address: updatedAddress,
        operatingHours: updatedHours,
        freeTrialInfo: updatedTrial,
        proPrice: updatedProPrice,
        updatedAt: now
      }
    });
  } catch (err) {
    console.error('Error updating company config:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update company configuration.'
    });
  }
}
