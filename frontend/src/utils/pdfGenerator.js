/**
 * PDF Solar Proposal Generator (Chunk 14 / Results Presentation)
 * Sungroves Innovations LLP AI-Powered Solar Calculator Web Tool
 *
 * Generates a clean, professional multi-section PDF proposal using jsPDF and jsPDF-AutoTable.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateSolarProposalPDF({
  results,
  locationData = {},
  roofData = {},
  aiSummary = ''
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Colors
  const primaryColor = [16, 185, 129]; // Emerald #10b981
  const darkColor = [15, 23, 42];      // Slate #0f172a
  const grayColor = [100, 116, 139];   // Muted #64748b
  const goldColor = [245, 158, 11];    // Amber #f59e0b

  let currentY = 15;

  // ── Header Banner ────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // Dark slate header
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SUNGROVES INNOVATIONS LLP', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text('Solar Energy Installation & Engineering • Chhatrapati Sambhajinagar, Maharashtra', margin, 18);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`Proposal Date: ${dateStr}`, pageWidth - margin, 18, { align: 'right' });

  currentY = 36;

  // ── Document Title ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Preliminary Rooftop Solar Feasibility Assessment', margin, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Digital pre-sales rooftop solar sizing, generation forecast, and financial payback analysis.', margin, currentY);

  currentY += 8;

  // ── Section: Site & Customer Overview ────────────────────────────────────
  const cityName = locationData.cityName || locationData.shortName || results.location?.cityName || 'Maharashtra, India';
  const latVal = locationData.latitude || locationData.lat || results.location?.latitude || '19.8762';
  const lonVal = locationData.longitude || locationData.lng || results.location?.longitude || '75.3433';
  const tracedArea = results.technical?.tracedRoofArea || roofData.tracedAreaSqM || roofData.areaSqM || '—';
  const usableArea = results.technical?.usableRoofArea || roofData.usableAreaSqM || '—';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['Project Location & Site Geometry', 'Value']],
    body: [
      ['Target Location / City', String(cityName)],
      ['Geographic Coordinates', `${Number(latVal).toFixed(4)}° N, ${Number(lonVal).toFixed(4)}° E`],
      ['Total Traced Rooftop Footprint', `${tracedArea} m² (${Math.round(Number(tracedArea) * 10.7639 || 0)} sq ft)`],
      ['Usable Rooftop Area (75% Setback Factor)', `${usableArea} m² (${Math.round(Number(usableArea) * 10.7639 || 0)} sq ft)`],
      ['Solar Resource Irradiance Source', `${results.solar?.source || 'PVGIS / NASA POWER'} (${results.solar?.peakSunHours || '5.2'} Peak Sun Hours/day)`]
    ],
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold', width: 90 }, 1: { width: contentWidth - 90 } }
  });

  currentY = doc.lastAutoTable.finalY + 7;

  // ── Section: AI / Pre-sales Executive Recommendation ────────────────────
  if (aiSummary) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('Solar Consultant Executive Summary & Recommendation', margin + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(aiSummary, contentWidth - 8);
    doc.text(splitSummary.slice(0, 3), margin + 4, currentY + 12);

    currentY += 28;
  }

  // ── Section: Technical System Specifications ────────────────────────────
  const exactRequirement = results.technical?.exactSystemSize ?? results.technical?.systemSizeKWp ?? '—';
  const recommendedSize = results.technical?.recommendedSystemSize ?? results.technical?.systemSizeKWp ?? '—';
  const numPanels = results.technical?.numPanels ?? '—';
  const panelWattage = results.technical?.panelWattage ?? '400';
  const totalPanelArea = results.technical?.totalPanelArea ?? '—';
  const monthlyGen = results.technical?.monthlyGeneration ?? '—';
  const annualGen = results.technical?.monthlyGeneration ? (results.technical.monthlyGeneration * 12).toLocaleString('en-IN') : '—';
  const monthlyCons = results.technical?.monthlyConsumption ?? '—';
  const excess = results.technical?.excessGeneration ?? '—';
  const limitFactor = results.technical?.limitingFactor === 'roof' ? 'Roof Space Bound' : 'Bill/Consumption Bound';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'striped',
    head: [['Technical System Specification', 'Metric Value']],
    body: [
      ['Calculated Requirement', `${exactRequirement} kWp`],
      ['Recommended System Size', `${recommendedSize} kWp`],
      ['Total Solar PV Modules Required', `${numPanels} modules (${panelWattage}W Mono-PERC)`],
      ['Total Solar Panel Physical Footprint', `${totalPanelArea} m²`],
      ['System Sizing Constraint / Limiting Factor', limitFactor],
      ['Estimated Monthly Solar Generation', `${monthlyGen} kWh / month`],
      ['Estimated Annual Solar Generation', `${annualGen} kWh / year`],
      ['Estimated Monthly Energy Consumption', `${monthlyCons} kWh / month`],
      ['Net Energy Balance (Export / Shortfall)', `${excess > 0 ? `+${excess}` : excess} kWh / month`]
    ],
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold', width: 90 }, 1: { width: contentWidth - 90 } }
  });

  currentY = doc.lastAutoTable.finalY + 7;

  // ── Section: Financial & PM Surya Ghar Subsidy Breakdown ────────────────
  const grossCost = results.financial?.grossCost ? Number(results.financial.grossCost).toLocaleString('en-IN') : '—';
  const subsidy = results.financial?.subsidy ? Number(results.financial.subsidy).toLocaleString('en-IN') : '0';
  const netCost = results.financial?.netCost ? Number(results.financial.netCost).toLocaleString('en-IN') : '—';
  const monthlySavings = results.financial?.monthlySavings ? Number(results.financial.monthlySavings).toLocaleString('en-IN') : '—';
  const annualSavings = results.financial?.annualSavings ? Number(results.financial.annualSavings).toLocaleString('en-IN') : '—';
  const paybackYears = results.financial?.paybackYears ? `${results.financial.paybackYears} Years` : '—';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['Financial & PM Surya Ghar Subsidy Breakdown', 'Estimated Amount (INR)']],
    body: [
      ['Estimated Gross System Cost (@ ₹55,000 / kWp)', `₹ ${grossCost}`],
      ['PM Surya Ghar: Muft Bijli Yojana Central Subsidy', `(-) ₹ ${subsidy}`],
      ['Estimated Net Customer Investment', `₹ ${netCost}`],
      ['Estimated Monthly Electricity Bill Savings', `₹ ${monthlySavings} / month`],
      ['Estimated Annual Electricity Bill Savings', `₹ ${annualSavings} / year`],
      ['Estimated Simple Payback Period', paybackYears]
    ],
    headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold', width: 90 }, 1: { fontStyle: 'bold', width: contentWidth - 90 } }
  });

  currentY = doc.lastAutoTable.finalY + 7;

  // ── Section: Environmental Impact ────────────────────────────────────────
  const co2Annual = results.environmental?.annualCO2Kg ? Number(results.environmental.annualCO2Kg).toLocaleString('en-IN') : '—';
  const trees = results.environmental?.equivalentTrees ? Number(results.environmental.equivalentTrees).toLocaleString('en-IN') : '—';
  const co2Lifetime = results.environmental?.annualCO2Kg ? (Number(results.environmental.annualCO2Kg) * 25 / 1000).toFixed(1) : '—';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    head: [['Environmental Carbon Offset Metric', 'Equivalent Impact']],
    body: [
      ['Annual CO2 Emissions Avoided (Grid Factor: 0.82 kg/kWh)', `${co2Annual} kg CO2 / year`],
      ['25-Year System Lifetime Carbon Offset', `${co2Lifetime} Metric Tonnes CO2`],
      ['Equivalent Mature Trees Planted Annually', `~ ${trees} Trees`]
    ],
    headStyles: { fillColor: [236, 253, 245], textColor: [4, 120, 87], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [4, 120, 87] },
    columnStyles: { 0: { fontStyle: 'bold', width: 90 }, 1: { width: contentWidth - 90 } }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // ── Footer Disclaimer ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const disclaimer = 'IMPORTANT DISCLAIMER: This document contains preliminary pre-sales estimates based on satellite imagery tracing and deterministic solar irradiance models. It does not constitute a final engineering design, structural approval, utility net-metering clearance, or binding commercial quotation. Final system sizing and equipment proposals require an on-site physical survey by Sungroves Innovations LLP engineers.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, margin, currentY);

  // Save the PDF
  const filename = `Sungroves_Solar_Proposal_${(cityName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}
