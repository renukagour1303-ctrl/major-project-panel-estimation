import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  validateBenchmarkInputs,
  calculateBenchmarkSubsidy,
  calculateBenchmark,
  calculateMetricComparison,
  extractWebsiteMetrics,
  generateBenchmarkComparison,
  formatMetricValue,
  formatVariance,
  DEFAULT_BENCHMARK_ASSUMPTIONS
} from './solarBenchmark.js';

describe('Independent Solar Benchmark Tool Test Suite', () => {

  // ── 1. Input Validation Tests ─────────────────────────────────────────────
  describe('Input Validation', () => {
    test('Validates complete and valid inputs successfully', () => {
      const res = validateBenchmarkInputs({
        roofAreaSqM: 30,
        dailyIrradianceKwh: 5.2,
        tariffPerKwh: 8.5
      });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.validatedInputs.roofAreaSqM, 30);
      assert.strictEqual(res.validatedInputs.dailyIrradianceKwh, 5.2);
      assert.strictEqual(res.validatedInputs.tariffPerKwh, 8.5);
      assert.strictEqual(res.validatedInputs.isDefaultDailyIrradiance, false);
      assert.strictEqual(res.validatedInputs.isDefaultTariff, false);
    });

    test('Rejects missing or null roofAreaSqM with clear error message', () => {
      const res1 = validateBenchmarkInputs({});
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.errors.roofAreaSqM.includes('required'));

      const res2 = validateBenchmarkInputs({ roofAreaSqM: null });
      assert.strictEqual(res2.isValid, false);
      assert.ok(res2.errors.roofAreaSqM.includes('required'));
    });

    test('Rejects negative or non-finite roof area', () => {
      const resNeg = validateBenchmarkInputs({ roofAreaSqM: -15 });
      assert.strictEqual(resNeg.isValid, false);
      assert.ok(resNeg.errors.roofAreaSqM.includes('non-negative'));

      const resNaN = validateBenchmarkInputs({ roofAreaSqM: 'invalid-area' });
      assert.strictEqual(resNaN.isValid, false);
      assert.ok(resNaN.errors.roofAreaSqM.includes('non-negative'));
    });

    test('Rejects negative or non-finite daily irradiance when supplied', () => {
      const res = validateBenchmarkInputs({ roofAreaSqM: 40, dailyIrradianceKwh: -2.5 });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.dailyIrradianceKwh.includes('non-negative'));
    });

    test('Rejects negative or non-finite electricity tariff when supplied', () => {
      const res = validateBenchmarkInputs({ roofAreaSqM: 40, tariffPerKwh: -8 });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.tariffPerKwh.includes('non-negative'));
    });

    test('Discloses and applies benchmark defaults when irradiance or tariff omitted', () => {
      const res = validateBenchmarkInputs({ roofAreaSqM: 50 });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.validatedInputs.dailyIrradianceKwh, 5.0);
      assert.strictEqual(res.validatedInputs.tariffPerKwh, 8.0);
      assert.strictEqual(res.validatedInputs.isDefaultDailyIrradiance, true);
      assert.strictEqual(res.validatedInputs.isDefaultTariff, true);
    });
  });

  // ── 2. Benchmark Subsidy (CFA) Threshold Tests ─────────────────────────────
  describe('Benchmark Subsidy (CFA) General-State Residential Schedule', () => {
    test('Calculates zero subsidy for zero or negative capacity', () => {
      assert.strictEqual(calculateBenchmarkSubsidy(0), 0);
      assert.strictEqual(calculateBenchmarkSubsidy(-1), 0);
      assert.strictEqual(calculateBenchmarkSubsidy(null), 0);
    });

    test('Calculates ₹30,000 / kW for capacity <= 2 kW', () => {
      // 1 kW -> ₹30,000
      assert.strictEqual(calculateBenchmarkSubsidy(1), 30000);
      // 1.5 kW -> ₹45,000
      assert.strictEqual(calculateBenchmarkSubsidy(1.5), 45000);
      // 2 kW threshold boundary -> ₹60,000
      assert.strictEqual(calculateBenchmarkSubsidy(2), 60000);
    });

    test('Calculates ₹60,000 + (kW - 2) * ₹18,000 for capacity between 2 kW and 3 kW', () => {
      // 2.5 kW -> 60,000 + 0.5 * 18,000 = ₹69,000
      assert.strictEqual(calculateBenchmarkSubsidy(2.5), 69000);
      // 3 kW threshold boundary -> 60,000 + 1.0 * 18,000 = ₹78,000
      assert.strictEqual(calculateBenchmarkSubsidy(3), 78000);
    });

    test('Caps subsidy at ₹78,000 for capacity > 3 kW', () => {
      // 3.1 kW -> ₹78,000
      assert.strictEqual(calculateBenchmarkSubsidy(3.1), 78000);
      // 5 kW -> ₹78,000
      assert.strictEqual(calculateBenchmarkSubsidy(5), 78000);
      // 10 kW -> ₹78,000
      assert.strictEqual(calculateBenchmarkSubsidy(10), 78000);
    });
  });

  // ── 3. Benchmark Core Formulas Tests ───────────────────────────────────────
  describe('Benchmark Formula Computations', () => {
    test('Correctly computes all 8 metrics for a 30 m² usable roof scenario', () => {
      // Inputs: roofAreaSqM = 30, dailyIrradianceKwh = 5.0, tariffPerKwh = 8.0
      const res = calculateBenchmark({
        roofAreaSqM: 30,
        dailyIrradianceKwh: 5.0,
        tariffPerKwh: 8.0
      });

      assert.strictEqual(res.isValid, true);
      const m = res.metrics;

      // 1. System Capacity = 30 / 10 = 3.0 kW
      assert.strictEqual(m.systemCapacityKw, 3.0);

      // 2. Daily generation = 3.0 * 5.0 * 0.75 = 11.25 kWh/day
      assert.strictEqual(m.dailyGenerationKwh, 11.25);

      // 3. Annual yield = 11.25 * 365 = 4106.25 kWh/year
      assert.strictEqual(m.annualYieldKwh, 4106.25);

      // 4. Gross cost = 3.0 * 50,000 = ₹1,50,000
      assert.strictEqual(m.grossCostRs, 150000);

      // 5. Subsidy for 3 kW = 60,000 + 1 * 18,000 = ₹78,000
      assert.strictEqual(m.subsidyRs, 78000);

      // 6. Net outlay = 1,50,000 - 78,000 = ₹72,000
      assert.strictEqual(m.netOutlayRs, 72000);

      // 7. Annual savings = 4106.25 * 8.0 = ₹32,850
      assert.strictEqual(m.annualSavingsRs, 32850);

      // 8. Payback period = 72,000 / 32,850 ≈ 2.19177 years
      assert.ok(Math.abs(m.paybackYears - (72000 / 32850)) < 1e-4);
    });

    test('Handles zero annual savings without throwing division by zero', () => {
      const res = calculateBenchmark({
        roofAreaSqM: 20,
        dailyIrradianceKwh: 5.0,
        tariffPerKwh: 0 // Free electricity or zero savings
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.metrics.annualSavingsRs, 0);
      assert.strictEqual(res.metrics.paybackYears, null);
    });

    test('Supports custom configurable benchmark assumptions', () => {
      const custom = {
        costRatePerKw: 60000,
        areaRatioSqMPerKw: 8,
        performanceRatio: 0.80
      };

      const res = calculateBenchmark({
        roofAreaSqM: 40,
        dailyIrradianceKwh: 5.0,
        tariffPerKwh: 8.0
      }, custom);

      assert.strictEqual(res.isValid, true);
      // Capacity = 40 / 8 = 5.0 kW
      assert.strictEqual(res.metrics.systemCapacityKw, 5.0);
      // Daily generation = 5.0 * 5.0 * 0.80 = 20.0 kWh/day
      assert.strictEqual(res.metrics.dailyGenerationKwh, 20.0);
      // Gross cost = 5.0 * 60,000 = ₹3,00,000
      assert.strictEqual(res.metrics.grossCostRs, 300000);
    });
  });

  // ── 4. Variance & Status Threshold Tests ───────────────────────────────────
  describe('Variance Calculation and Status Thresholds', () => {
    test('Both values zero evaluates to 0.00% variance and Validated', () => {
      const res = calculateMetricComparison('subsidy', 'Subsidy', 0, 0);
      assert.strictEqual(res.variancePercent, 0.0);
      assert.strictEqual(res.status, 'Validated');
    });

    test('Benchmark zero but website non-zero evaluates to N/A and Not comparable', () => {
      const res = calculateMetricComparison('capacity', 'Capacity', 0, 2.5);
      assert.strictEqual(res.variancePercent, null);
      assert.strictEqual(res.status, 'Not comparable');
    });

    test('Either value null or non-finite evaluates to N/A and Not comparable', () => {
      const res1 = calculateMetricComparison('payback', 'Payback', 2.5, null);
      assert.strictEqual(res1.variancePercent, null);
      assert.strictEqual(res1.status, 'Not comparable');

      const res2 = calculateMetricComparison('grossCost', 'Gross Cost', undefined, 150000);
      assert.strictEqual(res2.variancePercent, null);
      assert.strictEqual(res2.status, 'Not comparable');
    });

    test('Variance <= 15% marks status as Validated', () => {
      // Benchmark = 100, Website = 110 -> 10.00% variance
      const res10 = calculateMetricComparison('capacity', 'Capacity', 100, 110);
      assert.strictEqual(res10.variancePercent, 10.0);
      assert.strictEqual(res10.status, 'Validated');

      // Boundary condition: exactly 15.00%
      const res15 = calculateMetricComparison('capacity', 'Capacity', 100, 115);
      assert.strictEqual(res15.variancePercent, 15.0);
      assert.strictEqual(res15.status, 'Validated');
    });

    test('Variance > 15% marks status as Review', () => {
      // Benchmark = 100, Website = 116 -> 16.00% variance
      const res16 = calculateMetricComparison('capacity', 'Capacity', 100, 116);
      assert.strictEqual(res16.variancePercent, 16.0);
      assert.strictEqual(res16.status, 'Review');

      // Negative divergence: Benchmark = 100, Website = 80 -> 20.00% variance
      const res20 = calculateMetricComparison('capacity', 'Capacity', 100, 80);
      assert.strictEqual(res20.variancePercent, 20.0);
      assert.strictEqual(res20.status, 'Review');
    });
  });

  // ── 5. End-to-End Master Comparison & Extraction Tests ─────────────────────
  describe('Master Comparison Generation & Formatting', () => {
    test('Correctly maps website output and formats all 7 required metrics', () => {
      const websiteData = {
        technical: {
          systemSizeKWp: 3.0,
          monthlyGeneration: 345
        },
        financial: {
          grossCost: 165000,
          subsidy: 78000,
          netCost: 87000,
          annualSavings: 33120,
          paybackYears: 2.63
        },
        system: {
          recommendedSystemSize: 3.0,
          exactSystemSize: 2.85
        },
        solar: {
          source: 'PVGIS-SARAH2'
        }
      };

      const result = generateBenchmarkComparison(
        { roofAreaSqM: 30, dailyIrradianceKwh: 5.0, tariffPerKwh: 8.0 },
        websiteData
      );

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.rows.length, 7);

      const [capacityRow, yieldRow, grossRow, subRow, netRow, savingsRow, paybackRow] = result.rows;

      // 1. Capacity
      assert.strictEqual(capacityRow.label, 'System Capacity (kW)');
      assert.strictEqual(capacityRow.benchmarkValue, 3.0);
      assert.strictEqual(capacityRow.websiteValue, 3.0);
      assert.strictEqual(capacityRow.variancePercent, 0.0);
      assert.strictEqual(capacityRow.status, 'Validated');

      // 2. Annual Yield
      assert.strictEqual(yieldRow.label, 'Annual Yield (kWh/yr)');
      assert.strictEqual(yieldRow.benchmarkValue, 4106.25);
      assert.strictEqual(yieldRow.websiteValue, 4140); // 345 * 12
      assert.ok(yieldRow.variancePercent < 1.0);
      assert.strictEqual(yieldRow.status, 'Validated');

      // 3. Gross Cost
      assert.strictEqual(grossRow.label, 'Gross Cost (₹)');
      assert.strictEqual(grossRow.benchmarkValue, 150000);
      assert.strictEqual(grossRow.websiteValue, 165000);
      assert.strictEqual(grossRow.variancePercent, 10.0);
      assert.strictEqual(grossRow.status, 'Validated');

      // 4. Subsidy
      assert.strictEqual(subRow.label, 'PM Surya Ghar Subsidy (₹)');
      assert.strictEqual(subRow.benchmarkValue, 78000);
      assert.strictEqual(subRow.websiteValue, 78000);
      assert.strictEqual(subRow.variancePercent, 0.0);
      assert.strictEqual(subRow.status, 'Validated');

      // Formatting checks
      assert.strictEqual(formatMetricValue('capacity', 3.0), '3.00 kW');
      assert.strictEqual(formatMetricValue('payback', 2.63), '2.63 Yrs');
      assert.ok(formatMetricValue('annualYield', 4106.25).includes('4,106.25 kWh/yr'));
      assert.strictEqual(formatVariance(0.0), '0.00%');
      assert.strictEqual(formatVariance(null), 'N/A');
    });
  });
});
