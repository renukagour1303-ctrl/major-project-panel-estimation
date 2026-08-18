import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sun, CheckCircle2, ShieldCheck, Cpu, Layers, Server, Activity, ArrowRight } from 'lucide-react';

function App() {
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    data: null,
    error: null
  });

  const checkBackendHealth = async () => {
    setBackendStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      // In development, Vite proxies /api to http://localhost:5000
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await axios.get(`${apiUrl}/health`);
      setBackendStatus({
        loading: false,
        connected: true,
        data: response.data,
        error: null
      });
    } catch (err) {
      setBackendStatus({
        loading: false,
        connected: false,
        data: null,
        error: err.message || 'Unable to connect to backend server'
      });
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Sun size={24} />
          </div>
          <div className="brand-info">
            <h1>Sungroves Innovations LLP</h1>
            <span>AI-Powered Solar Calculator Web Tool</span>
          </div>
        </div>
        <div className="badge-wrapper">
          <span className="status-badge online">
            <span className="pulse-dot"></span>
            Chunk 1: Project Setup
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-banner">
          <div className="hero-tag">
            <ShieldCheck size={16} />
            <span>Pre-Sales Solar Estimation Engine</span>
          </div>
          <h2>Smart Rooftop Solar Feasibility & Estimation Platform</h2>
          <p>
            Automating initial site assessments with satellite map roof tracing, deterministic solar generation calculations, PM Surya Ghar subsidy estimates, and AI recommendations.
          </p>
        </section>

        {/* Status & Architecture Overview Grid */}
        <div className="cards-grid">
          <div className="feature-card">
            <div className="card-icon emerald">
              <Cpu size={24} />
            </div>
            <h3>Deterministic Math Engine</h3>
            <p>
              Exact formulas for system sizing, generation (kWh), savings (₹), net metering, and payback period. AI explains results without computing numbers.
            </p>
          </div>

          <div className="feature-card">
            <div className="card-icon gold">
              <Layers size={24} />
            </div>
            <h3>Satellite Roof Tracing</h3>
            <p>
              High-resolution Esri satellite imagery with Leaflet.draw and Turf.js for precise polygon boundary area calculation.
            </p>
          </div>

          <div className="feature-card">
            <div className="card-icon info">
              <Server size={24} />
            </div>
            <h3>Decoupled Full-Stack</h3>
            <p>
              Clean React.js frontend with isolated Node.js/Express.js backend connecting PVGIS & NASA POWER APIs with SQLite persistence.
            </p>
          </div>
        </div>

        {/* Backend Connectivity Status Widget */}
        <section className="status-widget">
          <div className="status-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={20} color="var(--primary-green)" />
              <h3 style={{ margin: 0 }}>Backend Connectivity Status</h3>
            </div>
            <button 
              onClick={checkBackendHealth}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}
            >
              Refresh Check
            </button>
          </div>

          {backendStatus.loading ? (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
              Checking connection to backend service...
            </div>
          ) : backendStatus.connected ? (
            <div className="status-details">
              <div className="status-item">
                <label>API Status</label>
                <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={16} /> Online ({backendStatus.data?.status})
                </span>
              </div>
              <div className="status-item">
                <label>Service</label>
                <span>{backendStatus.data?.service}</span>
              </div>
              <div className="status-item">
                <label>Version / Stage</label>
                <span>{backendStatus.data?.chunk}</span>
              </div>
              <div className="status-item">
                <label>Server Timestamp</label>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{backendStatus.data?.timestamp}</span>
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '1rem', 
              background: 'var(--status-error-bg)', 
              color: 'var(--status-error)', 
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem' 
            }}>
              <strong>Backend connection not detected:</strong> {backendStatus.error}. Make sure the Node/Express server is running on port 5000.
            </div>
          )}
        </section>

        {/* Development Chunks Roadmap */}
        <section className="roadmap-section">
          <h3 style={{ fontSize: '1.15rem' }}>Implementation Roadmap (SPEC.md)</h3>
          <div className="roadmap-grid">
            <div className="chunk-pill active">
              <CheckCircle2 size={16} /> Chunk 1: Project Setup (Current)
            </div>
            <div className="chunk-pill">
              <ArrowRight size={16} color="var(--text-muted)" /> Chunk 2: Frontend Shell & Navigation
            </div>
            <div className="chunk-pill">
              <ArrowRight size={16} color="var(--text-muted)" /> Chunk 3: Location Detection
            </div>
            <div className="chunk-pill">
              <ArrowRight size={16} color="var(--text-muted)" /> Chunk 4: Satellite Map
            </div>
            <div className="chunk-pill">
              <ArrowRight size={16} color="var(--text-muted)" /> Chunk 5: Roof Drawing
            </div>
            <div className="chunk-pill">
              <ArrowRight size={16} color="var(--text-muted)" /> Chunk 6: Roof Area Calculation
            </div>
            <div className="chunk-pill">
              <ArrowRight size={16} color="var(--text-muted)" /> Chunk 7: Electricity Inputs
            </div>
            <div className="chunk-pill">
              <ArrowRight size={16} color="var(--text-muted)" /> Chunk 8: Calculation Engine
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Sungroves Innovations LLP | Chhatrapati Sambhajinagar, Maharashtra, India. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
