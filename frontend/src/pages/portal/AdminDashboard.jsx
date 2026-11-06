import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Inbox, 
  IndianRupee, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Sun, 
  ShieldCheck, 
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  Star,
  Sliders,
  Settings,
  Lock,
  Unlock,
  Check,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCompany } from '../../context/CompanyContext.jsx';
import { fetchSiteSettings, updateSiteSettings, fetchAdminSettings, updateAdminSettings } from '../../services/settingsService.js';
import { fetchPlansConfig, updatePlanConfig } from '../../services/paymentService.js';
import { fetchStaffList, createStaffMember, toggleStaffStatus, deleteStaffMember } from '../../services/authService.js';
import { fetchLeads, updateLeadStatus, fetchLeadStats, clearDummyLeads } from '../../services/leadService.js';
import { fetchReviews, deleteReview, approveReview, getReviewImageUrl } from '../../services/reviewService.js';

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const { companyConfig, refreshCompanyConfig } = useCompany();
  const navigate = useNavigate();

  // 5 Distinct Tabs: 'plans', 'leads', 'settings', 'reviews', 'admins'
  const [activeTab, setActiveTab] = useState('plans');

  // ── Tab 1: Plan Configurator State ──────────────────────────────────────────
  const [plans, setPlans] = useState([
    {
      plan_name: 'free',
      display_name: 'Free Plan',
      price: 'Free',
      allow_pdf_export: false,
      lock_pdf_export: true,
      lock_advanced_financials: false,
      lock_roof_tracing: false,
      allow_advanced_pvgis: false,
      description: 'Basic solar feasibility estimation with online results.'
    },
    {
      plan_name: 'pro',
      display_name: 'Pro Plan',
      price: '₹4,999 / year',
      allow_pdf_export: true,
      lock_pdf_export: false,
      lock_advanced_financials: false,
      lock_roof_tracing: false,
      allow_advanced_pvgis: true,
      description: 'Full access including PDF proposal export and advanced PVGIS data analytics.'
    }
  ]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSavingPlans, setIsSavingPlans] = useState(false);
  const [plansSuccessMsg, setPlansSuccessMsg] = useState('');
  const [plansErrorMsg, setPlansErrorMsg] = useState('');

  const loadPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const res = await fetchPlansConfig();
      if (res && res.plans && Array.isArray(res.plans)) {
        setPlans(res.plans);
      }
    } catch (err) {
      console.warn('Failed to load plans config:', err);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handlePlanChange = (planName, field, value) => {
    setPlans(prev => prev.map(p => {
      if (p.plan_name === planName) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleTogglePlanLock = (planName, lockField) => {
    setPlans(prev => prev.map(p => {
      if (p.plan_name === planName) {
        const currentVal = Boolean(p[lockField]);
        const updated = { ...p, [lockField]: !currentVal };
        if (lockField === 'lock_pdf_export') {
          updated.allow_pdf_export = currentVal; // if lock was true, now false -> allow is true
        }
        return updated;
      }
      return p;
    }));
  };

  const handleSavePlans = async (e) => {
    e.preventDefault();
    setIsSavingPlans(true);
    setPlansSuccessMsg('');
    setPlansErrorMsg('');

    try {
      await updatePlanConfig(token, { plans });
      setPlansSuccessMsg('Subscription plans and feature locking permissions updated successfully!');
      setTimeout(() => setPlansSuccessMsg(''), 4500);
    } catch (err) {
      setPlansErrorMsg(err.response?.data?.message || 'Failed to update plan configuration.');
    } finally {
      setIsSavingPlans(false);
    }
  };

  // ── Tab 2: Leads & Inquiries State ─────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [leadStats, setLeadStats] = useState(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState('All'); // 'All', 'pending', 'contacted', 'Closed'
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  // Dummy Leads Cleanup State
  const [isClearingDummy, setIsClearingDummy] = useState(false);
  const [dummyCleanupModalOpen, setDummyCleanupModalOpen] = useState(false);
  const [leadCleanupSuccessMsg, setLeadCleanupSuccessMsg] = useState('');
  const [leadCleanupErrorMsg, setLeadCleanupErrorMsg] = useState('');

  const loadLeads = async () => {
    if (!token) return;
    setIsLoadingLeads(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetchLeads(token, { status: leadStatusFilter, search: leadSearch }),
        fetchLeadStats(token)
      ]);
      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (statsRes.success) setLeadStats(statsRes.stats || null);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const handleClearDummyLeads = async (clearAll = false) => {
    setIsClearingDummy(true);
    setLeadCleanupSuccessMsg('');
    setLeadCleanupErrorMsg('');
    try {
      const res = await clearDummyLeads(token, { all: clearAll });
      setLeadCleanupSuccessMsg(res.message || 'Test dummy leads cleared successfully!');
      setDummyCleanupModalOpen(false);
      await loadLeads();
      setTimeout(() => setLeadCleanupSuccessMsg(''), 5000);
    } catch (err) {
      setLeadCleanupErrorMsg(err.response?.data?.message || 'Failed to clear dummy leads.');
    } finally {
      setIsClearingDummy(false);
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await updateLeadStatus(token, leadId, newStatus);
      await loadLeads();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert('Failed to update lead status.');
    }
  };

  // ── Tab 3: Site Settings State ─────────────────────────────────────────────
  const [siteSettingsForm, setSiteSettingsForm] = useState({
    company_email: '',
    company_phone: '',
    office_address: '',
    business_hours: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState('');

  const loadSettings = async () => {
    try {
      const data = await fetchSiteSettings();
      if (data) {
        setSiteSettingsForm({
          company_email: data.company_email || data.companyEmail || companyConfig?.email || 'support@sungroves.com',
          company_phone: data.company_phone || data.companyPhone || companyConfig?.phone || '+91 98765 43210',
          office_address: data.office_address || data.officeAddress || companyConfig?.address || 'Chhatrapati Sambhajinagar, Maharashtra, India',
          business_hours: data.business_hours || data.businessHours || companyConfig?.operatingHours || 'Mon - Sat: 9:00 AM - 6:30 PM'
        });
      }
    } catch (err) {
      console.warn('Failed to load site settings:', err);
    }
  };

  const handleSiteSettingsChange = (e) => {
    const { name, value } = e.target;
    setSiteSettingsForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSiteSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg('');
    setSettingsErrorMsg('');

    try {
      await updateSiteSettings(token, siteSettingsForm);
      await refreshCompanyConfig();
      setSettingsSuccessMsg('Site settings updated successfully and synced with public Footer & Contact views!');
      setTimeout(() => setSettingsSuccessMsg(''), 4500);
    } catch (err) {
      setSettingsErrorMsg(err.response?.data?.message || 'Failed to update site settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ── Pricing Settings State ────────────────────────────────────────────────
  const [proPlanPrice, setProPlanPrice] = useState(499);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceSuccessMsg, setPriceSuccessMsg] = useState('');
  const [priceErrorMsg, setPriceErrorMsg] = useState('');

  const loadPricingSettings = async () => {
    setIsLoadingPricing(true);
    setPriceErrorMsg('');
    try {
      const data = await fetchAdminSettings();
      if (data) {
        const val = data.pro_plan_price ?? data.proPlanPrice ?? data.settings?.pro_plan_price;
        if (val !== undefined && val !== null && !isNaN(Number(val))) {
          setProPlanPrice(Number(val));
        }
      }
    } catch (err) {
      console.warn('Failed to load pricing settings:', err);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const handleSavePrice = async (e) => {
    if (e) e.preventDefault();
    const numeric = Number(proPlanPrice);
    if (isNaN(numeric) || numeric <= 0) {
      setPriceErrorMsg('Please enter a valid positive numeric price for the Pro Plan.');
      return;
    }

    setIsSavingPrice(true);
    setPriceSuccessMsg('');
    setPriceErrorMsg('');

    try {
      const res = await updateAdminSettings(token, { pro_plan_price: numeric });
      const newPrice = res?.pro_plan_price ?? res?.proPlanPrice ?? numeric;
      setProPlanPrice(Number(newPrice));
      setPriceSuccessMsg(`Pro Plan price updated successfully to ₹${newPrice}! Razorpay payment orders and checkout modal will now dynamically charge ₹${newPrice}.`);
      if (refreshCompanyConfig) await refreshCompanyConfig();
      if (loadPlans) await loadPlans();
      setTimeout(() => setPriceSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to update Pro Plan price:', err);
      setPriceErrorMsg(err.response?.data?.message || err.message || 'Failed to update Pro Plan price.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const renderPricingSettingsSection = () => (
    <div className="pricing-settings-card" style={{
      background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.75) 100%)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      borderRadius: '14px',
      padding: '1.75rem',
      marginBottom: '2rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)'
    }}>
      <div className="card-header-bar flex-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '6px', borderRadius: '8px', color: '#10b981' }}>
              <IndianRupee size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>Pricing & Subscription Settings</h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', textTransform: 'uppercase' }}>
              Razorpay Order Sync
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
            Configure dynamic pricing for the Sungroves Turnkey Pro Plan. The configured amount is securely converted to paise and passed to the Razorpay checkout modal.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={loadPricingSettings}
          disabled={isLoadingPricing}
          title="Reload Pricing Settings"
        >
          <RefreshCw size={15} className={isLoadingPricing ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {priceSuccessMsg && (
        <div className="alert-success-banner" style={{ margin: '1rem 0' }}>
          <CheckCircle2 size={18} />
          <span>{priceSuccessMsg}</span>
        </div>
      )}

      {priceErrorMsg && (
        <div className="alert-error-banner" style={{ margin: '1rem 0' }}>
          <AlertCircle size={18} />
          <span>{priceErrorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSavePrice} className="portal-form">
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="pro_plan_price">Pro Plan Price (₹) *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', fontWeight: 700, fontSize: '1.1rem' }}>₹</span>
              <input
                id="pro_plan_price"
                type="number"
                name="pro_plan_price"
                min="1"
                step="1"
                placeholder="499"
                value={proPlanPrice}
                onChange={(e) => setProPlanPrice(e.target.value)}
                required
                style={{ paddingLeft: '32px', fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}
              />
            </div>
            <span className="field-hint">
              Active price in INR (e.g. 499 = ₹499). Multiplied by 100 on the server into {(Number(proPlanPrice) || 0) * 100} paise for Razorpay order creation.
            </span>
          </div>

          <div className="form-group" style={{ justifyContent: 'center' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px dashed rgba(16, 185, 129, 0.4)',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Payment Gateway Preview</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Customer Amount:</span>
                <strong style={{ color: '#10b981', fontSize: '1.15rem' }}>₹{Number(proPlanPrice) || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Razorpay Charge:</span>
                <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>{(Number(proPlanPrice) || 0) * 100} paise</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions-right">
          <button
            type="submit"
            id="save-settings-btn"
            className="btn-primary"
            disabled={isSavingPrice || isLoadingPricing}
          >
            {isSavingPrice ? (
              <>
                <span className="spinner-sm"></span>
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // ── Tab 4: Review Moderation State ─────────────────────────────────────────
  const [adminReviews, setAdminReviews] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all', 'pending', 'approved'
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewActionMsg, setReviewActionMsg] = useState('');
  const [reviewActionError, setReviewActionError] = useState('');
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [isApprovingReviewId, setIsApprovingReviewId] = useState(null);

  const loadAdminReviews = async () => {
    setIsLoadingReviews(true);
    setReviewActionError('');
    try {
      const res = await fetchReviews(1, reviewFilter);
      if (res && Array.isArray(res.reviews)) {
        setAdminReviews(res.reviews);
      }
    } catch (err) {
      console.warn('Failed to load reviews for admin:', err);
      setReviewActionError('Failed to load reviews from server.');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleApproveReview = async (reviewId) => {
    setIsApprovingReviewId(reviewId);
    setReviewActionError('');
    setReviewActionMsg('');
    try {
      await approveReview(reviewId, token);
      setReviewActionMsg(`Review #${reviewId} has been approved and published to public site.`);
      setAdminReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: 'approved' } : r));
      setTimeout(() => setReviewActionMsg(''), 4000);
    } catch (err) {
      setReviewActionError(err.response?.data?.message || 'Failed to approve review.');
    } finally {
      setIsApprovingReviewId(null);
    }
  };

  const confirmDeleteReview = async () => {
    if (!reviewToDelete || !token) return;
    setIsDeletingReview(true);
    setReviewActionError('');
    setReviewActionMsg('');
    try {
      await deleteReview(reviewToDelete.id, token);
      setReviewActionMsg(`Review #${reviewToDelete.id} from ${reviewToDelete.customer_name} deleted.`);
      setAdminReviews(prev => prev.filter(r => r.id !== reviewToDelete.id));
      setReviewToDelete(null);
      setTimeout(() => setReviewActionMsg(''), 4000);
    } catch (err) {
      setReviewActionError(err.response?.data?.message || err.message || 'Failed to delete review.');
    } finally {
      setIsDeletingReview(false);
    }
  };

  // ── Tab 5: Admin & Staff Management State ──────────────────────────────────
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'admin'
  });
  const [staffActionError, setStaffActionError] = useState('');
  const [staffActionSuccess, setStaffActionSuccess] = useState('');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // User Deletion State
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const loadStaff = async () => {
    if (!token) return;
    setIsLoadingStaff(true);
    try {
      const res = await fetchStaffList(token);
      if (res.success) {
        setStaffList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load staff/admin list:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.username || !newStaff.email || !newStaff.password) {
      setStaffActionError('Please fill in all required fields (Username, Email, Password).');
      return;
    }

    if (newStaff.password.length < 6) {
      setStaffActionError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmittingStaff(true);
    setStaffActionError('');
    setStaffActionSuccess('');

    try {
      const payload = {
        username: newStaff.username.trim(),
        email: newStaff.email.trim(),
        password: newStaff.password,
        role: newStaff.role,
        fullName: newStaff.fullName?.trim() || newStaff.username.trim()
      };
      await createStaffMember(token, payload);
      setStaffActionSuccess(`Team member '${newStaff.username}' successfully created with role ${newStaff.role}!`);
      setStaffModalOpen(false);
      setNewStaff({
        username: '',
        fullName: '',
        email: '',
        password: '',
        role: 'staff'
      });
      await loadStaff();
      setTimeout(() => setStaffActionSuccess(''), 5000);
    } catch (err) {
      setStaffActionError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !token) return;
    setIsDeletingUser(true);
    setStaffActionError('');
    setStaffActionSuccess('');
    try {
      await deleteStaffMember(token, userToDelete.id);
      setStaffActionSuccess(`User '${userToDelete.username}' was permanently removed from team directory.`);
      setUserToDelete(null);
      await loadStaff();
      setTimeout(() => setStaffActionSuccess(''), 4000);
    } catch (err) {
      setStaffActionError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleStaffStatus = async (staffId, currentStatus) => {
    try {
      await toggleStaffStatus(token, staffId, currentStatus === 1 ? 0 : 1);
      await loadStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change user status.');
    }
  };

  // ── Tab Lifecycle Triggers ────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'plans') {
      loadPlans();
    } else if (activeTab === 'pricing') {
      loadPricingSettings();
    } else if (activeTab === 'leads') {
      loadLeads();
    } else if (activeTab === 'settings') {
      loadSettings();
      loadPricingSettings();
    } else if (activeTab === 'reviews') {
      loadAdminReviews();
    } else if (activeTab === 'admins') {
      loadStaff();
    }
  }, [activeTab, leadStatusFilter, reviewFilter]);

  // Initial load for pricing settings
  useEffect(() => {
    loadPricingSettings();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-dashboard-layout">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="portal-topbar">
        <div className="pt-brand">
          <Link to="/" className="pt-home-link" title="Return to Public Website">
            <ArrowLeft size={16} />
            <span>Public Site</span>
          </Link>
          <div className="pt-brand-title">
            <Sun size={22} className="text-emerald" />
            <div>
              <h2>{companyConfig?.companyName || 'Sungroves'}</h2>
              <span>Unified Administrator Dashboard</span>
            </div>
          </div>
        </div>

        <div className="pt-user-actions">
          <div className="pt-user-tag">
            <span className="user-role-badge admin">ADMIN</span>
            <span className="user-name">{user?.fullName || user?.username}</span>
          </div>

          <button type="button" className="btn-logout" onClick={handleLogout} title="Sign Out">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────────────────────────── */}
      <div className="portal-main-container">
        {/* Navigation Tabs (5 Distinct Tabs) */}
        <div className="portal-tabs-nav">
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            <Sliders size={17} />
            <span>Plan Configurator</span>
          </button>

          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            <Inbox size={17} />
            <span>Leads & Inquiries</span>
            {leadStats?.newLeads > 0 && (
              <span className="tab-counter-badge">{leadStats.newLeads}</span>
            )}
          </button>

          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <IndianRupee size={17} />
            <span>Pricing & Subscription Settings</span>
          </button>

          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={17} />
            <span>Site Settings</span>
          </button>

          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <Star size={17} />
            <span>Review Moderation</span>
            {adminReviews.length > 0 && (
              <span className="tab-counter-badge">{adminReviews.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`portal-tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            <ShieldCheck size={17} />
            <span>Team & Staff Management</span>
            {staffList.length > 0 && (
              <span className="tab-counter-badge">{staffList.length}</span>
            )}
          </button>
        </div>

        {/* ── TAB 1: Plan Configurator ────────────────────────────────────── */}
        {activeTab === 'plans' && (
          <div className="portal-card-body">
            <div className="card-header-bar flex-between">
              <div>
                <h3>Subscription Tier & Feature Locking Configurator</h3>
                <p>Manage subscription tier prices (Free vs Pro) and toggle feature locking permissions (e.g., allow PDF proposal export).</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={loadPlans}
                disabled={isLoadingPlans}
              >
                <RefreshCw size={15} className={isLoadingPlans ? 'spin-icon' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {plansSuccessMsg && (
              <div className="alert-success-banner">
                <CheckCircle2 size={18} />
                <span>{plansSuccessMsg}</span>
              </div>
            )}

            {plansErrorMsg && (
              <div className="alert-error-banner">
                <AlertCircle size={18} />
                <span>{plansErrorMsg}</span>
              </div>
            )}

            {isLoadingPlans ? (
              <div className="portal-loading-center">
                <span className="spinner-sm"></span>
                <span>Loading plan configurations...</span>
              </div>
            ) : (
              <form onSubmit={handleSavePlans} className="portal-form">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  {plans.map((p) => {
                    const isPro = p.plan_name === 'pro';
                    return (
                      <div
                        key={p.plan_name}
                        style={{
                          background: isPro ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)' : 'rgba(15, 23, 42, 0.5)',
                          border: isPro ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '14px',
                          padding: '1.5rem',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            background: isPro ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                            color: isPro ? '#10b981' : '#94a3b8'
                          }}>
                            {isPro ? 'Pro / Turnkey Tier' : 'Standard Tier'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Internal key: <code>{p.plan_name}</code>
                          </span>
                        </div>

                        <div className="form-group">
                          <label>Display Name *</label>
                          <input
                            type="text"
                            value={p.display_name}
                            onChange={(e) => handlePlanChange(p.plan_name, 'display_name', e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Subscription Price Display String *</label>
                          <input
                            type="text"
                            value={p.price}
                            placeholder={isPro ? '₹4,999 / year' : 'Free'}
                            onChange={(e) => handlePlanChange(p.plan_name, 'price', e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Tier Description</label>
                          <textarea
                            rows="2"
                            value={p.description || ''}
                            onChange={(e) => handlePlanChange(p.plan_name, 'description', e.target.value)}
                          ></textarea>
                        </div>

                        {/* Feature Lock Toggles for Free Plan */}
                        {!isPro ? (
                          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px' }}>
                            <h4 style={{ fontSize: '0.85rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Lock size={14} />
                              <span>Free Tier Paywall & Feature Locking</span>
                            </h4>

                            {/* Lock 1: PDF Proposal Export */}
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '0.85rem' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(p.lock_pdf_export !== undefined ? p.lock_pdf_export : !p.allow_pdf_export)}
                                onChange={() => handleTogglePlanLock(p.plan_name, 'lock_pdf_export')}
                                style={{ width: '18px', height: '18px', accentColor: '#f59e0b', marginTop: '2px' }}
                              />
                              <div>
                                <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>Lock PDF Proposal Export (lock_pdf_export)</strong>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                  When enabled (checked), Free users will see the Pro Upgrade Modal when clicking Download PDF Proposal.
                                </p>
                              </div>
                            </label>

                            {/* Lock 2: Advanced Financials */}
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '0.85rem' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(p.lock_advanced_financials)}
                                onChange={() => handleTogglePlanLock(p.plan_name, 'lock_advanced_financials')}
                                style={{ width: '18px', height: '18px', accentColor: '#f59e0b', marginTop: '2px' }}
                              />
                              <div>
                                <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>Lock Advanced Financials (lock_advanced_financials)</strong>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                  When enabled (checked), locks 10-year cumulative ROI projections and cashflow modeling with a Pro upgrade prompt.
                                </p>
                              </div>
                            </label>

                            {/* Lock 3: Roof Tracing */}
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(p.lock_roof_tracing)}
                                onChange={() => handleTogglePlanLock(p.plan_name, 'lock_roof_tracing')}
                                style={{ width: '18px', height: '18px', accentColor: '#f59e0b', marginTop: '2px' }}
                              />
                              <div>
                                <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>Lock Custom Rooftop Tracing (lock_roof_tracing)</strong>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                  When enabled (checked), restricts custom polygon satellite rooftop tracing to Turnkey Pro subscribers.
                                </p>
                              </div>
                            </label>
                          </div>
                        ) : (
                          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px' }}>
                            <h4 style={{ fontSize: '0.85rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sparkles size={14} />
                              <span>Pro Plan Unlocked Capabilities</span>
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                              <li>Unlimited PDF Proposal Generation & Exports</li>
                              <li>Full 10-Year Cumulative ROI & Financial Cashflow Curves</li>
                              <li>Satellite Roof Tracing with Obstacle Detection</li>
                              <li>Priority Engineering Consultation & On-Site Audits</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="form-actions-right">
                  <button type="submit" className="btn-primary" disabled={isSavingPlans}>
                    {isSavingPlans ? (
                      <>
                        <span className="spinner-sm"></span>
                        <span>Saving Plan Permissions...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Plan Configuration</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 2: Leads & Inquiries ────────────────────────────────────── */}
        {activeTab === 'leads' && (
          <div className="portal-card-body">
            <div className="card-header-bar">
              <div>
                <h3>Customer Leads & Inquiries</h3>
                <p>View customer lead submissions, filter by workflow status, and view complete customer contact info.</p>
              </div>
            </div>

            {/* Metrics Row */}
            {leadStats && (
              <div className="lead-stats-row">
                <div className="stat-pill-box">
                  <label>Total Inquiries</label>
                  <span>{leadStats.total}</span>
                </div>
                <div className="stat-pill-box new">
                  <label>Pending / New</label>
                  <span>{leadStats.newLeads}</span>
                </div>
                <div className="stat-pill-box audit">
                  <label>Audit Scheduled</label>
                  <span>{leadStats.auditScheduled}</span>
                </div>
                <div className="stat-pill-box quote">
                  <label>Quote Sent</label>
                  <span>{leadStats.quoteSent}</span>
                </div>
                <div className="stat-pill-box closed">
                  <label>Closed</label>
                  <span>{leadStats.closed}</span>
                </div>
                <div className="stat-pill-box capacity">
                  <label>Total Potential kWp</label>
                  <span>{leadStats.totalCapacityKWp} kWp</span>
                </div>
              </div>
            )}

            {/* Cleanup Feedback Banners */}
            {leadCleanupSuccessMsg && (
              <div className="alert-success-banner" style={{ margin: '1rem 0' }}>
                <CheckCircle2 size={18} />
                <span>{leadCleanupSuccessMsg}</span>
              </div>
            )}
            {leadCleanupErrorMsg && (
              <div className="alert-error-banner" style={{ margin: '1rem 0' }}>
                <AlertCircle size={18} />
                <span>{leadCleanupErrorMsg}</span>
              </div>
            )}

            {/* Filters Bar with 'pending' and 'contacted' status filters & Clear Dummy action */}
            <div className="leads-filter-bar">
              <div className="search-input-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search customer name, phone, email, city..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLeads()}
                />
              </div>

              <div className="status-filter-tabs">
                {[
                  { label: 'All', value: 'All' },
                  { label: 'Pending / New', value: 'pending' },
                  { label: 'Contacted', value: 'contacted' },
                  { label: 'Closed', value: 'Closed' }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`filter-pill-btn ${leadStatusFilter === item.value ? 'active' : ''}`}
                    onClick={() => setLeadStatusFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button type="button" className="btn-secondary" onClick={loadLeads} title="Refresh leads list">
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                className="btn-clean-dummy"
                onClick={() => setDummyCleanupModalOpen(true)}
                title="Wipe sample test leads while retaining database schema"
              >
                <Trash2 size={15} />
                <span>Clear Dummy Test Leads</span>
              </button>
            </div>

            {isLoadingLeads ? (
              <div className="portal-loading-center">
                <span className="spinner-sm"></span>
                <span>Loading customer leads...</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="empty-leads-box">
                <Inbox size={40} className="text-muted" />
                <h4>No Inquiries Found</h4>
                <p>No customer inquiries matched the selected status filter ('{leadStatusFilter}').</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Contact Info</th>
                      <th>Solar Capacity & Equipment</th>
                      <th>Subsidy / Investment</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id}>
                        <td>#{l.id}</td>
                        <td>
                          <strong>{l.customerName}</strong>
                          {l.address && <div className="text-muted-xs">{l.address}</div>}
                        </td>
                        <td>
                          <div>
                            <a href={`tel:${l.phone}`} style={{ color: '#10b981', textDecoration: 'none' }}>
                              {l.phone}
                            </a>
                          </div>
                          {l.email && (
                            <div className="text-muted-xs">
                              <a href={`mailto:${l.email}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>
                                {l.email}
                              </a>
                            </div>
                          )}
                        </td>
                        <td>
                          {l.calculatedSystemCapacity ? (
                            <div className="calc-summary-tag">
                              <strong>{l.calculatedSystemCapacity} kWp</strong>
                              {l.panelInfo && <span> ({l.panelInfo})</span>}
                            </div>
                          ) : (
                            <span>{l.targetCapacity || 'General Feasibility Inquiry'}</span>
                          )}
                        </td>
                        <td>
                          {l.subsidyAmount !== null && l.subsidyAmount !== undefined ? (
                            <div>
                              <div className="text-emerald">Subsidy: ₹{Number(l.subsidyAmount).toLocaleString('en-IN')}</div>
                              {l.estimatedNetCost && <div className="text-muted-xs">Net: ₹{Number(l.estimatedNetCost).toLocaleString('en-IN')}</div>}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <select
                            className={`status-dropdown-select status-${(l.status || 'new').toLowerCase().replace(/\s+/g, '-')}`}
                            value={l.status}
                            onChange={(e) => handleUpdateStatus(l.id, e.target.value)}
                          >
                            <option value="New">New / Pending</option>
                            <option value="Audit Scheduled">Audit Scheduled (Contacted)</option>
                            <option value="Quote Sent">Quote Sent (Contacted)</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </td>
                        <td>{new Date(l.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => setSelectedLead(l)}
                            title="View full customer contact & solar estimate"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Pricing Settings ────────────────────────────────────────── */}
        {activeTab === 'pricing' && (
          <div className="portal-card-body">
            {renderPricingSettingsSection()}
          </div>
        )}

        {/* ── TAB 3: Site Settings ────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="portal-card-body">
            {renderPricingSettingsSection()}

            <div className="card-header-bar">
              <div>
                <h3>Dynamic Site Settings & Contact Sync</h3>
                <p>Update official company email, phone, office address, and business hours. Automatically synchronizes with public Footer and Contact views.</p>
              </div>
            </div>

            {settingsSuccessMsg && (
              <div className="alert-success-banner">
                <CheckCircle2 size={18} />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            {settingsErrorMsg && (
              <div className="alert-error-banner">
                <AlertCircle size={18} />
                <span>{settingsErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSiteSettings} className="portal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="company_email">Official Support Email *</label>
                  <input
                    id="company_email"
                    type="email"
                    name="company_email"
                    placeholder="support@sungroves.com"
                    value={siteSettingsForm.company_email}
                    onChange={handleSiteSettingsChange}
                    required
                  />
                  <span className="field-hint">Rendered in the public footer, contact cards, and client proposals.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="company_phone">Official Contact Phone Number *</label>
                  <input
                    id="company_phone"
                    type="text"
                    name="company_phone"
                    placeholder="+91 98765 43210"
                    value={siteSettingsForm.company_phone}
                    onChange={handleSiteSettingsChange}
                    required
                  />
                  <span className="field-hint">Direct helpline for customer site assessments and WhatsApp inquiries.</span>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="office_address">Registered Office Address *</label>
                  <input
                    id="office_address"
                    type="text"
                    name="office_address"
                    placeholder="Chhatrapati Sambhajinagar, Maharashtra, India"
                    value={siteSettingsForm.office_address}
                    onChange={handleSiteSettingsChange}
                    required
                  />
                  <span className="field-hint">Physical headquarters and engineering office address.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="business_hours">Business / Operating Hours *</label>
                  <input
                    id="business_hours"
                    type="text"
                    name="business_hours"
                    placeholder="Mon - Sat: 9:00 AM - 6:30 PM"
                    value={siteSettingsForm.business_hours}
                    onChange={handleSiteSettingsChange}
                    required
                  />
                  <span className="field-hint">Engineering consultation and site survey operating schedule.</span>
                </div>
              </div>

              <div className="form-actions-right">
                <button type="submit" className="btn-primary" disabled={isSavingSettings}>
                  {isSavingSettings ? (
                    <>
                      <span className="spinner-sm"></span>
                      <span>Syncing Settings...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Update Site Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 4: Review Moderation ────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <div className="portal-card-body">
            <div className="card-header-bar flex-between">
              <div>
                <h3>Customer Review Moderation</h3>
                <p>Moderate customer reviews submitted on the public website. Approve pending reviews to publish them or delete inappropriate submissions.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={loadAdminReviews}
                  disabled={isLoadingReviews}
                >
                  <RefreshCw size={15} className={isLoadingReviews ? 'spin-icon' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Status Filter for Reviews */}
            <div style={{ display: 'flex', gap: '8px', margin: '1rem 0' }}>
              {[
                { label: 'All Reviews', value: 'all' },
                { label: 'Pending Moderation', value: 'pending' },
                { label: 'Approved Reviews', value: 'approved' }
              ].map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  className={`filter-pill-btn ${reviewFilter === tab.value ? 'active' : ''}`}
                  onClick={() => setReviewFilter(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {reviewActionMsg && (
              <div className="alert-success-banner" style={{ margin: '14px 0' }}>
                <CheckCircle2 size={18} />
                <span>{reviewActionMsg}</span>
              </div>
            )}

            {reviewActionError && (
              <div className="alert-error-banner" style={{ margin: '14px 0' }}>
                <AlertCircle size={18} />
                <span>{reviewActionError}</span>
              </div>
            )}

            {isLoadingReviews ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <span className="spinner-sm"></span>
                <p style={{ marginTop: '10px' }}>Loading reviews...</p>
              </div>
            ) : adminReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <Star size={36} color="#64748b" style={{ margin: '0 auto 10px' }} />
                <h4>No Customer Reviews Found</h4>
                <p>Public customer reviews will appear here for review and moderation.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Photo</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminReviews.map((rev) => (
                      <tr key={rev.id}>
                        <td><strong>#{rev.id}</strong></td>
                        <td><strong>{rev.customer_name}</strong></td>
                        <td>
                          <div style={{ display: 'inline-flex', gap: '2px', color: '#f59e0b' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                fill={s <= rev.rating ? '#f59e0b' : 'transparent'}
                                color={s <= rev.rating ? '#f59e0b' : '#64748b'}
                              />
                            ))}
                          </div>
                        </td>
                        <td style={{ maxWidth: '320px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                          {rev.comment}
                        </td>
                        <td>
                          {rev.image_url ? (
                            <a href={getReviewImageUrl(rev.image_url)} target="_blank" rel="noreferrer" title="Click to view full photo">
                              <img
                                src={getReviewImageUrl(rev.image_url)}
                                alt="Review attachment"
                                style={{
                                  width: '42px',
                                  height: '42px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1px solid #334155'
                                }}
                              />
                            </a>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '13px' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            background: rev.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: rev.status === 'approved' ? '#10b981' : '#f59e0b'
                          }}>
                            {rev.status || 'approved'}
                          </span>
                        </td>
                        <td>{new Date(rev.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {rev.status !== 'approved' && (
                              <button
                                type="button"
                                className="btn-table-action"
                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                onClick={() => handleApproveReview(rev.id)}
                                disabled={isApprovingReviewId === rev.id}
                                title="Approve and publish review"
                              >
                                <Check size={14} />
                                <span>{isApprovingReviewId === rev.id ? 'Approving...' : 'Approve'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-icon-action"
                              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              onClick={() => setReviewToDelete(rev)}
                              title="Delete this review"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: Team & Staff Management ─────────────────────────────── */}
        {activeTab === 'admins' && (
          <div className="portal-card-body">
            <div className="card-header-bar flex-between">
              <div>
                <h3>Team & Staff Management</h3>
                <p>Manage administrative and consulting staff directory, create team accounts, and control authorization status.</p>
              </div>
              <button type="button" className="btn-primary" onClick={() => setStaffModalOpen(true)}>
                <UserPlus size={16} />
                <span>+ Add New Member</span>
              </button>
            </div>

            {staffActionSuccess && (
              <div className="alert-success-banner">
                <CheckCircle2 size={18} />
                <span>{staffActionSuccess}</span>
              </div>
            )}

            {isLoadingStaff ? (
              <div className="portal-loading-center">
                <span className="spinner-sm"></span>
                <span>Loading admin & staff directory...</span>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((s) => (
                      <tr key={s.id}>
                        <td>#{s.id}</td>
                        <td><strong>{s.fullName}</strong></td>
                        <td><code>{s.username}</code></td>
                        <td>{s.email}</td>
                        <td>
                          <span className={`user-role-badge ${s.role.toLowerCase()}`}>{s.role}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${s.isActive === 1 ? 'active' : 'inactive'}`}>
                            {s.isActive === 1 ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                        <td>
                          {s.id !== user?.id ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className={`btn-table-action ${s.isActive === 1 ? 'deactivate' : 'activate'}`}
                                onClick={() => handleToggleStaffStatus(s.id, s.isActive)}
                                title={s.isActive === 1 ? 'Deactivate account' : 'Reactivate account'}
                              >
                                {s.isActive === 1 ? (
                                  <>
                                    <UserX size={14} />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={14} />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                className="btn-table-action delete"
                                onClick={() => setUserToDelete(s)}
                                title="Permanently delete staff user"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-sm">(Current Active Session)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Admin / Staff Modal ───────────────────────────────────────── */}
      {staffModalOpen && (
        <div className="modal-overlay" onClick={() => setStaffModalOpen(false)}>
          <div className="modal-content staff-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-block">
              <h2>+ Add New Member</h2>
              <p>Add a new team member with an assigned administrative or staff role.</p>
            </div>

            {staffActionError && (
              <div className="form-error-banner">
                <span>{staffActionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="contact-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="staffUsername">Username *</label>
                  <input
                    id="staffUsername"
                    type="text"
                    placeholder="e.g. rohit_admin"
                    value={newStaff.username}
                    onChange={(e) => setNewStaff(p => ({ ...p, username: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="staffFullName">Full Name *</label>
                  <input
                    id="staffFullName"
                    type="text"
                    placeholder="e.g. Rohit Deshmukh"
                    value={newStaff.fullName}
                    onChange={(e) => setNewStaff(p => ({ ...p, fullName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="staffEmail">Email Address *</label>
                  <input
                    id="staffEmail"
                    type="email"
                    placeholder="rohit@sungroves.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="staffRole">Role *</label>
                  <select
                    id="staffRole"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff(p => ({ ...p, role: e.target.value }))}
                  >
                    <option value="admin">Admin (Full Administrative Privileges)</option>
                    <option value="staff">Staff (Lead & Inquiry Consultant)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="staffPassword">Password (Min 6 chars) *</label>
                <input
                  id="staffPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setStaffModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmittingStaff}>
                  {isSubmittingStaff ? 'Adding Member...' : '+ Add New Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lead Detail Modal ─────────────────────────────────────────────── */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal-content lead-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-block flex-between">
              <div>
                <h2>Lead Assessment #{selectedLead.id}</h2>
                <p>Submitted on {new Date(selectedLead.createdAt).toLocaleString()}</p>
              </div>
              <span className={`status-pill status-${(selectedLead.status || 'new').toLowerCase().replace(/\s+/g, '-')}`}>
                {selectedLead.status}
              </span>
            </div>

            <div className="lead-detail-grid">
              <div className="ld-section">
                <h4>Customer Information</h4>
                <div className="ld-row"><label>Name:</label> <strong>{selectedLead.customerName}</strong></div>
                <div className="ld-row"><label>Phone:</label> <strong>{selectedLead.phone}</strong></div>
                <div className="ld-row"><label>Email:</label> <span>{selectedLead.email || '—'}</span></div>
                <div className="ld-row"><label>Address / City:</label> <span>{selectedLead.address || '—'}</span></div>
              </div>

              <div className="ld-section highlight-panel">
                <h4>Deterministic Solar Calculation Data</h4>
                <div className="ld-row"><label>System Capacity:</label> <strong>{selectedLead.calculatedSystemCapacity ? `${selectedLead.calculatedSystemCapacity} kWp` : (selectedLead.targetCapacity || '—')}</strong></div>
                <div className="ld-row"><label>Panel Specification:</label> <span>{selectedLead.panelInfo || '—'}</span></div>
                <div className="ld-row"><label>Central Subsidy:</label> <strong className="text-emerald">{selectedLead.subsidyAmount ? `₹${Number(selectedLead.subsidyAmount).toLocaleString('en-IN')}` : '—'}</strong></div>
                <div className="ld-row"><label>Est. Net Investment:</label> <strong>{selectedLead.estimatedNetCost ? `₹${Number(selectedLead.estimatedNetCost).toLocaleString('en-IN')}` : '—'}</strong></div>
                <div className="ld-row"><label>Est. Annual Savings:</label> <span>{selectedLead.estimatedAnnualSavings ? `₹${Number(selectedLead.estimatedAnnualSavings).toLocaleString('en-IN')} / yr` : '—'}</span></div>
              </div>
            </div>

            {selectedLead.message && (
              <div className="lead-message-box">
                <label>Customer Message / Notes:</label>
                <p>{selectedLead.message}</p>
              </div>
            )}

            <div className="lead-status-update-row">
              <label>Update Workflow Status:</label>
              <select
                className="status-dropdown-select"
                value={selectedLead.status}
                onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
              >
                <option value="New">New / Pending</option>
                <option value="Audit Scheduled">Audit Scheduled (Contacted)</option>
                <option value="Quote Sent">Quote Sent (Contacted)</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={() => setSelectedLead(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Delete Confirmation Modal ────────────────────────────── */}
      {reviewToDelete && (
        <div className="modal-overlay" onClick={() => !isDeletingReview && setReviewToDelete(null)}>
          <div className="modal-content staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header-block">
              <h2 style={{ color: '#f87171' }}>Confirm Review Deletion</h2>
              <p>Are you sure you want to permanently delete this customer review?</p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid #334155', margin: '16px 0' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#f8fafc' }}>{reviewToDelete.customer_name}</strong>
                <span style={{ color: '#f59e0b', marginLeft: '10px' }}>({reviewToDelete.rating} / 5 Stars)</span>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>
                "{reviewToDelete.comment}"
              </p>
              {reviewToDelete.image_url && (
                <p style={{ color: '#f87171', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>
                  ⚠️ Note: The attached photo file will also be permanently removed from disk storage.
                </p>
              )}
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setReviewToDelete(null)}
                disabled={isDeletingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#fff' }}
                onClick={confirmDeleteReview}
                disabled={isDeletingReview}
              >
                {isDeletingReview ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Dummy Test Leads Confirmation Modal ────────────────────── */}
      {dummyCleanupModalOpen && (
        <div className="modal-overlay" onClick={() => !isClearingDummy && setDummyCleanupModalOpen(false)}>
          <div className="modal-content staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header-block">
              <h2 style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={20} />
                <span>Clear Dummy Test Inquiries</span>
              </h2>
              <p>Clean up sample and automated test submissions to keep your CRM and inquiry metrics accurate.</p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid #334155', margin: '16px 0' }}>
              <p style={{ color: '#cbd5e1', fontSize: '14px', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                This operation removes inquiries tagged as test, sample, or matching mock test email domains (e.g. <code>test@...</code>, <code>example@...</code>), while strictly preserving genuine customer records and database schemas.
              </p>
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                Current inquiries in database: <strong style={{ color: '#f8fafc' }}>{leads.length}</strong>
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDummyCleanupModalOpen(false)}
                disabled={isClearingDummy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#d97706', borderColor: '#b45309', color: '#fff' }}
                onClick={() => handleClearDummyLeads(false)}
                disabled={isClearingDummy}
              >
                {isClearingDummy ? 'Cleaning...' : 'Clear Test Leads Only'}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#fff' }}
                onClick={() => handleClearDummyLeads(true)}
                disabled={isClearingDummy}
                title="Wipe all lead entries in test environment"
              >
                {isClearingDummy ? 'Wiping...' : 'Wipe All Leads'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── User Delete Confirmation Modal ──────────────────────────────── */}
      {userToDelete && (
        <div className="modal-overlay" onClick={() => !isDeletingUser && setUserToDelete(null)}>
          <div className="modal-content staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header-block">
              <h2 style={{ color: '#f87171' }}>Confirm Team Member Deletion</h2>
              <p>Are you sure you want to permanently delete this user account from the system?</p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid #334155', margin: '16px 0' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#f8fafc', fontSize: '15px' }}>{userToDelete.fullName}</strong>
                <span style={{ color: '#94a3b8', marginLeft: '8px' }}>({userToDelete.username})</span>
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '4px' }}>
                Email: {userToDelete.email}
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                Role: <span className={`user-role-badge ${String(userToDelete.role).toLowerCase()}`}>{userToDelete.role}</span>
              </div>
              <p style={{ color: '#f87171', fontSize: '12px', marginTop: '12px', marginBottom: 0 }}>
                ⚠️ Warning: This user will lose all portal access immediately.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#fff' }}
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? 'Deleting...' : 'Delete User Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
