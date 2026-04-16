/**
 * VenueFlow Test Suite — Wait Time Estimator
 * 
 * Unit tests for js/wait-estimator.js
 */

'use strict';

const WaitEstimatorTests = {
  name: 'Wait Time Estimator',

  tests: [
    // ===== estimateWaitTime =====
    {
      name: 'estimateWaitTime: returns 0 for 0% density',
      run() {
        const result = WaitEstimator.estimateWaitTime(0, 'food', 'active', 14);
        TestRunner.assertEqual(result, 0);
      }
    },
    {
      name: 'estimateWaitTime: returns positive wait for positive density',
      run() {
        const result = WaitEstimator.estimateWaitTime(50, 'food', 'active', 14);
        TestRunner.assert(result > 0, `Expected positive wait but got: ${result}`);
      }
    },
    {
      name: 'estimateWaitTime: food has longer wait than restroom at same density',
      run() {
        const foodWait = WaitEstimator.estimateWaitTime(60, 'food', 'active', 14);
        const restroomWait = WaitEstimator.estimateWaitTime(60, 'restroom', 'active', 14);
        TestRunner.assert(foodWait > restroomWait,
          `Food (${foodWait}) should be longer than restroom (${restroomWait})`);
      }
    },
    {
      name: 'estimateWaitTime: merchandise has longest wait factor',
      run() {
        const merchWait = WaitEstimator.estimateWaitTime(50, 'merchandise', 'active', 14);
        const gateWait = WaitEstimator.estimateWaitTime(50, 'gate', 'active', 14);
        TestRunner.assert(merchWait > gateWait,
          `Merch (${merchWait}) should be longer than gate (${gateWait})`);
      }
    },
    {
      name: 'estimateWaitTime: break phase increases wait time',
      run() {
        const activeWait = WaitEstimator.estimateWaitTime(50, 'food', 'active', 14);
        const breakWait = WaitEstimator.estimateWaitTime(50, 'food', 'break', 14);
        TestRunner.assert(breakWait > activeWait,
          `Break wait (${breakWait}) should be more than active (${activeWait})`);
      }
    },
    {
      name: 'estimateWaitTime: pre-event phase has lowest wait',
      run() {
        const preWait = WaitEstimator.estimateWaitTime(50, 'food', 'pre_event', 14);
        const entryWait = WaitEstimator.estimateWaitTime(50, 'food', 'entry', 14);
        TestRunner.assert(preWait < entryWait,
          `Pre-event (${preWait}) should be less than entry (${entryWait})`);
      }
    },
    {
      name: 'estimateWaitTime: high density (>70%) causes non-linear increase',
      run() {
        const wait60 = WaitEstimator.estimateWaitTime(60, 'food', 'active', 14);
        const wait90 = WaitEstimator.estimateWaitTime(90, 'food', 'active', 14);
        // At 90%, the increase should be more than proportional (1.5x density = >1.5x wait)
        const ratio = wait90 / wait60;
        TestRunner.assert(ratio > 1.5,
          `Expected non-linear increase ratio > 1.5 but got ${ratio.toFixed(2)}`);
      }
    },
    {
      name: 'estimateWaitTime: handles negative density gracefully',
      run() {
        const result = WaitEstimator.estimateWaitTime(-10, 'food', 'active', 14);
        TestRunner.assertEqual(result, 0);
      }
    },
    {
      name: 'estimateWaitTime: handles unknown facility type',
      run() {
        const result = WaitEstimator.estimateWaitTime(50, 'unknown_type', 'active', 14);
        TestRunner.assert(result >= 0, `Expected non-negative wait but got: ${result}`);
      }
    },
    {
      name: 'estimateWaitTime: handles unknown event phase',
      run() {
        const result = WaitEstimator.estimateWaitTime(50, 'food', 'unknown_phase', 14);
        TestRunner.assert(result > 0, `Expected positive wait but got: ${result}`);
      }
    },

    // ===== getRecommendation =====
    {
      name: 'getRecommendation: low density gives low urgency',
      run() {
        const rec = WaitEstimator.getRecommendation('food', 20, 'active');
        TestRunner.assertEqual(rec.urgency, 'low');
        TestRunner.assert(rec.text.includes('🟢'), 'Should have green indicator');
      }
    },
    {
      name: 'getRecommendation: high density gives high urgency',
      run() {
        const rec = WaitEstimator.getRecommendation('food', 85, 'active');
        TestRunner.assertEqual(rec.urgency, 'high');
        TestRunner.assert(rec.text.includes('🔴'), 'Should have red indicator');
      }
    },
    {
      name: 'getRecommendation: includes estimated minutes',
      run() {
        const rec = WaitEstimator.getRecommendation('food', 50, 'active');
        TestRunner.assert(typeof rec.estimatedMinutes === 'number', 'Should have estimatedMinutes');
        TestRunner.assert(rec.estimatedMinutes > 0, 'Minutes should be positive');
      }
    },

    // ===== calculateGaugePercent =====
    {
      name: 'calculateGaugePercent: returns 0 for 0 minutes',
      run() {
        TestRunner.assertEqual(WaitEstimator.calculateGaugePercent(0), 0);
      }
    },
    {
      name: 'calculateGaugePercent: returns 50 for half of max',
      run() {
        const result = WaitEstimator.calculateGaugePercent(15, 30);
        TestRunner.assertEqual(result, 50);
      }
    },
    {
      name: 'calculateGaugePercent: caps at 100 for values exceeding max',
      run() {
        const result = WaitEstimator.calculateGaugePercent(50, 30);
        TestRunner.assertEqual(result, 100);
      }
    },
    {
      name: 'calculateGaugePercent: custom max minutes',
      run() {
        const result = WaitEstimator.calculateGaugePercent(10, 20);
        TestRunner.assertEqual(result, 50);
      }
    },

    // ===== estimateAllWaitTimes =====
    {
      name: 'estimateAllWaitTimes: returns estimates for all zones',
      run() {
        const mockData = {
          zone1: { name: 'Zone 1', type: 'food', density: 50, capacity: 100 },
          zone2: { name: 'Zone 2', type: 'restroom', density: 30, capacity: 50 }
        };
        const results = WaitEstimator.estimateAllWaitTimes(mockData, 'active');
        TestRunner.assertEqual(results.length, 2);
        TestRunner.assert(results[0].waitMinutes !== undefined, 'Should have waitMinutes');
        TestRunner.assert(results[0].recommendation !== undefined, 'Should have recommendation');
      }
    },
    {
      name: 'estimateAllWaitTimes: sorts by type priority then wait time',
      run() {
        const mockData = {
          gate: { name: 'Gate', type: 'gate', density: 90, capacity: 100 },
          food: { name: 'Food', type: 'food', density: 50, capacity: 100 },
          restroom: { name: 'WC', type: 'restroom', density: 40, capacity: 50 }
        };
        const results = WaitEstimator.estimateAllWaitTimes(mockData, 'active');
        // Food should come before restroom which comes before gate
        TestRunner.assertEqual(results[0].type, 'food');
        TestRunner.assertEqual(results[1].type, 'restroom');
      }
    },

    // ===== findBestAlternative =====
    {
      name: 'findBestAlternative: finds least crowded zone of same type',
      run() {
        const mockData = {
          food_a: { name: 'Food A', type: 'food', density: 80, capacity: 100 },
          food_b: { name: 'Food B', type: 'food', density: 30, capacity: 100 },
          food_c: { name: 'Food C', type: 'food', density: 55, capacity: 100 }
        };
        const alt = WaitEstimator.findBestAlternative('food_a', mockData);
        TestRunner.assertEqual(alt.name, 'Food B');
      }
    },
    {
      name: 'findBestAlternative: returns null for non-existent zone',
      run() {
        const mockData = {
          food_a: { name: 'Food A', type: 'food', density: 50, capacity: 100 }
        };
        const alt = WaitEstimator.findBestAlternative('nonexistent', mockData);
        TestRunner.assertEqual(alt, null);
      }
    },
    {
      name: 'findBestAlternative: returns null when no alternatives exist',
      run() {
        const mockData = {
          food_a: { name: 'Food A', type: 'food', density: 50, capacity: 100 },
          gate_a: { name: 'Gate A', type: 'gate', density: 20, capacity: 200 }
        };
        const alt = WaitEstimator.findBestAlternative('food_a', mockData);
        TestRunner.assertEqual(alt, null);
      }
    },

    // ===== Constants =====
    {
      name: 'FACILITY_WAIT_FACTORS: has all expected types',
      run() {
        const factors = WaitEstimator.FACILITY_WAIT_FACTORS;
        TestRunner.assert(factors.food > 0, 'food factor should be positive');
        TestRunner.assert(factors.restroom > 0, 'restroom factor should be positive');
        TestRunner.assert(factors.gate > 0, 'gate factor should be positive');
        TestRunner.assert(factors.merchandise > 0, 'merchandise factor should be positive');
      }
    },
    {
      name: 'PHASE_MULTIPLIERS: break has highest multiplier',
      run() {
        const phases = WaitEstimator.PHASE_MULTIPLIERS;
        const breakMult = phases.break;
        TestRunner.assert(breakMult > phases.active, 'Break should be higher than active');
        TestRunner.assert(breakMult > phases.pre_event, 'Break should be higher than pre_event');
      }
    }
  ]
};
