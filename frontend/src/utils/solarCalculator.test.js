import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

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
  calculateSolarSystem
} from './solarCalculator.js';

describe('Deterministic Solar Calculation Engine Tests (Chunk 8)', () => {

  // 1. Normal Bill
  test('1. Normal bill consumption calculation', () => {
    const consumption = calculateMonthlyConsumption(3500, 8.5, '');
    assert.equal(consumption, 411.76);
  });

  // 2. Very Low Bill
  test('2. Very low bill calculation', () => {
    const consumption = calculateMonthlyConsumption(200, 8.5, '');
    assert.equal(consumption, 23.53);
  });

  // 3. High Bill
  test('3. High bill calculation', () => {
    const consumption = calculateMonthlyConsumption(25000, 10.0, '');
    assert.equal(consumption, 2500);
  });

  // 4. Invalid Bill
  test('4. Invalid bill (negative or non-numeric)', () => {
    assert.equal(calculateMonthlyConsumption(-500, 8.5, ''), 0);
    assert.equal(calculateMonthlyConsumption('abc', 8.5, ''), 0);
  });

  // 5. Invalid Tariff
  test('5. Invalid tariff rate', () => {
    assert.equal(calculateMonthlyConsumption(3500, -2, ''), 0);
    assert.equal(calculateMonthlyConsumption(3500, 'xyz', ''), 0);
  });

  // 6. Zero Tariff / Division-by-Zero Protection
  test('6. Zero tariff rate protection (no division by zero)', () => {
    assert.equal(calculateMonthlyConsumption(3500, 0, ''), 0);
    assert.equal(calculateBillBasedSystemSize(15, 0), 0);
  });

  // 7. Normal Usable Roof Area
  test('7. Normal usable roof area maximum panels', () => {
    const maxPanels = calculateMaximumPanels(100, 2.0); // 100m² / 2.0m² per panel
    assert.equal(maxPanels, 50);
  });

  // 8. Very Small Usable Roof Area
  test('8. Very small usable roof area', () => {
    const maxPanels = calculateMaximumPanels(1.5, 2.0); // 1.5m² unusable for 2.0m² panel
    assert.equal(maxPanels, 0);
  });

  // 9. Roof-Limited System
  test('9. Roof-limited system sizing and limiting factor', () => {
    const billKw = 10.0; // Bill needs 10 kW
    const roofKw = 4.0;  // Roof can only fit 4 kW
    const limiting = calculateLimitingFactor(billKw, roofKw);
    const finalKw = calculateFinalSystemSize(billKw, roofKw);

    assert.equal(limiting, 'roof');
    assert.equal(finalKw, 4.0);
  });

  // 10. Bill-Limited System
  test('10. Bill-limited system sizing and limiting factor', () => {
    const billKw = 3.5;  // Bill needs 3.5 kW
    const roofKw = 12.0; // Roof fits 12 kW
    const limiting = calculateLimitingFactor(billKw, roofKw);
    const finalKw = calculateFinalSystemSize(billKw, roofKw);

    assert.equal(limiting, 'bill');
    assert.equal(finalKw, 3.5);
  });

  // 11. Different Panel Wattages
  test('11. Different panel wattages system size', () => {
    const size350 = calculateRoofBasedSystemSize(10, 350); // 10 * 350W = 3.5 kWp
    const size550 = calculateRoofBasedSystemSize(10, 550); // 10 * 550W = 5.5 kWp

    assert.equal(size350, 3.5);
    assert.equal(size550, 5.5);
  });

  // 12. Different Panel Areas
  test('12. Different panel areas max panels', () => {
    const panels350 = calculateMaximumPanels(50, 1.7); // floor(50/1.7) = 29
    const panels550 = calculateMaximumPanels(50, 2.4); // floor(50/2.4) = 20

    assert.equal(panels350, 29);
    assert.equal(panels550, 20);
  });

  // 13. Zero / Invalid Peak Sun Hours
  test('13. Zero or invalid peak sun hours validation state', () => {
    const result = calculateSolarSystem({
      usableAreaSqM: 50,
      monthlyConsumptionKwh: 400,
      dailyLoadKwh: 13.33,
      selectedPanel: { wattage: 400, area: 2.0 },
      peakSunHours: 0 // Missing/zero peak sun hours
    });

    assert.equal(result.isValid, false);
    assert.equal(result.missingField, 'peakSunHours');
  });

  // 14. Monthly Generation
  test('14. Monthly generation formula (finalKw * psh * 30 * 0.75)', () => {
    // 5 kWp * 5.5 PSH * 30 days * 0.75 PR = 618.75 kWh
    const gen = calculateMonthlyGeneration(5.0, 5.5);
    assert.equal(gen, 618.75);
  });

  // 15. Monthly Savings
  test('15. Monthly savings formula (generation * tariff)', () => {
    // 600 kWh * ₹8.50 = ₹5100
    const savings = calculateMonthlySavings(600, 8.50);
    assert.equal(savings, 5100.00);
  });

  // 16. Excess Generation
  test('16. Excess generation (positive net generation)', () => {
    const excess = calculateExcessGeneration(600, 400); // 600 gen - 400 consumption = +200 kWh
    assert.equal(excess, 200);
  });

  // 17. Shortfall
  test('17. Shortfall generation (negative net generation)', () => {
    const shortfall = calculateExcessGeneration(300, 450); // 300 gen - 450 consumption = -150 kWh
    assert.equal(shortfall, -150);
  });

  // 18. Subsidy Below 2 kW
  test('18. Subsidy calculation below 2 kW (1.5 kW system)', () => {
    // 1.5 kW * ₹30,000 = ₹45,000
    const subsidy = calculateSubsidy(1.5, 'residential');
    assert.equal(subsidy, 45000);
  });

  // 19. Subsidy Between 2 kW and 3 kW
  test('19. Subsidy calculation between 2 kW and 3 kW (2.5 kW system)', () => {
    // (2 kW * ₹30,000) + (0.5 kW * ₹18,000) = ₹60,000 + ₹9,000 = ₹69,000
    const subsidy = calculateSubsidy(2.5, 'residential');
    assert.equal(subsidy, 69000);
  });

  // 20. Subsidy Above 3 kW (Max Cap ₹78,000)
  test('20. Subsidy calculation above 3 kW (5 kW system capped at ₹78,000)', () => {
    // Max cap = ₹78,000
    const subsidy = calculateSubsidy(5.0, 'residential');
    assert.equal(subsidy, 78000);
  });

  // 21. Commercial Subsidy Handling
  test('21. Commercial subsidy handling (returns ₹0)', () => {
    const subsidy = calculateSubsidy(3.0, 'commercial');
    assert.equal(subsidy, 0);
  });

  // 22. Payback with Positive Savings
  test('22. Payback period calculation with positive savings', () => {
    // Net Cost = ₹1,00,000, Monthly Savings = ₹2,000 (Annual = ₹24,000)
    // Payback = 100000 / 24000 = 4.17 years
    const payback = calculatePayback(100000, 2000);
    assert.equal(payback.paybackYears, 4.17);
  });

  // 23. Payback with Zero Savings
  test('23. Payback period with zero savings (prevents division by zero)', () => {
    const payback = calculatePayback(100000, 0);
    assert.equal(payback.paybackYears, null);
    assert.ok(payback.paybackMessage.includes('cannot be estimated'));
  });

  // 24. CO2 Calculation
  test('24. Annual CO2 saved calculation', () => {
    // 500 kWh/mo * 12 mo * 0.82 kg = 4920 kg CO2
    const co2 = calculateAnnualCO2(500);
    assert.equal(co2, 4920);
  });

  // 25. Tree Equivalent Calculation
  test('25. Tree equivalent calculation', () => {
    // 4920 kg CO2 / 21 kg per tree = 234 trees
    const trees = calculateTreeEquivalent(4920);
    assert.equal(trees, 234);
  });

  // Complete End-to-End Orchestration Test
  test('26. Complete calculateSolarSystem orchestration with valid inputs', () => {
    const result = calculateSolarSystem({
      tracedAreaSqM: 60,
      usableAreaSqM: 45, // 45m² usable area -> 45/2.0 = 22 panels max -> 8.8 kWp max roof
      billAmount: 3500,
      tariffRate: 8.50, // 3500/8.50 = 411.76 kWh/mo -> 13.73 kWh/day -> bill size 3.33 kWp
      selectedPanel: { wattage: 400, area: 2.0 },
      peakSunHours: 5.5,
      customerType: 'residential'
    });

    assert.equal(result.isValid, true);
    assert.equal(result.billBasedSystemSizeKw, 3.33);
    assert.equal(result.maximumPanels, 22);
    assert.equal(result.maximumRoofSystemSizeKw, 8.8);
    assert.equal(result.limitingFactor, 'bill');
    assert.equal(result.finalSystemSizeKw, 3.33);
    assert.equal(result.numberOfPanels, 8); // 3.33 * 1000 / 400 = 8.325 -> 8 panels
    assert.equal(result.totalPanelAreaSqM, 16.0); // 8 * 2.0 = 16 m²
    assert.equal(result.grossCostRs, 183150); // 3.33 kW * 55000 = 183150
    assert.equal(result.applicableSubsidyRs, 78000); // 3.33 kW > 3 kW -> max 78000
    assert.equal(result.netCostRs, 105150); // 183150 - 78000 = 105150
    assert.ok(result.monthlyGenerationKwh > 0);
    assert.ok(result.annualCO2SavedKg > 0);
  });

});
