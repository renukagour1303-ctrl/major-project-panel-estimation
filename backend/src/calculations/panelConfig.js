/**
 * Central configuration object for solar panel options.
 * Defined according to SPEC.md project specifications.
 */
export const PANEL_OPTIONS = {
  350: {
    wattage: 350,
    area: 1.7,
    dimensions: '1.70 m × 1.00 m',
    efficiency: '20.6%',
    label: '350 W (Standard Efficiency)',
    type: 'Standard Monocrystalline',
    desc: 'Compact size, suitable for tight or fragmented roof sections.'
  },
  400: {
    wattage: 400,
    area: 2.0,
    dimensions: '2.00 m × 1.00 m',
    efficiency: '20.0%',
    label: '400 W (High Efficiency)',
    type: 'High Efficiency Monocrystalline',
    desc: 'Optimal balance of power density, roof fit, and affordability.'
  },
  550: {
    wattage: 550,
    area: 2.4,
    dimensions: '2.27 m × 1.05 m',
    efficiency: '22.9%',
    label: '550 W (Ultra-High Efficiency Mono-PERC)',
    type: 'Ultra-High Efficiency Mono-PERC',
    desc: 'Maximum generation per panel, recommended for large unshaded roofs.'
  }
};

/**
 * Get panel specs object for a given wattage.
 * Defaults to 400W if wattage is unlisted or invalid.
 */
export function getPanelSpec(wattage) {
  const wattNum = Number(wattage);
  return PANEL_OPTIONS[wattNum] || PANEL_OPTIONS[400];
}
