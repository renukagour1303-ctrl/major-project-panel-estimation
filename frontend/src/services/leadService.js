import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function submitLead(leadData) {
  const response = await axios.post(`${API_BASE}/leads`, leadData);
  return response.data;
}

export async function fetchLeads(token, params = {}) {
  const response = await axios.get(`${API_BASE}/admin/leads`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params
  });
  return response.data;
}

export async function updateLeadStatus(token, id, status) {
  const response = await axios.put(
    `${API_BASE}/admin/leads/${id}/status`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
}

export async function fetchLeadStats(token) {
  const response = await axios.get(`${API_BASE}/admin/leads/stats`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}

export async function clearDummyLeads(token, options = {}) {
  const response = await axios.delete(`${API_BASE}/admin/leads/dummy`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: options
  });
  return response.data;
}
