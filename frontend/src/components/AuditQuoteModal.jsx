import React, { useState } from 'react';
import { X, Send, CheckCircle2, Sun, IndianRupee, ShieldCheck, User, Phone, Mail, MapPin } from 'lucide-react';
import { submitLead } from '../services/leadService.js';
import { useCompany } from '../context/CompanyContext.jsx';

export default function AuditQuoteModal({ isOpen, onClose, results, locationData, roofData }) {
  const { companyConfig } = useCompany();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState(locationData.cityName || locationData.shortName || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      setErrorMessage('Please provide your name and phone number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        address: address ? address.trim() : (locationData.cityName || null),
        targetCapacity: `${results?.technical?.systemSizeKWp || 0} kWp`,
        calculatedSystemCapacity: results?.technical?.systemSizeKWp || null,
        panelInfo: `${results?.technical?.numPanels || 0} modules (${results?.technical?.panelWattage || 400}W)`,
        subsidyAmount: results?.financial?.subsidy || null,
        estimatedNetCost: results?.financial?.netCost || null,
        estimatedAnnualSavings: results?.financial?.annualSavings || null,
        message: message.trim() || 'Request for physical site audit and formal solar quotation.',
        source: 'calculator_results'
      };

      await submitLead(payload);
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content contact-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={handleClose}>
          <X size={20} />
        </button>

        {isSuccess ? (
          <div className="modal-success-state">
            <div className="success-icon-circle">
              <CheckCircle2 size={44} className="text-emerald" />
            </div>
            <h3>Site Survey Request Confirmed!</h3>
            <p>
              Your solar estimate of <strong>{results?.technical?.systemSizeKWp} kWp</strong> has been transmitted directly to our engineering lead desk. An engineer from <strong>{companyConfig.companyName}</strong> will contact you at <strong>{phone}</strong> to confirm your site audit.
            </p>
            <button type="button" className="btn-primary" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="modal-header-block">
              <div className="status-pill-success inline-flex">
                <ShieldCheck size={15} />
                <span>Direct Site Survey & Formal Proposal</span>
              </div>
              <h2>Request Official Solar Survey</h2>
              <p>
                Connect with {companyConfig.companyName} engineers to schedule a physical rooftop structural survey and DISCOM net-metering consultation.
              </p>
            </div>

            {/* Attached Estimate Summary Banner */}
            <div className="attached-estimate-summary">
              <div className="aes-item">
                <label>Estimated Size</label>
                <strong>{results?.technical?.systemSizeKWp || '—'} kWp</strong>
              </div>
              <div className="aes-item">
                <label>Panels</label>
                <strong>{results?.technical?.numPanels || '—'} modules</strong>
              </div>
              <div className="aes-item">
                <label>Net Cost</label>
                <strong className="text-emerald">₹{Number(results?.financial?.netCost || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div className="aes-item">
                <label>Est. Subsidy</label>
                <strong className="text-emerald">₹{Number(results?.financial?.subsidy || 0).toLocaleString('en-IN')}</strong>
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
                  <label htmlFor="quoteCustomerName">Your Full Name *</label>
                  <input
                    id="quoteCustomerName"
                    type="text"
                    placeholder="e.g. Anand Deshmukh"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quotePhone">Phone Number *</label>
                  <input
                    id="quotePhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="quoteEmail">Email Address (for Quotation PDF)</label>
                  <input
                    id="quoteEmail"
                    type="email"
                    placeholder="anand@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quoteAddress">Installation Address / City</label>
                  <input
                    id="quoteAddress"
                    type="text"
                    placeholder="e.g. Chhatrapati Sambhajinagar"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="quoteMessage">Notes or Special Requirements</label>
                <textarea
                  id="quoteMessage"
                  rows="2"
                  placeholder="e.g. Prefer elevated solar structure, need 3-phase connection..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-sm"></span>
                      <span>Submitting Estimate...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit to Sungroves</span>
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
