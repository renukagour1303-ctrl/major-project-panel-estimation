import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateSolarEstimate } from './solarCalculationController.js';

// Helper mock response object
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

describe('Solar Calculation Controller (Chunk 11 Integration)', () => {
  it('1. Rejects invalid or missing coordinates with 400', async () => {
    const req = {
      body: {
        latitude: 'invalid-lat',
        longitude: 75.3433,
        tracedRoofArea: 80,
        usableRoofArea: 60,
        monthlyBill: 3500,
        tariffRate: 8.5
      }
    };
    const res = createMockRes();
    await calculateSolarEstimate(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'INVALID_COORDINATES');
  });

  it('2. Rejects invalid or zero roof area with 400', async () => {
    const req = {
      body: {
        latitude: 19.8762,
        longitude: 75.3433,
        tracedRoofArea: 0,
        usableRoofArea: 0,
        monthlyBill: 3500,
        tariffRate: 8.5
      }
    };
    const res = createMockRes();
    await calculateSolarEstimate(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'INVALID_ROOF_AREA');
  });

  it('3. Rejects invalid electricity inputs with 400', async () => {
    const req = {
      body: {
        latitude: 19.8762,
        longitude: 75.3433,
        tracedRoofArea: 80,
        usableRoofArea: 60,
        monthlyBill: 0,
        tariffRate: 0
      }
    };
    const res = createMockRes();
    await calculateSolarEstimate(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'INVALID_ELECTRICITY_INPUTS');
  });

  it('4. Successfully executes calculation with valid inputs against real solar data', async () => {
    const req = {
      body: {
        latitude: 19.8762,
        longitude: 75.3433,
        cityName: 'Chhatrapati Sambhajinagar',
        tracedRoofArea: 80,
        usableRoofArea: 60,
        monthlyBill: 3500,
        tariffRate: 8.5,
        panelWattage: 400
      }
    };
    const res = createMockRes();
    await calculateSolarEstimate(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    
    // Check location structure
    assert.strictEqual(res.body.location.latitude, 19.8762);
    assert.strictEqual(res.body.location.longitude, 75.3433);
    assert.strictEqual(res.body.location.cityName, 'Chhatrapati Sambhajinagar');

    // Check solar structure
    assert.ok(['PVGIS', 'NASA'].includes(res.body.solar.source));
    assert.ok(res.body.solar.peakSunHours > 0);
    assert.ok(Array.isArray(res.body.solar.monthlyIrradiation));

    // Check roof structure
    assert.strictEqual(res.body.roof.tracedArea, 80);
    assert.strictEqual(res.body.roof.usableArea, 60);

    // Check electricity structure
    assert.strictEqual(res.body.electricity.monthlyConsumption, 411.76);
    assert.strictEqual(res.body.electricity.dailyLoad, 13.73);
    assert.strictEqual(res.body.electricity.tariffRate, 8.5);

    // Check panel structure
    assert.strictEqual(res.body.panel.wattage, 400);
    assert.strictEqual(res.body.panel.area, 2.0);
    assert.ok(res.body.panel.panelCount > 0);
    assert.ok(res.body.panel.totalPanelArea > 0);

    // Check system structure
    assert.ok(res.body.system.billBasedSystemSize > 0);
    assert.strictEqual(res.body.system.roofBasedSystemSize, 12);
    assert.ok(res.body.system.finalSystemSize > 0);
    assert.ok(['roof', 'bill'].includes(res.body.system.limitingFactor));

    // Check energy structure
    assert.ok(res.body.energy.monthlyGeneration > 0);
    assert.ok(res.body.energy.annualGeneration > 0);

    // Check financial structure
    assert.ok(res.body.financial.monthlySavings > 0);
    assert.ok(res.body.financial.grossCost > 0);
    assert.ok(res.body.financial.subsidy >= 0);
    assert.ok(res.body.financial.netCost > 0);
    assert.ok(res.body.financial.paybackYears > 0);

    // Check environmental structure
    assert.ok(res.body.environmental.annualCO2Saved > 0);
    assert.ok(res.body.environmental.equivalentTrees > 0);
  });
});
