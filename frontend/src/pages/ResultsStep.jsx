import React from 'react';
import { 
  BarChart3, 
  Cpu, 
  IndianRupee, 
  Leaf, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sun, 
  Layers 
} from 'lucide-react';

export default function ResultsStep({ onReset }) {
  // Sample placeholder estimation data matching SPEC.md formulas
  const mockResults = {
    technical: {
      systemSizeKWp: 3.2,
      numPanels: 8,
      panelWattage: 400,
      totalPanelArea: 16.0,
      tracedRoofArea: 80.0,
      usableRoofArea: 60.0,
      monthlyGeneration: 360,
      monthlyConsumption: 412,
      excessGeneration: -52, // Shortfall
      limitingFactor: 'roof' // or 'bill'
    },
    financial: {
      grossCost: 176000, // 3.2 * 55,000
      subsidy: 78000,    // PM Surya Ghar max subsidy for >3kW
      netCost: 98000,    // 176,000 - 78,000
      monthlySavings: 3060, // 360 kWh * 8.50
      annualSavings: 36720,
      paybackYears: 2.7
    },
    environmental: {
      annualCO2Kg: 3542, // 360 * 12 * 0.82
      equivalentTrees: 168 // 3542 / 21
    },
    aiSummary: "Based on your roof space of 80 m² in Chhatrapati Sambhajinagar and your average monthly electricity bill of ₹3,500, a 3.2 kWp rooftop solar installation with 8 high-efficiency 400W panels is recommended. This system is estimated to generate approximately 360 kWh per month, offsetting around 87% of your electricity consumption. Under the PM Surya Ghar: Muft Bijli Yojana, an estimated central subsidy of ₹78,000 applies, reducing your net estimated investment to ₹98,000 with an attractive estimated payback period of roughly 2.7 years."
  };

  return (
    <div className="step-content-card results-dashboard">
      {/* Results Header */}
      <div className="results-header-banner">
        <div className="results-header-left">
          <div className="status-pill-success">
            <CheckCircle2 size={16} />
            <span>Preliminary Solar Assessment Ready</span>
          </div>
          <h2>Your Rooftop Solar Feasibility Estimate</h2>
          <p>Prepared for Sungroves Innovations LLP client assessment.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onReset}>
          <RotateCcw size={16} />
          <span>New Calculation</span>
        </button>
      </div>

      {/* Limiting Factor Callout */}
      {mockResults.technical.limitingFactor === 'roof' && (
        <div className="limiting-factor-banner">
          <AlertTriangle size={20} className="text-gold" />
          <div>
            <strong>Roof Space Constraint Note:</strong> Your available roof space supports approximately{' '}
            <strong>{mockResults.technical.systemSizeKWp} kWp</strong>, which covers approximately{' '}
            <strong>{Math.round((mockResults.technical.monthlyGeneration / mockResults.technical.monthlyConsumption) * 100)}%</strong>{' '}
            of your estimated monthly electricity consumption.
          </div>
        </div>
      )}

      {/* Top 3 Core Metric Highlights */}
      <div className="highlight-metrics-row">
        <div className="highlight-metric-card emerald">
          <div className="hmc-icon"><Sun size={24} /></div>
          <div className="hmc-data">
            <label>Recommended Capacity</label>
            <div className="hmc-val">{mockResults.technical.systemSizeKWp} <span>kWp</span></div>
            <span className="hmc-sub">{mockResults.technical.numPanels} × {mockResults.technical.panelWattage}W Panels</span>
          </div>
        </div>

        <div className="highlight-metric-card gold">
          <div className="hmc-icon"><IndianRupee size={24} /></div>
          <div className="hmc-data">
            <label>Estimated Net Investment</label>
            <div className="hmc-val">₹{mockResults.financial.netCost.toLocaleString('en-IN')}</div>
            <span className="hmc-sub">After ₹{mockResults.financial.subsidy.toLocaleString('en-IN')} PM Surya Ghar Subsidy</span>
          </div>
        </div>

        <div className="highlight-metric-card teal">
          <div className="hmc-icon"><Leaf size={24} /></div>
          <div className="hmc-data">
            <label>Estimated Payback Period</label>
            <div className="hmc-val">{mockResults.financial.paybackYears} <span>Years</span></div>
            <span className="hmc-sub">₹{mockResults.financial.annualSavings.toLocaleString('en-IN')} / yr Savings</span>
          </div>
        </div>
      </div>

      {/* Main Results Grid: Technical & Financial */}
      <div className="results-sections-grid">
        {/* Technical Results Section */}
        <div className="result-panel">
          <div className="panel-header">
            <Cpu size={20} className="text-emerald" />
            <h3>Technical System Specifications</h3>
          </div>
          <div className="specs-table">
            <div className="spec-row">
              <span className="spec-label">System Size</span>
              <strong className="spec-val">{mockResults.technical.systemSizeKWp} kWp</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Panel Count & Type</span>
              <strong className="spec-val">{mockResults.technical.numPanels} panels ({mockResults.technical.panelWattage}W Mono-PERC)</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Total Panel Area</span>
              <strong className="spec-val">{mockResults.technical.totalPanelArea} m²</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Traced Roof Area</span>
              <strong className="spec-val">{mockResults.technical.tracedRoofArea} m²</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Usable Roof Area (75%)</span>
              <strong className="spec-val">{mockResults.technical.usableRoofArea} m²</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Monthly Generation</span>
              <strong className="spec-val text-emerald">{mockResults.technical.monthlyGeneration} kWh / month</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Monthly Consumption</span>
              <strong className="spec-val">{mockResults.technical.monthlyConsumption} kWh / month</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Net Balance / Shortfall</span>
              <strong className="spec-val text-gold">{mockResults.technical.excessGeneration} kWh / month</strong>
            </div>
          </div>
        </div>

        {/* Financial Results Section */}
        <div className="result-panel">
          <div className="panel-header">
            <IndianRupee size={20} className="text-gold" />
            <h3>Financial & Subsidy Breakdown</h3>
          </div>
          <div className="specs-table">
            <div className="spec-row">
              <span className="spec-label">Estimated Gross Cost (₹55,000 / kWp)</span>
              <strong className="spec-val">₹{mockResults.financial.grossCost.toLocaleString('en-IN')}</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">PM Surya Ghar Central Subsidy</span>
              <strong className="spec-val text-emerald">- ₹{mockResults.financial.subsidy.toLocaleString('en-IN')}</strong>
            </div>
            <div className="spec-row highlight">
              <span className="spec-label">Estimated Net Cost</span>
              <strong className="spec-val text-emerald">₹{mockResults.financial.netCost.toLocaleString('en-IN')}</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Monthly Savings</span>
              <strong className="spec-val">₹{mockResults.financial.monthlySavings.toLocaleString('en-IN')} / month</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Annual Savings</span>
              <strong className="spec-val">₹{mockResults.financial.annualSavings.toLocaleString('en-IN')} / year</strong>
            </div>
            <div className="spec-row highlight">
              <span className="spec-label">Estimated Payback Period</span>
              <strong className="spec-val text-emerald">{mockResults.financial.paybackYears} Years</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Impact Section */}
      <div className="environmental-impact-card">
        <div className="panel-header">
          <Leaf size={20} className="text-emerald" />
          <h3>Environmental & Carbon Offset Impact</h3>
        </div>
        <div className="env-grid">
          <div className="env-box">
            <span className="env-num">{mockResults.environmental.annualCO2Kg.toLocaleString('en-IN')} kg</span>
            <span className="env-desc">Estimated CO₂ emissions avoided per year (Grid Factor: 0.82 kg/kWh)</span>
          </div>
          <div className="env-box">
            <span className="env-num">~{mockResults.environmental.equivalentTrees}</span>
            <span className="env-desc">Equivalent environmental impact of mature trees planted</span>
          </div>
        </div>
      </div>

      {/* AI Explanation Paragraph */}
      <div className="ai-explanation-card">
        <div className="ai-card-header">
          <Sparkles size={20} className="text-emerald" />
          <h3>AI System Summary & Recommendation</h3>
        </div>
        <p className="ai-paragraph">
          {mockResults.aiSummary}
        </p>
      </div>

      {/* Read-Only Roof Map Preview */}
      <div className="roof-preview-panel">
        <div className="panel-header">
          <Layers size={18} className="text-emerald" />
          <h4>Traced Roof Layout (Read-Only)</h4>
        </div>
        <div className="readonly-map-box">
          <div className="map-badge-tag">Confirmed Polygon: 80 m²</div>
          <svg width="240" height="120" viewBox="0 0 240 120">
            <polygon 
              points="40,20 200,30 180,100 50,90" 
              fill="rgba(16, 185, 129, 0.4)" 
              stroke="#10b981" 
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
