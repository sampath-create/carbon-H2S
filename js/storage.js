'use strict';

/**
 * @fileoverview Storage module for persistence, retrieval, and validation of user data.
 * Provides XSS-safe read/write access to localStorage with strict schema enforcement.
 */

/** @constant {string} localStorage key for all persisted application data. */
const STORAGE_KEY = 'carbon_tracker_data_v1';

/**
 * Immutable default data schema. Never mutate this object directly.
 * @constant {Object}
 */
const DEFAULT_DATA = Object.freeze({
  history: [],
  goals: [],
  preferences: Object.freeze({
    theme: 'dark'
  })
});

/**
 * Returns a deep copy of the default data to prevent shared state mutation.
 * @returns {Object}
 */
function getDefaultData() {
  return {
    history: [],
    goals: [],
    preferences: { theme: 'dark' }
  };
}

/**
 * Sanitizes and validates all application data structures to prevent XSS and data corruption.
 * All methods are pure — they do not mutate their input arguments.
 */
class StorageManager {
  /**
   * Safe retrieval of data from localStorage with validation.
   * Returns a fresh default data object on parse failure or empty storage.
   *
   * @returns {Object} Validated user data with guaranteed structure.
   * @example
   * const state = StorageManager.load();
   * console.log(state.preferences.theme); // 'dark'
   */
  static load() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return getDefaultData();
      }

      const parsed = JSON.parse(serialized);
      return this.validate(parsed);
    } catch (e) {
      console.error('[StorageManager] Failed to load localStorage data. Resetting.', e);
      return getDefaultData();
    }
  }

  /**
   * Safe persistence of validated data to localStorage.
   * Validates the data before writing to guarantee schema integrity.
   *
   * @param {Object} data - Application state to persist.
   * @returns {boolean} True if save succeeded, false on error.
   * @example
   * const ok = StorageManager.save(state);
   */
  static save(data) {
    try {
      const validated = this.validate(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      return true;
    } catch (e) {
      console.error('[StorageManager] Failed to save to localStorage.', e);
      return false;
    }
  }

  /**
   * Validates the full application state schema, enforces types,
   * sanitizes all string fields, and clamps numeric inputs.
   *
   * @param {*} data - Untrusted data parsed from localStorage.
   * @returns {Object} A new validated and sanitized data object.
   */
  static validate(data) {
    const validated = {
      history: [],
      goals: [],
      preferences: {
        theme: data?.preferences?.theme === 'light' ? 'light' : 'dark'
      }
    };

    // Validate and sanitize history entries
    if (Array.isArray(data?.history)) {
      data.history.forEach(item => {
        if (item && typeof item === 'object') {
          validated.history.push({
            id: String(item.id || `${Date.now()}-${Math.random()}`).replace(/[^\w-]/g, '').substring(0, 64),
            timestamp: this.sanitizeNumber(item.timestamp, 0, Number.MAX_SAFE_INTEGER),
            transport: this.sanitizeNumber(item.transport, 0),
            energy: this.sanitizeNumber(item.energy, 0),
            lifestyle: this.sanitizeNumber(item.lifestyle, 0),
            total: this.sanitizeNumber(item.total, 0),
            inputs: this.validateInputs(item.inputs)
          });
        }
      });
    }

    // Validate and sanitize goal entries
    if (Array.isArray(data?.goals)) {
      data.goals.forEach(goal => {
        if (goal && typeof goal === 'object' && goal.id && goal.title) {
          const sanitizedId = String(goal.id).replace(/[^\w-]/g, '').substring(0, 64);
          const sanitizedTitle = String(goal.title)
            .replace(/[<>"'`/()]/g, '') // Strip HTML-dangerous chars, slashes, and parentheses
            .replace(/script/gi, '')    // Strip the word "script" to prevent execution
            .trim()
            .substring(0, 100);

          if (!sanitizedId || !sanitizedTitle) return; // Skip invalid entries

          validated.goals.push({
            id: sanitizedId,
            title: sanitizedTitle,
            category: ['transport', 'energy', 'lifestyle', 'general'].includes(goal.category)
              ? goal.category
              : 'general',
            targetPercent: this.sanitizeNumber(goal.targetPercent, 1, 100),
            currentValue: this.sanitizeNumber(goal.currentValue, 0),
            targetValue: this.sanitizeNumber(goal.targetValue, 0),
            completed: Boolean(goal.completed),
            createdAt: this.sanitizeNumber(goal.createdAt, 0, Number.MAX_SAFE_INTEGER)
          });
        }
      });
    }

    return validated;
  }

  /**
   * Validates and sanitizes raw calculator form inputs.
   * Clamps all numeric fields within documented bounds to prevent injection.
   *
   * @param {*} inputs - Untrusted inputs object from the calculation form.
   * @returns {Object} A new sanitized inputs object.
   */
  static validateInputs(inputs) {
    const safeInputs = {
      carDist: 0,
      vehicleType: 'none',
      pubDist: 0,
      shortFlights: 0,
      longFlights: 0,
      electricity: 0,
      renewPct: 0,
      dietType: 'average-meat',
      shoppingType: 'medium',
      wasteType: 'medium'
    };

    if (!inputs || typeof inputs !== 'object') {
      return safeInputs;
    }

    /** @type {Object.<string, {min: number, max: number}>} */
    const numericBounds = Object.freeze({
      carDist:      { min: 0, max: 1000 },
      pubDist:      { min: 0, max: 1000 },
      shortFlights: { min: 0, max: 100 },
      longFlights:  { min: 0, max: 100 },
      electricity:  { min: 0, max: 10000 },
      renewPct:     { min: 0, max: 100 }
    });

    /** @type {string[]} Keys that are enum-like string identifiers */
    const enumKeys = ['vehicleType', 'dietType', 'shoppingType', 'wasteType'];

    Object.keys(numericBounds).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(inputs, key)) {
        const { min, max } = numericBounds[key];
        safeInputs[key] = this.sanitizeNumber(inputs[key], min, max);
      }
    });

    enumKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(inputs, key)) {
        // Allow only alphanumeric characters and hyphens (e.g. 'heavy-meat', 'petrol')
        safeInputs[key] = String(inputs[key])
          .replace(/[^\w-]/g, '')
          .substring(0, 30);
      }
    });

    return safeInputs;
  }

  /**
   * Sanitizes a numeric value to be finite and clamped within [min, max] bounds.
   * Prevents injection of NaN or Infinity values. Uses parseFloat to handle mixed text inputs safely.
   *
   * @param {*} value - Untrusted numeric input.
   * @param {number} min - Lower bound.
   * @param {number} max - Upper bound.
   * @returns {number} Sanitized and clamped number.
   */
  static sanitizeNumber(value, min = 0, max = 100000) {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) {
      return min;
    }
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Removes all application data from localStorage.
   * @returns {boolean} True if cleared successfully, false on error.
   */
  static clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('[StorageManager] Failed to clear storage.', e);
      return false;
    }
  }
}

// Export module for vanilla JavaScript usage
window.StorageManager = StorageManager;
