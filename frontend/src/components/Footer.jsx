import React from 'react';
import { ShieldCheck, MapPin, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-company">
          <div className="footer-brand">
            <h3>Sungroves Innovations LLP</h3>
            <p>Rooftop Solar Solutions & Energy Consulting</p>
          </div>
          <div className="footer-location">
            <MapPin size={15} />
            <span>Chhatrapati Sambhajinagar, Maharashtra, India</span>
          </div>
        </div>

        <div className="footer-disclaimer">
          <div className="disclaimer-title">
            <ShieldCheck size={16} />
            <strong>Client-Facing Estimation Disclaimer</strong>
          </div>
          <p>
            Estimates provided by this tool are preliminary calculations for pre-sales assessment. Final system sizing, solar generation, financial savings, net-metering approval, and PM Surya Ghar subsidy eligibility are subject to detailed structural inspection, electrical site surveys, and statutory utility approvals by Sungroves Innovations LLP and relevant authorities.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Sungroves Innovations LLP. All rights reserved.</p>
      </div>
    </footer>
  );
}
