/**
 * Calculates monthly energy consumption (kWh) and daily baseline load (kWh/day)
 * according to SPEC.md explicit input precedence rules.
 * 
 * Precedence logic:
 * 1. If directMonthlyConsumption is entered and valid (> 0), use that value directly.
 * 2. Otherwise, if valid monthlyBill and perUnitRate values are available, calculate:
 *    monthlyConsumptionKwh = monthlyBill / perUnitRate
 * 3. Otherwise return 0 for both metrics.
 * 
 * Daily Load:
 *    dailyLoadKwh = monthlyConsumptionKwh / 30
 * 
 * @param {Object} params
 * @param {string|number} params.monthlyBill - Average monthly bill in ₹
 * @param {string|number} params.perUnitRate - Electricity tariff rate in ₹/kWh
 * @param {string|number} [params.directMonthlyConsumption] - Direct monthly consumption in kWh
 * @returns {Object} Calculated consumption metrics and source metadata
 */
export function calculateEnergyConsumption({ monthlyBill, perUnitRate, directMonthlyConsumption }) {
  const directVal = parseFloat(directMonthlyConsumption);
  const billVal = parseFloat(monthlyBill);
  const rateVal = parseFloat(perUnitRate);

  // 1. Direct kWh input takes top precedence if valid and > 0
  if (!isNaN(directVal) && directVal > 0) {
    const monthlyConsumptionKwh = Number(directVal.toFixed(2));
    const dailyLoadKwh = Number((monthlyConsumptionKwh / 30).toFixed(2));
    return {
      monthlyConsumptionKwh,
      dailyLoadKwh,
      consumptionSource: 'direct',
      isValid: true
    };
  }

  // 2. Fall back to bill ÷ tariff rate calculation if both are valid and > 0
  if (!isNaN(billVal) && billVal > 0 && !isNaN(rateVal) && rateVal > 0) {
    const monthlyConsumptionKwh = Number((billVal / rateVal).toFixed(2));
    const dailyLoadKwh = Number((monthlyConsumptionKwh / 30).toFixed(2));
    return {
      monthlyConsumptionKwh,
      dailyLoadKwh,
      consumptionSource: 'calculated',
      isValid: true
    };
  }

  // 3. Handle missing, zero, or negative inputs safely
  return {
    monthlyConsumptionKwh: 0,
    dailyLoadKwh: 0,
    consumptionSource: 'none',
    isValid: false
  };
}
