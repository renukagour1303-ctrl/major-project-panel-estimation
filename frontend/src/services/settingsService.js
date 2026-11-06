import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchSiteSettings() {
  try {
    const res = await axios.get(`${API_BASE}/settings`);
    if (res.data?.settings) {
      return res.data.settings;
    }
    return res.data;
  } catch (err) {
    console.warn('Failed to fetch dynamic site settings, using sensible fallbacks:', err);
    return {
      company_email: 'support@sungroves.com',
      company_phone: '+91 98765 43210',
      office_address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
      business_hours: 'Mon - Sat: 9:00 AM - 6:30 PM',
      pro_plan_price: 499
    };
  }
}

export async function updateSiteSettings(token, data) {
  const res = await axios.put(`${API_BASE}/settings`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
}

/**
 * GET /api/admin/settings
 * Retrieves active site settings including pro_plan_price
 */
export async function fetchAdminSettings() {
  try {
    const res = await axios.get(`${API_BASE}/admin/settings`);
    return res.data;
  } catch (err) {
    console.warn('Failed to fetch admin settings, fallback:', err);
    return {
      success: true,
      pro_plan_price: 499,
      company_email: 'support@sungroves.com',
      company_phone: '+91 98765 43210',
      office_address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
      business_hours: 'Mon - Sat: 9:00 AM - 6:30 PM'
    };
  }
}

/**
 * POST /api/admin/settings
 * Updates pro_plan_price in SQLite (requires admin role/auth middleware)
 */
export async function updateAdminSettings(token, data) {
  const res = await axios.post(`${API_BASE}/admin/settings`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
}
