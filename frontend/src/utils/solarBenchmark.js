/**
 * Independent Solar Benchmark Comparison Utility
 * 
 * Standalone comparative verification engine for Sungroves Solar.
 * Does NOT alter or replace any existing website calculation engine or customer flow.
 * 
 * Benchmark Formulas:
 * - Benchmark system capacity (kW) = roofAreaSqM / 10
 * - Daily generation (kWh/day) = systemCapacityKw * dailyIrradianceKwh * 0.75
 * - Annual yield (kWh/year) = dailyGenerationKwh * 365
 * - Gross cost (₹) = systemCapacityKw * 50000
 * - Benchmark CFA for general-state residential scenario:
 *   - Capacity <= 2 kW: capacityKw * 30000
 *   - Capacity > 2 and <= 3 kW: 60000 + (capacityKw - 2) * 18000
 *   - Capacity > 3 kW: 78000
 * - Net outlay (₹) = grossCost - subsidy
 * - Annual savings (₹) = annualYield * tariffPerKwh
 * - Payback (years) = netOutlay / annualSavings (when annualSavings > 0)
 */

export const DEFAULT_BENCHMARK_ASSUMPTIONS = {
  areaRatioSqMPerKw: 10,       // 10 sq.m per 1 kWp benchmark assumption
  performanceRatio: 0.75,      // 75% system performance ratio (PR)
  dailyIrradianceKwh: 5.0,     // 5.0 kWh/m²/day default peak sun hours
  tariffPerKwh: 8.0,           // ₹8.00 / kWh default grid tariff
  costRatePerKw: 50000,        // ₹50,000 / kW benchmark turnkey cost
  daysPerYear: 365,            // 365 days / year
  tolerancePercent: 15.0       // 15% comparison tolerance
};

/**
 * Validates benchmark inputs.
 * Requires finite, non-negative numbers.
 * Does NOT silently replace actual website inputs with defaults.
 */
export function validateBenchmarkInputs(inputs) {
  if (!inputs || typeof inputs !== 'object') {
    return {
      isValid: false,
      errors: { general: 'Inputs object is required.' },
      validatedInputs: null
    };
  }

  const errors = {};

  // 1. roofAreaSqM: mandatory usable roof area
  if (inputs.roofAreaSqM === undefined || inputs.roofAreaSqM === null || inputs.roofAreaSqM === '') {
    errors.roofAreaSqM = 'Usable roof area (roofAreaSqM) is required.';
  } else {
    const roofArea = Number(inputs.roofAreaSqM);
    if (!Number.isFinite(roofArea) || roofArea < 0) {
      errors.roofAreaSqM = 'Usable roof area must be a finite, non-negative number.';
    }
  }

  // 2. dailyIrradianceKwh: mandatory if provided; fallback disclosed
  let dailyIrradiance;
  let isDefaultDailyIrradiance = false;
  if (inputs.dailyIrradianceKwh === undefined || inputs.dailyIrradianceKwh === null || inputs.dailyIrradianceKwh === '') {
    dailyIrradiance = DEFAULT_BENCHMARK_ASSUMPTIONS.dailyIrradianceKwh;
    isDefaultDailyIrradiance = true;
  } else {
    dailyIrradiance = Number(inputs.dailyIrradianceKwh);
    if (!Number.isFinite(dailyIrradiance) || dailyIrradiance < 0) {
      errors.dailyIrradianceKwh = 'Daily irradiance must be a finite, non-negative number.';
    }
  }

  // 3. tariffPerKwh: mandatory if provided; fallback disclosed
  let tariffRate;
  let isDefaultTariff = false;
  if (inputs.tariffPerKwh === undefined || inputs.tariffPerKwh === null || inputs.tariffPerKwh === '') {
    tariffRate = DEFAULT_BENCHMARK_ASSUMPTIONS.tariffPerKwh;
    isDefaultTariff = true;
  } else {
    tariffRate = Number(inputs.tariffPerKwh);
    if (!Number.isFinite(tariffRate) || tariffRate < 0) {
      errors.tariffPerKwh = 'Electricity tariff must be a finite, non-negative number.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    validatedInputs: isValid ? {
      roofAreaSqM: Number(inputs.roofAreaSqM),
      dailyIrradianceKwh: dailyIrradiance,
      tariffPerKwh: tariffRate,
      isDefaultDailyIrradiance,
      isDefaultTariff
    } : null
  };
}

