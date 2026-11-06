import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  CreditCard,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Dynamically injects Razorpay Checkout SDK into the document.
 */
export function injectRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }
    if (typeof document === 'undefined') {
      return resolve(false);
    }

    const scriptSrc = 'https://checkout.razorpay.com/v1/checkout.js';
    const existing = document.querySelector(`script[src="${scriptSrc}"]`);
    if (existing) {
      if (window.Razorpay) return resolve(true);
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to inject Razorpay checkout script from checkout.razorpay.com');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Checkout Component
 * 
 * - Injects https://checkout.razorpay.com/v1/checkout.js
 * - Connects checkout handler using import.meta.env.VITE_RAZORPAY_KEY_ID
 * - Calls POST /api/payment/create-order
 * - On payment success, calls POST /api/payment/verify-payment and displays confirmation
 */
export default function Checkout({
  amount = 499,
  planName = 'Pro Engineering Tier',
  onSuccess,
  onClose,
  buttonText,
  className = ''
}) {
  const { customerToken, customer, updateCustomer } = useCustomerAuth();
  const { token: staffToken, user, updateUser } = useAuth();
  const activeToken = customerToken || staffToken;
  const activeUser = customer || user;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmationData, setConfirmationData] = useState(null);

  // Preload Razorpay Checkout script on component mount
  useEffect(() => {
    injectRazorpayScript().catch((err) => {
      console.warn('Razorpay script preloading notice:', err);
    });
  }, []);

  /**
   * Connect checkout handler using import.meta.env.VITE_RAZORPAY_KEY_ID
   */
  const handleCheckout = async () => {
    setErrorMsg('');
    setStatusMsg('');
    setIsLoading(true);

    try {
      // 1. Ensure Razorpay Checkout SDK is injected
      setStatusMsg('Connecting to payment gateway...');
      const loaded = await injectRazorpayScript();
      if (!loaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Could not load Razorpay payment SDK. Please verify your internet connection.');
      }

      // 2. Obtain key ID from environment variable
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKeyId) {
        throw new Error('Razorpay Key ID is not configured (VITE_RAZORPAY_KEY_ID is missing).');
      }

      // 3. Create order on backend via POST /api/payment/create-order
      setStatusMsg('Initializing secure order...');
      const headers = {};
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }

      const orderResponse = await axios.post(
        `${API_BASE}/payment/create-order`,
        { amount: Number(amount) },
        { headers }
      );

      const orderData = orderResponse.data;
      if (!orderData || !orderData.order_id) {
        throw new Error(orderData?.message || 'Failed to generate order ID from backend.');
      }

      // 4. Configure Razorpay checkout options
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Sungroves Solar',
        description: `${planName} (₹${amount})`,
        image: '/favicon.ico',
        order_id: orderData.order_id,
        prefill: {
          name: activeUser?.name || activeUser?.fullName || 'Valued Customer',
          email: activeUser?.email || ''
        },
        theme: {
          color: '#10b981'
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            setStatusMsg('');
          }
        },
        handler: async (response) => {
          try {
            setIsLoading(true);
            setStatusMsg('Verifying payment cryptographically with server...');

            // On payment success, call /api/payment/verify-payment
            const verifyResponse = await axios.post(
              `${API_BASE}/payment/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              { headers }
            );

            const verifyData = verifyResponse.data;

            if (verifyData && verifyData.success) {
              // Update context user profiles if Pro granted
              if (verifyData.customer && updateCustomer) {
                updateCustomer(verifyData.customer);
              }
              if (verifyData.user && updateUser) {
                updateUser(verifyData.user);
              }

              // Display confirmation
              setConfirmationData({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                amount: amount,
                plan: verifyData.plan || 'pro',
                verifiedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                message: verifyData.message || 'Payment successfully verified!'
              });

              setStatusMsg('');
              if (onSuccess) {
                onSuccess(verifyData);
              }
            } else {
              throw new Error(verifyData?.message || 'Signature verification failed.');
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            setErrorMsg(
              verifyErr.response?.data?.message ||
              verifyErr.message ||
              'Payment verification failed.'
            );
          } finally {
            setIsLoading(false);
          }
        }
      };

      setStatusMsg('Opening secure checkout dialog...');
      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on('payment.failed', (failEvent) => {
        console.error('Razorpay payment failed:', failEvent.error);
        setErrorMsg(failEvent.error?.description || 'Payment transaction failed or was cancelled.');
        setIsLoading(false);
        setStatusMsg('');
      });

      rzpInstance.open();
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMsg(
        err.response?.data?.message ||
        err.message ||
        'Failed to start payment checkout.'
      );
      setIsLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <div className={`checkout-container ${className}`}>
      {confirmationData ? (
        <div
          className="checkout-confirmation-card"
          style={{
            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            color: '#f8fafc',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.15)'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              border: '2px solid #10b981'
            }}
          >
            <CheckCircle2 size={44} style={{ color: '#10b981' }} />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '999px',
              marginBottom: '0.75rem',
              letterSpacing: '0.05em'
            }}
          >
            <Sparkles size={14} />
            <span>PAYMENT VERIFIED & CONFIRMED</span>
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f8fafc' }}>
            Welcome to Sungroves Pro!
          </h3>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
            {confirmationData.message} All premium engineering tools, PDF proposal exports, and satellite solar analytics are unlocked.
          </p>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#94a3b8' }}>Payment Reference:</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>{confirmationData.paymentId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#94a3b8' }}>Order ID:</span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{confirmationData.orderId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#94a3b8' }}>Amount Paid:</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>₹{confirmationData.amount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: '#94a3b8' }}>Verified At:</span>
              <span style={{ color: '#cbd5e1' }}>{confirmationData.verifiedAt}</span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <span>Continue with Pro Features</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="checkout-action-card">
          {statusMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93c5fd',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            id="razorpay-checkout-button"
            onClick={handleCheckout}
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '0.85rem 1.5rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.75 : 1
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <CreditCard size={18} />
                <span>{buttonText || `Pay with Razorpay — ₹${amount}`}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}
          >
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            <span>Secure 256-bit Encrypted Checkout • Razorpay Gateway</span>
          </div>
        </div>
      )}
    </div>
  );
}
