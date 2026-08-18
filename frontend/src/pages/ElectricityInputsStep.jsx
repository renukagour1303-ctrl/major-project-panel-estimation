import React from 'react';
import { Zap, IndianRupee, SunMedium, Info, Calculator, CheckCircle2 } from 'lucide-react';

const PANEL_SPECS = {
  350: { wattage: 350, area: 1.7, label: '350 W (Standard Efficiency)', desc: 'Compact size, suitable for tight or fragmented roof sections.' },
  400: { wattage: 400, area: 2.0, label: '400 W (High Efficiency)', desc: 'Optimal balance of power density, roof fit, and affordability.' },
  550: { wattage: 550, area: 2.4, label: '550 W (Ultra-High Efficiency Mono-PERC)', desc: 'Maximum generation per panel, recommended for large unshaded roofs.' }
};

export default function ElectricityInputsStep({ inputData, updateInputData }) {
  const bill = parseFloat(inputData.monthlyBill) || 0;
  const rate = parseFloat(inputData.perUnitRate) || 0;
  const selectedWattage = inputData.panelWattage || 400;

  // Estimated consumption preview (deterministic helper)
  const estimatedKWh = (bill > 0 && rate > 0) ? (bill / rate).toFixed(1) : 0;
  const estimatedDailyKWh = (estimatedKWh > 0) ? (estimatedKWh / 30).toFixed(1) : 0;

  return (
    <div className="step-content-card">
      <div className="step-header-block">
        <div className="step-icon-badge">
          <Zap size={24} />
        </div>
        <div>
          <h2>Step 3: Electricity Details & Panel Preference</h2>
          <p>
            Enter your current electricity bill information and select your preferred solar PV panel technology.
          </p>
        </div>
      </div>

      <div className="form-fields-grid">
        {/* Monthly Bill Input */}
        <div className="form-field-card">
          <label className="field-label">
            <IndianRupee size={16} className="text-emerald" />
            <span>Average Monthly Electricity Bill (₹)</span>
          </label>
          <div className="input-with-adornment">
            <span className="adornment">₹</span>
            <input
              type="number"
              min="1"
              step="50"
              placeholder="e.g. 3500"
              value={inputData.monthlyBill || ''}
              onChange={(e) => updateInputData({ monthlyBill: e.target.value })}
              className="form-input"
            />
          </div>
          <span className="field-hint">Average amount paid per month on your MSEDCL / utility bill.</span>
        </div>

        {/* Per-Unit Rate Input */}
        <div className="form-field-card">
          <label className="field-label">
            <Zap size={16} className="text-gold" />
            <span>Per-Unit Electricity Tariff (₹ / kWh)</span>
          </label>
          <div className="input-with-adornment">
            <span className="adornment">₹</span>
            <input
              type="number"
              min="0.1"
              step="0.25"
              placeholder="e.g. 8.50"
              value={inputData.perUnitRate || ''}
              onChange={(e) => updateInputData({ perUnitRate: e.target.value })}
              className="form-input"
            />
          </div>
          <span className="field-hint">Your effective tariff slab rate (typically ₹7 – ₹11 / kWh in Maharashtra).</span>
        </div>
      </div>

      {/* Consumption Estimation Pill */}
      {estimatedKWh > 0 && (
        <div className="consumption-preview-card">
          <div className="preview-item">
            <label>Estimated Monthly Consumption</label>
            <div className="preview-val">
              <strong>{estimatedKWh}</strong> <small>kWh / month</small>
            </div>
          </div>
          <div className="preview-item">
            <label>Estimated Daily Load</label>
            <div className="preview-val">
              <strong>{estimatedDailyKWh}</strong> <small>kWh / day</small>
            </div>
          </div>
        </div>
      )}

      {/* Panel Selection Section */}
      <div className="panel-selection-section">
        <label className="section-subtitle">
          <SunMedium size={18} className="text-emerald" />
          <span>Select Solar Panel Wattage</span>
        </label>
        
        <div className="panel-options-grid">
          {Object.entries(PANEL_SPECS).map(([watt, spec]) => {
            const isSelected = selectedWattage === Number(watt);
            return (
              <div
                key={watt}
                className={`panel-option-card ${isSelected ? 'selected' : ''}`}
                onClick={() => updateInputData({ panelWattage: Number(watt) })}
              >
                <div className="panel-card-header">
                  <span className="wattage-badge">{watt} Watt</span>
                  {isSelected && <CheckCircle2 size={18} className="text-emerald" />}
                </div>
                <h4 className="panel-name">{spec.label}</h4>
                <p className="panel-desc">{spec.desc}</p>
                <div className="panel-meta">
                  <span>Panel Area: <strong>{spec.area} m²</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="info-banner">
        <Info size={18} />
        <div>
          <strong>Tariff Transparency:</strong> We do not lock you into a single hardcoded tariff because slabs vary based on residential consumption brackets.
        </div>
      </div>
    </div>
  );
}
