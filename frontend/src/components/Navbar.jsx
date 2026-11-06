import React from 'react';
import { Sun, PhoneCall, Sparkles, LogIn, UserPlus, LogOut, User, LayoutDashboard, Film, Star } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ backendOnline, onOpenContact, onOpenPricing }) {
  const { companyConfig } = useCompany();
  const { isAuthenticated, user } = useAuth();
  const { customer, isCustomerLoggedIn, customerLogout } = useCustomerAuth();
  const navigate = useNavigate();

  const handleScrollToVideo = () => {
    const el = document.getElementById('demo-video-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToReviews = () => {
    const el = document.getElementById('customer-reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#customer-reviews-section');
    }
  };

  return (
    <header className="navbar">
      <div className="brand-wrapper" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <div className="brand-icon">
          <Sun size={24} />
        </div>
        <div className="brand-info">
          <h1>{companyConfig.companyName || 'Sungroves Innovations LLP'}</h1>
          <span>AI-Powered Solar Calculator Web Tool</span>
        </div>
      </div>

      <div className="nav-center-links">
        <button type="button" className="nav-link-btn" onClick={onOpenPricing}>
          <Sparkles size={15} className="text-emerald" />
          <span>Plans & Pricing</span>
        </button>

        <button type="button" className="nav-link-btn" onClick={handleScrollToReviews}>
          <Star size={15} color="#f59e0b" />
          <span>Reviews</span>
        </button>

        <button type="button" className="nav-link-btn" onClick={handleScrollToVideo}>
          <Film size={15} />
          <span>Demo Video</span>
        </button>

        <button type="button" className="nav-link-btn" onClick={onOpenContact}>
          <PhoneCall size={15} />
          <span>Contact Us</span>
        </button>
      </div>
      
      <div className="nav-right">
        <div className="badge-wrapper">
          <span className={`status-badge ${backendOnline ? 'online' : 'offline'}`}>
            <span className="pulse-dot"></span>
            {backendOnline ? 'API Connected' : 'API Offline'}
          </span>
        </div>

        {/* Customer Authentication State */}
        {isCustomerLoggedIn ? (
          <div className="customer-nav-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="customer-user-chip" title={customer?.email}>
              <User size={14} className="text-emerald" />
              <span className="customer-user-name">{customer?.name}</span>
            </div>
            <button 
              type="button" 
              onClick={customerLogout} 
              className="btn-customer-logout"
              title="Logout from customer account"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="customer-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/login" className="btn-customer-login" id="nav-login-btn">
              <LogIn size={15} />
              <span>Login</span>
            </Link>
            <Link to="/register" className="btn-customer-register" id="nav-register-btn">
              <UserPlus size={15} />
              <span>Register</span>
            </Link>
          </div>
        )}

        {/* Existing Admin / Staff Portal Quick Access when authenticated */}
        {isAuthenticated && (
          <Link
            to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/staff/dashboard'}
            className="btn-portal-badge"
            title={`Logged in as ${user?.username} (${user?.role})`}
          >
            <LayoutDashboard size={14} />
            <span>Portal</span>
          </Link>
        )}
      </div>
    </header>
  );
}
