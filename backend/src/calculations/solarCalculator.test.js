/**
 * Unit tests for Chunk 8 Deterministic Calculation Engine on Backend
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateMonthlyConsumption,
  calculateDailyLoad,
  calculateBillBasedSystemSize,
  calculateMaximumPanels,
  calculateRoofBasedSystemSize,
  calculateLimitingFactor,
  calculateFinalSystemSize,
  calculatePanelCount,
  calculateTotalPanelArea,
  calculateMonthlyGeneration,
  calculateMonthlySavings,
  calculateExcessGeneration,
  calculateGrossCost,
  calculateSubsidy,
  calculateNetCost,
  calculatePayback,
  calculateAnnualCO2,
  calculateTreeEquivalent,
  calculateSolarSystem,
  roundToStandardSize
} from './solarCalculator.js';
import { PANEL_OPTIONS } from './panelConfig.js';

describe('Deterministic Solar Calculation Engine (Backend)', () => {
  it('1. Normal bill consumption calculation', () => {
    const result = calculateMonthlyConsumption(3500, 8.5, '');
    assert.strictEqual(result, 411.76);
  });

  it('2. Direct consumption takes precedence', () => {
    const result = calculateMonthlyConsumption(3500, 8.5, 500);
    assert.strictEqual(result, 500);
  });

  it('3. Complete calculateSolarSystem orchestration with valid inputs', () => {
    const inputs = {
      tracedAreaSqM: 80,
      usableAreaSqM: 60,
      billAmount: 3500,
      tariffRate: 8.5,
      selectedPanel: PANEL_OPTIONS[400],
      peakSunHours: 5.5,
      customerType: 'residential'
    };

    const result = calculateSolarSystem(inputs);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.exactSystemSize, 3.33);
    assert.strictEqual(result.recommendedSystemSize, 5);
    assert.strictEqual(result.maximumPanels, 30);
    assert.strictEqual(result.maximumRoofSystemSizeKw, 12);
    assert.strictEqual(result.finalSystemSizeKw, 5);
    assert.ok(result.numberOfPanels > 0);
    assert.ok(result.monthlyGenerationKwh > 0);
    assert.ok(result.monthlySavingsRs > 0);
    assert.ok(result.grossCostRs > 0);
    assert.ok(result.netCostRs > 0);
    assert.ok(result.paybackYears > 0);
  });

  it('4. Standard kit size rounding (roundToStandardSize)', () => {
    assert.strictEqual(roundToStandardSize(1.70), 2.0);
    assert.strictEqual(roundToStandardSize(0.8), 1.0);
    assert.strictEqual(roundToStandardSize(2.0), 2.0);
    assert.strictEqual(roundToStandardSize(2.1), 3.0);
    assert.strictEqual(roundToStandardSize(3.33), 5.0);
    assert.strictEqual(roundToStandardSize(6.2), 7.5);
    assert.strictEqual(roundToStandardSize(9.1), 10.0);
    assert.strictEqual(roundToStandardSize(12.5), 12.5);
  });
});
