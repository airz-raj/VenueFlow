/**
 * VenueFlow Firebase Service
 * 
 * Handles Firebase initialization, anonymous authentication,
 * and real-time database synchronization for crowd density data.
 * 
 * Google Services: Firebase Auth + Realtime Database
 * 
 * @module firebase-service
 */

'use strict';

const FirebaseService = (() => {

  /* ==========================================
     State
     ========================================== */

  let _db = null;
  let _auth = null;
  let _userId = null;
  let _isInitialized = false;
  let _listeners = [];
  let _simulationInterval = null;

  /* ==========================================
     Simulated Venue Data
     ========================================== */

  /**
   * Venue zones with base crowd density data.
   * In production, this would come from IoT sensors/cameras.
   */
  const VENUE_ZONES = [
    { id: 'gate_north', name: 'North Gate', type: 'gate', baseDensity: 45, capacity: 15000 },
    { id: 'gate_south', name: 'South Gate', type: 'gate', baseDensity: 62, capacity: 15000 },
    { id: 'gate_east', name: 'East Gate', type: 'gate', baseDensity: 38, capacity: 15000 },
    { id: 'gate_west', name: 'West Gate', type: 'gate', baseDensity: 71, capacity: 15000 },
    { id: 'food_court_a', name: 'Food Court A (North)', type: 'food', baseDensity: 55, capacity: 3000 },
    { id: 'food_court_b', name: 'Food Court B (South)', type: 'food', baseDensity: 78, capacity: 3000 },
    { id: 'food_court_c', name: 'Food Court C (East)', type: 'food', baseDensity: 42, capacity: 2500 },
    { id: 'restroom_n1', name: 'Restroom Block N1', type: 'restroom', baseDensity: 35, capacity: 500 },
    { id: 'restroom_n2', name: 'Restroom Block N2', type: 'restroom', baseDensity: 60, capacity: 500 },
    { id: 'restroom_s1', name: 'Restroom Block S1', type: 'restroom', baseDensity: 48, capacity: 500 },
    { id: 'restroom_s2', name: 'Restroom Block S2', type: 'restroom', baseDensity: 72, capacity: 500 },
    { id: 'merch_store', name: 'Official Merchandise Store', type: 'merchandise', baseDensity: 65, capacity: 1500 },
    { id: 'vip_lounge', name: 'VIP Lounge', type: 'seating', baseDensity: 25, capacity: 5000 },
    { id: 'stand_a', name: 'North Stand', type: 'seating', baseDensity: 82, capacity: 33000 },
    { id: 'stand_b', name: 'South Stand', type: 'seating', baseDensity: 76, capacity: 33000 },
    { id: 'stand_c', name: 'East Pavilion', type: 'seating', baseDensity: 68, capacity: 33000 },
    { id: 'stand_d', name: 'West Pavilion', type: 'seating', baseDensity: 73, capacity: 33000 },
    { id: 'parking_a', name: 'Parking Lot A', type: 'parking', baseDensity: 50, capacity: 8000 },
    { id: 'parking_b', name: 'Parking Lot B', type: 'parking', baseDensity: 38, capacity: 8000 },
    { id: 'first_aid_center', name: 'First Aid Center', type: 'first_aid', baseDensity: 15, capacity: 200 }
  ];

  /** Current simulated crowd data */
  let _crowdData = {};

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Initialize Firebase services.
   * Falls back to simulation mode if Firebase is unavailable.
   * @param {Object} config - Firebase configuration
   * @returns {Promise<boolean>} Success status
   */
  async function initialize(config) {
    try {
      if (typeof firebase !== 'undefined' && config && config.apiKey !== 'YOUR_FIREBASE_API_KEY') {
        // Production mode: Initialize Firebase
        const app = firebase.initializeApp(config);
        _auth = firebase.auth();
        _db = firebase.database();

        // Anonymous auth for zero-friction tracking
        const credential = await _auth.signInAnonymously();
        _userId = credential.user.uid;
        _isInitialized = true;
        
        console.log('[Firebase] Initialized with user:', _userId);
        _setupRealtimeListeners();
      } else {
        // Simulation mode: Generate realistic demo data
        console.log('[Firebase] Running in simulation mode');
        _userId = 'sim-' + Math.random().toString(36).slice(2, 10);
        _isInitialized = true;
        _initializeSimulation();
      }
      return true;
    } catch (error) {
      console.warn('[Firebase] Init failed, using simulation:', error.message);
      _userId = 'sim-' + Math.random().toString(36).slice(2, 10);
      _isInitialized = true;
      _initializeSimulation();
      return true;
    }
  }

  /* ==========================================
     Real-time Database (Production)
     ========================================== */

  /**
   * Set up real-time listeners for crowd data from Firebase.
   * @private
   */
  function _setupRealtimeListeners() {
    if (!_db) return;

    const crowdRef = _db.ref('crowd_density');
    crowdRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        _crowdData = data;
        _notifyListeners('crowdUpdate', _crowdData);
      }
    });

    const alertsRef = _db.ref('alerts');
    alertsRef.orderByChild('timestamp').limitToLast(20).on('child_added', (snapshot) => {
      const alert = snapshot.val();
      if (alert) {
        _notifyListeners('newAlert', { id: snapshot.key, ...alert });
      }
    });
  }

  /* ==========================================
     Simulation Mode
     ========================================== */

  /**
   * Initialize crowd data simulation for demo purposes.
   * Generates realistic, time-varying crowd density data.
   * @private
   */
  function _initializeSimulation() {
    // Initialize crowd data from base values
    VENUE_ZONES.forEach(zone => {
      _crowdData[zone.id] = {
        name: zone.name,
        type: zone.type,
        density: zone.baseDensity,
        capacity: zone.capacity,
        currentCount: Math.round(zone.capacity * zone.baseDensity / 100),
        trend: 'stable',
        lastUpdated: Date.now()
      };
    });

    // Notify initial data
    _notifyListeners('crowdUpdate', _crowdData);

    // Start simulation: update every 5 seconds
    _simulationInterval = setInterval(_simulateCrowdUpdate, 5000);
  }

  /**
   * Simulate realistic crowd movement patterns.
   * Density fluctuates naturally over time.
   * @private
   */
  function _simulateCrowdUpdate() {
    VENUE_ZONES.forEach(zone => {
      const current = _crowdData[zone.id];
      if (!current) return;

      // Add random variance (-5 to +5 percentage points)
      const variance = (Math.random() - 0.5) * 10;
      let newDensity = current.density + variance;

      // Apply mean reversion towards base density
      const reversion = (zone.baseDensity - newDensity) * 0.1;
      newDensity += reversion;

      // Clamp between 5% and 98%
      newDensity = Math.max(5, Math.min(98, newDensity));

      // Calculate trend
      const diff = newDensity - current.density;
      let trend = 'stable';
      if (diff > 2) trend = 'increasing';
      else if (diff < -2) trend = 'decreasing';

      _crowdData[zone.id] = {
        ...current,
        density: Math.round(newDensity * 10) / 10,
        currentCount: Math.round(zone.capacity * newDensity / 100),
        trend,
        lastUpdated: Date.now()
      };
    });

    _notifyListeners('crowdUpdate', _crowdData);
  }

  /* ==========================================
     Listener Management
     ========================================== */

  /**
   * Register a listener for data events.
   * @param {string} event - Event type ('crowdUpdate', 'newAlert')
   * @param {Function} callback - Event handler
   */
  function onData(event, callback) {
    _listeners.push({ event, callback });
    
    // Immediately emit current data for 'crowdUpdate'
    if (event === 'crowdUpdate' && Object.keys(_crowdData).length > 0) {
      callback(_crowdData);
    }
  }

  /**
   * Remove a data listener.
   * @param {string} event - Event type
   * @param {Function} callback - Event handler to remove
   */
  function offData(event, callback) {
    _listeners = _listeners.filter(l => !(l.event === event && l.callback === callback));
  }

  /**
   * Notify all registered listeners.
   * @param {string} event - Event type
   * @param {*} data - Event data
   * @private
   */
  function _notifyListeners(event, data) {
    _listeners.forEach(l => {
      if (l.event === event) {
        try {
          l.callback(data);
        } catch (err) {
          console.error(`[Firebase] Listener error for "${event}":`, err);
        }
      }
    });
  }

  /* ==========================================
     Data Access
     ========================================== */

  /**
   * Get current crowd data for all zones.
   * @returns {Object} Current crowd density data
   */
  function getCrowdData() {
    return { ..._crowdData };
  }

  /**
   * Get crowd data for a specific zone.
   * @param {string} zoneId - Zone identifier
   * @returns {Object|null} Zone crowd data
   */
  function getZoneData(zoneId) {
    return _crowdData[zoneId] ? { ..._crowdData[zoneId] } : null;
  }

  /**
   * Get the list of all venue zones.
   * @returns {Array} Venue zones
   */
  function getVenueZones() {
    return VENUE_ZONES.map(z => ({ ...z }));
  }

  /**
   * Get the current user session ID.
   * @returns {string|null} User ID
   */
  function getUserId() {
    return _userId;
  }

  /**
   * Check if service is initialized.
   * @returns {boolean} Initialization status
   */
  function isReady() {
    return _isInitialized;
  }

  /**
   * Generate simulated alerts for demo.
   * @returns {Array} Array of alert objects
   */
  function getSimulatedAlerts() {
    const now = Date.now();
    return [
      {
        id: 'alert-1',
        type: 'info',
        title: 'Gates Now Open',
        message: 'All entry gates are now open. Gate A and Gate C have the shortest queues.',
        timestamp: now - 1800000,
        read: false
      },
      {
        id: 'alert-2',
        type: 'deal',
        title: '🎉 Half-Time Special',
        message: 'Get 20% off at Food Court A during the break! Valid for the next 15 minutes.',
        timestamp: now - 900000,
        read: false
      },
      {
        id: 'alert-3',
        type: 'warning',
        title: 'High Crowd Density',
        message: 'South Gate area is experiencing heavy congestion. Consider using East or West gates.',
        timestamp: now - 600000,
        read: false
      },
      {
        id: 'alert-4',
        type: 'info',
        title: 'Weather Update',
        message: 'Clear skies expected throughout the match. Temperature: 28°C.',
        timestamp: now - 300000,
        read: true
      },
      {
        id: 'alert-5',
        type: 'deal',
        title: '🏏 Merchandise Flash Sale',
        message: 'Limited edition match jerseys available at the Official Store. First come, first served!',
        timestamp: now - 120000,
        read: false
      },
      {
        id: 'alert-6',
        type: 'info',
        title: 'Restroom Advisory',
        message: 'Restroom Block N1 has the shortest wait time right now (~2 min). Block S2 is currently crowded.',
        timestamp: now - 60000,
        read: false
      }
    ];
  }

  /**
   * Cleanup: remove listeners and stop simulation.
   */
  function destroy() {
    if (_simulationInterval) {
      clearInterval(_simulationInterval);
      _simulationInterval = null;
    }
    _listeners = [];
    if (_db) {
      _db.ref('crowd_density').off();
      _db.ref('alerts').off();
    }
  }

  /* ==========================================
     Public API
     ========================================== */

  return Object.freeze({
    initialize,
    onData,
    offData,
    getCrowdData,
    getZoneData,
    getVenueZones,
    getUserId,
    isReady,
    getSimulatedAlerts,
    destroy
  });

})();
