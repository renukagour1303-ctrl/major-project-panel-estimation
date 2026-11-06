/**
 * Solar Calculation Controller (Chunk 11)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 * 
 * End-to-end calculation endpoint:
 * 1. Validates inputs (location coordinates, roof geometry, electricity inputs, panel selection).
 * 2. Fetches real solar resource data from PVGIS (with NASA POWER fallback).
 * 3. Executes the Chunk 8 deterministic calculation engine.
 * 4. Returns a clean structured estimation response.
 */

import { fetchPVGISSolarResource, validateCoordinates } from '../services/pvgisService.js';
import { fetchNasaPowerSolarResource } from '../services/nasaPowerService.js';
import { calculateSolarSystem } from '../calculations/solarCalculator.js';
import { getPanelSpec, PANEL_OPTIONS } from '../calculations/panelConfig.js';

/**
 * Controller for POST /api/solar/calculate
 */
export async function calculateSolarEstimate(req, res) {
  try {
    const {
      latitude,
      longitude,
      lat,
      lng,
      cityName,
      tracedRoofArea,
      tracedAreaSqM,
      usableRoofArea,
      usableAreaSqM,
      monthlyBill,
      billAmount,
      perUnitRate,
      tariffRate,
      directMonthlyConsumption,
      monthlyConsumptionKwh,
      panelWattage,
      selectedPanel,
      customerType = 'residential'
    } = req.body || {};

    // ── 1. Validate Location Coordinates ─────────────────────────────────────
    const finalLat = latitude !== undefined ? latitude : lat;
    const finalLon = longitude !== undefined ? longitude : lng;

    const coordError = validateCoordinates(finalLat, finalLon);
    if (coordError) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_COORDINATES',
        message: coordError
      });
    }

    const latNum = parseFloat(finalLat);
    const lonNum = parseFloat(finalLon);

    // ── 2. Validate Roof Geometry ───────────────────────────────────────────
    const finalTracedArea = parseFloat(tracedRoofArea !== undefined ? tracedRoofArea : tracedAreaSqM);
    const finalUsableArea = parseFloat(usableRoofArea !== undefined ? usableRoofArea : usableAreaSqM);

    if (isNaN(finalTracedArea) || finalTracedArea <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ROOF_AREA',
        message: 'Traced roof area must be a positive number.'
      });
    }

    if (isNaN(finalUsableArea) || finalUsableArea <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_USABLE_ROOF_AREA',
        message: 'Usable roof area must be a positive number.'
      });
    }

    // ── 3. Validate Electricity Inputs ──────────────────────────────────────
    const finalBill = parseFloat(monthlyBill !== undefined ? monthlyBill : billAmount);
    const finalTariff = parseFloat(tariffRate !== undefined ? tariffRate : perUnitRate);
    const directCons = directMonthlyConsumption !== undefined ? directMonthlyConsumption : monthlyConsumptionKwh;
    const directConsNum = parseFloat(directCons);

    const hasValidDirectConsumption = !isNaN(directConsNum) && directConsNum > 0;
    const hasValidBillAndTariff = !isNaN(finalBill) && finalBill > 0 && !isNaN(finalTariff) && finalTariff > 0;

    if (!hasValidDirectConsumption && !hasValidBillAndTariff) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ELECTRICITY_INPUTS',
        message: 'Valid monthly electricity bill and tariff rate (or direct monthly consumption) are required.'
      });
    }

    // ── 4. Validate Panel Selection ─────────────────────────────────────────
    let resolvedPanel = selectedPanel;
    if (!resolvedPanel || !resolvedPanel.wattage || !resolvedPanel.area) {
      const wattage = panelWattage || selectedPanel?.wattage || 400;
      resolvedPanel = getPanelSpec(wattage);
    } else {
      // Verify wattage exists in supported options
      if (!PANEL_OPTIONS[resolvedPanel.wattage]) {
        resolvedPanel = getPanelSpec(resolvedPanel.wattage);
      }
    }

    if (!resolvedPanel || !resolvedPanel.wattage || !resolvedPanel.area) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PANEL_SELECTION',
        message: 'A valid supported solar panel configuration is required.'
      });
    }

    // ── 5. Fetch Real Solar Resource Data (PVGIS -> NASA Fallback) ───────────
    let solarResult = await fetchPVGISSolarResource(latNum, lonNum);

    if (!solarResult.success) {
      console.warn(`PVGIS unavailable for (${latNum}, ${lonNum}): ${solarResult.message}. Trying NASA POWER...`);
      solarResult = await fetchNasaPowerSolarResource(latNum, lonNum);
    }

    if (!solarResult.success) {
      console.error(`Both PVGIS and NASA failed for (${latNum}, ${lonNum}): ${solarResult.message}`);
      const status = solarResult.error === 'NASA_TIMEOUT' ? 504 :
                     solarResult.error === 'NASA_HTTP_ERROR' ? 502 : 500;

      return res.status(status).json({
        success: false,
        error: 'SOLAR_RESOURCE_UNAVAILABLE',
        message: 'Solar data could not be retrieved right now. Please try again later.',
        details: solarResult
      });
    }

    const peakSunHours = solarResult.peakSunHours;
    if (!peakSunHours || peakSunHours <= 0) {
      return res.status(502).json({
        success: false,
        error: 'INVALID_SOLAR_RESOURCE_DATA',
        message: 'Could not derive valid Peak Sun Hours from solar data provider.'
      });
    }

    // ── 6. Execute Deterministic Calculation Engine ──────────────────────────
    const calcInputs = {
      tracedAreaSqM: finalTracedArea,
      usableAreaSqM: finalUsableArea,
      billAmount: !isNaN(finalBill) ? finalBill : 0,
      tariffRate: !isNaN(finalTariff) ? finalTariff : 0,
      directMonthlyConsumption: hasValidDirectConsumption ? directConsNum : '',
      selectedPanel: resolvedPanel,
      peakSunHours,
      customerType
    };

    const calcResult = calculateSolarSystem(calcInputs);

    if (!calcResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'CALCULATION_ERROR',
        message: calcResult.error || 'Unable to perform calculation with provided inputs.'
      });
    }

    // ── 7. Build Structured Response ─────────────────────────────────────────
    const responsePayload = {
      success: true,
      location: {
        latitude: latNum,
        longitude: lonNum,
        cityName: cityName || null
      },
      solar: {
        source: solarResult.source,
        peakSunHours: solarResult.peakSunHours,
        monthlyIrradiation: solarResult.monthlyIrradiation || [],
        annualIrradiation: solarResult.annualIrradiationKwhPerSqM || null,
        radiationDatabase: solarResult.radiationDatabase || null,
        elevation: solarResult.elevation ?? null
      },
      roof: {
        tracedArea: finalTracedArea,
        usableArea: finalUsableArea
      },
      electricity: {
        monthlyConsumption: calcResult.monthlyConsumptionKwh,
        dailyLoad: calcResult.dailyLoadKwh,
        tariffRate: calcResult.inputs.tariffRate,
        billAmount: calcResult.inputs.billAmount
      },
      panel: {
        selectedPanel: resolvedPanel,
        wattage: resolvedPanel.wattage,
        area: resolvedPanel.area,
        panelCount: calcResult.numberOfPanels,
        totalPanelArea: calcResult.totalPanelAreaSqM
      },
      exactSystemSize: calcResult.exactSystemSize,
      recommendedSystemSize: calcResult.recommendedSystemSize,
      system: {
        billBasedSystemSize: calcResult.billBasedSystemSizeKw,
        roofBasedSystemSize: calcResult.maximumRoofSystemSizeKw,
        finalSystemSize: calcResult.finalSystemSizeKw,
        limitingFactor: calcResult.limitingFactor,
        // Standard kit sizing fields
        exactSystemSize: calcResult.exactSystemSize,
        recommendedSystemSize: calcResult.recommendedSystemSize,
        aboveStandardRange: calcResult.aboveStandardRange,
        roofConstrainedKit: calcResult.roofConstrainedKit,
        kitNote: calcResult.kitNote
      },
      energy: {
        monthlyGeneration: calcResult.monthlyGenerationKwh,
        annualGeneration: Number((calcResult.monthlyGenerationKwh * 12).toFixed(2)),
        monthlyConsumption: calcResult.monthlyConsumptionKwh,
        excessGeneration: calcResult.excessGenerationKwh
      },
      financial: {
        monthlySavings: calcResult.monthlySavingsRs,
        annualSavings: calcResult.annualSavingsRs,
        grossCost: calcResult.grossCostRs,
        subsidy: calcResult.applicableSubsidyRs,
        netCost: calcResult.netCostRs,
        paybackYears: calcResult.paybackYears,
        paybackMessage: calcResult.paybackMessage
      },
      environmental: {
        annualCO2Saved: calcResult.annualCO2SavedKg,
        equivalentTrees: calcResult.equivalentTrees
      }
    };

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('Unexpected error in calculateSolarEstimate controller:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while processing the solar estimation.'
    });
  }
}
