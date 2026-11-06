import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateDeterministicFallbackSummary, generateClaudeRecommendation } from './claudeService.js';

describe('Claude AI Recommendation Service (Chunk 14)', () => {
  const sampleData = {
    location: { cityName: 'Chhatrapati Sambhajinagar', latitude: 19.8762, longitude: 75.3433 },
    system: { finalSystemSize: 3.2, limitingFactor: 'roof' },
    panel: { panelCount: 8, wattage: 400, totalPanelArea: 16.0 },
    roof: { tracedArea: 80.0, usableArea: 60.0 },
    electricity: { monthlyConsumption: 412, tariffRate: 8.50, billAmount: 3500 },
    energy: { monthlyGeneration: 360, excessGeneration: -52 },
    financial: {
      grossCost: 176000,
      subsidy: 78000,
      netCost: 98000,
      monthlySavings: 3060,
      annualSavings: 36720,
      paybackYears: 2.7
    },
    environmental: {
      annualCO2Saved: 3542,
      equivalentTrees: 168
    }
  };

  it('1. Generates deterministic fallback summary with exact calculated figures', () => {
    const summary = generateDeterministicFallbackSummary(sampleData);
    assert.ok(typeof summary === 'string');
    assert.ok(summary.includes('3.2 kWp'));
    assert.ok(summary.includes('8'));
    assert.ok(summary.includes('400W'));
    assert.ok(summary.includes('360 kWh'));
    assert.ok(summary.includes('78,000'));
    assert.ok(summary.includes('98,000'));
    assert.ok(summary.includes('2.7 years'));
  });

  it('2. Returns deterministic fallback when ANTHROPIC_API_KEY is not configured', async () => {
    const result = await generateClaudeRecommendation(sampleData);
    assert.equal(result.success, true);
    assert.ok(result.summary.length > 30);
    assert.ok(result.summary.includes('3.2 kWp'));
  });
});
