import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import {
  loadRazorpayScript,
  createPaymentOrder,
  verifyPaymentSignature,
  fetchPlansConfig,
  mockCheckout
} from '../services/paymentService.js';
import { fetchAdminSettings } from '../services/settingsService.js';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function UpgradeModal({ isOpen, onClose, onUpgradeSuccess, featureName = 'custom PDF reports' }) {
  const { customerToken, customer, updateCustomer, setCustomerSession } = useCustomerAuth();
  const { token: adminOrStaffToken, user, updateUser } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [proPriceNumeric, setProPriceNumeric] = useState(499);
  const [proPriceDisplay, setProPriceDisplay] = useState('₹499 / year');

  const activeToken = customerToken || adminOrStaffToken;
  const activeUser = customer || user;

  // Dynamically load Pro price from GET /api/settings/pricing or GET /api/admin/settings
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function loadConfig() {
      try {
        const res = await fetch('/api/settings/pricing');
        const data = await res.json();
        if (isMounted && data && data.proPrice) {
          const numericVal = Number(data.proPrice);
          setProPriceNumeric(numericVal);
          setProPriceDisplay(`₹${numericVal.toLocaleString('en-IN')} / year`);
          return;
        }
      } catch (e) {
        // Fallback to fetchAdminSettings
      }

      try {
        const data = await fetchAdminSettings();
        if (isMounted && data) {
          const price = data.pro_plan_price ?? data.proPlanPrice ?? data.settings?.pro_plan_price;
          if (price !== undefined && price !== null && !isNaN(Number(price))) {
            const numericVal = Number(price);
            setProPriceNumeric(numericVal);
            setProPriceDisplay(`₹${numericVal.toLocaleString('en-IN')} / year`);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not load admin settings in UpgradeModal:', e);
      }

      // Secondary fallback to fetchPlansConfig
      try {
        const data = await fetchPlansConfig();
        if (isMounted && data && Array.isArray(data.plans)) {
          const proPlan = data.plans.find((p) => p.plan_name === 'pro');
          if (proPlan && proPlan.price) {
            setProPriceDisplay(proPlan.price);
          }
        }
      } catch (e) {
        console.warn('Could not load plan price in UpgradeModal:', e);
      }
    }
    loadConfig();
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Primary Checkout Handler: Secure Razorpay Test Mode Checkout
   */
  const handleRazorpayCheckout = async () => {
    setErrorMsg('');
    setStatusMsg('');

    if (!activeToken || !activeUser) {
      setErrorMsg('Please log in or register an account before upgrading to Sungroves Pro.');
      return;
    }

    setIsUpgrading(true);
    setStatusMsg('Initializing secure payment session...');

    try {
      // 1. Ensure Razorpay Checkout JS SDK is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Unable to connect to Razorpay payment gateway. Please check your network connection.');
      }

      // 2. Request backend order creation (server-authoritative price & SQLite persistence)
      setStatusMsg('Preparing payment order with Razorpay...');
      const orderData = await createPaymentOrder(activeToken);

      if (!orderData || !orderData.order_id) {
        throw new Error(orderData?.message || 'Failed to initialize payment order on server.');
      }

      const razorpayKeyId =
        orderData.key_id ||
        import.meta.env.VITE_RAZORPAY_KEY_ID ||
        'rzp_test_placeholder';

      setStatusMsg('Waiting for payment confirmation...');

      // 3. Configure Checkout Options
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Sungroves Solar',
        description: `Upgrade to Sungroves Pro Plan (₹${orderData.amount ? Math.round(orderData.amount / 100) : proPriceNumeric})`,
        image: '/favicon.ico',
        order_id: orderData.order_id,
        notes: {
          plan: 'pro',
          amount_inr: `₹${orderData.amount ? Math.round(orderData.amount / 100) : proPriceNumeric}`
        },
        prefill: {
          name: activeUser.name || activeUser.fullName || 'Solar Customer',
          email: activeUser.email || ''
        },
        theme: {
          color: '#10b981'
        },
        modal: {
          ondismiss: () => {
            setIsUpgrading(false);
            setStatusMsg('');
          }
        },
        handler: async (response) => {
          try {
            setStatusMsg('Cryptographically verifying payment with server...');
            setIsUpgrading(true);

            // 4. Submit response fields to /api/payments/verify-signature
            const verifyRes = await verifyPaymentSignature(activeToken, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes && verifyRes.success && verifyRes.plan === 'pro') {
              // 5. Update Auth Contexts
              if (verifyRes.customer) {
                updateCustomer(verifyRes.customer);
              }
              if (verifyRes.user) {
                updateUser(verifyRes.user);
              }

              setSuccess(true);
              setStatusMsg('');
              setTimeout(() => {
                setSuccess(false);
                onClose();
                if (onUpgradeSuccess) {
                  onUpgradeSuccess();
                }
              }, 1500);
            } else if (verifyRes && verifyRes.pending) {
              setStatusMsg('');
              setErrorMsg(verifyRes.message || 'Payment is pending bank capture. Your Pro features will unlock upon confirmation.');
            } else {
              throw new Error(verifyRes?.message || 'Payment verification failed.');
            }
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr);
            setErrorMsg(verifyErr.response?.data?.message || verifyErr.message || 'Signature verification failed.');
          } finally {
            setIsUpgrading(false);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (failRes) => {
        console.error('Razorpay payment failed:', failRes.error);
        setErrorMsg(failRes.error?.description || 'Payment was unsuccessful or cancelled by user.');
        setIsUpgrading(false);
        setStatusMsg('');
      });

      razorpayInstance.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      const serverMsg = err.response?.data?.message;
      setErrorMsg(serverMsg || err.message || 'Could not launch payment gateway.');
      setIsUpgrading(false);
      setStatusMsg('');
    }
  };

  /**
   * Fallback development mock checkout (for local testing without real keys)
   */
  const handleDevMockUpgrade = async () => {
    setIsUpgrading(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await mockCheckout('pro', activeToken);
      if (res && res.success) {
        if (res.customer) {
          updateCustomer(res.customer);
          if (res.token) setCustomerSession(res.customer, res.token);
        }
        if (res.user) {
          updateUser(res.user);
        }
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onUpgradeSuccess) onUpgradeSuccess();
        }, 1200);
      } else {
        setErrorMsg(res?.message || 'Mock checkout failed.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Mock payment failed.');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content upgrade-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(16, 185, 129, 0.15)',
          color: '#f8fafc',
          padding: '2rem',
          position: 'relative'
        }}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <CheckCircle2 size={40} className="text-emerald" style={{ color: '#10b981' }} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Welcome to Sungroves Pro!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Your account has been upgraded to <strong>Pro Plan</strong>. Unlocking your requested feature now...
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#10b981',
                marginBottom: '1rem'
              }}
            >
              <Sparkles size={14} />
              <span>PRO PLAN FEATURE</span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.6rem', color: '#f8fafc', lineHeight: 1.3 }}>
              Upgrade to Sungroves Pro
            </h2>

            <p style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              This feature is available on the Pro Plan. Upgrade now to download custom PDF reports and unlock engineering insights.
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '0.75rem'
                }}
              >
                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Pro Engineering Tier</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#10b981' }}>
                  {proPriceDisplay}
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span><strong>Download Full Branded PDF Proposals</strong> & System Sizing Reports</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>Advanced PVGIS & NASA POWER Satellite Solar Irradiance Data</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>PM Surya Ghar Direct Subsidy Processing Liaison</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>DISCOM Net-Metering Sanction Load Documentation</span>
                </li>
              </ul>
            </div>

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

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isUpgrading}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: isUpgrading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                id="razorpay-upgrade-btn"
                onClick={handleRazorpayCheckout}
                disabled={isUpgrading}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: isUpgrading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  opacity: isUpgrading ? 0.8 : 1
                }}
              >
                {isUpgrading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Upgrade to Pro — ₹{proPriceNumeric}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            {/* Development fallback simulator if credentials are not yet populated */}
            {import.meta.env.DEV && (
              <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleDevMockUpgrade}
                  disabled={isUpgrading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.75rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  [Dev Testing] Simulate Instant Upgrade via Mock Checkout
                </button>
              </div>
            )}

            <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
              🔒 Razorpay Test Mode Secured • 256-bit SSL Encryption
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
