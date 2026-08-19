import React, { useRef, useState } from 'react';
import { PenTool, Edit3, Trash2, RotateCcw, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import RoofMap from '../components/RoofMap.jsx';

export default function RoofTraceStep({ roofData, updateRoofData, locationData }) {
  // ── Extract confirmed coordinates from Step 1 ───────────────────────────────
  const latitude  = locationData?.latitude  ?? (locationData?.lat  ? parseFloat(locationData.lat)  : 19.8762);
  const longitude = locationData?.longitude ?? (locationData?.lng  ? parseFloat(locationData.lng)  : 75.3433);
  const cityName  = locationData?.cityName || locationData?.shortName || '';

  // ── Ref to programmatic drawing controls inside RoofMap ─────────────────────
  const drawControlRef = useRef(null); // { startDrawing, startEditing, saveEditing, clearPolygon }

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);  // track whether edit mode is active

  // ── Callbacks from RoofMap ───────────────────────────────────────────────────

  const handlePolygonDrawn = (geojson, latlngs) => {
    // Store GeoJSON geometry in roofData for later use
    // Actual area calculation is Chunk 6 (Turf.js); for now mark traced = true
    updateRoofData({
      traced: true,
      polygonGeoJSON: geojson,
      polygonLatLngs: latlngs,
      // Reset area numbers – Chunk 6 will fill these in
      areaSqM: 0,
      usableAreaSqM: 0
    });
    setIsEditing(false);
  };

  const handlePolygonCleared = () => {
    updateRoofData({
      traced: false,
      polygonGeoJSON: null,
      polygonLatLngs: null,
      areaSqM: 0,
      usableAreaSqM: 0
    });
    setIsEditing(false);
  };

  // ── Toolbar action handlers ──────────────────────────────────────────────────

  const handleDrawPolygon = () => {
    drawControlRef.current?.startDrawing();
    setIsEditing(false);
  };

  const handleEditShape = () => {
    if (!roofData.traced) return;
    if (isEditing) {
      // Save edits
      drawControlRef.current?.saveEditing();
      setIsEditing(false);
    } else {
      drawControlRef.current?.startEditing();
      setIsEditing(true);
    }
  };

  const handleClearOutline = () => {
    drawControlRef.current?.clearPolygon();
    setIsEditing(false);
  };

  const handleRedraw = () => {
    drawControlRef.current?.startDrawing();
    setIsEditing(false);
  };

  const hasPolygon = Boolean(roofData.traced && roofData.polygonGeoJSON);

  return (
    <div className="step-content-card">
      {/* ── Step header ───────────────────────────────────────────────────────── */}
      <div className="step-header-block">
        <div className="step-icon-badge">
          <PenTool size={24} />
        </div>
        <div>
          <h2>Step 2: Trace Your Rooftop Outline</h2>
          <p>
            Zoom into your building on the satellite map below, then click <strong>Draw Polygon</strong> and click around the roof outline. Double-click to close the shape.
          </p>
        </div>
      </div>

      {/* ── Drawing Toolbar ────────────────────────────────────────────────────── */}
      <div className="map-toolbar">
        <div className="toolbar-group">
          {/* Draw / Redraw */}
          <button
            type="button"
            className={`toolbar-btn ${!hasPolygon ? 'toolbar-btn-primary' : ''}`}
            onClick={handleDrawPolygon}
            title="Draw a new polygon on the map"
          >
            <PenTool size={16} />
            <span>Draw Polygon</span>
          </button>

          {/* Edit / Save */}
          <button
            type="button"
            className={`toolbar-btn ${isEditing ? 'active' : ''}`}
            disabled={!hasPolygon}
            onClick={handleEditShape}
            title={isEditing ? 'Save edits' : 'Edit the drawn polygon'}
          >
            <Edit3 size={16} />
            <span>{isEditing ? 'Save Edits' : 'Edit Shape'}</span>
          </button>

          {/* Redraw */}
          <button
            type="button"
            className="toolbar-btn"
            onClick={handleRedraw}
            title="Clear the current polygon and start fresh"
          >
            <RotateCcw size={16} />
            <span>Redraw</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            className="toolbar-btn delete"
            disabled={!hasPolygon && !roofData.traced}
            onClick={handleClearOutline}
            title="Delete the polygon and start over"
          >
            <Trash2 size={16} />
            <span>Clear Outline</span>
          </button>
        </div>

        {/* Drawing hint */}
        <div className="drawing-hint-tag">
          {hasPolygon ? (
            <span className="drawing-hint-done">
              <CheckCircle2 size={14} className="text-emerald" />
              Roof outline confirmed
            </span>
          ) : (
            <span className="drawing-hint-idle">
              Click "Draw Polygon" → click around roof → double-click to finish
            </span>
          )}
        </div>
      </div>

      {/* ── Live Leaflet Satellite Map + drawing tools ─────────────────────────── */}
      <RoofMap
        latitude={latitude}
        longitude={longitude}
        cityName={cityName}
        onPolygonDrawn={handlePolygonDrawn}
        onPolygonCleared={handlePolygonCleared}
        drawControlRef={drawControlRef}
      />

      {/* ── Area Metrics Cards (Chunk 6 will populate real m² values) ─────────── */}
      <div className="area-metrics-grid">
        <div className="metric-box">
          <label>Traced Roof Area</label>
          <div className="metric-value">
            <span>{roofData.areaSqM || '—'}</span>
            {roofData.areaSqM > 0 && <small>m²</small>}
            {roofData.areaSqM > 0 && (
              <span className="sqft-sub">({Math.round(roofData.areaSqM * 10.7639)} sq.ft)</span>
            )}
            {!roofData.areaSqM && (
              <span className="sqft-sub">Draw roof outline to calculate area</span>
            )}
          </div>
        </div>

        <div className="metric-box highlight">
          <label>Usable Roof Area (75% Rule)</label>
          <div className="metric-value emerald">
            <span>{roofData.usableAreaSqM || '—'}</span>
            {roofData.usableAreaSqM > 0 && <small>m²</small>}
            {roofData.usableAreaSqM > 0 && (
              <span className="sqft-sub">({Math.round(roofData.usableAreaSqM * 10.7639)} sq.ft)</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Status banner ──────────────────────────────────────────────────────── */}
      {!hasPolygon ? (
        <div className="warning-banner">
          <AlertCircle size={18} />
          <span>
            <strong>Required:</strong> Draw your roof outline on the satellite map above before proceeding.
          </span>
        </div>
      ) : (
        <div className="info-banner">
          <Info size={18} />
          <div>
            <strong>Usable Area Factor (75%):</strong> Accounts for panel spacing, walkways, shadow setbacks, vents, and structural obstructions (MNRE standard).
          </div>
        </div>
      )}
    </div>
  );
}
