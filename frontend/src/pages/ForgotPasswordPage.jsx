import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { forgotCustomerPassword } from '../services/customerAuthService.js';

export default function ForgotPasswordPage() {
  const { companyConfig } = useCompany();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await forgotCustomerPassword(email.trim());
      // Always show exact same success message:
      setSubmittedMessage(res.message || 'If an account exists, a reset link was sent.');
    } catch (err) {
      // Even if network or server error, never reveal if email exists
      setSubmittedMessage('If an account exists, a reset link was sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="portal-auth-layout">
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
              <Sun size={28} className="text-emerald" />
            </div>
            <h2>{companyConfig.companyName || 'Sungroves Innovations LLP'}</h2>
            <p className="auth-subtitle">Reset Your Password</p>
          </div>

          {submittedMessage ? (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(5, 150, 105, 0.15)', color: '#10b981', marginBottom: '16px' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '8px' }}>Check Your Email</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                {submittedMessage}
              </p>
              <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
                Please check your inbox and spam folder. The password reset link will expire in 15 minutes.
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none', padding: '10px 24px' }}>
                <span>Return to Sign In</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                Enter the email address associated with your customer account and we'll send you a secure link to reset your password.
              </p>

              {errorMessage && (
                <div className="auth-error-alert" style={{ marginBottom: '18px' }}>
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="portal-login-form">
                <div className="form-group">
                  <label htmlFor="forgotEmail">Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={17} className="input-icon" />
                    <input
                      id="forgotEmail"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-sm"></span>
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="setup-admin-footer-link" style={{ marginTop: '20px', textAlign: 'center' }}>
                <span>Remember your password? </span>
                <Link to="/login" style={{ color: '#059669', fontWeight: '600' }}>Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
