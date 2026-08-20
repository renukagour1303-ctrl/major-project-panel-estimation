import React from 'react';
import { Zap, IndianRupee, SunMedium, Info, CheckCircle2, ShieldCheck, HelpCircle, Gauge } from 'lucide-react';
import { PANEL_OPTIONS, getPanelSpec } from '../utils/panelConfig.js';
import { calculateEnergyConsumption } from '../utils/consumptionCalculator.js';

export default function ElectricityInputsStep({ inputData, updateInputData }) {
  // Extract values from state
  const monthlyBillStr = inputData?.monthlyBill ?? '3500';
  const perUnitRateStr = inputData?.perUnitRate ?? '8.50';
  const directConsumptionStr = inputData?.directMonthlyConsumption ?? '';
  const selectedWattage = inputData?.panelWattage || 400;

  // Calculate live energy consumption using explicit precedence logic
  const consumptionResult = calculateEnergyConsumption({
    monthlyBill: monthlyBillStr,
    perUnitRate: perUnitRateStr,
    directMonthlyConsumption: directConsumptionStr
  });

  const { monthlyConsumptionKwh, dailyLoadKwh, consumptionSource, isValid } = consumptionResult;

  // Handler for updating inputs
  const handleInputChange = (fields) => {
    const nextBill = fields.monthlyBill !== undefined ? fields.monthlyBill : monthlyBillStr;
    const nextRate = fields.perUnitRate !== undefined ? fields.perUnitRate : perUnitRateStr;
    const nextDirect = fields.directMonthlyConsumption !== undefined ? fields.directMonthlyConsumption : directConsumptionStr;
    const nextWattage = fields.panelWattage !== undefined ? fields.panelWattage : selectedWattage;

    const nextConsumption = calculateEnergyConsumption({
      monthlyBill: nextBill,
      perUnitRate: nextRate,
      directMonthlyConsumption: nextDirect
    });

    const selectedPanelSpec = getPanelSpec(nextWattage);

    updateInputData({
      monthlyBill: nextBill,
      perUnitRate: nextRate,
      directMonthlyConsumption: nextDirect,
      monthlyConsumptionKwh: nextConsumption.monthlyConsumptionKwh,
      dailyLoadKwh: nextConsumption.dailyLoadKwh,
      consumptionSource: nextConsumption.consumptionSource,
      panelWattage: selectedPanelSpec.wattage,
      selectedPanel: selectedPanelSpec
    });
  };

  return (
    <div className="step-content-card">
      {/* Step Header */}
      <div className="step-header-block">
        <div className="step-icon-badge">
          <Zap size={24} />
        </div>
        <div>
          <h2>Step 3: Energy Consumption & Panel Selection</h2>
          <p>
            Enter your electricity usage or bill details to calculate your daily baseline load, then choose a target solar PV panel model.
          </p>
        </div>
      </div>

      {/* Form Fields Grid */}
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
              value={monthlyBillStr}
              onChange={(e) => handleInputChange({ monthlyBill: e.target.value })}
              className="form-input"
            />
          </div>
          <span className="field-hint">Average amount paid per month on your utility bill.</span>
        </div>

        {/* Electricity Tariff Rate Input */}
        <div className="form-field-card">
          <label className="field-label">
            <Zap size={16} className="text-gold" />
            <span>Electricity Tariff Rate (₹ / kWh)</span>
          </label>
          <div className="input-with-adornment">
            <span className="adornment">₹</span>
            <input
              type="number"
              min="0.1"
              step="0.25"
              placeholder="e.g. 8.50"
              value={perUnitRateStr}
              onChange={(e) => handleInputChange({ perUnitRate: e.target.value })}
              className="form-input"
            />
          </div>
          <span className="field-hint">Your effective slab rate (typically ₹7.00 – ₹11.00 / kWh in Maharashtra).</span>
        </div>

        {/* Optional Direct Monthly Consumption Input */}
        <div className="form-field-card full-width">
          <label className="field-label">
            <Gauge size={16} className="text-emerald" />
            <span>Direct Monthly Consumption (kWh / month) [Optional]</span>
          </label>
          <div className="input-with-adornment">
            <span className="adornment">kWh</span>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 450 (Optional direct meter reading)"
              value={directConsumptionStr}
              onChange={(e) => handleInputChange({ directMonthlyConsumption: e.target.value })}
              className="form-input"
            />
          </div>
          <span className="field-hint">
            If specified, direct kWh overrides the bill-derived calculation (Precedence rule).
          </span>
        </div>
      </div>

      {/* Real-Time Consumption Summary Card */}
      <div className="consumption-summary-box">
        <div className="summary-header-row">
          <span className="summary-title-text">Calculated Baseline Load</span>
          {consumptionSource === 'direct' && (
            <span className="source-indicator-badge direct">
              <ShieldCheck size={14} />
              Direct kWh Input Active (Overrides Bill)
            </span>
          )}
          {consumptionSource === 'calculated' && (
            <span className="source-indicator-badge calculated">
              <Zap size={14} />
              Calculated from Bill & Tariff (Bill ÷ Rate)
            </span>
          )}
          {consumptionSource === 'none' && (
            <span className="source-indicator-badge none">
              <HelpCircle size={14} />
              Enter valid bill or direct kWh above
            </span>
          )}
        </div>

        <div className="consumption-preview-grid">
          <div className="preview-stat-card">
            <label>Estimated Monthly Consumption</label>
            <div className="stat-val">
              <strong>{isValid ? monthlyConsumptionKwh.toLocaleString() : '—'}</strong>
              {isValid && <small>kWh / month</small>}
            </div>
            <span className="stat-sub">
              {consumptionSource === 'direct' ? 'From direct meter entry' : (consumptionSource === 'calculated' ? `₹${monthlyBillStr} ÷ ₹${perUnitRateStr}/kWh` : 'Awaiting input')}
            </span>
          </div>

          <div className="preview-stat-card highlight">
            <label>Baseline Daily Load</label>
            <div className="stat-val emerald">
              <strong>{isValid ? dailyLoadKwh.toLocaleString() : '—'}</strong>
              {isValid && <small>kWh / day</small>}
            </div>
            <span className="stat-sub">
              {isValid ? `${monthlyConsumptionKwh} kWh ÷ 30 days` : 'Awaiting input'}
            </span>
          </div>
        </div>
      </div>

      {/* Solar Panel Selection Section */}
      <div className="panel-selection-section">
        <label className="section-subtitle">
          <SunMedium size={18} className="text-emerald" />
          <span>Select Target Solar Panel Model</span>
        </label>
        
        <div className="panel-options-grid">
          {Object.entries(PANEL_OPTIONS).map(([watt, spec]) => {
            const isSelected = Number(watt) === selectedWattage;
            return (
              <div
                key={watt}
                className={`panel-option-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleInputChange({ panelWattage: Number(watt) })}
              >
                <div className="panel-card-header">
                  <span className="wattage-badge">{spec.wattage} Watt</span>
                  {isSelected && <CheckCircle2 size={18} className="text-emerald" />}
                </div>
                <h4 className="panel-name">{spec.label}</h4>
                <p className="panel-desc">{spec.desc}</p>

                {/* Key Panel Specs */}
                <div className="panel-specs-details">
                  <div className="spec-row">
                    <span>Panel Dimensions:</span>
                    <strong>{spec.dimensions} ({spec.area} m²)</strong>
                  </div>
                  <div className="spec-row">
                    <span>Module Efficiency:</span>
                    <strong className="text-emerald">{spec.efficiency}</strong>
                  </div>
                  <div className="spec-row">
                    <span>Cell Technology:</span>
                    <span>{spec.type}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <Info size={18} />
        <div>
          <strong>Tariff & Panel Guidance:</strong> The 75% setback roof area from Step 2 is saved in state and will be combined with your daily load ({isValid ? `${dailyLoadKwh} kWh/day` : '—'}) in Step 4 to determine solar system sizing.
        </div>
      </div>
    </div>
  );
}
