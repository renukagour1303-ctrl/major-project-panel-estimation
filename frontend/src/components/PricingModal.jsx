import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Zap, Shield, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useCompany } from '../context/CompanyContext.jsx';
import { fetchAdminSettings } from '../services/settingsService.js';

export default function PricingModal({ isOpen, onClose, onOpenContact, proPrice: propProPrice }) {
  const { companyConfig } = useCompany();
  const [proPrice, setProPrice] = useState(
    propProPrice 
      ? `₹${Number(propProPrice).toLocaleString('en-IN')} / year` 
      : (companyConfig.proPrice || '₹499 / year')
  );

  useEffect(() => {
    if (propProPrice) {
      setProPrice(`₹${Number(propProPrice).toLocaleString('en-IN')} / year`);
    }
  }, [propProPrice]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function loadPrice() {
      try {
        const res = await fetch('/api/settings/pricing');
        const data = await res.json();
        if (isMounted && data && data.proPrice) {
          setProPrice(`₹${Number(data.proPrice).toLocaleString('en-IN')} / year`);
          return;
        }
      } catch (e) {
        // Fallback to fetchAdminSettings
      }

      try {
        const data = await fetchAdminSettings();
        if (isMounted && data) {
          const price = data.pro_plan_price ?? data.proPlanPrice ?? data.settings?.pro_plan_price;
          if (price !== undefined && price !== null && !isNaN(Number(price))) {
            setProPrice(`₹${Number(price).toLocaleString('en-IN')} / year`);
          }
        }
      } catch (e) {
        // Fallback to companyConfig.proPrice
      }
    }
    loadPrice();
    return () => { isMounted = false; };
  }, [isOpen, propProPrice, companyConfig.proPrice]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pricing-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="pricing-header-center">
          <div className="pricing-badge">
            <Sparkles size={16} className="text-emerald" />
            <span>Transparent Solar Consultation Plans</span>
          </div>
          <h2>Plans & Services for {companyConfig.companyName}</h2>
          <p>
            Start with our full-featured free tier or upgrade to Pro turnkey engineering and fast-track PM Surya Ghar utility clearance.
          </p>
        </div>

        <div className="pricing-grid-2">
          {/* Free Tier Card */}
          <div className="pricing-tier-card free-tier">
            <div className="ptc-header">
              <span className="tier-tag">Standard Access</span>
              <h3>Free Evaluation</h3>
              <div className="tier-price">
                <span className="currency">₹</span>
                <span className="amount">0</span>
                <span className="period">/ free forever</span>
              </div>
              <p className="tier-desc">{companyConfig.freeTrialInfo}</p>
            </div>

            <ul className="tier-features-list">
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Rooftop Solar Area Tracing with Turf.js</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>PVGIS & NASA POWER Solar Irradiance</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>PM Surya Ghar Subsidy Calculation</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>10-Year ROI & Payback Projections</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Downloadable PDF Feasibility Proposal</span>
              </li>
            </ul>

            <button type="button" className="btn-secondary full-width" onClick={onClose}>
              Continue with Free Calculator
            </button>
          </div>

          {/* Pro / Paid Service Tier Card */}
          <div className="pricing-tier-card pro-tier featured">
            <div className="featured-ribbon">POPULAR FOR HOME & BUSINESS</div>
            <div className="ptc-header">
              <span className="tier-tag pro">Turnkey Consulting</span>
              <h3>Pro Engineering Service</h3>
              <div className="tier-price">
                <span className="amount-pro">{proPrice}</span>
              </div>
              <p className="tier-desc">Comprehensive on-site structural inspection, net-metering liaison, and subsidy clearance.</p>
            </div>

            <ul className="tier-features-list">
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span><strong>Physical On-Site Structural & Electrical Survey</strong></span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>3D Shadow & Drone Shading Analysis</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>DISCOM Net-Metering & Sanction Load Filing</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Direct PM Surya Ghar Subsidy Portal Assistance</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Tier-1 Equipment Procurement & 5-Year Maintenance</span>
              </li>
            </ul>

            <button
              type="button"
              className="btn-primary full-width"
              onClick={() => {
                onClose();
                if (onOpenContact) onOpenContact();
              }}
            >
              <span>Inquire for Pro Consultation</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="pricing-footer-note">
          <Shield size={16} className="text-emerald" />
          <span>
            Pricing and service scopes are managed centrally by {companyConfig.companyName}. All installations follow strict MNRE & CEIG guidelines.
          </span>
        </div>
      </div>
    </div>
  );
}
