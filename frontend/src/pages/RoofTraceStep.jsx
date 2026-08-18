import React from 'react';
import { PenTool, Edit3, Trash2, RotateCcw, CheckCircle, Info, Layers, AlertCircle } from 'lucide-react';

export default function RoofTraceStep({ roofData, updateRoofData }) {
  // Set default placeholder area if traced
  const handleToggleMockTrace = () => {
    if (roofData.traced) {
      updateRoofData({ traced: false, areaSqM: 0, usableAreaSqM: 0 });
    } else {
      const area = 80; // 80 m²
      const usable = area * 0.75; // 60 m² (75% factor)
      updateRoofData({ traced: true, areaSqM: area, usableAreaSqM: usable });
    }
  };

  return (
    <div className="step-content-card">
      <div className="step-header-block">
        <div className="step-icon-badge">
          <PenTool size={24} />
        </div>
        <div>
          <h2>Step 2: Trace Your Rooftop Outline</h2>
          <p>
            Use the interactive drawing tools on the satellite map below to outline your building's roof perimeter.
          </p>
        </div>
      </div>

      {/* Drawing Toolbar Mockup */}
      <div className="map-toolbar">
        <div className="toolbar-group">
          <button 
            type="button" 
            className={`toolbar-btn ${roofData.traced ? 'active' : ''}`}
            onClick={handleToggleMockTrace}
            title="Click to simulate tracing roof polygon"
          >
            <PenTool size={16} />
            <span>{roofData.traced ? 'Polygon Traced ✓' : 'Draw Polygon (Mock)'}</span>
          </button>
          
          <button type="button" className="toolbar-btn" disabled={!roofData.traced}>
            <Edit3 size={16} />
            <span>Edit Shape</span>
          </button>

          <button 
            type="button" 
            className="toolbar-btn delete" 
            disabled={!roofData.traced}
            onClick={() => updateRoofData({ traced: false, areaSqM: 0, usableAreaSqM: 0 })}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>

          <button 
            type="button" 
            className="toolbar-btn"
            onClick={handleToggleMockTrace}
          >
            <RotateCcw size={16} />
            <span>Redraw</span>
          </button>
        </div>

        <div className="map-layer-tag">
          <Layers size={14} />
          <span>Esri World Imagery (Satellite)</span>
        </div>
      </div>

      {/* Satellite Map Placeholder Canvas */}
      <div className="satellite-map-placeholder">
        <div className="map-overlay-guide">
          {roofData.traced ? (
            <div className="traced-polygon-indicator">
              <div className="polygon-shape-svg">
                <svg width="220" height="140" viewBox="0 0 220 140">
                  <polygon 
                    points="30,20 190,30 170,120 40,110" 
                    fill="rgba(16, 185, 129, 0.35)" 
                    stroke="#10b981" 
                    strokeWidth="3" 
                    strokeDasharray="4 2"
                  />
                  <circle cx="30" cy="20" r="5" fill="#f59e0b" />
                  <circle cx="190" cy="30" r="5" fill="#f59e0b" />
                  <circle cx="170" cy="120" r="5" fill="#f59e0b" />
                  <circle cx="40" cy="110" r="5" fill="#f59e0b" />
                </svg>
              </div>
              <div className="polygon-tag">
                <CheckCircle size={15} />
                <span>Roof Boundary Confirmed</span>
              </div>
            </div>
          ) : (
            <div className="empty-map-prompt">
              <PenTool size={36} className="prompt-icon" />
              <h3>Draw your roof outline on the map</h3>
              <p>Click "Draw Polygon" in the toolbar above or click here to simulate roof tracing.</p>
              <button 
                type="button" 
                className="btn-primary-sm"
                onClick={handleToggleMockTrace}
              >
                Simulate Roof Outline
              </button>
            </div>
          )}
        </div>

        {/* Map Attribution Bar */}
        <div className="map-attribution">
          Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community
        </div>
      </div>

      {/* Area Metrics Cards */}
      <div className="area-metrics-grid">
        <div className="metric-box">
          <label>Traced Roof Area</label>
          <div className="metric-value">
            <span>{roofData.areaSqM || 0}</span>
            <small>m²</small>
            <span className="sqft-sub">({Math.round((roofData.areaSqM || 0) * 10.7639)} sq.ft)</span>
          </div>
        </div>

        <div className="metric-box highlight">
          <label>Usable Roof Area (75% Rule)</label>
          <div className="metric-value emerald">
            <span>{roofData.usableAreaSqM || 0}</span>
            <small>m²</small>
            <span className="sqft-sub">({Math.round((roofData.usableAreaSqM || 0) * 10.7639)} sq.ft)</span>
          </div>
        </div>
      </div>

      {/* Rule & Guidance Alert */}
      {!roofData.traced ? (
        <div className="warning-banner">
          <AlertCircle size={18} />
          <span><strong>Mandatory:</strong> Please trace your roof outline to proceed to calculation.</span>
        </div>
      ) : (
        <div className="info-banner">
          <Info size={18} />
          <div>
            <strong>Usable Area Factor (75%):</strong> Accounts for panel spacing, walkways, shadow setbacks, vents, and roof parapet walls per MNRE standards.
          </div>
        </div>
      )}
    </div>
  );
}
