/**
 * Deterministic Solar Calculation Engine
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 * 
 * Performs pure, deterministic solar calculation formulas according to SPEC.md.
 * Independent of React UI and AI explanation components.
 */

// Project Constants defined in SPEC.md
export const PERFORMANCE_RATIO = 0.75;
export const COST_PER_KWP = 55000;
export const GRID_EMISSION_FACTOR = 0.82; // kg CO2 / kWh
export const TREE_CO2_FACTOR = 21;        // kg CO2 avoided per tree per year

/**
 * Standard commercially available solar kit sizes in kWp (Indian Market).
 */
export const STANDARD_KIT_SIZES = [1, 1.5, 2, 3, 5, 7.5, 10];

/**
 * Rounds up the exact required kWp to the nearest standard rooftop kit size.
 * If exactKwp exceeds all standard sizes (> 10 kWp), returns exactKwp.
 */
export function roundToStandardSize(exactKwp) {
  const num = typeof exactKwp === 'number' ? exactKwp : parseFloat(exactKwp);
  if (isNaN(num) || num <= 0) return 0;
  const rounded = STANDARD_KIT_SIZES.find(
    size => size >= (num - 0.0001)
  );
  return rounded || num;
}

// Backward compatibility alias
export function selectStandardKit(exactKw) {
  return roundToStandardSize(exactKw);
}

/**
 * 1. Monthly Consumption Calculation
 * Direct kWh input takes precedence if provided and valid (> 0).
 * Otherwise calculated from bill ÷ tariff.
 */
export function calculateMonthlyConsumption(billAmount, tariffRate, directMonthlyConsumption) {
  const directVal = parseFloat(directMonthlyConsumption);
  if (!isNaN(directVal) && directVal > 0) {
    return Number(directVal.toFixed(2));
  }

  const billVal = parseFloat(billAmount);
  const rateVal = parseFloat(tariffRate);

  if (isNaN(billVal) || billVal <= 0 || isNaN(rateVal) || rateVal <= 0) {
    return 0;
  }

  return Number((billVal / rateVal).toFixed(2));
}

/**
 * 2. Daily Load Calculation
 * Daily load (kWh/day) = Monthly Consumption / 30
 */
export function calculateDailyLoad(monthlyConsumptionKwh) {
  const consumption = parseFloat(monthlyConsumptionKwh);
  if (isNaN(consumption) || consumption <= 0) return 0;
  return Number((consumption / 30).toFixed(2));
}

/**
 * 3. Bill-Based System Size Calculation (= Exact Physical Requirement)
 * Exact System Size (kWp) = Daily Load / (Peak Sun Hours × 0.75)
 * Returns full precision (4 decimal places) to avoid rounding losses before kit selection.
 */
export function calculateBillBasedSystemSize(dailyLoadKwh, peakSunHours) {
  const load = parseFloat(dailyLoadKwh);
  const psh = parseFloat(peakSunHours);

  if (isNaN(load) || load <= 0 || isNaN(psh) || psh <= 0) {
    return 0;
  }

  const billKw = load / (psh * PERFORMANCE_RATIO);
  return Number(billKw.toFixed(4));
}

/**
 * 4. Maximum Panels Possible (Physical Roof Capacity)
 * Maximum Panels = floor(Usable Roof Area / Selected Panel Area)
 */
export function calculateMaximumPanels(usableAreaSqM, panelArea) {
  const area = parseFloat(usableAreaSqM);
  const pArea = parseFloat(panelArea);

  if (isNaN(area) || area <= 0 || isNaN(pArea) || pArea <= 0) {
    return 0;
  }

  return Math.floor(area / pArea);
}

/**
 * 5. Roof-Based Maximum System Size
 * Maximum Roof System Size (kWp) = (Maximum Panels × Panel Wattage) / 1000
 */
export function calculateRoofBasedSystemSize(maximumPanels, panelWattage) {
  const maxPanels = parseInt(maximumPanels, 10);
  const wattage = parseFloat(panelWattage);

  if (isNaN(maxPanels) || maxPanels <= 0 || isNaN(wattage) || wattage <= 0) {
    return 0;
  }

  const roofKw = (maxPanels * wattage) / 1000;
  return Number(roofKw.toFixed(2));
}

/**
 * 6. Limiting Factor Determination
 * 'roof' if roof capacity is less than bill recommendation, else 'bill'.
 */
export function calculateLimitingFactor(billBasedSystemSizeKw, maximumRoofSystemSizeKw) {
  const billKw = parseFloat(billBasedSystemSizeKw) || 0;
  const roofKw = parseFloat(maximumRoofSystemSizeKw) || 0;

  if (roofKw < billKw) {
    return 'roof';
  }
  return 'bill';
}

