/**
 * VenueFlow Test Suite — Utility Functions
 * 
 * Unit tests for js/utils.js
 */

'use strict';

const UtilsTests = {
  name: 'Utils Module',

  tests: [
    // ===== formatWaitTime =====
    {
      name: 'formatWaitTime: returns "< 1 min" for values under 1',
      run() {
        const result = VenueUtils.formatWaitTime(0.5);
        TestRunner.assertEqual(result, '< 1 min');
      }
    },
    {
      name: 'formatWaitTime: returns minutes for values under 60',
      run() {
        TestRunner.assertEqual(VenueUtils.formatWaitTime(5), '5 min');
        TestRunner.assertEqual(VenueUtils.formatWaitTime(15), '15 min');
        TestRunner.assertEqual(VenueUtils.formatWaitTime(59), '59 min');
      }
    },
    {
      name: 'formatWaitTime: returns hours and minutes for values >= 60',
      run() {
        TestRunner.assertEqual(VenueUtils.formatWaitTime(60), '1h');
        TestRunner.assertEqual(VenueUtils.formatWaitTime(80), '1h 20m');
        TestRunner.assertEqual(VenueUtils.formatWaitTime(125), '2h 5m');
      }
    },
    {
      name: 'formatWaitTime: handles invalid inputs gracefully',
      run() {
        TestRunner.assertEqual(VenueUtils.formatWaitTime(-5), '--');
        TestRunner.assertEqual(VenueUtils.formatWaitTime(null), '--');
        TestRunner.assertEqual(VenueUtils.formatWaitTime('abc'), '--');
        TestRunner.assertEqual(VenueUtils.formatWaitTime(undefined), '--');
      }
    },

    // ===== formatRelativeTime =====
    {
      name: 'formatRelativeTime: returns "just now" for recent timestamps',
      run() {
        const result = VenueUtils.formatRelativeTime(Date.now() - 30000);
        TestRunner.assertEqual(result, 'just now');
      }
    },
    {
      name: 'formatRelativeTime: returns minutes ago',
      run() {
        const result = VenueUtils.formatRelativeTime(Date.now() - 300000);
        TestRunner.assertEqual(result, '5m ago');
      }
    },
    {
      name: 'formatRelativeTime: returns hours ago',
      run() {
        const result = VenueUtils.formatRelativeTime(Date.now() - 7200000);
        TestRunner.assertEqual(result, '2h ago');
      }
    },

    // ===== formatNumber =====
    {
      name: 'formatNumber: formats numbers with locale separators',
      run() {
        const result = VenueUtils.formatNumber(132000);
        // Handle both en-US (132,000) and en-IN (1,32,000) formats
        const digitsOnly = result.replace(/[^0-9]/g, '');
        TestRunner.assertEqual(digitsOnly, '132000');
      }
    },
    {
      name: 'formatNumber: handles non-number input',
      run() {
        TestRunner.assertEqual(VenueUtils.formatNumber('abc'), '0');
        TestRunner.assertEqual(VenueUtils.formatNumber(null), '0');
      }
    },

    // ===== getDensityLevel =====
    {
      name: 'getDensityLevel: returns LOW for density <= 30',
      run() {
        const result = VenueUtils.getDensityLevel(25);
        TestRunner.assertEqual(result.id, 'low');
      }
    },
    {
      name: 'getDensityLevel: returns MODERATE for density 31-55',
      run() {
        const result = VenueUtils.getDensityLevel(40);
        TestRunner.assertEqual(result.id, 'moderate');
      }
    },
    {
      name: 'getDensityLevel: returns HIGH for density 56-80',
      run() {
        const result = VenueUtils.getDensityLevel(70);
        TestRunner.assertEqual(result.id, 'high');
      }
    },
    {
      name: 'getDensityLevel: returns CRITICAL for density > 80',
      run() {
        const result = VenueUtils.getDensityLevel(90);
        TestRunner.assertEqual(result.id, 'critical');
      }
    },

    // ===== getDensityColor =====
    {
      name: 'getDensityColor: returns a valid HSL color string',
      run() {
        const result = VenueUtils.getDensityColor(50);
        TestRunner.assert(result.startsWith('hsl('), `Expected HSL color but got: ${result}`);
      }
    },
    {
      name: 'getDensityColor: clamps values to 0-100 range',
      run() {
        const low = VenueUtils.getDensityColor(-10);
        const high = VenueUtils.getDensityColor(150);
        TestRunner.assert(low.startsWith('hsl('), 'Expected valid HSL for negative input');
        TestRunner.assert(high.startsWith('hsl('), 'Expected valid HSL for >100 input');
      }
    },

    // ===== sanitizeHTML =====
    {
      name: 'sanitizeHTML: escapes HTML special characters',
      run() {
        const result = VenueUtils.sanitizeHTML('<script>alert("xss")</script>');
        TestRunner.assert(!result.includes('<script>'), 'Script tags should be escaped');
        TestRunner.assert(result.includes('&lt;'), 'Should contain escaped bracket');
      }
    },
    {
      name: 'sanitizeHTML: handles non-string inputs',
      run() {
        TestRunner.assertEqual(VenueUtils.sanitizeHTML(null), '');
        TestRunner.assertEqual(VenueUtils.sanitizeHTML(42), '');
        TestRunner.assertEqual(VenueUtils.sanitizeHTML(undefined), '');
      }
    },
    {
      name: 'sanitizeHTML: preserves safe text unchanged',
      run() {
        TestRunner.assertEqual(VenueUtils.sanitizeHTML('Hello World'), 'Hello World');
      }
    },

    // ===== validateInput =====
    {
      name: 'validateInput: trims whitespace',
      run() {
        TestRunner.assertEqual(VenueUtils.validateInput('  hello  '), 'hello');
      }
    },
    {
      name: 'validateInput: truncates to max length',
      run() {
        const long = 'a'.repeat(1000);
        const result = VenueUtils.validateInput(long, 100);
        TestRunner.assertEqual(result.length, 100);
      }
    },
    {
      name: 'validateInput: returns empty for non-strings',
      run() {
        TestRunner.assertEqual(VenueUtils.validateInput(null), '');
        TestRunner.assertEqual(VenueUtils.validateInput(42), '');
      }
    },

    // ===== debounce =====
    {
      name: 'debounce: creates a function',
      run() {
        const fn = VenueUtils.debounce(() => {}, 100);
        TestRunner.assertEqual(typeof fn, 'function');
      }
    },

    // ===== throttle =====
    {
      name: 'throttle: creates a function',
      run() {
        const fn = VenueUtils.throttle(() => {}, 100);
        TestRunner.assertEqual(typeof fn, 'function');
      }
    },

    // ===== createEventBus =====
    {
      name: 'createEventBus: emits and receives events',
      run() {
        const bus = VenueUtils.createEventBus();
        let received = null;
        bus.on('test', (data) => { received = data; });
        bus.emit('test', 'hello');
        TestRunner.assertEqual(received, 'hello');
      }
    },
    {
      name: 'createEventBus: off removes listener',
      run() {
        const bus = VenueUtils.createEventBus();
        let count = 0;
        const handler = () => { count++; };
        bus.on('test', handler);
        bus.emit('test');
        bus.off('test', handler);
        bus.emit('test');
        TestRunner.assertEqual(count, 1);
      }
    },

    // ===== generateId =====
    {
      name: 'generateId: returns unique IDs',
      run() {
        const id1 = VenueUtils.generateId();
        const id2 = VenueUtils.generateId();
        TestRunner.assert(id1 !== id2, 'IDs should be unique');
      }
    },
    {
      name: 'generateId: uses prefix',
      run() {
        const id = VenueUtils.generateId('test');
        TestRunner.assert(id.startsWith('test-'), `Expected prefix "test-" but got: ${id}`);
      }
    },

    // ===== Constants =====
    {
      name: 'POI_CATEGORIES: contains expected categories',
      run() {
        TestRunner.assert(VenueUtils.POI_CATEGORIES.FOOD, 'Should have FOOD category');
        TestRunner.assert(VenueUtils.POI_CATEGORIES.RESTROOM, 'Should have RESTROOM category');
        TestRunner.assert(VenueUtils.POI_CATEGORIES.GATE, 'Should have GATE category');
      }
    },
    {
      name: 'POI_CATEGORIES: is frozen (immutable)',
      run() {
        const before = Object.keys(VenueUtils.POI_CATEGORIES).length;
        try {
          VenueUtils.POI_CATEGORIES.NEW_CAT = { id: 'new' };
        } catch (e) { /* expected in strict mode */ }
        const after = Object.keys(VenueUtils.POI_CATEGORIES).length;
        TestRunner.assertEqual(before, after);
      }
    }
  ]
};
