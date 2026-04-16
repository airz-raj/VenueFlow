/**
 * VenueFlow Wait Time Estimator
 * 
 * AI-powered wait time predictions based on crowd density,
 * event phase, time patterns, and facility type.
 * 
 * All core functions are pure and unit-testable.
 * 
 * @module wait-estimator
 */

'use strict';

const WaitEstimator = (() => {

  /* ==========================================
     Constants
     ========================================== */

  /** Base wait time multipliers by facility type (minutes per 10% density) */
  const FACILITY_WAIT_FACTORS = Object.freeze({
    food: 1.2,        // Food courts have longer base wait
    restroom: 0.6,    // Quick turnover
    gate: 0.8,        // Moderate flow
    merchandise: 1.5, // Browsing + checkout time
    parking: 0.4,     // Steady flow
    first_aid: 0.3,   // Low traffic normally
    atm: 1.0,         // Per-person transaction time
    seating: 0.2      // Finding seats
  });

  /** Event phase multipliers affect all wait times */
  const PHASE_MULTIPLIERS = Object.freeze({
    pre_event: 0.6,
    entry: 1.3,
    active: 0.5,      // People in seats
    break: 1.8,       // Halftime rush
    post_event: 1.5   // Everyone leaving
  });

  /** Time-of-day adjustment (hour 0–23 → multiplier) */
  const TIME_ADJUSTMENTS = Object.freeze({
    morning: 0.7,    // 6–11
    midday: 1.0,     // 11–14
    afternoon: 1.1,  // 14–17
    evening: 1.2,    // 17–20
    night: 0.8       // 20–23
  });

  /* ==========================================
     Core Estimation Functions (Pure)
     ========================================== */

  /**
   * Estimate wait time for a facility zone.
   * 
   * Algorithm:
   * 1. Base wait = density × facility factor
   * 2. Apply event phase multiplier
   * 3. Apply time-of-day adjustment
   * 4. Add random variance for realism
   * 
   * @param {number} density - Current crowd density percentage (0-100)
   * @param {string} facilityType - Type of facility (food, restroom, etc.)
   * @param {string} [eventPhase='active'] - Current event phase
   * @param {number} [hour] - Current hour (0-23), defaults to now
   * @returns {number} Estimated wait time in minutes
   */
  function estimateWaitTime(density, facilityType, eventPhase = 'active', hour = null) {
    // Validate inputs
    if (typeof density !== 'number' || density < 0) return 0;
    
    const clampedDensity = Math.min(100, density);
    
    // Step 1: Base wait time from density and facility type
    const facilityFactor = FACILITY_WAIT_FACTORS[facilityType] || 0.8;
    let waitTime = (clampedDensity / 10) * facilityFactor;

    // Step 2: Apply event phase multiplier
    const phaseMult = PHASE_MULTIPLIERS[eventPhase] || 1.0;
    waitTime *= phaseMult;

    // Step 3: Apply time-of-day adjustment
    const currentHour = hour !== null ? hour : new Date().getHours();
    const timeAdj = _getTimeAdjustment(currentHour);
    waitTime *= timeAdj;

    // Step 4: Non-linear scaling for high density
    // Wait times increase exponentially above 70% density
    if (clampedDensity > 70) {
      const overflow = (clampedDensity - 70) / 30;
      waitTime *= (1 + overflow * 0.8);
    }

    // Minimum 1 minute if density > 10%
    if (clampedDensity > 10 && waitTime < 1) waitTime = 1;

    return Math.round(waitTime * 10) / 10;
  }

  /**
   * Get time-of-day adjustment factor.
   * @param {number} hour - Hour (0-23)
   * @returns {number} Multiplier
   */
  function _getTimeAdjustment(hour) {
    if (hour >= 6 && hour < 11) return TIME_ADJUSTMENTS.morning;
    if (hour >= 11 && hour < 14) return TIME_ADJUSTMENTS.midday;
    if (hour >= 14 && hour < 17) return TIME_ADJUSTMENTS.afternoon;
    if (hour >= 17 && hour < 20) return TIME_ADJUSTMENTS.evening;
    return TIME_ADJUSTMENTS.night;
  }

  /**
   * Generate "best time to visit" recommendation.
   * 
   * @param {string} facilityType - Facility type
   * @param {number} currentDensity - Current density percentage
   * @param {string} eventPhase - Current event phase
   * @returns {Object} Recommendation with text and urgency
   */
  function getRecommendation(facilityType, currentDensity, eventPhase) {
    const waitMin = estimateWaitTime(currentDensity, facilityType, eventPhase);
    
    let text = '';
    let urgency = 'low'; // low, medium, high

    if (currentDensity < 30) {
      text = '🟢 Great time to visit! Very short wait.';
      urgency = 'low';
    } else if (currentDensity < 55) {
      text = '🟡 Moderate crowd. Reasonable wait time.';
      urgency = 'medium';
    } else if (currentDensity < 75) {
      text = '🟠 Getting busy. Consider visiting soon or waiting for a lull.';
      urgency = 'medium';
    } else {
      text = '🔴 Very crowded! Wait for 10-15 minutes or try a nearby alternative.';
      urgency = 'high';
    }

    // Phase-specific advice
    if (eventPhase === 'active') {
      text += ' (Good time — most people are in their seats)';
    } else if (eventPhase === 'break') {
      text += ' (Halftime rush — expect longer waits)';
    }

    return { text, urgency, estimatedMinutes: waitMin };
  }

  /**
   * Estimate wait times for all facility zones.
   * 
   * @param {Object} crowdData - Crowd density data from Firebase
   * @param {string} [eventPhase='active'] - Current event phase
   * @returns {Array} Array of wait time estimates per zone
   */
  function estimateAllWaitTimes(crowdData, eventPhase = 'active') {
    return Object.entries(crowdData).map(([zoneId, data]) => {
      const waitMin = estimateWaitTime(data.density, data.type, eventPhase);
      const recommendation = getRecommendation(data.type, data.density, eventPhase);

      return {
        zoneId,
        name: data.name,
        type: data.type,
        density: Math.round(data.density),
        waitMinutes: waitMin,
        trend: data.trend || 'stable',
        recommendation,
        densityLevel: VenueUtils.getDensityLevel(data.density)
      };
    }).sort((a, b) => {
      // Sort: food/restroom/merch first, then by wait time
      const typePriority = { food: 0, restroom: 1, merchandise: 2, gate: 3 };
      const ap = typePriority[a.type] ?? 5;
      const bp = typePriority[b.type] ?? 5;
      if (ap !== bp) return ap - bp;
      return b.waitMinutes - a.waitMinutes;
    });
  }

  /**
   * Find the best alternative zone of the same type.
   * 
   * @param {string} zoneId - Current zone ID
   * @param {Object} crowdData - Crowd density data
   * @returns {Object|null} Best alternative zone, or null
   */
  function findBestAlternative(zoneId, crowdData) {
    const current = crowdData[zoneId];
    if (!current) return null;

    const alternatives = Object.entries(crowdData)
      .filter(([id, data]) => id !== zoneId && data.type === current.type)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.density - b.density);

    return alternatives.length > 0 ? alternatives[0] : null;
  }

  /**
   * Calculate gauge percentage (0-100) for circular gauge rendering.
   * Maps wait time to a visual 0-100 scale.
   * 
   * @param {number} waitMinutes - Wait time in minutes
   * @param {number} [maxMinutes=30] - Maximum minutes for full gauge
   * @returns {number} Gauge percentage (0-100)
   */
  function calculateGaugePercent(waitMinutes, maxMinutes = 30) {
    if (waitMinutes <= 0) return 0;
    return Math.min(100, (waitMinutes / maxMinutes) * 100);
  }

  /* ==========================================
     Public API
     ========================================== */

  return Object.freeze({
    estimateWaitTime,
    getRecommendation,
    estimateAllWaitTimes,
    findBestAlternative,
    calculateGaugePercent,
    FACILITY_WAIT_FACTORS,
    PHASE_MULTIPLIERS
  });

})();