/**
 * Calculates benchmark PM Surya Ghar CFA subsidy for indicative general-state residential scenario.
 * Slabs:
 * - Up to 2 kW: ₹30,000 / kW
 * - Next 1 kW (2 to 3 kW): ₹18,000 / kW
 * - Above 3 kW: capped at ₹78,000
 */
export function calculateBenchmarkSubsidy(capacityKw) {
  const cap = Number(capacityKw);
  if (!Number.isFinite(cap) || cap <= 0) return 0;

  if (cap <= 2) {
    return cap * 30000;
  }
  if (cap <= 3) {
    return 60000 + (cap - 2) * 18000;
  }
  return 78000;
}

/**
 * Executes independent benchmark solar formulas.
 */
export function calculateBenchmark(rawInputs, customAssumptions = {}) {
  const validation = validateBenchmarkInputs(rawInputs);
  if (!validation.isValid) {
    return {
      isValid: false,
      errors: validation.errors,
      metrics: null
    };
  }

  const inputs = validation.validatedInputs;
  const assumptions = { ...DEFAULT_BENCHMARK_ASSUMPTIONS, ...customAssumptions };

  // 1. Capacity (kW) = roofAreaSqM / 10
  const systemCapacityKw = inputs.roofAreaSqM / assumptions.areaRatioSqMPerKw;

  // 2. Daily generation (kWh/day) = systemCapacityKw * dailyIrradianceKwh * 0.75
  const dailyGenerationKwh = systemCapacityKw * inputs.dailyIrradianceKwh * assumptions.performanceRatio;

  // 3. Annual yield (kWh/year) = dailyGenerationKwh * 365
  const annualYieldKwh = dailyGenerationKwh * assumptions.daysPerYear;

  // 4. Gross cost (₹) = systemCapacityKw * 50000
  const grossCostRs = systemCapacityKw * assumptions.costRatePerKw;

  // 5. Subsidy (₹)
  const subsidyRs = calculateBenchmarkSubsidy(systemCapacityKw);

  // 6. Net outlay (₹) = grossCost - subsidy
  const netOutlayRs = grossCostRs - subsidyRs;

  // 7. Annual savings (₹) = annualYield * tariffPerKwh
  const annualSavingsRs = annualYieldKwh * inputs.tariffPerKwh;

  // 8. Payback (years) = netOutlay / annualSavings (when annualSavings > 0)
  let paybackYears = null;
  if (annualSavingsRs > 0 && netOutlayRs >= 0) {
    paybackYears = netOutlayRs / annualSavingsRs;
  }

  return {
    isValid: true,
    inputs,
    assumptions,
    metrics: {
      systemCapacityKw,
      dailyGenerationKwh,
      annualYieldKwh,
      grossCostRs,
      subsidyRs,
      netOutlayRs,
      annualSavingsRs,
      paybackYears
    }
  };
}

/**
 * Calculates variance and status between benchmark and website values.
 * 
 * Rules:
 * - variancePercent = abs(websiteValue - benchmarkValue) / abs(benchmarkValue) * 100
 * - If both values are zero: variance is 0.00%, Status: Validated
 * - If benchmark is zero but values are not both zero: variance is null (N/A), Status: Not comparable
 * - If either value is unavailable or non-finite: variance is null (N/A), Status: Not comparable
 * - If variancePercent <= tolerance (15%): Status: Validated
 * - Otherwise: Status: Review
 */
export function calculateMetricComparison(metricKey, metricLabel, benchmarkValue, websiteValue, tolerance = 15.0) {
  const isBenchValid = benchmarkValue !== null && benchmarkValue !== undefined && Number.isFinite(Number(benchmarkValue));
  const isWebValid = websiteValue !== null && websiteValue !== undefined && Number.isFinite(Number(websiteValue));

  const benchNum = isBenchValid ? Number(benchmarkValue) : null;
  const webNum = isWebValid ? Number(websiteValue) : null;

  let variancePercent = null;
  let status = 'Not comparable';

  if (!isBenchValid || !isWebValid) {
    variancePercent = null;
    status = 'Not comparable';
  } else if (benchNum === 0 && webNum === 0) {
    variancePercent = 0.0;
    status = 'Validated';
  } else if (benchNum === 0 && webNum !== 0) {
    variancePercent = null;
    status = 'Not comparable';
  } else {
    const rawVariance = (Math.abs(webNum - benchNum) / Math.abs(benchNum)) * 100;
    variancePercent = Number(rawVariance.toFixed(2));
    status = variancePercent <= tolerance ? 'Validated' : 'Review';
  }

  return {
    key: metricKey,
    label: metricLabel,
    benchmarkValue: benchNum,
    websiteValue: webNum,
    variancePercent,
    status
  };
}