/**
 * 7. Final System Size Calculation
 * Final System Size (kWp) = MIN(Bill-based System Size, Roof-based System Size)
 */
export function calculateFinalSystemSize(billBasedSystemSizeKw, maximumRoofSystemSizeKw) {
  const billKw = parseFloat(billBasedSystemSizeKw) || 0;
  const roofKw = parseFloat(maximumRoofSystemSizeKw) || 0;

  if (billKw <= 0 && roofKw <= 0) return 0;
  if (billKw <= 0) return roofKw;
  if (roofKw <= 0) return billKw;

  return Number(Math.min(billKw, roofKw).toFixed(2));
}

/**
 * 8. Panel Count Calculation
 * Number of Panels = integer count constrained by final system size and maximum panels.
 */
export function calculatePanelCount(finalSystemSizeKw, panelWattage, maximumPanels = Infinity) {
  const systemKw = parseFloat(finalSystemSizeKw);
  const wattage = parseFloat(panelWattage);
  const maxPanels = parseInt(maximumPanels, 10);

  if (isNaN(systemKw) || systemKw <= 0 || isNaN(wattage) || wattage <= 0) {
    return 0;
  }

  const rawCount = Math.round((systemKw * 1000) / wattage);
  const safeMax = isNaN(maxPanels) || maxPanels <= 0 ? Infinity : maxPanels;

  return Math.min(rawCount, safeMax);
}

/**
 * 9. Total Panel Area
 * Total Panel Area (m²) = Number of Panels × Panel Area
 */
export function calculateTotalPanelArea(numberOfPanels, panelArea) {
  const count = parseInt(numberOfPanels, 10);
  const pArea = parseFloat(panelArea);

  if (isNaN(count) || count <= 0 || isNaN(pArea) || pArea <= 0) {
    return 0;
  }

  return Number((count * pArea).toFixed(2));
}

/**
 * 10. Monthly Generation Calculation
 * Monthly Generation (kWh) = Final System Size × Peak Sun Hours × 30 × 0.75
 */
export function calculateMonthlyGeneration(finalSystemSizeKw, peakSunHours) {
  const systemKw = parseFloat(finalSystemSizeKw);
  const psh = parseFloat(peakSunHours);

  if (isNaN(systemKw) || systemKw <= 0 || isNaN(psh) || psh <= 0) {
    return 0;
  }

  const gen = systemKw * psh * 30 * PERFORMANCE_RATIO;
  return Number(gen.toFixed(2));
}

/**
 * 11. Monthly Savings Calculation
 * Estimated Monthly Savings (₹) = Monthly Generation × Tariff Rate
 */
export function calculateMonthlySavings(monthlyGenerationKwh, tariffRate) {
  const gen = parseFloat(monthlyGenerationKwh);
  const rate = parseFloat(tariffRate);

  if (isNaN(gen) || gen <= 0 || isNaN(rate) || rate <= 0) {
    return 0;
  }

  return Number((gen * rate).toFixed(2));
}

/**
 * 12. Excess Generation / Shortfall Calculation
 * Excess Generation (kWh) = Monthly Generation - Monthly Consumption
 */
export function calculateExcessGeneration(monthlyGenerationKwh, monthlyConsumptionKwh) {
  const gen = parseFloat(monthlyGenerationKwh) || 0;
  const cons = parseFloat(monthlyConsumptionKwh) || 0;

  return Number((gen - cons).toFixed(2));
}

/**
 * 13. Gross Cost Estimate Calculation
 * Gross Cost (₹) = Final System Size × ₹55,000/kWp
 */
export function calculateGrossCost(finalSystemSizeKw) {
  const systemKw = parseFloat(finalSystemSizeKw);
  if (isNaN(systemKw) || systemKw <= 0) return 0;

  return Math.round(systemKw * COST_PER_KWP);
}

/**
 * 14. PM Surya Ghar Subsidy Calculation
 * Residential cases (Central Government MNRE scheme):
 * - First 2 kW: ₹30,000 / kW (Max ₹60,000)
 * - 2 kW to 3 kW: ₹18,000 / kW (Max ₹18,000)
 * - Above 3 kW: ₹0 additional
 * - Maximum possible subsidy: ₹78,000
 * Commercial cases: ₹0
 */
