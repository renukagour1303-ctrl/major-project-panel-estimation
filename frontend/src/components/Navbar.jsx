import React from 'react';
import { Sun, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Navbar({ backendOnline }) {
  return (
    <header className="navbar">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Sun size={24} />
        </div>
        <div className="brand-info">
          <h1>Sungroves Innovations LLP</h1>
          <span>AI-Powered Solar Calculator Web Tool</span>
        </div>
      </div>
      
      <div className="nav-right">
        <div className="badge-wrapper">
          <span className={`status-badge ${backendOnline ? 'online' : 'offline'}`}>
            <span className="pulse-dot"></span>
            {backendOnline ? 'API Connected' : 'API Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
