import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Register a new public customer
 */
export async function registerCustomer(name, email, password) {
  const response = await axios.post(`${API_BASE}/customer/register`, {
    name,
    email,
    password
  });
  return response.data;
}

/**
 * Log in a customer
 */
export async function loginCustomer(email, password) {
  const response = await axios.post(`${API_BASE}/customer/login`, {
    email,
    password
  });
  return response.data;
}

/**
 * Fetch current authenticated customer profile
 */
export async function fetchCustomerProfile(token) {
  const response = await axios.get(`${API_BASE}/customer/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}

/**
 * Request password reset email
 */
export async function forgotCustomerPassword(email) {
  const response = await axios.post(`${API_BASE}/customer/forgot-password`, {
    email
  });
  return response.data;
}

/**
 * Submit new password with reset token
 */
export async function resetCustomerPassword(token, newPassword) {
  const response = await axios.post(`${API_BASE}/customer/reset-password`, {
    token,
    newPassword
  });
  return response.data;
}
