import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function checkHasAdmin() {
  const response = await axios.get(`${API_BASE}/auth/has-admin`);
  return response.data;
}

export async function registerAdmin(adminData) {
  const response = await axios.post(`${API_BASE}/auth/register-admin`, adminData);
  return response.data;
}

export async function loginUser(username, password) {
  const response = await axios.post(`${API_BASE}/admin/login`, {
    username,
    password
  });
  return response.data;
}

export async function requestAdminPasswordReset(email) {
  const response = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
  return response.data;
}

export async function resetAdminPassword(email, resetToken, newPassword) {
  const response = await axios.post(`${API_BASE}/auth/reset-password`, {
    email,
    resetToken,
    newPassword
  });
  return response.data;
}

export async function fetchCurrentUser(token) {
  const response = await axios.get(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}

export async function fetchStaffList(token) {
  const response = await axios.get(`${API_BASE}/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}

export async function createStaffMember(token, userData) {
  const response = await axios.post(`${API_BASE}/admin/users/create`, userData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}

export async function toggleStaffStatus(token, id, isActive) {
  const response = await axios.put(
    `${API_BASE}/admin/users/${id}/status`,
    { isActive },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
}

export async function deleteStaffMember(token, id) {
  const response = await axios.delete(`${API_BASE}/admin/users/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}
