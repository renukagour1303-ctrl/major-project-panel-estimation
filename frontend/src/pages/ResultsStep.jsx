import React, { useState, useEffect } from 'react';
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
  Layers,
  FileDown,
  TrendingUp,
  Calendar,
  Zap,
  MapPin,
  RefreshCw,
  Lock
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

import { fetchSolarRecommendation } from '../services/recommendationService.js';
import { generateSolarProposalPDF } from '../utils/pdfGenerator.js';
import RoofMap from '../components/RoofMap.jsx';
import AuditQuoteModal from '../components/AuditQuoteModal.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import SolarBenchmarkComparison from '../components/SolarBenchmarkComparison.jsx';
import { useCompany } from '../context/CompanyContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchPlansConfig } from '../services/paymentService.js';
import { fetchAdminSettings } from '../services/settingsService.js';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function ResultsStep({ onReset, calculationResults, roofData = {}, locationData = {}, proPrice: propProPrice }) {
  const { companyConfig } = useCompany();
  const { customer } = useCustomerAuth();
  const { user } = useAuth();
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [aiSource, setAiSource] = useState('claude');
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [plansConfig, setPlansConfig] = useState([]);
  const [proPrice, setProPrice] = useState(propProPrice ? Number(propProPrice) : 499);

  useEffect(() => {
    if (propProPrice !== undefined && propProPrice !== null) {
      setProPrice(Number(propProPrice));
    }
  }, [propProPrice]);

  useEffect(() => {
    let isMounted = true;
    async function loadPlans() {
      try {
        const res = await fetchPlansConfig();
        if (isMounted && res && res.plans) {
          setPlansConfig(res.plans);
        }
      } catch (err) {
        console.warn('Failed to fetch plan config in ResultsStep:', err);
      }

      try {
        const pricingRes = await fetch('/api/settings/pricing');
        const pricingData = await pricingRes.json();
        if (isMounted && pricingData && pricingData.proPrice) {
          setProPrice(Number(pricingData.proPrice));
          return;
        }
      } catch (e) {
        // Fallback to fetchAdminSettings
      }

      try {
        const settings = await fetchAdminSettings();
        if (isMounted && settings) {
          const price = settings.pro_plan_price ?? settings.proPlanPrice ?? settings.settings?.pro_plan_price;
          if (price !== undefined && price !== null && !isNaN(Number(price))) {
            setProPrice(Number(price));
          }
        }
      } catch (settingsErr) {
        console.warn('Failed to fetch dynamic settings in ResultsStep:', settingsErr);
      }
    }
    loadPlans();
    return () => { isMounted = false; };
  }, [propProPrice]);

  const isUserPro = (customer && customer.plan === 'pro') || (user && user.plan === 'pro');
  const freeConfig = plansConfig.find(p => p.plan_name === 'free');
  const isPdfAllowedForFree = freeConfig ? Boolean(freeConfig.allow_pdf_export) : false;
  const isPdfLocked = !isUserPro && (freeConfig ? (freeConfig.lock_pdf_export !== undefined ? Boolean(freeConfig.lock_pdf_export) : !isPdfAllowedForFree) : !isPdfAllowedForFree);
  const isAdvancedFinancialsLocked = !isUserPro && Boolean(freeConfig?.lock_advanced_financials);
  const isRoofTracingLocked = !isUserPro && Boolean(freeConfig?.lock_roof_tracing);

  // Fallback defaults if calculationResults is not provided
  const results = calculationResults ? {
    technical: {
      systemSizeKWp: calculationResults.system?.finalSystemSize ?? calculationResults.system?.recommendedSystemSize ?? 0,
      exactSystemSize: calculationResults.system?.exactSystemSize ?? calculationResults.exactSystemSize ?? (calculationResults.system?.billBasedSystemSize ?? 0),
      recommendedSystemSize: calculationResults.system?.recommendedSystemSize ?? calculationResults.recommendedSystemSize ?? (calculationResults.system?.finalSystemSize ?? 0),
      numPanels: calculationResults.panel?.panelCount ?? 0,
      panelWattage: calculationResults.panel?.wattage ?? 400,
      totalPanelArea: calculationResults.panel?.totalPanelArea ?? 0,
      tracedRoofArea: calculationResults.roof?.tracedArea ?? 0,
      usableRoofArea: calculationResults.roof?.usableArea ?? 0,
      monthlyGeneration: calculationResults.energy?.monthlyGeneration ?? 0,
      monthlyConsumption: calculationResults.electricity?.monthlyConsumption ?? 0,
      excessGeneration: calculationResults.energy?.excessGeneration ?? 0,
      limitingFactor: calculationResults.system?.limitingFactor ?? 'bill'
    },
    financial: {
      grossCost: calculationResults.financial?.grossCost ?? 0,
      subsidy: calculationResults.financial?.subsidy ?? 0,
      netCost: calculationResults.financial?.netCost ?? 0,
      monthlySavings: calculationResults.financial?.monthlySavings ?? 0,
      annualSavings: calculationResults.financial?.annualSavings ?? 0,
      paybackYears: calculationResults.financial?.paybackYears ?? 0,
      paybackMessage: calculationResults.financial?.paybackMessage ?? ''
    },
    environmental: {
      annualCO2Kg: calculationResults.environmental?.annualCO2Saved ?? 0,
      equivalentTrees: calculationResults.environmental?.equivalentTrees ?? 0
    },
    solar: calculationResults.solar || null,
    location: calculationResults.location || null
  } : {
    technical: {
      systemSizeKWp: 3.2,
      numPanels: 8,
      panelWattage: 400,
      totalPanelArea: 16.0,
      tracedRoofArea: 80.0,
      usableRoofArea: 60.0,
      monthlyGeneration: 360,
      monthlyConsumption: 412,
      excessGeneration: -52,
      limitingFactor: 'roof'
    },
    financial: {
      grossCost: 176000,
      subsidy: 78000,
      netCost: 98000,
      monthlySavings: 3060,
      annualSavings: 36720,
      paybackYears: 2.7,
      paybackMessage: '2.7 years'
    },
    environmental: {
      annualCO2Kg: 3542,
      equivalentTrees: 168
    },
    solar: { source: 'PVGIS', peakSunHours: 5.2 },
    location: { cityName: 'Chhatrapati Sambhajinagar' }
  };

  // Fetch AI recommendation on component mount
  useEffect(() => {
    let isMounted = true;

    async function loadRecommendation() {
      if (!calculationResults) return;
      setIsAiLoading(true);
      try {
        const rec = await fetchSolarRecommendation(calculationResults);
        if (isMounted && rec?.summary) {
          setAiSummary(rec.summary);
          setAiSource(rec.source || 'claude');
        }
      } catch (err) {
        console.warn('Could not load AI recommendation:', err);
      } finally {
        if (isMounted) setIsAiLoading(false);
      }
    }

    loadRecommendation();
    return () => { isMounted = false; };
  }, [calculationResults]);

  // Execute PDF Proposal Generation
  const executePdfDownload = () => {
    setIsExportingPdf(true);
    try {
      generateSolarProposalPDF({
        results,
        locationData,
        roofData,
        aiSummary: aiSummary || ''
      });
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle PDF Proposal Button Click (Feature Locking Check)
  const handleDownloadPDF = () => {
    if (isPdfLocked) {
      setIsUpgradeModalOpen(true);
      return;
    }
    executePdfDownload();
  };

  // ── Prepare Chart Data ─────────────────────────────────────────────────────

  // 1. Monthly Energy Profile Data (12 Months)
  const monthlyData = MONTH_NAMES_SHORT.map((month, idx) => {
    const monthlyIrradList = results.solar?.monthlyIrradiation;
    let monthGenKwh = 0;

    if (Array.isArray(monthlyIrradList) && monthlyIrradList[idx]?.irradiationKwhPerSqM) {
      // Seasonal generation based on real solar database monthly irradiance
      const him = monthlyIrradList[idx].irradiationKwhPerSqM;
      monthGenKwh = Math.round(results.technical.systemSizeKWp * (him / 30) * DAYS_PER_MONTH[idx] * 0.75);
    } else {
      // Normal variation around average monthly generation
      const seasonalFactors = [0.92, 0.98, 1.15, 1.22, 1.20, 0.85, 0.75, 0.78, 0.95, 1.08, 1.02, 0.90];
      monthGenKwh = Math.round(results.technical.monthlyGeneration * seasonalFactors[idx]);
    }

    return {
      month,
      solarGeneration: monthGenKwh,
      consumption: results.technical.monthlyConsumption,
      netExport: Math.max(0, monthGenKwh - results.technical.monthlyConsumption),
      shortfall: Math.max(0, results.technical.monthlyConsumption - monthGenKwh)
    };
  });

  // 2. 10-Year Cumulative ROI / Savings Projection Data
  const annualSavings = results.financial.annualSavings || (results.financial.monthlySavings * 12);
  const netInvestment = results.financial.netCost || 1;
  const degradationRate = 0.007; // 0.7% panel degradation per year
  const tariffInflationRate = 0.03; // 3% annual electricity tariff inflation

  let runningSavings = 0;
  const roiData = [];

  for (let year = 1; year <= 10; year++) {
    // Account for slight panel degradation and electricity price inflation
    const yearFactor = Math.pow(1 - degradationRate, year - 1) * Math.pow(1 + tariffInflationRate, year - 1);
    const yearlySavings = annualSavings * yearFactor;
    runningSavings += yearlySavings;

    roiData.push({
      year: `Year ${year}`,
      cumulativeSavings: Math.round(runningSavings),
      netInvestment: netInvestment,
      netReturn: Math.round(runningSavings - netInvestment)
    });
  }

  // Calculate coverage percentage
  const coveragePercent = results.technical.monthlyConsumption > 0
    ? Math.min(100, Math.round((results.technical.monthlyGeneration / results.technical.monthlyConsumption) * 100))
    : 0;

  return (
    <div className="step-content-card results-dashboard">
      {/* ── Results Header Banner ────────────────────────────────────────────── */}
      <div className="results-header-banner">
        <div className="results-header-left">
          <div className="status-pill-success">
            <CheckCircle2 size={16} />
            <span>Preliminary Solar Feasibility Assessment Ready</span>
          </div>
          <h2>Your Rooftop Solar Feasibility Estimate</h2>
          <p>
            Prepared for {companyConfig.companyName || 'Sungroves Innovations LLP'} client assessment • Location: {locationData.cityName || results.location?.cityName || 'Maharashtra, India'}
          </p>
        </div>

        <div className="results-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsQuoteModalOpen(true)}
            title="Submit calculated estimate to Sungroves engineers"
          >
            <Calendar size={17} />
            <span>Request Site Survey</span>
          </button>

          <button
            type="button"
            className="btn-pdf-export"
            onClick={handleDownloadPDF}
            disabled={isExportingPdf}
            title={isPdfLocked ? 'Pro Plan feature: Upgrade to export PDF proposal' : 'Download full professional PDF proposal'}
          >
            <FileDown size={17} />
            <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF Proposal'}</span>
            {isPdfLocked && (
              <span style={{ 
                marginLeft: '6px', 
                fontSize: '0.68rem', 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                color: '#0f172a', 
                fontWeight: 800, 
                padding: '2px 6px', 
                borderRadius: '4px',
                letterSpacing: '0.04em'
              }}>
                PRO
              </span>
            )}
          </button>

          <button type="button" className="btn-secondary" onClick={onReset}>
            <RotateCcw size={16} />
            <span>New Calculation</span>
          </button>
        </div>
      </div>

      {/* ── Limiting Factor Banner ───────────────────────────────────────────── */}
      {results.technical.limitingFactor === 'roof' ? (
        <div className="limiting-factor-banner warning">
          <AlertTriangle size={22} className="text-gold" />
          <div>
            <strong>Roof Space Constraint Note:</strong> Your available rooftop area ({results.technical.usableRoofArea} m² usable) supports a maximum capacity of{' '}
            <strong>{results.technical.systemSizeKWp} kWp</strong> ({results.technical.numPanels} panels), which is estimated to cover approximately{' '}
            <strong>{coveragePercent}%</strong> of your monthly electricity consumption.
          </div>
        </div>
      ) : (
        <div className="limiting-factor-banner success">
          <CheckCircle2 size={22} className="text-emerald" />
          <div>
            <strong>Consumption-Optimized Sizing:</strong> Based on your monthly bill, a{' '}
            <strong>{results.technical.systemSizeKWp} kWp</strong> system meets approximately{' '}
            <strong>100%</strong> of your baseline electricity load within your available roof space.
          </div>
        </div>
      )}

      {/* ── Top 3 Core Metric Highlights ─────────────────────────────────────── */}
      <div className="highlight-metrics-row">
        {/* Metric 1: System Size */}
        <div className="highlight-metric-card emerald">
          <div className="hmc-icon"><Sun size={26} /></div>
          <div className="hmc-data">
            <label>Recommended Installation</label>
            <div className="hmc-val">
              {results.technical.recommendedSystemSize || results.technical.systemSizeKWp} <span>kWp ⭐</span>
            </div>
            <div className="hmc-sub" style={{ marginTop: '4px', lineHeight: '1.4' }}>
              <div>Exact System Requirement: <strong>{results.technical.exactSystemSize || results.technical.systemSizeKWp} kWp</strong></div>
              <div 
                title="Rounded up to nearest standard rooftop kit size available in Indian market"
                style={{ fontSize: '0.72rem', color: '#94a3b8', cursor: 'help', marginTop: '2px' }}
              >
                ⓘ Rounded up to nearest standard rooftop kit size available in Indian market
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Net Investment */}
        <div className="highlight-metric-card gold">
          <div className="hmc-icon"><IndianRupee size={26} /></div>
          <div className="hmc-data">
            <label>Estimated Net Investment</label>
            <div className="hmc-val">₹{Number(results.financial.netCost).toLocaleString('en-IN')}</div>
            <span className="hmc-sub">
              {results.financial.subsidy > 0
                ? `After ₹${Number(results.financial.subsidy).toLocaleString('en-IN')} PM Surya Ghar Subsidy`
                : 'Gross Investment (Commercial / No Subsidy)'}
            </span>
          </div>
        </div>

        {/* Metric 3: Payback Period */}
        <div className="highlight-metric-card teal">
          <div className="hmc-icon"><TrendingUp size={26} /></div>
          <div className="hmc-data">
            <label>Estimated Payback Period</label>
            <div className="hmc-val">{results.financial.paybackYears ? `${results.financial.paybackYears}` : '—'} <span>Years</span></div>
            <span className="hmc-sub">₹{Number(results.financial.annualSavings).toLocaleString('en-IN')} / year estimated savings</span>
          </div>
        </div>
      </div>

      {/* ── AI Executive Summary & Recommendation ───────────────────────────── */}
      <div className="ai-explanation-card">
        <div className="ai-card-header">
          <div className="ai-badge-label">
            <Sparkles size={18} className="text-emerald" />
            <span>AI Consultant Summary & Recommendation</span>
          </div>
          {aiSource && (
            <span className="ai-source-tag">
              {aiSource === 'claude' ? 'Powered by Claude' : 'Deterministic Summary'}
            </span>
          )}
        </div>

        {isAiLoading ? (
          <div className="ai-loading-state">
            <span className="spinner-sm"></span>
            <span>Generating consultant executive summary...</span>
          </div>
        ) : (
          <p className="ai-paragraph">
            {aiSummary || `Based on your rooftop layout in ${locationData.cityName || 'Maharashtra'}, a recommended ${results.technical.systemSizeKWp} kWp solar system utilizing ${results.technical.numPanels} high-efficiency ${results.technical.panelWattage}W panels can generate roughly ${results.technical.monthlyGeneration} kWh per month. With an estimated PM Surya Ghar Central Subsidy of ₹${Number(results.financial.subsidy).toLocaleString('en-IN')}, your estimated net investment is ₹${Number(results.financial.netCost).toLocaleString('en-IN')} with an expected payback period of approximately ${results.financial.paybackYears} years.`}
          </p>
        )}
      </div>

      {/* ── Interactive Visual Charts Grid (Recharts) ────────────────────────── */}
      <div className="charts-sections-grid">
        {/* Chart 1: Monthly Energy Generation vs Consumption Profile */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-group">
              <BarChart3 size={20} className="text-emerald" />
              <div>
                <h3>Monthly Energy Profile</h3>
                <span className="chart-subtitle">Monthly Consumption vs. Solar Generation (kWh)</span>
              </div>
            </div>
          </div>

          <div className="chart-wrapper" style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit=" kWh" />
                <Tooltip
                  formatter={(value, name) => [
                    `${value} kWh`,
                    name === 'solarGeneration' ? 'Solar Generation' : 'Monthly Consumption'
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '8px' }}
                  formatter={(value) => value === 'solarGeneration' ? 'Solar Generation (kWh)' : 'Baseline Consumption (kWh)'}
                />
                <Bar dataKey="solarGeneration" fill="#10b981" radius={[4, 4, 0, 0]} name="solarGeneration" />
                <Line type="monotone" dataKey="consumption" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="consumption" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 10-Year Cumulative ROI & Savings Projection */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-group">
              <TrendingUp size={20} className="text-emerald" />
              <div>
                <h3>10-Year ROI & Cumulative Savings</h3>
                <span className="chart-subtitle">Cumulative bill savings vs. Initial Net Investment</span>
              </div>
            </div>
          </div>

          <div className="chart-wrapper" style={{ width: '100%', height: 280, position: 'relative' }}>
            {isAdvancedFinancialsLocked ? (
              <div className="locked-feature-overlay" onClick={() => setIsUpgradeModalOpen(true)}>
                <div className="locked-feature-box">
                  <Lock size={26} style={{ color: '#f59e0b' }} />
                  <h4>Advanced 10-Year ROI Projections Locked</h4>
                  <p>Upgrade to the Turnkey Pro Plan to unlock 10-year cumulative savings projections, cashflow modeling, and degradation curves.</p>
                  <button type="button" className="btn-upgrade-pill">
                    <Sparkles size={14} /> Unlock with Pro — ₹{proPrice}
                  </button>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={roiData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${Number(value).toLocaleString('en-IN')}`,
                      name === 'cumulativeSavings' ? 'Cumulative Savings' : 'Net Initial Investment'
                    ]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px' }}
                    formatter={(value) => value === 'cumulativeSavings' ? 'Cumulative Savings (₹)' : 'Initial Net Cost (₹)'}
                  />
                  <ReferenceLine y={netInvestment} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Net Investment', fill: '#ef4444', fontSize: 11, position: 'top' }} />
                  <Area type="monotone" dataKey="cumulativeSavings" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#savingsGradient)" name="cumulativeSavings" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Results Tables: Technical & Financial ───────────────────────── */}
      <div className="results-sections-grid">
        {/* Technical Results Section */}
        <div className="result-panel">
          <div className="panel-header">
            <Cpu size={20} className="text-emerald" />
            <h3>Technical System Specifications</h3>
          </div>
          <div className="specs-table">
            <div className="spec-row">
              <span className="spec-label">Exact System Requirement</span>
              <strong className="spec-val">{results.technical.exactSystemSize || results.technical.systemSizeKWp} kWp</strong>
            </div>
            <div className="spec-row highlight">
              <span className="spec-label" title="Rounded up to nearest standard rooftop kit size available in Indian market">
                Recommended Installation ⭐
                <small style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>
                  Rounded up to nearest standard rooftop kit size available in Indian market
                </small>
              </span>
              <strong className="spec-val text-emerald">{results.technical.recommendedSystemSize || results.technical.systemSizeKWp} kWp ⭐</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Panel Count & Specification</span>
              <strong className="spec-val">{results.technical.numPanels} modules ({results.technical.panelWattage}W Mono-PERC)</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Total Panel Footprint Area</span>
              <strong className="spec-val">{results.technical.totalPanelArea} m²</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">
                Total Traced Rooftop Area
                {isRoofTracingLocked && (
                  <span 
                    onClick={() => setIsUpgradeModalOpen(true)}
                    style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#f59e0b', color: '#0f172a', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    title="Custom polygon rooftop tracing is a Pro feature"
                  >
                    PRO LOCK
                  </span>
                )}
              </span>
              <strong className="spec-val">{results.technical.tracedRoofArea} m²</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Usable Solar Rooftop Area (75%)</span>
              <strong className="spec-val">{results.technical.usableRoofArea} m²</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Monthly Generation</span>
              <strong className="spec-val text-emerald">{results.technical.monthlyGeneration} kWh / month</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Monthly Consumption</span>
              <strong className="spec-val">{results.technical.monthlyConsumption} kWh / month</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Net Balance (Export / Shortfall)</span>
              <strong className={`spec-val ${results.technical.excessGeneration >= 0 ? 'text-emerald' : 'text-gold'}`}>
                {results.technical.excessGeneration >= 0 ? `+${results.technical.excessGeneration}` : results.technical.excessGeneration} kWh / month
              </strong>
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
              <span className="spec-label">Estimated Gross Cost (@ ₹55,000 / kWp)</span>
              <strong className="spec-val">₹{Number(results.financial.grossCost).toLocaleString('en-IN')}</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">PM Surya Ghar Central Subsidy</span>
              <strong className="spec-val text-emerald">- ₹{Number(results.financial.subsidy).toLocaleString('en-IN')}</strong>
            </div>
            <div className="spec-row highlight">
              <span className="spec-label">Estimated Net Customer Cost</span>
              <strong className="spec-val text-emerald">₹{Number(results.financial.netCost).toLocaleString('en-IN')}</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Monthly Electricity Savings</span>
              <strong className="spec-val">₹{Number(results.financial.monthlySavings).toLocaleString('en-IN')} / month</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Estimated Annual Electricity Savings</span>
              <strong className="spec-val">₹{Number(results.financial.annualSavings).toLocaleString('en-IN')} / year</strong>
            </div>
            <div className="spec-row highlight">
              <span className="spec-label">Estimated Simple Payback Period</span>
              <strong className="spec-val text-emerald">{results.financial.paybackYears ? `${results.financial.paybackYears} Years` : results.financial.paybackMessage}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Environmental Impact Section ────────────────────────────────────── */}
      <div className="environmental-impact-card">
        <div className="panel-header">
          <Leaf size={20} className="text-emerald" />
          <h3>Environmental & Carbon Offset Impact</h3>
        </div>
        <div className="env-grid">
          <div className="env-box">
            <span className="env-num">{Number(results.environmental.annualCO2Kg).toLocaleString('en-IN')} kg</span>
            <span className="env-desc">Estimated CO₂ emissions avoided per year (Grid Factor: 0.82 kg/kWh)</span>
          </div>
          <div className="env-box">
            <span className="env-num">~{Number(results.environmental.equivalentTrees).toLocaleString('en-IN')}</span>
            <span className="env-desc">Equivalent environmental impact of mature trees planted annually</span>
          </div>
          <div className="env-box">
            <span className="env-num">{(Number(results.environmental.annualCO2Kg) * 25 / 1000).toFixed(1)} t</span>
            <span className="env-desc">Estimated 25-year lifetime carbon offset (Metric Tonnes)</span>
          </div>
        </div>
      </div>

      {/* ── Read-Only Traced Rooftop Preview ─────────────────────────────────── */}
      <div className="roof-preview-panel">
        <div className="panel-header">
          <Layers size={18} className="text-emerald" />
          <h4>Confirmed Rooftop Geometry (Read-Only)</h4>
        </div>
        
        <div className="readonly-map-container-box">
          <RoofMap
            latitude={locationData.latitude || locationData.lat || results.location?.latitude || 19.8762}
            longitude={locationData.longitude || locationData.lng || results.location?.longitude || 75.3433}
            cityName={locationData.cityName || results.location?.cityName || ''}
            initialGeoJSON={roofData.polygonGeoJSON}
            className="readonly-roof-map"
          />
          <div className="readonly-map-overlay-badge">
            <span>Traced Area: {results.technical.tracedRoofArea} m²</span>
            <span>•</span>
            <span className="text-emerald">Usable Solar Area: {results.technical.usableRoofArea} m²</span>
          </div>
        </div>
      </div>

      {/* ── Independent Solar Benchmark Comparison Tool ───────────────────── */}
      <SolarBenchmarkComparison
        roofAreaSqM={results.technical.usableRoofArea}
        dailyIrradianceKwh={results.solar?.peakSunHours || calculationResults?.solar?.peakSunHours || 5.0}
        tariffPerKwh={results.electricity?.tariffRate || calculationResults?.electricity?.tariffRate || 8.0}
        websiteResults={calculationResults || results}
      />

      {/* ── Direct Lead Submission Banner ──────────────────────────────────── */}
      <div className="lead-cta-banner">
        <div className="lead-cta-content">
          <div className="lead-cta-icon">
            <Sun size={28} className="text-emerald" />
          </div>
          <div>
            <h3>Ready to take the next step with {companyConfig.companyName}?</h3>
            <p>
              Submit your calculated <strong>{results.technical.systemSizeKWp} kWp</strong> feasibility report directly to our installation engineers for a physical on-site structural audit and DISCOM clearance.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setIsQuoteModalOpen(true)}
        >
          <Calendar size={16} />
          <span>Book Free Site Evaluation</span>
        </button>
      </div>

      {/* ── Audit & Quotation Modal ────────────────────────────────────────── */}
      <AuditQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        results={results}
        locationData={locationData}
        roofData={roofData}
      />

      {/* ── Feature Lock Pro Upgrade Modal ─────────────────────────────────── */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgradeSuccess={executePdfDownload}
        featureName="custom PDF reports"
      />
    </div>
  );
}
