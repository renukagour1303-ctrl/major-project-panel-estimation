import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Sun, Lock, User, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft, UserPlus, Sparkles, Mail, KeyRound, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCompany } from '../../context/CompanyContext.jsx';
import { checkHasAdmin, requestAdminPasswordReset, resetAdminPassword } from '../../services/authService.js';

export default function LoginPage() {
  const { login } = useAuth();
  const { companyConfig } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasAdmin, setHasAdmin] = useState(true); // default true to avoid flicker

  // Forgot password modal states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = enter email, 2 = enter OTP & new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const from = location.state?.from?.pathname || null;

  // Check whether an admin account exists
  useEffect(() => {
    let isMounted = true;
    async function verifyAdminExistence() {
      try {
        const res = await checkHasAdmin();
        if (isMounted && typeof res.hasAdmin === 'boolean') {
          setHasAdmin(res.hasAdmin);
        }
      } catch (err) {
        console.warn('Could not verify admin status:', err);
      }
    }
    verifyAdminExistence();
    return () => { isMounted = false; };
  }, []);

  const openForgotModal = () => {
    // If username field looks like an email, pre-fill it
    if (username && username.includes('@')) {
      setResetEmail(username.trim());
    }
    setResetStep(1);
    setModalError('');
    setModalSuccess('');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setIsForgotModalOpen(true);
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setModalError('Please enter your administrator email address.');
      return;
    }

    setIsResetSubmitting(true);
    setModalError('');
    setModalSuccess('');

    try {
      const res = await requestAdminPasswordReset(resetEmail.trim());
      // If server provided dev token in response for quick local testing, prefill OTP
      if (res.devResetToken) {
        setResetOtp(res.devResetToken);
      }
      setModalSuccess(res.message || 'Verification code generated! Please check your email or console.');
      setResetStep(2);
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to request password reset.');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleExecuteReset = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!resetOtp.trim()) {
      setModalError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setModalError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setModalError('Passwords do not match. Please verify.');
      return;
    }

    setIsResetSubmitting(true);
    try {
      const res = await resetAdminPassword(resetEmail.trim(), resetOtp.trim(), newPassword);
      setModalSuccess(res.message || 'Password successfully updated! Redirecting to login...');
      // Autofill login form
      setUsername(resetEmail.trim());
      setPassword(newPassword);
      setSuccessMessage('Password reset successfully! Your credentials have been auto-filled. Click Sign In to continue.');
      setTimeout(() => {
        setIsForgotModalOpen(false);
      }, 1500);
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter your username/email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await login(username.trim(), password);
      const userRole = (res.user?.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        navigate(from || '/admin/dashboard', { replace: true });
      } else {
        navigate(from || '/staff/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="portal-auth-layout">
      <div className="auth-card-container">
        <div className="auth-back-link">
          <Link to="/" className="back-to-home-link">
            <ArrowLeft size={16} />
            <span>Back to Public Calculator</span>
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <div className="brand-logo-circle">
              <Sun size={28} className="text-emerald" />
            </div>
            <h2>{companyConfig.companyName || 'Sungroves Innovations LLP'}</h2>
            <p className="auth-subtitle">Enterprise Admin & Staff Management Portal</p>
          </div>

          {/* First-time setup callout when no admin exists */}
          {!hasAdmin && (
            <div className="first-time-setup-banner">
              <div className="ftsb-icon">
                <Sparkles size={20} className="text-emerald" />
              </div>
              <div className="ftsb-text">
                <strong>Initial System Setup Required</strong>
                <p>No administrator account has been created yet. Create your company Admin account to get started.</p>
                <Link to="/admin/setup" className="btn-setup-admin">
                  <UserPlus size={15} />
                  <span>Create Admin Account</span>
                </Link>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="auth-error-alert">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert-success-banner" style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="portal-login-form">
            <div className="form-group">
              <label htmlFor="portalUsername">Username or Email</label>
              <div className="input-with-icon">
                <User size={17} className="input-icon" />
                <input
                  id="portalUsername"
                  type="text"
                  placeholder="Username or Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="portalPassword" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={openForgotModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  id="portalPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-sm"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Additional footer link for Create Admin when not configured */}
          {!hasAdmin && (
            <div className="setup-admin-footer-link">
              <span>First time setting up? </span>
              <Link to="/register-admin">Create Admin Account</Link>
            </div>
          )}

          <div className="auth-demo-hint">
            <ShieldCheck size={16} className="text-emerald" />
            <div>
              <strong>Secure Role-Based Access:</strong>
              <p>Admin accounts manage company settings and staff. Staff accounts manage customer leads.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin Forgot & Reset Password Modal ──────────────────────────────── */}
      {isForgotModalOpen && (
        <div className="modal-overlay" onClick={() => !isResetSubmitting && setIsForgotModalOpen(false)}>
          <div 
            className="modal-content staff-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  {resetStep === 1 ? 'Reset Admin Password' : 'Enter Verification OTP'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  {resetStep === 1 
                    ? 'Enter your registered administrator email to receive a 6-digit verification code.' 
                    : `Enter the 6-digit OTP code sent for ${resetEmail} and your new password.`}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsForgotModalOpen(false)}
                disabled={isResetSubmitting}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="alert-error-banner" style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', padding: '0.65rem 0.85rem' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="alert-success-banner" style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', padding: '0.65rem 0.85rem' }}>
                <CheckCircle2 size={16} />
                <span>{modalSuccess}</span>
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestCode} className="contact-form">
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="resetAdminEmail">Admin Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="resetAdminEmail"
                      type="email"
                      placeholder="e.g. admin@sungroves.in"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setIsForgotModalOpen(false)}
                    disabled={isResetSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isResetSubmitting}
                  >
                    {isResetSubmitting ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExecuteReset} className="contact-form">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="resetOtp">6-Digit Verification Code (OTP) *</label>
                  <div className="input-with-icon">
                    <KeyRound size={16} className="input-icon" />
                    <input
                      id="resetOtp"
                      type="text"
                      placeholder="e.g. 582914"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      maxLength={6}
                      required
                      autoFocus
                      style={{ letterSpacing: '2px', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="resetNewPassword">New Password (Min 6 chars) *</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="resetNewPassword"
                      type="password"
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="resetConfirmPassword">Confirm New Password *</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="resetConfirmPassword"
                      type="password"
                      placeholder="••••••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => { setResetStep(1); setModalError(''); setModalSuccess(''); }}
                    disabled={isResetSubmitting}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isResetSubmitting}
                  >
                    {isResetSubmitting ? 'Saving...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
