import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sliders,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import {
  generateBenchmarkComparison,
  formatMetricValue,
  formatVariance,
  DEFAULT_BENCHMARK_ASSUMPTIONS
} from '../utils/solarBenchmark.js';

/**
 * Independent Solar Benchmark Comparison Tool
 * 
 * Renders a side-by-side comparative verification table comparing the Sungroves Website Engine
 * against a standalone Industry Standard Benchmark model (10 m²/kW, 0.75 PR, flat ₹50k/kW).
 * 
 * Does NOT alter or replace any existing website calculations.
 */
export default function SolarBenchmarkComparison({
  roofAreaSqM,
  dailyIrradianceKwh,
  tariffPerKwh,
  websiteResults,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Allow custom override assumptions if evaluator wants to test parameter sensitivity
  const [customCostRate, setCustomCostRate] = useState(DEFAULT_BENCHMARK_ASSUMPTIONS.costRatePerKw);
  const [customAreaRatio, setCustomAreaRatio] = useState(DEFAULT_BENCHMARK_ASSUMPTIONS.areaRatioSqMPerKw);
  const [customPR, setCustomPR] = useState(DEFAULT_BENCHMARK_ASSUMPTIONS.performanceRatio);
  const [tolerance, setTolerance] = useState(DEFAULT_BENCHMARK_ASSUMPTIONS.tolerancePercent);

  // Fallback defaults without silent replacement
  const effectiveRoofArea = roofAreaSqM !== undefined && roofAreaSqM !== null ? Number(roofAreaSqM) : 0;
  const effectiveIrradiance = dailyIrradianceKwh !== undefined && dailyIrradianceKwh !== null ? Number(dailyIrradianceKwh) : DEFAULT_BENCHMARK_ASSUMPTIONS.dailyIrradianceKwh;
  const effectiveTariff = tariffPerKwh !== undefined && tariffPerKwh !== null ? Number(tariffPerKwh) : DEFAULT_BENCHMARK_ASSUMPTIONS.tariffPerKwh;

  const comparison = useMemo(() => {
    return generateBenchmarkComparison(
      {
        roofAreaSqM: effectiveRoofArea,
        dailyIrradianceKwh: effectiveIrradiance,
        tariffPerKwh: effectiveTariff
      },
      websiteResults,
      {
        costRatePerKw: Number(customCostRate),
        areaRatioSqMPerKw: Number(customAreaRatio),
        performanceRatio: Number(customPR),
        tolerancePercent: Number(tolerance)
      }
    );
  }, [
    effectiveRoofArea,
    effectiveIrradiance,
    effectiveTariff,
    websiteResults,
    customCostRate,
    customAreaRatio,
    customPR,
    tolerance
  ]);

  const resetAssumptions = () => {
    setCustomCostRate(DEFAULT_BENCHMARK_ASSUMPTIONS.costRatePerKw);
    setCustomAreaRatio(DEFAULT_BENCHMARK_ASSUMPTIONS.areaRatioSqMPerKw);
    setCustomPR(DEFAULT_BENCHMARK_ASSUMPTIONS.performanceRatio);
    setTolerance(DEFAULT_BENCHMARK_ASSUMPTIONS.tolerancePercent);
  };

  const getStatusBadge = (status) => {
    if (status === 'Validated') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#10b981',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700
          }}
        >
          <CheckCircle2 size={13} />
          Validated
        </span>
      );
    }
    if (status === 'Review') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700
          }}
        >
          <AlertCircle size={13} />
          Review
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(148, 163, 184, 0.12)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          color: '#94a3b8',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '0.78rem',
          fontWeight: 600
        }}
      >
        <HelpCircle size={13} />
        Not comparable
      </span>
    );
  };

  return (
    <div
      className={`benchmark-comparison-card ${className}`}
      style={{
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.75rem',
        marginTop: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
        color: '#f8fafc'
      }}
    >
      {/* ── Card Header ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          cursor: 'pointer',
          paddingBottom: isOpen ? '1.25rem' : '0',
          borderBottom: isOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                Independent Solar Benchmark Comparison
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700
                }}
              >
                STANDALONE VERIFICATION
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Side-by-side verification of Sungroves calculation engine against an isolated industry-standard benchmark model.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {comparison.summary && (
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>
                {comparison.summary.validatedCount} Validated
              </span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span style={{ color: comparison.summary.reviewCount > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 600 }}>
                {comparison.summary.reviewCount} Review
              </span>
            </div>
          )}
          <button
            type="button"
            aria-label="Toggle benchmark comparison details"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div style={{ paddingTop: '1.25rem' }}>
          {/* ── Input Values & Controls Bar ──────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.5rem',
              fontSize: '0.86rem'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Usable Roof Area: </span>
                <strong style={{ color: '#f8fafc' }}>{effectiveRoofArea.toFixed(1)} m²</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Daily Irradiance: </span>
                <strong style={{ color: '#f8fafc' }}>{effectiveIrradiance.toFixed(2)} kWh/m²/day</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Electricity Tariff: </span>
                <strong style={{ color: '#f8fafc' }}>₹{effectiveTariff.toFixed(2)} / kWh</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Tolerance: </span>
                <strong style={{ color: '#10b981' }}>±{tolerance}%</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Sliders size={14} />
              <span>{showConfig ? 'Hide Benchmark Assumptions' : 'Adjust Assumptions'}</span>
            </button>
          </div>

          {/* ── Configurable Assumptions Drawer (Collapsible) ───────────────── */}
          {showConfig && (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.65)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                  Configurable Benchmark Assumptions
                </h4>
                <button
                  type="button"
                  onClick={resetAssumptions}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset to Standard Defaults</span>
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Area Ratio (m² / kWp)
                  </label>
                  <input
                    type="number"
                    value={customAreaRatio}
                    onChange={(e) => setCustomAreaRatio(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Default: 10 m²/kW</small>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Performance Ratio (PR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customPR}
                    onChange={(e) => setCustomPR(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Default: 0.75 (75%)</small>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Cost Benchmark (₹ / kWp)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={customCostRate}
                    onChange={(e) => setCustomCostRate(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Default: ₹50,000 / kW</small>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Tolerance Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={tolerance}
                    onChange={(e) => setTolerance(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Default: 15%</small>
                </div>
              </div>
            </div>
          )}

          {/* ── Main Comparison Table ───────────────────────────────────────── */}
          <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
            <table
              className="benchmark-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.88rem',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0', width: '26%' }}>Metric</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0', textAlign: 'right', width: '24%' }}>
                    Industry Standard Benchmark (assumptions)
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#10b981', textAlign: 'right', width: '22%' }}>
                    Sungroves Website Engine
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0', textAlign: 'right', width: '14%' }}>
                    Variance (%)
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0', textAlign: 'center', width: '14%' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows && comparison.rows.map((row, idx) => (
                  <tr
                    key={row.key}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f8fafc' }}>
                      {row.label}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {formatMetricValue(row.key, row.benchmarkValue)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                      {formatMetricValue(row.key, row.websiteValue)}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        color:
                          row.variancePercent === null
                            ? '#94a3b8'
                            : row.variancePercent <= tolerance
                            ? '#10b981'
                            : '#fbbf24'
                      }}
                    >
                      {formatVariance(row.variancePercent)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {getStatusBadge(row.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Status Explanation & Tolerance Note ──────────────────────────── */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.8rem',
              color: '#94a3b8',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Info size={16} className="text-emerald" style={{ flexShrink: 0, marginTop: '2px', color: '#10b981' }} />
              <div>
                <strong style={{ color: '#e2e8f0' }}>Tolerance Interpretation:</strong>{' '}
                The <code>Validated</code> and <code>Review</code> labels indicate whether the result meets this project's
                chosen <strong>±{tolerance}%</strong> comparison tolerance. They do not certify regulatory compliance or absolute engineering accuracy.
                Divergence occurs naturally due to commercial standard kit sizing, consumption limits, and satellite irradiance data.
              </div>
            </div>
          </div>

          {/* ── Methodological Disclosures ──────────────────────────────────── */}
          {comparison.disclosures && comparison.disclosures.length > 0 && (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: '#cbd5e1'
              }}
            >
              <strong style={{ display: 'block', color: '#e2e8f0', marginBottom: '4px' }}>
                Engine Sizing & Meteorological Disclosures:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {comparison.disclosures.map((d, i) => (
                  <li key={i} style={{ marginBottom: '2px' }}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Assumptions Note ────────────────────────────────────────────── */}
          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            <strong>Benchmark Assumptions Note:</strong> Area ratio = {comparison.assumptions.areaRatioSqMPerKw} m²/kW;
            Performance ratio = {comparison.assumptions.performanceRatio}; Cost rate = ₹{comparison.assumptions.costRatePerKw.toLocaleString('en-IN')}/kW;
            Benchmark CFA subsidy reflects the general-state residential schedule (₹30,000/kW up to 2 kW; ₹18,000 for 3rd kW; capped at ₹78,000).
            These are configurable comparative assumptions and not a guarantee of actual government subsidy disbursement.
          </div>

          {/* ── Clear Legal & Engineering Disclaimer ────────────────────────── */}
          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              paddingTop: '0.75rem',
              fontStyle: 'italic'
            }}
          >
            <strong>Comparative Verification Disclaimer:</strong> This benchmark comparison is an independent verification
            aid designed solely to check the website calculation engine against a simplified {tolerance}% tolerance model.
            It is not an official engineering design, binding financial quote, or formal government subsidy eligibility determination.
          </div>
        </div>
      )}
    </div>
  );
}
