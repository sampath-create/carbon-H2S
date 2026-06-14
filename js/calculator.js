/**
 * @fileoverview Calculator module containing emission factors and calculation logic.
 */

/**
 * Freeze constants for emission factors to prevent modifications.
 * Values are in kg CO₂e.
 */
const EMISSION_FACTORS = Object.freeze({
  // Vehicle factors per km
  vehicle: {
    petrol: 0.18,   // kg CO2e / km
    diesel: 0.17,   // kg CO2e / km
    hybrid: 0.10,   // kg CO2e / km
    electric: 0.05, // kg CO2e / km (average grid charging)
    none: 0.00
  },
  
  // Public transport factor per km
  publicTransport: 0.04, // kg CO2e / km (bus/train average)
  
  // Flights per single flight event
  flights: {
    short: 150,  // < 3 hours (~1000 km return/single equivalent)
    long: 1200   // > 3 hours (~8000 km return/single equivalent)
  },
  
  // Electricity factor per kWh
  electricity: 0.38, // kg CO2e / kWh (grid average)
  
  // Diet factors (annual base)
  diet: {
    'heavy-meat': 3000,
    'average-meat': 2200,
    'flexitarian': 1600,
    'vegetarian': 1200,
    'vegan': 800
  },
  
  // Shopping habits (annual base)
  shopping: {
    low: 400,
    medium: 1000,
    high: 2200
  },
  
  // Waste production (annual base)
  waste: {
    low: 100,
    medium: 300,
    high: 600
  }
});

/**
 * Standard baseline comparison figures (annual kg CO₂e).
 */
const COMPARISON_BASELINES = Object.freeze({
  averageUser: 8500,     // Developed country average per capita
  targetSustainability: 2000 // IPCC target for carbon neutrality/capita
});

class CarbonCalculator {
  /**
   * Main calculation handler.
   * @param {Object} inputs Inputs object from form.
   * @returns {Object} Category breakdowns and total in kg CO₂e.
   */
  static calculate(inputs) {
    const validated = this.validateInputs(inputs);
    
    const transport = this.calculateTransport(validated);
    const energy = this.calculateEnergy(validated);
    const lifestyle = this.calculateLifestyle(validated);
    const total = transport + energy + lifestyle;
    
    return {
      transport: Math.round(transport),
      energy: Math.round(energy),
      lifestyle: Math.round(lifestyle),
      total: Math.round(total)
    };
  }

  /**
   * Sanitizes and enforces input constraints.
   * @param {Object} inputs 
   * @returns {Object} Sanitized values.
   */
  static validateInputs(inputs) {
    return {
      carDist: Math.max(0, Math.min(1000, Number(inputs.carDist) || 0)), // Cap daily distance at 1000km
      vehicleType: EMISSION_FACTORS.vehicle[inputs.vehicleType] !== undefined ? inputs.vehicleType : 'none',
      pubDist: Math.max(0, Math.min(1000, Number(inputs.pubDist) || 0)), // Cap daily public transit distance at 1000km
      shortFlights: Math.max(0, Math.min(100, Number(inputs.shortFlights) || 0)), // Cap flights
      longFlights: Math.max(0, Math.min(100, Number(inputs.longFlights) || 0)),
      electricity: Math.max(0, Math.min(10000, Number(inputs.electricity) || 0)), // Monthly kWh cap
      renewPct: Math.max(0, Math.min(100, Number(inputs.renewPct) || 0)),
      dietType: EMISSION_FACTORS.diet[inputs.dietType] !== undefined ? inputs.dietType : 'average-meat',
      shoppingType: EMISSION_FACTORS.shopping[inputs.shoppingType] !== undefined ? inputs.shoppingType : 'medium',
      wasteType: EMISSION_FACTORS.waste[inputs.wasteType] !== undefined ? inputs.wasteType : 'medium'
    };
  }

  /**
   * Calculates annual transportation emissions.
   * @param {Object} inputs 
   * @returns {number}
   */
  static calculateTransport(inputs) {
    const carEmissions = inputs.carDist * 365 * EMISSION_FACTORS.vehicle[inputs.vehicleType];
    const publicEmissions = inputs.pubDist * 365 * EMISSION_FACTORS.publicTransport;
    const shortFlightEmissions = inputs.shortFlights * EMISSION_FACTORS.flights.short;
    const longFlightEmissions = inputs.longFlights * EMISSION_FACTORS.flights.long;
    
    return carEmissions + publicEmissions + shortFlightEmissions + longFlightEmissions;
  }

  /**
   * Calculates annual energy emissions.
   * @param {Object} inputs 
   * @returns {number}
   */
  static calculateEnergy(inputs) {
    const annualElectricity = inputs.electricity * 12;
    const gridEmissions = annualElectricity * EMISSION_FACTORS.electricity;
    const renewableOffset = gridEmissions * (inputs.renewPct / 100);
    
    return gridEmissions - renewableOffset;
  }

  /**
   * Calculates annual lifestyle emissions.
   * @param {Object} inputs 
   * @returns {number}
   */
  static calculateLifestyle(inputs) {
    const dietEmissions = EMISSION_FACTORS.diet[inputs.dietType];
    const shoppingEmissions = EMISSION_FACTORS.shopping[inputs.shoppingType];
    const wasteEmissions = EMISSION_FACTORS.waste[inputs.wasteType];
    
    return dietEmissions + shoppingEmissions + wasteEmissions;
  }
}

// Export modules for vanilla JavaScript usage
window.EMISSION_FACTORS = EMISSION_FACTORS;
window.COMPARISON_BASELINES = COMPARISON_BASELINES;
window.CarbonCalculator = CarbonCalculator;
