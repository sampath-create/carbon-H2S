/**
 * @fileoverview Storage module for persistence, retrieval, and validation of user data.
 */

const STORAGE_KEY = 'carbon_tracker_data_v1';

/**
 * Default empty data schema.
 */
const DEFAULT_DATA = {
  history: [],
  goals: [],
  preferences: {
    theme: 'dark'
  }
};

/**
 * Sanitizes and validates standard fields to prevent XSS and DB corruption.
 */
class StorageManager {
  /**
   * Safe retrieval of data from localStorage with validation.
   * @returns {Object} Validated user data.
   */
  static load() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return DEFAULT_DATA;
      }
      
      const parsed = JSON.parse(serialized);
      return this.validate(parsed);
    } catch (e) {
      console.error('Failed to load local storage data. Resetting to default.', e);
      return DEFAULT_DATA;
    }
  }

  /**
   * Safe persistence of data to localStorage.
   * @param {Object} data 
   * @returns {boolean} Success status.
   */
  static save(data) {
    try {
      const validated = this.validate(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      return true;
    } catch (e) {
      console.error('Failed to save data to local storage.', e);
      return false;
    }
  }

  /**
   * Validate schema structure, enforce types, and sanitize inputs.
   * @param {Object} data 
   * @returns {Object} Validated and cleaned data.
   */
  static validate(data) {
    const validated = {
      history: Array.isArray(data?.history) ? [] : DEFAULT_DATA.history,
      goals: Array.isArray(data?.goals) ? [] : DEFAULT_DATA.goals,
      preferences: {
        theme: data?.preferences?.theme === 'light' ? 'light' : 'dark'
      }
    };

    // Validate calculations history
    if (Array.isArray(data?.history)) {
      data.history.forEach(item => {
        if (item && typeof item === 'object') {
          const validItem = {
            id: String(item.id || Date.now() + Math.random()),
            timestamp: Number(item.timestamp) || Date.now(),
            transport: Math.max(0, Number(item.transport) || 0),
            energy: Math.max(0, Number(item.energy) || 0),
            lifestyle: Math.max(0, Number(item.lifestyle) || 0),
            total: Math.max(0, Number(item.total) || 0),
            inputs: this.validateInputs(item.inputs)
          };
          validated.history.push(validItem);
        }
      });
    }

    // Validate goals list
    if (Array.isArray(data?.goals)) {
      data.goals.forEach(goal => {
        if (goal && typeof goal === 'object' && goal.id && goal.title) {
          const validGoal = {
            id: String(goal.id).replace(/[^\w-]/g, ''), // Alphanumeric and dashes only
            title: String(goal.title).substring(0, 100), // Cap title size
            category: ['transport', 'energy', 'lifestyle', 'general'].includes(goal.category) 
              ? goal.category 
              : 'general',
            targetPercent: Math.max(1, Math.min(100, Number(goal.targetPercent) || 0)),
            currentValue: Number(goal.currentValue) || 0,
            targetValue: Number(goal.targetValue) || 0,
            completed: Boolean(goal.completed),
            createdAt: Number(goal.createdAt) || Date.now()
          };
          validated.goals.push(validGoal);
        }
      });
    }

    return validated;
  }

  /**
   * Validates inputs stored alongside history to safely pre-populate inputs.
   * @param {Object} inputs 
   * @returns {Object} Validated input schema.
   */
  static validateInputs(inputs) {
    if (!inputs || typeof inputs !== 'object') {
      return {};
    }

    const safeInputs = {};
    const bounds = {
      carDist: { min: 0, max: 1000 },
      pubDist: { min: 0, max: 1000 },
      shortFlights: { min: 0, max: 100 },
      longFlights: { min: 0, max: 100 },
      electricity: { min: 0, max: 10000 },
      renewPct: { min: 0, max: 100 }
    };
    const stringKeys = ['vehicleType', 'dietType', 'shoppingType', 'wasteType'];

    Object.keys(bounds).forEach(key => {
      if (key in inputs) {
        const val = Number(inputs[key]) || 0;
        safeInputs[key] = Math.max(bounds[key].min, Math.min(bounds[key].max, val));
      }
    });

    stringKeys.forEach(key => {
      if (key in inputs) {
        // Sanitize string to prevent XSS injection in calculator form fields
        safeInputs[key] = String(inputs[key]).replace(/[^\w-]/g, '').substring(0, 30);
      }
    });

    return safeInputs;
  }

  /**
   * Resets all storage data.
   */
  static clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('Failed to clear storage.', e);
      return false;
    }
  }
}

// Export modules for vanilla JavaScript usage
window.StorageManager = StorageManager;
