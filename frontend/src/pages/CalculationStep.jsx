import React from 'react';
import { Calculator, MapPin, Layers, Zap, SunMedium, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function CalculationStep({ 
  locationData, 
  roofData, 
  inputData, 
  onCalculate, 
  isCalculating 
}) {
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
            Coordinates: {locationData.lat || '19.8762'}° N, {locationData.lng || '75.3433'}° E
          </span>
        </div>

        {/* Item 2: Roof Geometry */}
        <div className="review-card">
          <div className="review-card-header">
            <Layers size={18} className="text-gold" />
            <h4>Roof Space</h4>
          </div>
          <p className="review-main-val">
            {roofData.usableAreaSqM ? `${roofData.usableAreaSqM} m² usable` : '60 m² usable'}
          </p>
          <span className="review-sub-val">
            Total Traced: {roofData.areaSqM ? `${roofData.areaSqM} m²` : '80 m²'} (75% Usable Factor applied)
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
            <span>Deterministic Engine + AI Explanation</span>
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
              Computing Estimation...
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
