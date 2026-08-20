import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getSolarResource } from '../controllers/pvgisController.js';

describe('Chunk 10 - PVGIS -> NASA Fallback Logic', () => {
  it('TEST 1: PVGIS succeeds - NASA is NOT used', async () => {
    const req = { query: { lat: 19.85, lon: 75.32 } };
    let statusCode = 0;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    const fetchMock = mock.method(global, 'fetch', async (url) => {
      if (url.includes('PVcalc')) {
        return {
          ok: true,
          json: async () => ({
            outputs: {
              monthly: {
                fixed: Array.from({length: 12}, (_, i) => ({
                  month: i + 1,
                  'H(i)_m': 150,
                  'H(i)_d': 5
                }))
              },
              totals: {
                fixed: {
                  'H(i)_d': 5.5,
                  'H(i)_y': 1800
                }
              }
            }
          })
        };
      }
      throw new Error('Unexpected fetch call');
    });

    await getSolarResource(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseData.source, 'PVGIS');
    
    // fetch should only be called once (for PVGIS)
    assert.equal(fetchMock.mock.callCount(), 1, 'NASA should not be called when PVGIS succeeds');
    
    mock.restoreAll();
  });

  it('TEST 2: PVGIS fails and NASA succeeds', async () => {
    const req = { query: { lat: 19.85, lon: 75.32 } };
    let statusCode = 0;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    const fetchMock = mock.method(global, 'fetch', async (url) => {
      if (url.includes('PVcalc')) {
        // Simulate PVGIS failure
        return {
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          text: async () => 'Error'
        };
      }
      if (url.includes('power.larc.nasa.gov')) {
        // Simulate NASA success
        const allsky = {};
        for (let i = 1; i <= 12; i++) {
          allsky[`2015${String(i).padStart(2, '0')}`] = 5.0;
        }
        allsky['201513'] = 5.0;
        
        return {
          ok: true,
          json: async () => ({
            properties: {
              parameter: {
                ALLSKY_SFC_SW_DWN: allsky
              }
            }
          })
        };
      }
      throw new Error('Unexpected fetch call');
    });

    const logWarnMock = mock.method(console, 'warn', () => {});

    await getSolarResource(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseData.source, 'NASA');
    assert.equal(fetchMock.mock.callCount(), 2, 'NASA should be called when PVGIS fails');
    
    mock.restoreAll();
  });

  it('TEST 3: PVGIS fails and NASA also fails', async () => {
    const req = { query: { lat: 19.85, lon: 75.32 } };
    let statusCode = 0;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    mock.method(global, 'fetch', async () => {
      // Simulate failure for both
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error'
      };
    });

    mock.method(console, 'warn', () => {});
    mock.method(console, 'error', () => {});

    await getSolarResource(req, res);

    // Because both returned HTTP error, the fallback map falls back to 502 (based on NASA_HTTP_ERROR mapped in the controller)
    assert.equal(statusCode, 502);
    assert.equal(responseData.success, false);
    assert.equal(responseData.error, 'SOLAR_RESOURCE_UNAVAILABLE');
    assert.ok(responseData.details.primary);
    assert.ok(responseData.details.fallback);
    
    mock.restoreAll();
  });

  it('TEST 4: Invalid coordinates reject immediately', async () => {
    const req = { query: { lat: 100, lon: 200 } };
    let statusCode = 0;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    const fetchMock = mock.method(global, 'fetch', async () => ({}));

    await getSolarResource(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseData.error, 'INVALID_COORDINATES');
    assert.equal(fetchMock.mock.callCount(), 0, 'No APIs should be called');
    
    mock.restoreAll();
  });
});
