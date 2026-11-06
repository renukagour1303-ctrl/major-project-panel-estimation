/**
 * Claude AI Recommendation Service (Chunk 14)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 *
 * Provides natural-language explanation and pre-sales recommendation
 * based STRICTLY on the deterministic calculation results.
 *
 * Under SPEC.md rules:
 * - Claude NEVER invents or recalculates numerical values.
 * - Claude NEVER alters or overrides calculation engine outputs.
 * - Claude NEVER claims guaranteed savings or utility approvals.
 * - If Claude is unavailable or ANTHROPIC_API_KEY is unset, a deterministic fallback summary is returned.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Generate a deterministic rule-based summary when Claude is unavailable.
 * Guarantees zero downtime and complete fidelity to calculated results.
 */
export function generateDeterministicFallbackSummary(data) {
  const {
    location = {},
    system = {},
    panel = {},
    roof = {},
    electricity = {},
    energy = {},
    financial = {},
    environmental = {}
  } = data || {};

  const city = location.cityName || 'your area';
  const sizeKw = system.finalSystemSize || '—';
  const numPanels = panel.panelCount || '—';
  const panelWattage = panel.wattage || 400;
  const tracedRoof = roof.tracedArea || '—';
  const monthlyGen = energy.monthlyGeneration || '—';
  const monthlyCons = electricity.monthlyConsumption || energy.monthlyConsumption || 0;
  const netCost = financial.netCost !== undefined ? Number(financial.netCost).toLocaleString('en-IN') : '—';
  const subsidyNum = typeof financial.subsidy === 'number' ? financial.subsidy : parseFloat(financial.subsidy) || 0;
  const subsidyFormatted = subsidyNum > 0 ? subsidyNum.toLocaleString('en-IN') : '0';
  const paybackYears = financial.paybackYears ? `${financial.paybackYears} years` : 'an attractive timeline';
  const limitingFactor = system.limitingFactor;

  const coveragePct = monthlyCons > 0 && monthlyGen > 0
    ? Math.min(100, Math.round((monthlyGen / monthlyCons) * 100))
    : null;

  let limitClause = '';
  if (limitingFactor === 'roof') {
    limitClause = ` Due to physical roof boundaries (${tracedRoof} m² traced), this ${sizeKw} kWp system is optimized to capture maximum available roof space.`;
  }

  const subsidyClause = subsidyNum > 0
    ? ` With an estimated PM Surya Ghar Central Subsidy of ₹${subsidyFormatted}, your estimated net investment is ₹${netCost} with an expected payback period of approximately ${paybackYears}.`
    : ` Your estimated net investment is ₹${netCost} with an expected payback period of approximately ${paybackYears}.`;

  const coverageText = coveragePct ? ` covering approximately ${coveragePct}% of your electricity usage` : '';

  return `Based on your rooftop layout in ${city}, a recommended ${sizeKw} kWp solar system utilizing ${numPanels} high-efficiency ${panelWattage}W panels can generate roughly ${monthlyGen} kWh per month${coverageText}.${limitClause}${subsidyClause} This clean energy installation will also prevent an estimated ${environmental.annualCO2Saved || '—'} kg of CO₂ emissions annually.`;
}

/**
 * Request an AI explanation from Claude based on already-calculated results.
 *
 * @param {Object} calculationData Structured results from Chunk 8 & 11
 * @returns {Promise<Object>} { success: boolean, summary: string, source: 'claude' | 'deterministic-fallback' }
 */
export async function generateClaudeRecommendation(calculationData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If API key is missing or blank, use deterministic fallback immediately
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_anthropic_api_key_here')) {
    return {
      success: true,
      source: 'deterministic-fallback',
      summary: generateDeterministicFallbackSummary(calculationData),
      note: 'Generated using deterministic template (ANTHROPIC_API_KEY not configured).'
    };
  }

  const {
    location = {},
    solar = {},
    system = {},
    panel = {},
    roof = {},
    electricity = {},
    energy = {},
    financial = {},
    environmental = {}
  } = calculationData || {};

  const promptPayload = {
    cityName: location.cityName || 'Maharashtra, India',
    peakSunHours: solar.peakSunHours,
    solarApiUsed: solar.source || 'PVGIS',
    tracedRoofAreaSqM: roof.tracedArea,
    usableRoofAreaSqM: roof.usableArea,
    monthlyBillRs: electricity.billAmount,
    perUnitRateRs: electricity.tariffRate,
    monthlyConsumptionKwh: electricity.monthlyConsumption,
    finalSystemSizeKw: system.finalSystemSize,
    limitingFactor: system.limitingFactor,
    numberOfPanels: panel.panelCount,
    panelWattageW: panel.wattage,
    totalPanelAreaSqM: panel.totalPanelArea,
    monthlyGenerationKwh: energy.monthlyGeneration,
    excessGenerationKwh: energy.excessGeneration,
    grossCostRs: financial.grossCost,
    applicableSubsidyRs: financial.subsidy,
    netCostRs: financial.netCost,
    monthlySavingsRs: financial.monthlySavings,
    annualSavingsRs: financial.annualSavings,
    paybackYears: financial.paybackYears,
    annualCO2SavedKg: environmental.annualCO2Saved,
    equivalentTrees: environmental.equivalentTrees
  };

  const systemPrompt = `You are a professional solar energy consultant for Sungroves Innovations LLP, a solar installation company in Maharashtra, India.
Your task is to write one concise, encouraging, and clear pre-sales executive summary paragraph (3-4 sentences) explaining the calculated rooftop solar assessment for a customer.

CRITICAL RULES:
1. ONLY use the exact numerical values provided in the prompt.
2. NEVER calculate, alter, invent, or override any numbers.
3. NEVER promise guaranteed financial savings, guaranteed subsidy approval, or guaranteed net-metering payments.
4. Frame all figures as preliminary estimates for pre-sales planning before a physical site survey.
5. Highlight the capacity, panel count, estimated monthly generation, net investment after PM Surya Ghar subsidy, estimated payback, and environmental offset.
6. Return ONLY the single paragraph text with no introductory phrases or markdown headings.`;

  const userMessage = `Here are the deterministic solar calculation results:
${JSON.stringify(promptPayload, null, 2)}

Please write the client summary paragraph according to the instructions.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 350,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Claude API error (HTTP ${response.status}). Using deterministic fallback.`);
      return {
        success: true,
        source: 'deterministic-fallback',
        summary: generateDeterministicFallbackSummary(calculationData)
      };
    }

    const data = await response.json();
    const aiText = data.content?.[0]?.text?.trim();

    if (!aiText) {
      return {
        success: true,
        source: 'deterministic-fallback',
        summary: generateDeterministicFallbackSummary(calculationData)
      };
    }

    return {
      success: true,
      source: 'claude',
      summary: aiText
    };

  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`Claude API call failed (${err.message}). Using deterministic fallback.`);
    return {
      success: true,
      source: 'deterministic-fallback',
      summary: generateDeterministicFallbackSummary(calculationData)
    };
  }
}
