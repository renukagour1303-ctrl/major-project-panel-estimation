import React from 'react';
import { Calculator, MapPin, Layers, Zap, SunMedium, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function CalculationStep({ 
  locationData, 
  roofData, 
  inputData, 
  onCalculate, 
  isCalculating,
  calculationError
}) {
  const hasRoof = Boolean(roofData && roofData.traced && roofData.usableAreaSqM > 0);

  return (
    <div className="step-content-card">
      <div className="step-header-block">
        <div className="step-icon-badge">
          <Calculator size={24} />
        </div>
        <div>
          <h2>Step 4: Review Inputs & Calculate Estimate</h2>
          <p>
            Verify your parameters below. Our backend deterministic calculation engine will compute your solar capacity, generation, savings, and subsidy.
          </p>
        </div>
      </div>

      {/* Validation Warning when roof has not been traced */}
      {!hasRoof && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b' }}>
          <AlertCircle size={20} className="text-danger" style={{ flexShrink: 0 }} />
          <div>
            <strong>Roof Missing:</strong> Please trace your roof first before calculating your solar estimate.
          </div>
        </div>
      )}

      {/* Backend / Calculation Error Display */}
      {calculationError && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b' }}>
          <AlertCircle size={20} className="text-danger" style={{ flexShrink: 0 }} />
          <div>
            <strong>Calculation Error:</strong> {calculationError}
          </div>
        </div>
      )}

      {/* Summary Review Grid */}
      <div className="summary-review-grid">
        {/* Item 1: Location */}
        <div className="review-card">
          <div className="review-card-header">
            <MapPin size={18} className="text-emerald" />
            <h4>Location</h4>
          </div>
          <p className="review-main-val">{locationData.cityName || 'Chhatrapati Sambhajinagar'}</p>
          <span className="review-sub-val">
            Coordinates: {locationData.lat || locationData.latitude || '19.8762'}° N, {locationData.lng || locationData.longitude || '75.3433'}° E
          </span>
        </div>

        {/* Item 2: Roof Geometry */}
        <div className="review-card">
          <div className="review-card-header">
            <Layers size={18} className="text-gold" />
            <h4>Roof Space</h4>
          </div>
          <p className="review-main-val">
            {roofData.usableAreaSqM ? `${roofData.usableAreaSqM} m² usable` : 'No roof traced'}
          </p>
          <span className="review-sub-val">
            {roofData.tracedAreaSqM || roofData.areaSqM 
              ? `Total Traced: ${roofData.tracedAreaSqM || roofData.areaSqM} m² (75% Usable Factor applied)`
              : 'Please trace roof boundary in Step 2'}
          </span>
        </div>

        {/* Item 3: Electricity Details */}
        <div className="review-card">
          <div className="review-card-header">
            <Zap size={18} className="text-emerald" />
            <h4>Electricity Usage</h4>
          </div>
          <p className="review-main-val">
            ₹{inputData.monthlyBill || '3500'} / month
          </p>
          <span className="review-sub-val">
            Tariff Rate: ₹{inputData.perUnitRate || '8.50'} / kWh
          </span>
        </div>

        {/* Item 4: Panel Selection */}
        <div className="review-card">
          <div className="review-card-header">
            <SunMedium size={18} className="text-gold" />
            <h4>Panel Preference</h4>
          </div>
          <p className="review-main-val">
            {inputData.panelWattage || 400} W Panels
          </p>
          <span className="review-sub-val">
            Mono-PERC High-Efficiency PV Modules
          </span>
        </div>
      </div>

      {/* Action Banner */}
      <div className="calculate-action-banner">
        <div className="action-info">
          <div className="action-badge">
            <Sparkles size={16} />
            <span>Deterministic Engine + Solar Data</span>
          </div>
          <h3>Ready to generate your solar assessment?</h3>
          <p>
            The backend engine will query solar irradiance data and perform mathematical formulas for system sizing, generation, PM Surya Ghar subsidy, and payback.
          </p>
        </div>

        <button
          type="button"
          className="btn-calculate-lg"
          onClick={onCalculate}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <span className="calculating-state">
              <span className="spinner-sm"></span>
              Calculating your solar estimate...
            </span>
          ) : (
            <>
              <span>Calculate Solar Estimate</span>
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>

      <div className="info-banner">
        <ShieldCheck size={18} />
        <div>
          <strong>Deterministic Guarantee:</strong> Calculations are strictly executed with explicit formulas. AI (Claude) is used strictly as an explanation layer and never invents or overrides numerical results.
        </div>
      </div>
    </div>
  );
}
