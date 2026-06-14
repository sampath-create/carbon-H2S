'use strict';

/**
 * @fileoverview Insights engine that generates prioritized, personalized carbon-reduction
 * recommendations based on a user's calculator inputs.
 * All methods are stateless and produce no side-effects.
 */

class InsightsEngine {
  /**
   * Generates actionable recommendations based on the user's latest calculation input.
   * @param {Object} inputs The raw form inputs.
   * @returns {Array<Object>} List of curated recommendation objects.
   */
  static generate(inputs) {
    if (!inputs) return this.getDefaultRecommendations();

    const recommendations = [];

    // 1. Transportation Insights
    if (inputs.carDist > 0 && ['petrol', 'diesel'].includes(inputs.vehicleType)) {
      const annualCarEmissions = inputs.carDist * 365 * window.EMISSION_FACTORS.vehicle[inputs.vehicleType];
      
      // Tip A: Reduce car usage by 10%
      recommendations.push({
        id: 'reduce-car-10',
        category: 'transport',
        title: 'Reduce Car Travel by 10%',
        description: 'Try carpooling, combining trips, or walking for trips under 2 km. Walking or cycling also yields health benefits.',
        savings: Math.round(annualCarEmissions * 0.1),
        difficulty: 'Easy',
        impact: annualCarEmissions * 0.1 > 300 ? 'High' : 'Medium'
      });

      // Tip B: Switch to Hybrid or EV
      const evSavings = annualCarEmissions - (inputs.carDist * 365 * window.EMISSION_FACTORS.vehicle.electric);
      recommendations.push({
        id: 'switch-electric',
        category: 'transport',
        title: 'Transition to an Electric Vehicle',
        description: 'When it is time for your next car, consider an electric or hybrid vehicle. It drastically lowers operational footprint.',
        savings: Math.round(evSavings),
        difficulty: 'Hard',
        impact: 'High'
      });
    }

    if (inputs.pubDist > 5 && inputs.vehicleType !== 'none') {
      recommendations.push({
        id: 'maximize-transit',
        category: 'transport',
        title: 'Work remotely or carpool more',
        description: 'Avoid single-occupancy driving. Swapping two car commutes for remote work or transit cuts significant transport footprint.',
        savings: 250,
        difficulty: 'Medium',
        impact: 'Medium'
      });
    }

    if (inputs.shortFlights > 0) {
      recommendations.push({
        id: 'replace-flights',
        category: 'transport',
        title: 'Substitute Short Flights with Trains',
        description: 'For travel under 500 km, high-speed rail can be faster, cheaper, and emits up to 90% less CO₂ than regional flights.',
        savings: inputs.shortFlights * 100,
        difficulty: 'Medium',
        impact: inputs.shortFlights > 2 ? 'High' : 'Medium'
      });
    }

    if (inputs.longFlights > 0) {
      recommendations.push({
        id: 'reduce-long-flights',
        category: 'transport',
        title: 'Reduce Long-Haul Travel / Choose Direct',
        description: 'Take one fewer long-haul vacation per year, choose direct flights to avoid layover emissions, or purchase high-quality offsets.',
        savings: Math.round(inputs.longFlights * 600), // Target reducing half or choosing better routing
        difficulty: 'Hard',
        impact: 'High'
      });
    }

    // 2. Energy Insights
    if (inputs.electricity > 0) {
      const annualElectricityEmissions = inputs.electricity * 12 * window.EMISSION_FACTORS.electricity;

      if (inputs.renewPct < 100) {
        const potentialSavings = annualElectricityEmissions * (1 - (inputs.renewPct / 100));
        recommendations.push({
          id: 'switch-renewable',
          category: 'energy',
          title: 'Switch to a Renewable Energy Plan',
          description: 'Contact your utility provider to enroll in a green power plan (wind/solar), or purchase verified renewable certificates (RECs).',
          savings: Math.round(potentialSavings),
          difficulty: 'Easy',
          impact: 'High'
        });
      }

      recommendations.push({
        id: 'led-lighting',
        category: 'energy',
        title: 'Install LEDs and Smart Power Strips',
        description: 'Replacing standard lightbulbs with LEDs uses up to 80% less electricity. Smart strips prevent phantom energy draw from devices.',
        savings: Math.round(annualElectricityEmissions * 0.15),
        difficulty: 'Easy',
        impact: 'Medium'
      });
    }

    // 3. Lifestyle Insights
    if (['heavy-meat', 'average-meat'].includes(inputs.dietType)) {
      const currentDietEmissions = window.EMISSION_FACTORS.diet[inputs.dietType];
      const veganEmissions = window.EMISSION_FACTORS.diet.vegan;
      const flexitarianEmissions = window.EMISSION_FACTORS.diet.flexitarian;

      recommendations.push({
        id: 'meatless-mondays',
        category: 'lifestyle',
        title: 'Adopt a Flexitarian Diet',
        description: 'Reducing red meat intake and trying plant-based proteins just 3 days a week lowers land-use and agricultural emissions.',
        savings: currentDietEmissions - flexitarianEmissions,
        difficulty: 'Medium',
        impact: 'High'
      });
    }

    if (inputs.shoppingType === 'high') {
      recommendations.push({
        id: 'minimalist-shopping',
        category: 'lifestyle',
        title: 'Buy Secondhand and Minimalist',
        description: 'Manufacturing textiles and electronics accounts for large global emissions. Shop vintage, rent clothes, and repair items first.',
        savings: 1200,
        difficulty: 'Medium',
        impact: 'High'
      });
    } else if (inputs.shoppingType === 'medium') {
      recommendations.push({
        id: 'minimalist-shopping-med',
        category: 'lifestyle',
        title: 'Adopt a "One In, One Out" Rule',
        description: 'Carefully consider purchases. Buying 20% fewer consumer items annually helps lower raw material extraction emissions.',
        savings: 400,
        difficulty: 'Easy',
        impact: 'Medium'
      });
    }

    if (inputs.wasteType === 'high') {
      recommendations.push({
        id: 'compost-waste',
        category: 'lifestyle',
        title: 'Start Composting & Strict Recycling',
        description: 'Food rotting in landfills creates methane. Composting transforms organic waste into carbon-rich soil fertilizer.',
        savings: 500,
        difficulty: 'Medium',
        impact: 'High'
      });
    } else if (inputs.wasteType === 'medium') {
      recommendations.push({
        id: 'reduce-single-use',
        category: 'lifestyle',
        title: 'Ditch Single-Use Plastic Items',
        description: 'Buy in bulk, use reusable water bottles/bags, and sort recycle bins. This keeps plastics out of landfills and incinerators.',
        savings: 200,
        difficulty: 'Easy',
        impact: 'Medium'
      });
    }

    // Add a default low-impact reminder if recommendations are sparse
    if (recommendations.length === 0) {
      return this.getDefaultRecommendations();
    }

    // Sort by savings descending
    return recommendations.sort((a, b) => b.savings - a.savings);
  }

  /**
   * Fallback generic recommendations.
   * @returns {Array<Object>}
   */
  static getDefaultRecommendations() {
    return [
      {
        id: 'switch-renewable-default',
        category: 'energy',
        title: 'Transition to Renewable Energy',
        description: 'Power your home using wind, solar or geothermal. Reach out to local utility companies for renewable energy options.',
        savings: 1500,
        difficulty: 'Easy',
        impact: 'High'
      },
      {
        id: 'plant-based-meals',
        category: 'lifestyle',
        title: 'Integrate More Plant-Based Meals',
        description: 'Substitutes like lentils, beans, and tofu emit up to 10-20x less CO₂e compared to beef and lamb production.',
        savings: 800,
        difficulty: 'Easy',
        impact: 'Medium'
      },
      {
        id: 'commute-green',
        category: 'transport',
        title: 'Walk or Bike Short Commutes',
        description: 'For short errands or trips under 3 km, choose active transport. It keeps you healthy and eliminates vehicle exhaust.',
        savings: 300,
        difficulty: 'Easy',
        impact: 'Medium'
      }
    ];
  }
}

// Export modules for vanilla JavaScript usage
window.InsightsEngine = InsightsEngine;