export function calculateSubsidy(systemSizeKw, customerType = 'residential') {
  const size = parseFloat(systemSizeKw);
  if (isNaN(size) || size <= 0) return 0;
  if (customerType && customerType.toLowerCase() !== 'residential') return 0;

  let subsidy = 0;

  // First 2 kW (up to 2 kW) at ₹30,000/kW
  const firstTierKw = Math.min(size, 2.0);
  subsidy += firstTierKw * 30000;

  // 2 kW to 3 kW at ₹18,000/kW
  if (size > 2.0) {
    const secondTierKw = Math.min(size - 2.0, 1.0);
    subsidy += secondTierKw * 18000;
  }

  // Maximum cap ₹78,000
  return Math.round(Math.min(subsidy, 78000));
}

/**
 * 15. Net Cost Calculation
 * Net Cost (₹) = Math.max(0, Gross Cost - Applicable Subsidy)
 */
export function calculateNetCost(grossCostRs, applicableSubsidyRs) {
  const gross = parseFloat(grossCostRs) || 0;
  const subsidy = parseFloat(applicableSubsidyRs) || 0;

  return Math.max(0, Math.round(gross - subsidy));
}

/**
 * 16. Payback Period Calculation
 * Payback Period (years) = Net Cost / (Monthly Savings × 12)
 */
export function calculatePayback(netCostRs, monthlySavingsRs) {
  const cost = parseFloat(netCostRs);
  const savings = parseFloat(monthlySavingsRs);

  if (isNaN(cost) || cost <= 0 || isNaN(savings) || savings <= 0) {
    return {
      paybackYears: null,
      paybackMessage: 'Payback period cannot be estimated from the available information.'
    };
  }

  const annualSavings = savings * 12;
  const years = cost / annualSavings;

  return {
    paybackYears: Number(years.toFixed(2)),
    paybackMessage: `${years.toFixed(1)} years`
  };
}

/**
 * 17. Annual CO2 Saved Calculation
 * Annual CO2 Saved (kg) = Monthly Generation × 12 × 0.82 kg/kWh
 */
export function calculateAnnualCO2(monthlyGenerationKwh) {
  const gen = parseFloat(monthlyGenerationKwh);
  if (isNaN(gen) || gen <= 0) return 0;

  return Number((gen * 12 * GRID_EMISSION_FACTOR).toFixed(2));
}

/**
 * 18. Tree Equivalent Calculation
 * Equivalent Trees = Annual CO2 Saved / 21
 */
export function calculateTreeEquivalent(annualCO2SavedKg) {
  const co2 = parseFloat(annualCO2SavedKg);
  if (isNaN(co2) || co2 <= 0) return 0;

  return Math.round(co2 / TREE_CO2_FACTOR);
}

/**
 * 19. Orchestration Function: calculateSolarSystem
 * Takes combined inputs from Chunk 6, Chunk 7, and Peak Sun Hours.
 * Returns a complete structured calculation result object.
 * 
 * If peakSunHours is missing or <= 0, returns a clear validation result.
 */
