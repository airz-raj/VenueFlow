/**
 * VenueFlow Test Suite — Heatmap Engine
 * 
 * Unit tests for the data processing functions in js/heatmap.js
 */

'use strict';

const HeatmapTests = {
  name: 'Heatmap Engine',

  tests: [
    // ===== calculateOverallDensity =====
    {
      name: 'calculateOverallDensity: returns 0 for empty data',
      run() {
        const result = HeatmapEngine.calculateOverallDensity({});
        TestRunner.assertEqual(result, 0);
      }
    },
    {
      name: 'calculateOverallDensity: calculates weighted average correctly',
      run() {
        const data = {
          zone_a: { density: 80, capacity: 1000 },
          zone_b: { density: 20, capacity: 1000 }
        };
        const result = HeatmapEngine.calculateOverallDensity(data);
        // Weighted avg: (80*1000 + 20*1000) / (1000 + 1000) = 50
        TestRunner.assertEqual(result, 50);
      }
    },
    {
      name: 'calculateOverallDensity: weights by capacity',
      run() {
        const data = {
          zone_a: { density: 90, capacity: 9000 },
          zone_b: { density: 10, capacity: 1000 }
        };
        const result = HeatmapEngine.calculateOverallDensity(data);
        // Weighted: (90*9000 + 10*1000) / (9000 + 1000) = 82
        TestRunner.assertEqual(result, 82);
      }
    },
    {
      name: 'calculateOverallDensity: handles missing capacity',
      run() {
        const data = {
          zone_a: { density: 50 },
          zone_b: { density: 60 }
        };
        const result = HeatmapEngine.calculateOverallDensity(data);
        // Without capacity, each weighs 1: (50+60)/2 = 55
        TestRunner.assertEqual(result, 55);
      }
    },

    // ===== getHottestZones =====
    {
      name: 'getHottestZones: returns zones sorted by density descending',
      run() {
        const data = {
          zone_a: { name: 'A', density: 30 },
          zone_b: { name: 'B', density: 70 },
          zone_c: { name: 'C', density: 50 }
        };
        const result = HeatmapEngine.getHottestZones(data);
        TestRunner.assertEqual(result[0].name, 'B');
        TestRunner.assertEqual(result[1].name, 'C');
        TestRunner.assertEqual(result[2].name, 'A');
      }
    },
    {
      name: 'getHottestZones: returns empty array for empty data',
      run() {
        const result = HeatmapEngine.getHottestZones({});
        TestRunner.assertEqual(result.length, 0);
      }
    },
    {
      name: 'getHottestZones: includes zone id in results',
      run() {
        const data = { zone_x: { name: 'X', density: 50 } };
        const result = HeatmapEngine.getHottestZones(data);
        TestRunner.assertEqual(result[0].id, 'zone_x');
      }
    },

    // ===== getCongestedZones =====
    {
      name: 'getCongestedZones: returns zones above threshold',
      run() {
        const data = {
          zone_a: { name: 'A', density: 30 },
          zone_b: { name: 'B', density: 80 },
          zone_c: { name: 'C', density: 90 }
        };
        const result = HeatmapEngine.getCongestedZones(data, 70);
        TestRunner.assertEqual(result.length, 2);
      }
    },
    {
      name: 'getCongestedZones: uses default threshold of 70',
      run() {
        const data = {
          zone_a: { name: 'A', density: 65 },
          zone_b: { name: 'B', density: 75 }
        };
        const result = HeatmapEngine.getCongestedZones(data);
        TestRunner.assertEqual(result.length, 1);
        TestRunner.assertEqual(result[0].name, 'B');
      }
    },
    {
      name: 'getCongestedZones: returns empty for no congestion',
      run() {
        const data = {
          zone_a: { name: 'A', density: 10 },
          zone_b: { name: 'B', density: 20 }
        };
        const result = HeatmapEngine.getCongestedZones(data, 70);
        TestRunner.assertEqual(result.length, 0);
      }
    },
    {
      name: 'getCongestedZones: custom threshold works',
      run() {
        const data = {
          zone_a: { name: 'A', density: 45 },
          zone_b: { name: 'B', density: 55 }
        };
        const result = HeatmapEngine.getCongestedZones(data, 50);
        TestRunner.assertEqual(result.length, 1);
      }
    }
  ]
};
