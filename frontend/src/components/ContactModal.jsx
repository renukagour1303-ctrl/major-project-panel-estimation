import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, Phone, Mail, MapPin, Clock, MessageSquare, User } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { fetchSiteSettings } from '../services/settingsService.js';
import { submitLead } from '../services/leadService.js';

export default function ContactModal({ isOpen, onClose }) {
  const { companyConfig } = useCompany();
  const [siteSettings, setSiteSettings] = useState({
    company_email: 'support@sungroves.com',
    company_phone: '+91 98765 43210',
    office_address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
    business_hours: 'Mon - Sat: 9:00 AM - 6:30 PM'
  });

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const data = await fetchSiteSettings();
        if (isMounted && data) {
          setSiteSettings({
            company_email: data.company_email || data.companyEmail || companyConfig.email || 'support@sungroves.com',
            company_phone: data.company_phone || data.companyPhone || companyConfig.phone || '+91 98765 43210',
            office_address: data.office_address || data.officeAddress || companyConfig.address || 'Chhatrapati Sambhajinagar, Maharashtra, India',
            business_hours: data.business_hours || data.businessHours || companyConfig.operatingHours || 'Mon - Sat: 9:00 AM - 6:30 PM'
          });
        }
      } catch (err) {
        console.warn('Contact modal site settings fallback notice:', err);
      }
    }
    loadSettings();
    return () => { isMounted = false; };
  }, [companyConfig]);

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    targetCapacity: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const displayPhone = siteSettings.company_phone || companyConfig.phone || '+91 98765 43210';
  const displayEmail = siteSettings.company_email || companyConfig.email || 'support@sungroves.com';
  const displayHours = siteSettings.business_hours || companyConfig.operatingHours || 'Mon - Sat: 9:00 AM - 6:30 PM';
  const displayAddress = siteSettings.office_address || companyConfig.address || 'Chhatrapati Sambhajinagar, Maharashtra, India';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.phone.trim()) {
      setErrorMessage('Please provide your name and phone number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await submitLead({
        ...formData,
        source: 'contact_modal'
      });
      setSubmitSuccess(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitSuccess(false);
    setErrorMessage('');
    setFormData({
      customerName: '',
      phone: '',
      email: '',
      address: '',
      targetCapacity: '',
      message: ''
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleResetAndClose}>
      <div className="modal-content contact-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={handleResetAndClose}>
          <X size={20} />
        </button>

        {submitSuccess ? (
          <div className="modal-success-state">
            <div className="success-icon-circle">
              <CheckCircle2 size={44} className="text-emerald" />
            </div>
            <h3>Thank You for Contacting Sungroves!</h3>
            <p>
              Your solar inquiry has been received. Our energy consultant will contact you at <strong>{formData.phone}</strong> shortly.
            </p>
            <button type="button" className="btn-primary" onClick={handleResetAndClose}>
              Close
            </button>
          </div>
        ) : (
          <div>
            <div className="modal-header-block">
              <h2>Contact {companyConfig.companyName}</h2>
              <p>Get in touch with our solar engineering team for pre-sales assessments and site visits.</p>
            </div>

            <div className="contact-quick-info">
              <div className="cqi-item">
                <Phone size={16} className="text-emerald" />
                <span>{displayPhone}</span>
              </div>
              <div className="cqi-item">
                <Mail size={16} className="text-emerald" />
                <span>{displayEmail}</span>
              </div>
              <div className="cqi-item">
                <Clock size={16} className="text-emerald" />
                <span>{displayHours}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="form-error-banner">
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="modalCustomerName">Your Full Name *</label>
                  <input
                    id="modalCustomerName"
                    type="text"
                    name="customerName"
                    placeholder="e.g. Ramesh Patil"
                    value={formData.customerName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modalPhone">Phone Number *</label>
                  <input
                    id="modalPhone"
                    type="tel"
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="modalEmail">Email Address</label>
                  <input
                    id="modalEmail"
                    type="email"
                    name="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modalTargetCapacity">Target System Capacity (Optional)</label>
                  <input
                    id="modalTargetCapacity"
                    type="text"
                    name="targetCapacity"
                    placeholder="e.g. 3 kWp or 5 kWp"
                    value={formData.targetCapacity}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modalAddress">City / Location</label>
                <input
                  id="modalAddress"
                  type="text"
                  name="address"
                  placeholder="e.g. Chhatrapati Sambhajinagar, Maharashtra"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modalMessage">Your Message / Requirements</label>
                <textarea
                  id="modalMessage"
                  name="message"
                  rows="3"
                  placeholder="Tell us about your rooftop type, current electricity consumption, or specific requirements..."
                  value={formData.message}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleResetAndClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-sm"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Inquiry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
