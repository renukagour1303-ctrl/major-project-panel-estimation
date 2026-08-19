import React from 'react';
import { PenTool, Edit3, Trash2, RotateCcw, Info, AlertCircle } from 'lucide-react';
import RoofMap from '../components/RoofMap.jsx';

export default function RoofTraceStep({ roofData, updateRoofData, locationData }) {
  // Extract confirmed coordinates from Step 1 locationData
  const latitude = locationData?.latitude ?? (locationData?.lat ? parseFloat(locationData.lat) : 19.8762);
  const longitude = locationData?.longitude ?? (locationData?.lng ? parseFloat(locationData.lng) : 75.3433);
  const cityName = locationData?.cityName || locationData?.shortName || '';

  // Placeholder trace simulation toggle for wizard progression (Chunk 5 will add live Leaflet.draw)
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
          <h2>Step 2: Inspect Satellite Imagery & Trace Rooftop</h2>
          <p>
            The interactive satellite map below is centered on your confirmed location. Zoom in to identify your building's roof.
          </p>
        </div>
      </div>

      {/* Drawing Toolbar (Ready for Chunk 5 Leaflet.draw integration) */}
      <div className="map-toolbar">
        <div className="toolbar-group">
          <button 
            type="button" 
            className={`toolbar-btn ${roofData.traced ? 'active' : ''}`}
            onClick={handleToggleMockTrace}
            title="Click to simulate roof boundary confirmation"
          >
            <PenTool size={16} />
            <span>{roofData.traced ? 'Roof Boundary Confirmed ✓' : 'Confirm Roof Outline (Mock)'}</span>
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
            <span>Clear Outline</span>
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
      </div>

      {/* Live Leaflet Satellite Map with Esri World Imagery */}
      <RoofMap 
        latitude={latitude} 
        longitude={longitude} 
        cityName={cityName} 
      />

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
          <span><strong>Notice:</strong> Please confirm your roof outline before continuing to electricity inputs.</span>
        </div>
      ) : (
        <div className="info-banner">
          <Info size={18} />
          <div>
            <strong>Usable Area Factor (75%):</strong> Automatically accounts for panel clearances, walkways, shading buffers, and structural obstructions.
          </div>
        </div>
      )}
    </div>
  );
}
