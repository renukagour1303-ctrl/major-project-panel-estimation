import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCoordinates } from './pvgisService.js';

describe('PVGIS Service - validateCoordinates', () => {
  it('should accept valid coordinates', () => {
    assert.equal(validateCoordinates(19.850556, 75.322726), null);
    assert.equal(validateCoordinates('19.85', '75.32'), null);
  });

  it('should reject missing coordinates', () => {
    assert.match(validateCoordinates(undefined, 75.32), /Latitude is required/);
    assert.match(validateCoordinates(19.85, undefined), /Longitude is required/);
  });

  it('should reject invalid coordinate ranges', () => {
    assert.match(validateCoordinates(91, 75.32), /Latitude must be between/);
    assert.match(validateCoordinates(-91, 75.32), /Latitude must be between/);
    assert.match(validateCoordinates(19.85, 181), /Longitude must be between/);
    assert.match(validateCoordinates(19.85, -181), /Longitude must be between/);
  });

  it('should reject non-numeric coordinates', () => {
    assert.match(validateCoordinates('abc', 75.32), /Latitude must be a valid number/);
    assert.match(validateCoordinates(19.85, 'def'), /Longitude must be a valid number/);
  });
});