/**
 * Extracts and maps the 7 target comparison metrics from Sungroves website results.
 * Supports calculationResults (backend API or frontend orchestration result).
 */
export function extractWebsiteMetrics(websiteData) {
  if (!websiteData || typeof websiteData !== 'object') {
    return {
      systemCapacityKw: null,
      annualYieldKwh: null,
      grossCostRs: null,
      subsidyRs: null,
      netOutlayRs: null,
      annualSavingsRs: null,
      paybackYears: null,
      disclosures: ['Website calculation results not yet generated.']
    };
  }

  const disclosures = [];

  // 1. System Capacity (kW)
  let systemCapacityKw = null;
  if (websiteData.system?.finalSystemSize !== undefined) {
    systemCapacityKw = Number(websiteData.system.finalSystemSize);
  } else if (websiteData.technical?.systemSizeKWp !== undefined) {
    systemCapacityKw = Number(websiteData.technical.systemSizeKWp);
  } else if (websiteData.finalSystemSizeKw !== undefined) {
    systemCapacityKw = Number(websiteData.finalSystemSizeKw);
  }

  if (websiteData.system?.recommendedSystemSize && websiteData.system?.exactSystemSize) {
    disclosures.push(
      `Website engine sizes system using commercial rooftop kit rounding (${websiteData.system.recommendedSystemSize} kWp selected for ${websiteData.system.exactSystemSize} kWp requirement), constrained by roof and consumption.`
    );
  }

  // 2. Annual Yield (kWh/year)
  let annualYieldKwh = null;
  if (websiteData.energy?.annualGeneration !== undefined && websiteData.energy?.annualGeneration !== null) {
    annualYieldKwh = Number(websiteData.energy.annualGeneration);
  } else if (websiteData.energy?.monthlyGeneration !== undefined) {
    annualYieldKwh = Number((Number(websiteData.energy.monthlyGeneration) * 12).toFixed(2));
  } else if (websiteData.technical?.monthlyGeneration !== undefined) {
    annualYieldKwh = Number((Number(websiteData.technical.monthlyGeneration) * 12).toFixed(2));
  } else if (websiteData.monthlyGenerationKwh !== undefined) {
    annualYieldKwh = Number((Number(websiteData.monthlyGenerationKwh) * 12).toFixed(2));
  }

  if (websiteData.solar?.source) {
    disclosures.push(
      `Website engine incorporates localized satellite irradiance data (${websiteData.solar.source}) with seasonal monthly variations, whereas benchmark uses a constant 5.0 kWh/m²/day assumption.`
    );
  }

  // 3. Gross Cost (₹)
  let grossCostRs = null;
  if (websiteData.financial?.grossCost !== undefined) {
    grossCostRs = Number(websiteData.financial.grossCost);
  } else if (websiteData.grossCostRs !== undefined) {
    grossCostRs = Number(websiteData.grossCostRs);
  }

  // 4. PM Surya Ghar Subsidy (₹)
  let subsidyRs = null;
  if (websiteData.financial?.subsidy !== undefined) {
    subsidyRs = Number(websiteData.financial.subsidy);
  } else if (websiteData.applicableSubsidyRs !== undefined) {
    subsidyRs = Number(websiteData.applicableSubsidyRs);
  }

  // 5. Net Outlay (₹)
  let netOutlayRs = null;
  if (websiteData.financial?.netCost !== undefined) {
    netOutlayRs = Number(websiteData.financial.netCost);
  } else if (websiteData.netCostRs !== undefined) {
    netOutlayRs = Number(websiteData.netCostRs);
  }

  // 6. Annual Savings (₹)
  let annualSavingsRs = null;
  if (websiteData.financial?.annualSavings !== undefined) {
    annualSavingsRs = Number(websiteData.financial.annualSavings);
  } else if (websiteData.financial?.monthlySavings !== undefined) {
    annualSavingsRs = Number((Number(websiteData.financial.monthlySavings) * 12).toFixed(2));
  } else if (websiteData.annualSavingsRs !== undefined) {
    annualSavingsRs = Number(websiteData.annualSavingsRs);
  }

  // 7. Payback Period (years)
  let paybackYears = null;
  if (websiteData.financial?.paybackYears !== undefined && websiteData.financial?.paybackYears !== null) {
    paybackYears = Number(websiteData.financial.paybackYears);
  } else if (websiteData.paybackYears !== undefined && websiteData.paybackYears !== null) {
    paybackYears = Number(websiteData.paybackYears);
  }

  return {
    systemCapacityKw,
    annualYieldKwh,
    grossCostRs,
    subsidyRs,
    netOutlayRs,
    annualSavingsRs,
    paybackYears,
    disclosures
  };
}

