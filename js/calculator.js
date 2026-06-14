'use strict';

/**
 * @fileoverview Calculator module containing emission factors and calculation logic.
 * All emission factor constants are deeply frozen to prevent runtime mutation.
 */

/**
 * Emission factor constants (kg CO₂e per unit).
 * All nested objects are individually frozen for deep immutability.
 * @constant {Object}
 */
const EMISSION_FACTORS = Object.freeze({
  /** @type {Object.<string, number>} Vehicle factors (kg CO₂e / km) */
  vehicle: Object.freeze({
    petrol:   0.18,
    diesel:   0.17,
    hybrid:   0.10,
    electric: 0.05, // Average UK/EU grid charging
    none:     0.00
  }),

  /** @type {number} Public transport factor (kg CO₂e / km, bus/train average) */
  publicTransport: 0.04,

  /** @type {Object.<string, number>} Flight factors (kg CO₂e per single trip) */
  flights: Object.freeze({
    short: 150,  // < 3 hours (~1,000 km equivalent)
    long:  1200  // > 3 hours (~8,000 km return equivalent)
  }),

  /** @type {number} Grid electricity factor (kg CO₂e / kWh, global average) */
  electricity: 0.38,

  /** @type {Object.<string, number>} Annual diet emission baselines (kg CO₂e / year) */
  diet: Object.freeze({
    'heavy-meat':   3000,
    'average-meat': 2200,
    'flexitarian':  1600,
    'vegetarian':   1200,
    'vegan':         800
  }),

  /** @type {Object.<string, number>} Annual shopping emission baselines (kg CO₂e / year) */
  shopping: Object.freeze({
    low:    400,
    medium: 1000,
    high:   2200
  }),

  /** @type {Object.<string, number>} Annual waste emission baselines (kg CO₂e / year) */
  waste: Object.freeze({
    low:    100,
    medium: 300,
    high:   600
  })
});

/**
 * Standard annual carbon emission baselines for comparison (kg CO₂e / year).
 * @constant {Object}
 */
const COMPARISON_BASELINES = Object.freeze({
  /** Average per-capita footprint in developed countries */
  averageUser: 8500,
  /** IPCC 1.5°C-aligned target per capita */
  targetSustainability: 2000
});

/**
 * Performs carbon footprint calculations based on validated user inputs.
 * All methods are stateless and produce no side-effects.
 */
class CarbonCalculator {
  /**
   * Main calculation entry point. Validates inputs before processing.
   *
   * @param {Object} inputs - Raw form inputs.
   * @param {number} inputs.carDist - Daily car distance (km).
   * @param {string} inputs.vehicleType - Vehicle fuel type key.
   * @param {number} inputs.pubDist - Daily public transport distance (km).
   * @param {number} inputs.shortFlights - Number of short flights per year.
   * @param {number} inputs.longFlights - Number of long flights per year.
   * @param {number} inputs.electricity - Monthly electricity consumption (kWh).
   * @param {number} inputs.renewPct - Percentage of electricity from renewables (0–100).
   * @param {string} inputs.dietType - Diet type key.
   * @param {string} inputs.shoppingType - Shopping habit key.
   * @param {string} inputs.wasteType - Waste habit key.
   * @returns {{ transport: number, energy: number, lifestyle: number, total: number }}
   *   Annual emissions breakdown, rounded to nearest kg CO₂e.
   */
  static calculate(inputs) {
    const validated = this.validateInputs(inputs);

    const transport  = this.calculateTransport(validated);
    const energy     = this.calculateEnergy(validated);
    const lifestyle  = this.calculateLifestyle(validated);
    const total      = transport + energy + lifestyle;

    return {
      transport:  Math.round(transport),
      energy:     Math.round(energy),
      lifestyle:  Math.round(lifestyle),
      total:      Math.round(total)
    };
  }

  /**
   * Sanitizes and enforces input constraints, clamping values to safe ranges.
   * Returns a new object; does not mutate the input.
   *
   * @param {Object} inputs - Untrusted raw inputs.
   * @returns {Object} Sanitized and range-clamped inputs.
   */
  static validateInputs(inputs) {
    return {
      carDist:      Math.max(0, Math.min(1000,  Number(inputs.carDist)      || 0)),
      vehicleType:  EMISSION_FACTORS.vehicle[inputs.vehicleType] !== undefined
                      ? inputs.vehicleType
                      : 'none',
      pubDist:      Math.max(0, Math.min(1000,  Number(inputs.pubDist)      || 0)),
      shortFlights: Math.max(0, Math.min(100,   Number(inputs.shortFlights) || 0)),
      longFlights:  Math.max(0, Math.min(100,   Number(inputs.longFlights)  || 0)),
      electricity:  Math.max(0, Math.min(10000, Number(inputs.electricity)  || 0)),
      renewPct:     Math.max(0, Math.min(100,   Number(inputs.renewPct)     || 0)),
      dietType:     EMISSION_FACTORS.diet[inputs.dietType]         !== undefined
                      ? inputs.dietType
                      : 'average-meat',
      shoppingType: EMISSION_FACTORS.shopping[inputs.shoppingType] !== undefined
                      ? inputs.shoppingType
                      : 'medium',
      wasteType:    EMISSION_FACTORS.waste[inputs.wasteType]       !== undefined
                      ? inputs.wasteType
                      : 'medium'
    };
  }

  /**
   * Calculates annual transportation emissions.
   *
   * @param {Object} inputs - Sanitized inputs (from {@link validateInputs}).
   * @returns {number} Annual transport emissions in kg CO₂e.
   */
  static calculateTransport(inputs) {
    const DAYS_PER_YEAR = 365;
    const carEmissions         = inputs.carDist      * DAYS_PER_YEAR * EMISSION_FACTORS.vehicle[inputs.vehicleType];
    const publicEmissions      = inputs.pubDist      * DAYS_PER_YEAR * EMISSION_FACTORS.publicTransport;
    const shortFlightEmissions = inputs.shortFlights * EMISSION_FACTORS.flights.short;
    const longFlightEmissions  = inputs.longFlights  * EMISSION_FACTORS.flights.long;

    return carEmissions + publicEmissions + shortFlightEmissions + longFlightEmissions;
  }

  /**
   * Calculates annual home energy emissions, accounting for renewable offsets.
   *
   * @param {Object} inputs - Sanitized inputs (from {@link validateInputs}).
   * @returns {number} Annual energy emissions in kg CO₂e.
   */
  static calculateEnergy(inputs) {
    const MONTHS_PER_YEAR = 12;
    const annualKwh      = inputs.electricity * MONTHS_PER_YEAR;
    const gridEmissions  = annualKwh * EMISSION_FACTORS.electricity;
    const renewableOffset = gridEmissions * (inputs.renewPct / 100);

    return gridEmissions - renewableOffset;
  }

  /**
   * Calculates annual lifestyle emissions from diet, shopping, and waste habits.
   *
   * @param {Object} inputs - Sanitized inputs (from {@link validateInputs}).
   * @returns {number} Annual lifestyle emissions in kg CO₂e.
   */
  static calculateLifestyle(inputs) {
    return (
      EMISSION_FACTORS.diet[inputs.dietType]         +
      EMISSION_FACTORS.shopping[inputs.shoppingType] +
      EMISSION_FACTORS.waste[inputs.wasteType]
    );
  }
}

// Export modules for vanilla JavaScript usage
window.EMISSION_FACTORS    = EMISSION_FACTORS;
window.COMPARISON_BASELINES = COMPARISON_BASELINES;
window.CarbonCalculator    = CarbonCalculator;