export function calculateSolarSystem(inputs = {}) {
  const {
    tracedAreaSqM = 0,
    usableAreaSqM = 0,
    billAmount = 0,
    tariffRate = 0,
    directMonthlyConsumption = '',
    selectedPanel = null,
    peakSunHours = 0,
    customerType = 'residential'
  } = inputs;

  const psh = parseFloat(peakSunHours);
  if (isNaN(psh) || psh <= 0) {
    return {
      isValid: false,
      error: 'Peak Sun Hours value is required to calculate solar system sizing. Solar data not yet loaded.',
      missingField: 'peakSunHours'
    };
  }

  if (!selectedPanel || !selectedPanel.wattage || !selectedPanel.area) {
    return {
      isValid: false,
      error: 'A valid solar panel model selection is required.',
      missingField: 'selectedPanel'
    };
  }

  // 1. Consumption & Daily Load
  const monthlyConsumptionKwh = calculateMonthlyConsumption(billAmount, tariffRate, directMonthlyConsumption);
  const dailyLoadKwh = calculateDailyLoad(monthlyConsumptionKwh);

  if (monthlyConsumptionKwh <= 0 || dailyLoadKwh <= 0) {
    return {
      isValid: false,
      error: 'Valid electricity consumption or monthly bill is required.',
      missingField: 'monthlyConsumption'
    };
  }

  // 2. System Sizing Options
  // Step 1: Calculate exact system size (keep existing)
  // exactSystemSize = dailyLoad / (peakSunHours × 0.75)
  const exactSystemSize = Number((dailyLoadKwh / (psh * PERFORMANCE_RATIO)).toFixed(2));
  const billBasedSystemSizeKw = exactSystemSize;

  const maximumPanels = calculateMaximumPanels(usableAreaSqM, selectedPanel.area);
  const maximumRoofSystemSizeKw = calculateRoofBasedSystemSize(maximumPanels, selectedPanel.wattage);

  if (maximumRoofSystemSizeKw <= 0 || maximumPanels <= 0) {
    return {
      isValid: false,
      error: 'Usable roof area is too small for selected solar panels.',
      missingField: 'usableAreaSqM'
    };
  }

  // Step 2: Round up to standard kit size (NEW)
  // recommendedSystemSize = roundToStandardSize(exactSystemSize)
  const recommendedSystemSize = roundToStandardSize(exactSystemSize);
  const aboveStandardRange = exactSystemSize > 10;

  // Roof feasibility check
  const roofConstrainedKit = recommendedSystemSize > maximumRoofSystemSizeKw;
  const feasibleSystemSize = Math.min(recommendedSystemSize, maximumRoofSystemSizeKw);

  // Limiting factor: compare exact consumption requirement vs roof capacity
  const limitingFactor = calculateLimitingFactor(exactSystemSize, maximumRoofSystemSizeKw);

  // finalSystemSizeKw = standard kit size (or roof-feasible limit if constrained)
  const finalSystemSizeKw = Number(feasibleSystemSize.toFixed(2));

  // Step 3: Use recommendedSystemSize (or feasible system size) for ALL financial calculations:
  // - Monthly generation
  // - Monthly savings
  // - Gross cost
  // - Subsidy
  // - Net cost
  // - Payback period
  // - CO2 calculations
  const numberOfPanels = calculatePanelCount(finalSystemSizeKw, selectedPanel.wattage, maximumPanels);
  const totalPanelAreaSqM = calculateTotalPanelArea(numberOfPanels, selectedPanel.area);

  const monthlyGenerationKwh = calculateMonthlyGeneration(finalSystemSizeKw, psh);
  const rateNum = parseFloat(tariffRate) || 0;
  const monthlySavingsRs = calculateMonthlySavings(monthlyGenerationKwh, rateNum);
  const excessGenerationKwh = calculateExcessGeneration(monthlyGenerationKwh, monthlyConsumptionKwh);

  const grossCostRs = calculateGrossCost(finalSystemSizeKw);
  const applicableSubsidyRs = calculateSubsidy(finalSystemSizeKw, customerType);
  const netCostRs = calculateNetCost(grossCostRs, applicableSubsidyRs);

  const annualSavingsRs = Number((monthlySavingsRs * 12).toFixed(2));
  const paybackResult = calculatePayback(netCostRs, monthlySavingsRs);

  // 6. Environmental
  const annualCO2SavedKg = calculateAnnualCO2(monthlyGenerationKwh);
  const equivalentTrees = calculateTreeEquivalent(annualCO2SavedKg);

  let kitNote = '';
  if (aboveStandardRange) {
    kitNote = `Requirement exceeds 10 kWp standard range. Custom engineering required for ${exactSystemSize.toFixed(2)} kWp.`;
  } else if (roofConstrainedKit) {
    kitNote = `Nearest standard kit (${recommendedSystemSize} kWp) exceeds available roof capacity. ` +
              `Installation limited to ${feasibleSystemSize.toFixed(2)} kWp by roof area.`;
  } else {
    kitNote = `Nearest standard market kit size (${recommendedSystemSize} kWp selected for ${exactSystemSize.toFixed(2)} kWp requirement).`;
  }

  return {
    isValid: true,
    inputs: {
      tracedAreaSqM,
      usableAreaSqM,
      monthlyConsumptionKwh,
      dailyLoadKwh,
      billAmount,
      tariffRate: rateNum,
      selectedPanel,
      peakSunHours: psh,
      customerType
    },
    monthlyConsumptionKwh,
    dailyLoadKwh,

    exactSystemSize: Number(exactSystemSize.toFixed(2)),
    recommendedSystemSize,
    aboveStandardRange,
    roofConstrainedKit,
    kitNote,

    billBasedSystemSizeKw: Number(exactSystemSize.toFixed(2)),
    maximumPanels,
    maximumRoofSystemSizeKw,

    finalSystemSizeKw: Number(finalSystemSizeKw.toFixed(2)),
    limitingFactor,

    numberOfPanels,
    totalPanelAreaSqM,

    monthlyGenerationKwh,
    monthlySavingsRs,
    excessGenerationKwh,

    grossCostRs,
    applicableSubsidyRs,
    netCostRs,

    annualSavingsRs,
    paybackYears: paybackResult.paybackYears,
    paybackMessage: paybackResult.paybackMessage,

    annualCO2SavedKg,
    equivalentTrees
  };
}
