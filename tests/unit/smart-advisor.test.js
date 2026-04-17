/**
 * VenueFlow Smart Advisor Tests
 * 
 * Tests for pathfinding, facility scoring, forecasting,
 * and recommendation generation.
 */

const SmartAdvisorTests = {
  name: 'Smart Advisor Module',
  tests: [
    // ==========================================
    // Dijkstra Pathfinding
    // ==========================================
    {
      name: 'findShortestPath: returns null for unknown start',
      run() {
        const result = SmartAdvisor.findShortestPath('unknown', 'gate_north');
        TestRunner.assertEqual(result, null);
      }
    },
    {
      name: 'findShortestPath: returns zero distance for same node',
      run() {
        const result = SmartAdvisor.findShortestPath('gate_north', 'gate_north');
        TestRunner.assertEqual(result.distance, 0);
        TestRunner.assertEqual(result.walkTime, 0);
        TestRunner.assertEqual(result.path.length, 1);
      }
    },
    {
      name: 'findShortestPath: finds direct neighbor path',
      run() {
        const result = SmartAdvisor.findShortestPath('gate_north', 'food_court_a');
        TestRunner.assert(result !== null, 'Should find a path');
        TestRunner.assert(result.distance > 0, 'Distance should be positive');
        TestRunner.assert(result.walkTime > 0, 'Walk time should be positive');
        TestRunner.assertEqual(result.path[0], 'gate_north');
        TestRunner.assertEqual(result.path[result.path.length - 1], 'food_court_a');
      }
    },
    {
      name: 'findShortestPath: finds multi-hop path',
      run() {
        const result = SmartAdvisor.findShortestPath('parking_a', 'food_court_b');
        TestRunner.assert(result !== null, 'Should find a path');
        TestRunner.assert(result.path.length >= 3, `Path should have multiple hops, got ${result.path.length}`);
        TestRunner.assertEqual(result.path[0], 'parking_a');
        TestRunner.assertEqual(result.path[result.path.length - 1], 'food_court_b');
      }
    },
    {
      name: 'findShortestPath: returns shortest of multiple routes',
      run() {
        const result = SmartAdvisor.findShortestPath('gate_north', 'restroom_n1');
        TestRunner.assert(result !== null, 'Should find path');
        // Direct distance is 90m, verify it picks the shortest
        TestRunner.assert(result.distance <= 100, `Should find short path, got ${result.distance}m`);
      }
    },
    {
      name: 'findShortestPath: walk time uses correct speed',
      run() {
        const result = SmartAdvisor.findShortestPath('gate_north', 'food_court_a');
        if (result) {
          const expectedTime = result.distance / SmartAdvisor.WALK_SPEED_MPS / 60;
          TestRunner.assert(
            Math.abs(result.walkTime - Math.round(expectedTime * 10) / 10) < 0.2,
            `Walk time should match distance/speed calculation`
          );
        }
      }
    },

    // ==========================================
    // Facility Scoring
    // ==========================================
    {
      name: 'scoreFacility: returns score between 0-100',
      run() {
        const facility = { id: 'food_court_a', density: 50, trend: 'stable', type: 'food' };
        const result = SmartAdvisor.scoreFacility(facility, 'gate_north', 'active');
        TestRunner.assert(result.score >= 0, `Score should be >= 0, got ${result.score}`);
        TestRunner.assert(result.score <= 100, `Score should be <= 100, got ${result.score}`);
      }
    },
    {
      name: 'scoreFacility: low density scores better than high',
      run() {
        const low = SmartAdvisor.scoreFacility(
          { id: 'food_court_a', density: 20, trend: 'stable', type: 'food' }, 'gate_north', 'active'
        );
        const high = SmartAdvisor.scoreFacility(
          { id: 'food_court_a', density: 80, trend: 'stable', type: 'food' }, 'gate_north', 'active'
        );
        TestRunner.assert(low.score < high.score, `Low density (${low.score}) should score better than high (${high.score})`);
      }
    },
    {
      name: 'scoreFacility: decreasing trend scores better than increasing',
      run() {
        const dec = SmartAdvisor.scoreFacility(
          { id: 'food_court_a', density: 50, trend: 'decreasing', type: 'food' }, 'gate_north', 'active'
        );
        const inc = SmartAdvisor.scoreFacility(
          { id: 'food_court_a', density: 50, trend: 'increasing', type: 'food' }, 'gate_north', 'active'
        );
        TestRunner.assert(dec.score < inc.score, `Decreasing trend (${dec.score}) should score better than increasing (${inc.score})`);
      }
    },
    {
      name: 'scoreFacility: breakdown has all components',
      run() {
        const result = SmartAdvisor.scoreFacility(
          { id: 'food_court_a', density: 50, trend: 'stable', type: 'food' }, 'gate_north', 'active'
        );
        TestRunner.assert('density' in result.breakdown, 'Should have density');
        TestRunner.assert('distance' in result.breakdown, 'Should have distance');
        TestRunner.assert('waitTime' in result.breakdown, 'Should have waitTime');
        TestRunner.assert('trend' in result.breakdown, 'Should have trend');
        TestRunner.assert('estimatedWait' in result.breakdown, 'Should have estimatedWait');
      }
    },

    // ==========================================
    // Recommendations
    // ==========================================
    {
      name: 'getRecommendations: returns sorted array',
      run() {
        const mockData = {
          food_court_a: { name: 'Food A', type: 'food', density: 70, trend: 'stable' },
          food_court_b: { name: 'Food B', type: 'food', density: 30, trend: 'decreasing' },
          food_court_c: { name: 'Food C', type: 'food', density: 50, trend: 'increasing' }
        };
        const recs = SmartAdvisor.getRecommendations('food', mockData, 'gate_north', 'active');
        TestRunner.assertEqual(recs.length, 3);
        // Best score first (lowest)
        TestRunner.assert(recs[0].score <= recs[1].score, 'Should be sorted by score ascending');
        TestRunner.assert(recs[1].score <= recs[2].score, 'Should be sorted by score ascending');
      }
    },
    {
      name: 'getRecommendations: includes route info',
      run() {
        const mockData = {
          food_court_a: { name: 'Food A', type: 'food', density: 40, trend: 'stable' }
        };
        const recs = SmartAdvisor.getRecommendations('food', mockData, 'gate_north', 'active');
        TestRunner.assert(recs.length === 1, 'Should return 1 result');
        TestRunner.assert(recs[0].route !== null, 'Should include route');
        TestRunner.assert(recs[0].walkTime !== null, 'Should include walkTime');
        TestRunner.assert(recs[0].totalTime > 0, 'Total time should be positive');
      }
    },
    {
      name: 'getRecommendations: filters by type correctly',
      run() {
        const mockData = {
          food_court_a: { name: 'Food A', type: 'food', density: 40, trend: 'stable' },
          restroom_n1: { name: 'WC N1', type: 'restroom', density: 20, trend: 'decreasing' }
        };
        const foodRecs = SmartAdvisor.getRecommendations('food', mockData, 'gate_north', 'active');
        const restroomRecs = SmartAdvisor.getRecommendations('restroom', mockData, 'gate_north', 'active');
        TestRunner.assertEqual(foodRecs.length, 1);
        TestRunner.assertEqual(restroomRecs.length, 1);
        TestRunner.assertEqual(foodRecs[0].type, 'food');
        TestRunner.assertEqual(restroomRecs[0].type, 'restroom');
      }
    },

    // ==========================================
    // Crowd Forecasting
    // ==========================================
    {
      name: 'forecastDensity: increasing trend predicts higher',
      run() {
        const result = SmartAdvisor.forecastDensity(
          { density: 50, trend: 'increasing', type: 'food' }, 'active', 15
        );
        TestRunner.assert(result.predicted > 50, `Predicted ${result.predicted} should be > 50`);
      }
    },
    {
      name: 'forecastDensity: decreasing trend predicts lower',
      run() {
        const result = SmartAdvisor.forecastDensity(
          { density: 60, trend: 'decreasing', type: 'food' }, 'active', 15
        );
        TestRunner.assert(result.predicted < 60, `Predicted ${result.predicted} should be < 60`);
      }
    },
    {
      name: 'forecastDensity: clamps between 5-98',
      run() {
        const high = SmartAdvisor.forecastDensity(
          { density: 95, trend: 'increasing', type: 'food' }, 'break', 30
        );
        const low = SmartAdvisor.forecastDensity(
          { density: 5, trend: 'decreasing', type: 'food' }, 'active', 30
        );
        TestRunner.assert(high.predicted <= 98, `Should cap at 98, got ${high.predicted}`);
        TestRunner.assert(low.predicted >= 5, `Should floor at 5, got ${low.predicted}`);
      }
    },
    {
      name: 'forecastDensity: returns confidence level',
      run() {
        const result = SmartAdvisor.forecastDensity(
          { density: 50, trend: 'stable', type: 'food' }, 'active', 15
        );
        TestRunner.assert(
          ['high', 'medium', 'low'].includes(result.confidence),
          `Confidence should be high/medium/low, got ${result.confidence}`
        );
      }
    },
    {
      name: 'forecastDensity: break phase increases food/restroom prediction',
      run() {
        const activeResult = SmartAdvisor.forecastDensity(
          { density: 50, trend: 'stable', type: 'food' }, 'active', 15
        );
        const breakResult = SmartAdvisor.forecastDensity(
          { density: 50, trend: 'stable', type: 'food' }, 'break', 15
        );
        TestRunner.assert(
          breakResult.predicted > activeResult.predicted,
          `Break prediction (${breakResult.predicted}) should exceed active (${activeResult.predicted})`
        );
      }
    },

    // ==========================================
    // Venue Plan Generator
    // ==========================================
    {
      name: 'generateVenuePlan: returns structured plan',
      run() {
        const mockData = {
          food_court_a: { name: 'Food A', type: 'food', density: 40, trend: 'stable' },
          restroom_n1: { name: 'WC N1', type: 'restroom', density: 30, trend: 'decreasing' },
          gate_north: { name: 'Gate A', type: 'gate', density: 55, trend: 'stable' }
        };
        const plan = SmartAdvisor.generateVenuePlan(mockData, 'active', {}, 'north_stand');
        TestRunner.assert(plan.timestamp > 0, 'Should have timestamp');
        TestRunner.assertEqual(plan.userLocation, 'north_stand');
        TestRunner.assert(plan.sections.length >= 3, `Should have at least 3 sections, got ${plan.sections.length}`);
      }
    },
    {
      name: 'generateVenuePlan: food section has route and forecast',
      run() {
        const mockData = {
          food_court_a: { name: 'Food A', type: 'food', density: 40, trend: 'stable' },
          food_court_b: { name: 'Food B', type: 'food', density: 60, trend: 'increasing' }
        };
        const plan = SmartAdvisor.generateVenuePlan(mockData, 'active', {}, 'north_stand');
        const foodSection = plan.sections.find(s => s.id === 'food');
        TestRunner.assert(foodSection !== undefined, 'Should have food section');
        TestRunner.assert(foodSection.route !== null, 'Should include route');
        TestRunner.assert(foodSection.forecast !== undefined, 'Should include forecast');
        TestRunner.assert(foodSection.alternatives.length > 0, 'Should list alternatives');
      }
    },
    {
      name: 'generateVenuePlan: includes crowd forecast section',
      run() {
        const mockData = {
          north_stand: { name: 'North Stand', type: 'seating', density: 75, trend: 'increasing' },
          food_court_a: { name: 'Food A', type: 'food', density: 40, trend: 'stable' },
          gate_north: { name: 'Gate A', type: 'gate', density: 50, trend: 'stable' },
          restroom_n1: { name: 'WC N1', type: 'restroom', density: 30, trend: 'decreasing' }
        };
        const plan = SmartAdvisor.generateVenuePlan(mockData, 'active', {}, 'north_stand');
        const forecast = plan.sections.find(s => s.id === 'forecast');
        TestRunner.assert(forecast !== undefined, 'Should have forecast section');
        TestRunner.assert(typeof forecast.summary === 'string', 'Should have summary');
      }
    },

    // ==========================================
    // Edge Cases
    // ==========================================
    {
      name: 'getRecommendations: handles empty crowd data',
      run() {
        const recs = SmartAdvisor.getRecommendations('food', {}, 'gate_north', 'active');
        TestRunner.assertEqual(recs.length, 0);
      }
    },
    {
      name: 'findShortestPath: handles null destination',
      run() {
        const result = SmartAdvisor.findShortestPath('gate_north', null);
        TestRunner.assertEqual(result, null);
      }
    },
    {
      name: 'scoreFacility: handles unknown user location gracefully',
      run() {
        const result = SmartAdvisor.scoreFacility(
          { id: 'food_court_a', density: 50, trend: 'stable', type: 'food' },
          'unknown_location', 'active'
        );
        TestRunner.assert(result.score > 0, 'Should still produce a score');
      }
    }
  ]
};
