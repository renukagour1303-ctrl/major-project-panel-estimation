import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { fetchSiteSettings } from '../services/settingsService.js';
import { useCompany } from '../context/CompanyContext.jsx';
import { submitLead } from '../services/leadService.js';

export default function Contact({ onLeadSubmitted }) {
  const { companyConfig } = useCompany();
  const [siteSettings, setSiteSettings] = useState({
    company_email: 'support@sungroves.com',
    company_phone: '+91 98765 43210',
    office_address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
    business_hours: 'Mon - Sat: 9:00 AM - 6:30 PM'
  });
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
        console.warn('Contact component settings fetch notice:', err);
      }
    }
    loadSettings();
    return () => { isMounted = false; };
  }, [companyConfig]);

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
        source: 'contact_page'
      });
      setSubmitSuccess(true);
      if (onLeadSubmitted) onLeadSubmitted();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayPhone = siteSettings.company_phone || companyConfig.phone || '+91 98765 43210';
  const displayEmail = siteSettings.company_email || companyConfig.email || 'support@sungroves.com';
  const displayAddress = siteSettings.office_address || companyConfig.address || 'Chhatrapati Sambhajinagar, Maharashtra, India';
  const displayHours = siteSettings.business_hours || companyConfig.operatingHours || 'Mon - Sat: 9:00 AM - 6:30 PM';

  return (
    <div className="contact-section-container">
      <div className="contact-grid">
        <div className="contact-info-panel">
          <h3>Get in Touch with {companyConfig.companyName || 'Sungroves'}</h3>
          <p>
            Connect directly with our solar engineering consultants for rooftop feasibility assessments, site surveys, and MNRE subsidy guidance.
          </p>

          <div className="contact-details-list">
            <div className="contact-detail-item">
              <MapPin className="text-emerald" size={20} />
              <div>
                <strong>Office Address</strong>
                <p>{displayAddress}</p>
              </div>
            </div>

            <div className="contact-detail-item">
              <Phone className="text-emerald" size={20} />
              <div>
                <strong>Direct Phone</strong>
                <p>{displayPhone}</p>
              </div>
            </div>

            <div className="contact-detail-item">
              <Mail className="text-emerald" size={20} />
              <div>
                <strong>Official Email</strong>
                <p>{displayEmail}</p>
              </div>
            </div>

            <div className="contact-detail-item">
              <Clock className="text-emerald" size={20} />
              <div>
                <strong>Operating Hours</strong>
                <p>{displayHours}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-form-panel">
          {submitSuccess ? (
            <div className="contact-success-state">
              <CheckCircle2 size={48} className="text-emerald" />
              <h3>Inquiry Received!</h3>
              <p>Thank you for reaching out. Our engineering team will contact you at <strong>{formData.phone}</strong> shortly.</p>
              <button type="button" className="btn-secondary" onClick={() => setSubmitSuccess(false)}>
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <h4>Send an Inquiry</h4>
              {errorMessage && <div className="form-error-banner">{errorMessage}</div>}

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="customerName"
                  placeholder="e.g. Ramesh Patil"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="ramesh@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>City / Location</label>
                <input
                  type="text"
                  name="address"
                  placeholder="Chhatrapati Sambhajinagar"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Message / Notes</label>
                <textarea
                  name="message"
                  rows="3"
                  placeholder="Tell us about your rooftop area or average electricity bill..."
                  value={formData.message}
                  onChange={handleChange}
                ></textarea>
              </div>

              <button type="submit" className="btn-primary full-width" disabled={isSubmitting}>
                <Send size={16} />
                <span>{isSubmitting ? 'Sending...' : 'Submit Inquiry'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
