import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sun, Lock, User, Mail, UserCheck, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { checkHasAdmin, registerAdmin } from '../../services/authService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCompany } from '../../context/CompanyContext.jsx';

export default function RegisterAdminPage() {
  const { login } = useAuth();
  const { companyConfig } = useCompany();
  const navigate = useNavigate();

  const [hasAdmin, setHasAdmin] = useState(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check on mount if an admin already exists
  useEffect(() => {
    let isMounted = true;
    async function verifyAdminExistence() {
      try {
        const res = await checkHasAdmin();
        if (isMounted) {
          setHasAdmin(res.hasAdmin);
        }
      } catch (err) {
        console.warn('Could not check admin existence:', err);
      } finally {
        if (isMounted) setIsCheckingAdmin(false);
      }
    }
    verifyAdminExistence();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Frontend validations
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setErrorMessage('All fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await registerAdmin({
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      setSuccessMessage('Admin account created successfully! Signing in...');
      
      // Auto login with the new credentials
      if (res.token && res.user) {
        localStorage.setItem('sungroves_auth_token', res.token);
        localStorage.setItem('sungroves_auth_user', JSON.stringify(res.user));
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 1200);
      } else {
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to register Admin account.');
      setIsSubmitting(false);
    }
  };

  if (isCheckingAdmin) {
    return (
      <div className="portal-auth-layout">
        <div className="portal-loading-screen">
          <div className="portal-spinner"></div>
          <p>Checking system initialization status...</p>
        </div>
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="portal-auth-layout">
        <div className="auth-card-container">
          <div className="auth-back-link">
            <Link to="/login" className="back-to-home-link">
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          </div>

          <div className="auth-card">
            <div className="auth-header">
              <div className="brand-logo-circle">
                <ShieldCheck size={28} className="text-emerald" />
              </div>
              <h2>System Setup Complete</h2>
              <p className="auth-subtitle">An Administrator account already exists for {companyConfig.companyName}.</p>
            </div>

            <div className="auth-demo-hint" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={18} className="text-gold" />
              <div>
                <p>Public Admin registration is disabled once an Admin account has been configured. Please log in with your administrator credentials.</p>
              </div>
            </div>

            <Link to="/login" className="btn-primary auth-submit-btn">
              <span>Go to Portal Login</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-auth-layout">
      <div className="auth-card-container" style={{ maxWidth: '480px' }}>
        <div className="auth-back-link">
          <Link to="/login" className="back-to-home-link">
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <div className="brand-logo-circle">
              <Sun size={28} className="text-emerald" />
            </div>
            <h2>Create Initial Admin Account</h2>
            <p className="auth-subtitle">First-time administrator setup for {companyConfig.companyName}</p>
          </div>

          {errorMessage && (
            <div className="auth-error-alert">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert-success-banner" style={{ marginBottom: '1rem' }}>
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="portal-login-form">
            <div className="form-group">
              <label htmlFor="regFullName">Full Legal Name *</label>
              <div className="input-with-icon">
                <UserCheck size={17} className="input-icon" />
                <input
                  id="regFullName"
                  type="text"
                  name="fullName"
                  placeholder="e.g. Anand Deshmukh"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="regUsername">Username *</label>
                <div className="input-with-icon">
                  <User size={17} className="input-icon" />
                  <input
                    id="regUsername"
                    type="text"
                    name="username"
                    placeholder="e.g. anand_admin"
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="username"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="regEmail">Email Address *</label>
                <div className="input-with-icon">
                  <Mail size={17} className="input-icon" />
                  <input
                    id="regEmail"
                    type="email"
                    name="email"
                    placeholder="admin@sungroves.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="regPassword">Password *</label>
                <div className="input-with-icon">
                  <Lock size={17} className="input-icon" />
                  <input
                    id="regPassword"
                    type="password"
                    name="password"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="regConfirmPassword">Confirm Password *</label>
                <div className="input-with-icon">
                  <Lock size={17} className="input-icon" />
                  <input
                    id="regConfirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-sm"></span>
                  <span>Configuring Administrator...</span>
                </>
              ) : (
                <>
                  <span>Create Administrator Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-demo-hint">
            <ShieldCheck size={16} className="text-emerald" />
            <div>
              <strong>Initial Setup Protection:</strong>
              <p>This account will be assigned full administrative rights over company settings, pricing, staff accounts, and leads.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
