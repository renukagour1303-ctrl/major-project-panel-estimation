import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Mail, Phone, Clock, Lock } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { fetchSiteSettings } from '../services/settingsService.js';
import { Link } from 'react-router-dom';

export default function Footer({ onOpenContact, onOpenPricing }) {
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
        console.warn('Footer site settings fetch fallback notice:', err);
      }
    }
    loadSettings();
    return () => { isMounted = false; };
  }, [companyConfig]);

  const displayAddress = siteSettings.office_address || companyConfig.address || 'Chhatrapati Sambhajinagar, Maharashtra, India';
  const displayPhone = siteSettings.company_phone || companyConfig.phone || '+91 98765 43210';
  const displayEmail = siteSettings.company_email || companyConfig.email || 'support@sungroves.com';
  const displayHours = siteSettings.business_hours || companyConfig.operatingHours || 'Mon - Sat: 9:00 AM - 6:30 PM';

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-company">
          <div className="footer-brand">
            <h3>{companyConfig.companyName || 'Sungroves Innovations LLP'}</h3>
            <p>Rooftop Solar Solutions & Clean Energy Consulting</p>
          </div>
          
          <div className="footer-meta-list">
            <div className="footer-meta-item">
              <MapPin size={15} />
              <span>{displayAddress}</span>
            </div>
            <div className="footer-meta-item">
              <Phone size={15} />
              <span>{displayPhone}</span>
            </div>
            <div className="footer-meta-item">
              <Mail size={15} />
              <span>{displayEmail}</span>
            </div>
            <div className="footer-meta-item">
              <Clock size={15} />
              <span>{displayHours}</span>
            </div>
          </div>

          <div className="footer-quick-links">
            <button type="button" className="footer-link-btn" onClick={onOpenPricing}>
              Plans & Pricing ({companyConfig.proPrice || 'Pro Tier'})
            </button>
            <span>•</span>
            <button type="button" className="footer-link-btn" onClick={onOpenContact}>
              Contact Sales
            </button>
            <span>•</span>
            <Link to="/login" className="footer-link-btn">
              Staff & Admin Portal
            </Link>
          </div>
        </div>

        <div className="footer-disclaimer">
          <div className="disclaimer-title">
            <ShieldCheck size={16} />
            <strong>Client-Facing Estimation Disclaimer</strong>
          </div>
          <p>
            Estimates provided by this tool are preliminary calculations for pre-sales assessment based on satellite tracing and irradiance modeling. Final system sizing, solar generation, financial savings, net-metering approval, and PM Surya Ghar subsidy eligibility are subject to detailed structural inspection, electrical site surveys, and statutory utility approvals by {companyConfig.companyName || 'Sungroves Innovations LLP'} and relevant authorities.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} {companyConfig.companyName || 'Sungroves Innovations LLP'}. All rights reserved.</p>
      </div>
    </footer>
  );
}
