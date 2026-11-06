import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Sun, Lock, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { resetCustomerPassword } from '../services/customerAuthService.js';

export default function ResetPasswordPage() {
  const { companyConfig } = useCompany();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // If no token in URL -> redirect to /forgot-password
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your entries.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await resetCustomerPassword(token, newPassword);
      setSuccessToast('Password reset successful');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message === 'Invalid or expired reset token'
          ? 'Invalid or expired link'
          : err.response?.data?.message || 'Invalid or expired link'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="portal-auth-layout">
      {/* Toast Notification */}
      {successToast && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: '#064e3b',
            color: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '14px 20px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '15px',
            fontWeight: '600',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <CheckCircle2 size={20} color="#34d399" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="auth-card-container">
        <div className="auth-back-link">
          <Link to="/login" className="back-to-home-link">
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <div className="brand-logo-circle">
              <KeyRound size={28} className="text-emerald" />
            </div>
            <h2>{companyConfig.companyName || 'Sungroves Innovations LLP'}</h2>
            <p className="auth-subtitle">Set a New Password</p>
          </div>

          {errorMessage && (
            <div className="auth-error-alert" style={{ marginBottom: '18px' }}>
              <AlertCircle size={18} />
              <div>
                <span>{errorMessage}</span>
                {errorMessage.includes('Invalid or expired') && (
                  <div style={{ marginTop: '8px' }}>
                    <Link to="/forgot-password" style={{ color: '#f87171', fontWeight: '600', textDecoration: 'underline' }}>
                      Request a new password reset link &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {successToast && (
            <div className="alert-success-banner" style={{ marginBottom: '18px' }}>
              <CheckCircle2 size={18} />
              <span>Password reset successful! Redirecting to login in 2 seconds...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="portal-login-form">
            <div className="form-group">
              <label htmlFor="resetNewPassword">New Password * (Min. 8 characters)</label>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  id="resetNewPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="resetConfirmPassword">Confirm New Password *</label>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  id="resetConfirmPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting || !!successToast}>
              {isSubmitting ? (
                <>
                  <span className="spinner-sm"></span>
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="setup-admin-footer-link" style={{ marginTop: '20px', textAlign: 'center' }}>
            <span>Back to </span>
            <Link to="/login" style={{ color: '#059669', fontWeight: '600' }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