/**
 * Master Comparison Generator:
 * Takes inputs and website results, calculates benchmark metrics,
 * and produces the 7-row comparative verification dataset.
 */
export function generateBenchmarkComparison(inputs, websiteData, customAssumptions = {}) {
  const benchmarkResult = calculateBenchmark(inputs, customAssumptions);
  if (!benchmarkResult.isValid) {
    return {
      isValid: false,
      errors: benchmarkResult.errors,
      rows: [],
      summary: null
    };
  }

  const bMetrics = benchmarkResult.metrics;
  const wMetrics = extractWebsiteMetrics(websiteData);
  const tolerance = benchmarkResult.assumptions.tolerancePercent;

  const rows = [
    calculateMetricComparison('capacity', 'System Capacity (kW)', bMetrics.systemCapacityKw, wMetrics.systemCapacityKw, tolerance),
    calculateMetricComparison('annualYield', 'Annual Yield (kWh/yr)', bMetrics.annualYieldKwh, wMetrics.annualYieldKwh, tolerance),
    calculateMetricComparison('grossCost', 'Gross Cost (₹)', bMetrics.grossCostRs, wMetrics.grossCostRs, tolerance),
    calculateMetricComparison('subsidy', 'PM Surya Ghar Subsidy (₹)', bMetrics.subsidyRs, wMetrics.subsidyRs, tolerance),
    calculateMetricComparison('netOutlay', 'Net Outlay (₹)', bMetrics.netOutlayRs, wMetrics.netOutlayRs, tolerance),
    calculateMetricComparison('annualSavings', 'Annual Savings (₹)', bMetrics.annualSavingsRs, wMetrics.annualSavingsRs, tolerance),
    calculateMetricComparison('payback', 'Payback Period (Yrs)', bMetrics.paybackYears, wMetrics.paybackYears, tolerance)
  ];

  const validatedCount = rows.filter(r => r.status === 'Validated').length;
  const reviewCount = rows.filter(r => r.status === 'Review').length;
  const notComparableCount = rows.filter(r => r.status === 'Not comparable').length;

  return {
    isValid: true,
    inputs: benchmarkResult.inputs,
    assumptions: benchmarkResult.assumptions,
    disclosures: wMetrics.disclosures,
    rows,
    summary: {
      totalMetrics: rows.length,
      validatedCount,
      reviewCount,
      notComparableCount,
      tolerancePercent: tolerance
    }
  };
}

/**
 * Value formatters for clean table rendering
 */
export function formatMetricValue(key, val) {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) {
    return 'N/A';
  }
  const n = Number(val);

  switch (key) {
    case 'capacity':
      return `${n.toFixed(2)} kW`;
    case 'annualYield':
      return `${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh/yr`;
    case 'grossCost':
    case 'subsidy':
    case 'netOutlay':
    case 'annualSavings':
      return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'payback':
      return `${n.toFixed(2)} Yrs`;
    default:
      return n.toFixed(2);
  }
}

export function formatVariance(variance) {
  if (variance === null || variance === undefined || !Number.isFinite(Number(variance))) {
    return 'N/A';
  }
  return `${Number(variance).toFixed(2)}%`;
}
