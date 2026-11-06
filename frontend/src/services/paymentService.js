import axios from 'axios';
import { loadRazorpayScript } from '../utils/razorpayLoader.js';

export { loadRazorpayScript };

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchPlansConfig() {
  try {
    const res = await axios.get(`${API_BASE}/plans/config`);
    return res.data;
  } catch (err) {
    console.warn('Failed to fetch plan permissions, using fallback configs:', err);
    return {
      success: true,
      plans: [
        {
          plan_name: 'free',
          display_name: 'Free Plan',
          price: 'Free',
          allow_pdf_export: false,
          allow_advanced_pvgis: false,
          description: 'Basic solar feasibility estimation with online results.'
        },
        {
          plan_name: 'pro',
          display_name: 'Pro Plan',
          price: 'Rs.4,999 / year',
          allow_pdf_export: true,
          allow_advanced_pvgis: true,
          description: 'Full access including PDF proposal export and advanced PVGIS data analytics.'
        }
      ]
    };
  }
}

export async function updatePlanConfig(token, planData) {
  const res = await axios.put(`${API_BASE}/plans/config`, planData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
}

/**
 * Initiates a server-authoritative Razorpay payment order.
 * Accepts optional amount and user token.
 */
export async function createPaymentOrder(token = null, amount = null) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const payload = amount ? { amount } : {};
  const res = await axios.post(`${API_BASE}/payment/create-order`, payload, { headers });
  return res.data;
}

/**
 * Creates order via POST /api/payment/create-order
 */
export async function createOrder(amount, token = null) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await axios.post(`${API_BASE}/payment/create-order`, { amount }, { headers });
  return res.data;
}

/**
 * Submits Razorpay payment callback details to backend for cryptographic HMAC verification
 * and transactional plan upgrade via POST /api/payment/verify-payment.
 */
export async function verifyPayment(paymentData, token = null) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await axios.post(`${API_BASE}/payment/verify-payment`, paymentData, { headers });
  return res.data;
}

/**
 * Submits Razorpay payment callback details to backend for cryptographic HMAC verification
 * and transactional plan upgrade.
 */
export async function verifyPaymentSignature(token, paymentData) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await axios.post(
    `${API_BASE}/payment/verify-payment`,
    paymentData,
    { headers }
  );
  return res.data;
}

/**
 * Development-only simulated payment endpoint (blocked in production).
 */
export async function mockCheckout(plan = 'pro', token = null) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await axios.post(`${API_BASE}/payments/mock-checkout`, { plan }, { headers });
  return res.data;
}
