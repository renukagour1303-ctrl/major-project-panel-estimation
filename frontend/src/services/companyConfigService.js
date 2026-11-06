import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchCompanyConfig() {
  try {
    const response = await axios.get(`${API_BASE}/config`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  } catch (err) {
    console.warn('Failed to fetch dynamic company config, using fallbacks:', err);
    return {
      companyName: 'Sungroves Innovations LLP',
      phone: '+91 98765 43210',
      email: 'support@sungroves.com',
      address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
      operatingHours: 'Mon - Sat: 9:00 AM - 6:30 PM',
      freeTrialInfo: '14-Day Free Feasibility Consultation & Remote Rooftop Assessment',
      proPrice: '₹4,999 / year'
    };
  }
}

export async function updateCompanyConfig(token, data) {
  const response = await axios.put(`${API_BASE}/admin/config`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}
