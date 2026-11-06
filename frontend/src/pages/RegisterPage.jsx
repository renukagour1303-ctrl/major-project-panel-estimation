import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, User, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { registerCustomer } from '../services/customerAuthService.js';

export default function RegisterPage() {
  const { companyConfig } = useCompany();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    // Client-side validations
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await registerCustomer(name.trim(), email.trim(), password);
      setSuccessMessage(res.message || 'Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { state: { registeredEmail: email.trim() } });
      }, 1500);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 
        err.message || 
        'An error occurred during registration. Please try again.'
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
            <span>Back to Calculator</span>
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <div className="brand-logo-circle">
              <Sun size={28} className="text-emerald" />
            </div>
            <h2>{companyConfig.companyName || 'Sungroves Innovations LLP'}</h2>
            <p className="auth-subtitle">Create your Customer Account</p>
          </div>

          {successMessage && (
            <div className="alert-success-banner" style={{ marginBottom: '18px' }}>
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="auth-error-alert" style={{ marginBottom: '18px' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="portal-login-form">
            <div className="form-group">
              <label htmlFor="regName">Full Name *</label>
              <div className="input-with-icon">
                <User size={17} className="input-icon" />
                <input
                  id="regName"
                  type="text"
                  name="name"
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  required
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
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="regPassword">Password * (Min. 8 characters)</label>
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
                />
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting || !!successMessage}>
              {isSubmitting ? (
                <>
                  <span className="spinner-sm"></span>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="setup-admin-footer-link" style={{ marginTop: '20px', textAlign: 'center' }}>
            <span>Already have an account? </span>
            <Link to="/login" style={{ color: '#059669', fontWeight: '600' }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
