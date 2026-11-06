import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Shield } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';

export default function CustomerLoginPage() {
  const { companyConfig } = useCompany();
  const { customerLogin } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await customerLogin(email.trim(), password);
      // On success -> redirect to homepage
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 
        err.message || 
        'Invalid credentials. Please verify your email and password.'
      );
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
            <span>Back to Solar Calculator</span>
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <div className="brand-logo-circle">
              <Sun size={28} className="text-emerald" />
            </div>
            <h2>{companyConfig.companyName || 'Sungroves Innovations LLP'}</h2>
            <p className="auth-subtitle">Customer Account Login</p>
          </div>

          {errorMessage && (
            <div className="auth-error-alert" style={{ marginBottom: '18px' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="portal-login-form">
            <div className="form-group">
              <label htmlFor="customerEmail">Email Address *</label>
              <div className="input-with-icon">
                <Mail size={17} className="input-icon" />
                <input
                  id="customerEmail"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="customerPassword" style={{ margin: 0 }}>Password *</label>
                <Link 
                  to="/forgot-password" 
                  style={{ color: '#059669', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  id="customerPassword"
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
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="setup-admin-footer-link" style={{ marginTop: '20px', textAlign: 'center' }}>
            <span>Don't have an account yet? </span>
            <Link to="/register" style={{ color: '#059669', fontWeight: '600' }}>Create an Account</Link>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <Link 
              to="/admin" 
              style={{ color: '#94a3b8', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <Shield size={14} />
              <span>Staff & Admin Portal Login &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
