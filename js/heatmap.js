/**
 * VenueFlow Heatmap Engine
 * 
 * Canvas-based crowd density heatmap visualization.
 * Renders a color-coded density overlay for venue zones.
 * 
 * @module heatmap
 */

'use strict';

const HeatmapEngine = (() => {

  /* ==========================================
     State
     ========================================== */

  let _canvas = null;
  let _ctx = null;
  let _isInitialized = false;
  let _animationId = null;
  let _crowdData = {};
  let _targetDensities = {};
  let _currentDensities = {};

  /* ==========================================
     Zone Layout (Relative to canvas)
     ========================================== */

  /**
   * Get zone positions relative to canvas dimensions.
   * Positions represent a stadium layout from above.
   * @param {number} w - Canvas width
   * @param {number} h - Canvas height
   * @returns {Array} Zone layout definitions
   */
  function _getZoneLayout(w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w * 0.38;
    const ry = h * 0.38;

    return [
      // Gates (outer ring)
      { id: 'gate_north', x: cx, y: cy - ry * 1.1, radius: 28, label: 'Gate A' },
      { id: 'gate_south', x: cx, y: cy + ry * 1.1, radius: 28, label: 'Gate B' },
      { id: 'gate_east', x: cx + rx * 1.1, y: cy, radius: 28, label: 'Gate C' },
      { id: 'gate_west', x: cx - rx * 1.1, y: cy, radius: 28, label: 'Gate D' },
      
      // Food Courts
      { id: 'food_court_a', x: cx - rx * 0.6, y: cy - ry * 0.85, radius: 24, label: 'Food A' },
      { id: 'food_court_b', x: cx + rx * 0.5, y: cy + ry * 0.85, radius: 24, label: 'Food B' },
      { id: 'food_court_c', x: cx + rx * 0.85, y: cy - ry * 0.4, radius: 24, label: 'Food C' },
      
      // Restrooms
      { id: 'restroom_n1', x: cx + rx * 0.5, y: cy - ry * 0.88, radius: 18, label: 'WC N1' },
      { id: 'restroom_n2', x: cx - rx * 0.85, y: cy - ry * 0.45, radius: 18, label: 'WC N2' },
      { id: 'restroom_s1', x: cx - rx * 0.55, y: cy + ry * 0.88, radius: 18, label: 'WC S1' },
      { id: 'restroom_s2', x: cx + rx * 0.8, y: cy + ry * 0.5, radius: 18, label: 'WC S2' },
      
      // Other facilities
      { id: 'merch_store', x: cx - rx * 0.9, y: cy + ry * 0.25, radius: 22, label: 'Merch' },
      { id: 'first_aid_center', x: cx - rx * 0.75, y: cy + ry * 0.6, radius: 16, label: 'Aid' },
      
      // Stands (large areas)
      { id: 'stand_a', x: cx, y: cy - ry * 0.5, radius: 40, label: 'North Stand' },
      { id: 'stand_b', x: cx, y: cy + ry * 0.5, radius: 40, label: 'South Stand' },
      { id: 'stand_c', x: cx + rx * 0.5, y: cy, radius: 38, label: 'East Pavilion' },
      { id: 'stand_d', x: cx - rx * 0.5, y: cy, radius: 38, label: 'West Pavilion' },
    ];
  }

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Initialize the heatmap engine.
   * @param {string} canvasId - Canvas element ID
   * @returns {boolean} Success status
   */
  function initialize(canvasId) {
    _canvas = document.getElementById(canvasId);
    if (!_canvas) {
      console.error('[Heatmap] Canvas not found:', canvasId);
      return false;
    }

    _ctx = _canvas.getContext('2d');
    _isInitialized = true;

    // Handle resize with debounce
    const resizeHandler = VenueUtils.debounce(() => _resizeCanvas(), 200);
    window.addEventListener('resize', resizeHandler);
    _resizeCanvas();

    // Start animation loop
    _animate();

    console.log('[Heatmap] Initialized');
    return true;
  }

  /**
   * Resize canvas to match container.
   * @private
   */
  function _resizeCanvas() {
    if (!_canvas) return;
    const parent = _canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    _canvas.width = rect.width * dpr;
    _canvas.height = rect.height * dpr;
    _canvas.style.width = rect.width + 'px';
    _canvas.style.height = rect.height + 'px';
    _ctx.scale(dpr, dpr);
  }

  /* ==========================================
     Data Update
     ========================================== */

  /**
   * Update crowd density data for the heatmap.
   * @param {Object} crowdData - Zone density data from Firebase
   */
  function updateData(crowdData) {
    _crowdData = crowdData;
    
    // Set target densities for smooth animation
    Object.entries(crowdData).forEach(([zoneId, data]) => {
      _targetDensities[zoneId] = data.density;
      if (_currentDensities[zoneId] === undefined) {
        _currentDensities[zoneId] = data.density;
      }
    });
  }

  /* ==========================================
     Rendering
     ========================================== */

  /**
   * Animation loop for smooth heatmap transitions.
   * @private
   */
  function _animate() {
    if (!_isInitialized) return;

    // Smoothly interpolate current densities towards targets
    Object.keys(_targetDensities).forEach(id => {
      const current = _currentDensities[id] || 0;
      const target = _targetDensities[id];
      _currentDensities[id] = current + (target - current) * 0.08;
    });

    _render();
    _animationId = requestAnimationFrame(_animate);
  }

  /**
   * Render the heatmap on canvas.
   * @private
   */
  function _render() {
    if (!_ctx || !_canvas) return;

    const w = _canvas.width / (window.devicePixelRatio || 1);
    const h = _canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    _ctx.clearRect(0, 0, w, h);

    // Background
    _ctx.fillStyle = '#0d1117';
    _ctx.fillRect(0, 0, w, h);

    // Subtle grid
    _ctx.strokeStyle = 'hsla(220, 20%, 20%, 0.3)';
    _ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) {
      _ctx.beginPath(); _ctx.moveTo(x, 0); _ctx.lineTo(x, h); _ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      _ctx.beginPath(); _ctx.moveTo(0, y); _ctx.lineTo(w, y); _ctx.stroke();
    }

    // Stadium outline
    const outerRx = w * 0.38;
    const outerRy = h * 0.38;

    _ctx.strokeStyle = 'hsla(220, 50%, 40%, 0.3)';
    _ctx.lineWidth = 2;
    _ctx.beginPath();
    _ctx.ellipse(cx, cy, outerRx, outerRy, 0, 0, Math.PI * 2);
    _ctx.stroke();

    // Inner field
    const innerRx = outerRx * 0.55;
    const innerRy = outerRy * 0.55;
    
    _ctx.fillStyle = 'hsla(140, 30%, 20%, 0.2)';
    _ctx.beginPath();
    _ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
    _ctx.fill();

    _ctx.strokeStyle = 'hsla(140, 40%, 35%, 0.4)';
    _ctx.lineWidth = 1;
    _ctx.beginPath();
    _ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
    _ctx.stroke();

    // Draw density zones
    const zones = _getZoneLayout(w, h);

    zones.forEach(zone => {
      const density = _currentDensities[zone.id] || 0;
      const color = VenueUtils.getDensityColor(density);
      
      // Glow effect
      const gradient = _ctx.createRadialGradient(
        zone.x, zone.y, 0,
        zone.x, zone.y, zone.radius * 2
      );
      gradient.addColorStop(0, _applyAlpha(color, 0.4));
      gradient.addColorStop(0.5, _applyAlpha(color, 0.15));
      gradient.addColorStop(1, 'transparent');

      _ctx.fillStyle = gradient;
      _ctx.beginPath();
      _ctx.arc(zone.x, zone.y, zone.radius * 2, 0, Math.PI * 2);
      _ctx.fill();

      // Core circle
      _ctx.fillStyle = _applyAlpha(color, 0.6);
      _ctx.beginPath();
      _ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      _ctx.fill();

      _ctx.strokeStyle = _applyAlpha(color, 0.8);
      _ctx.lineWidth = 1.5;
      _ctx.beginPath();
      _ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      _ctx.stroke();

      // Density percentage
      _ctx.fillStyle = 'hsla(0, 0%, 100%, 0.9)';
      _ctx.font = `bold ${Math.max(10, zone.radius * 0.45)}px Inter, sans-serif`;
      _ctx.textAlign = 'center';
      _ctx.textBaseline = 'middle';
      _ctx.fillText(`${Math.round(density)}%`, zone.x, zone.y);

      // Label
      _ctx.fillStyle = 'hsla(0, 0%, 80%, 0.7)';
      _ctx.font = `500 ${Math.max(8, zone.radius * 0.35)}px Inter, sans-serif`;
      _ctx.fillText(zone.label, zone.x, zone.y + zone.radius + 12);
    });

    // Title
    _ctx.fillStyle = 'hsla(220, 15%, 80%, 0.8)';
    _ctx.font = '600 13px Inter, sans-serif';
    _ctx.textAlign = 'center';
    _ctx.fillText('Live Crowd Density Heatmap', cx, 24);
  }

  /**
   * Apply alpha to an HSL color string.
   * @param {string} hslColor - HSL color string
   * @param {number} alpha - Alpha value (0-1)
   * @returns {string} HSLA color string
   */
  function _applyAlpha(hslColor, alpha) {
    return hslColor.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  }

  /* ==========================================
     Data Processing (Testable)
     ========================================== */

  /**
   * Calculate overall venue density from zone data.
   * @param {Object} crowdData - Zone density data
   * @returns {number} Average density percentage
   */
  function calculateOverallDensity(crowdData) {
    const entries = Object.values(crowdData);
    if (entries.length === 0) return 0;
    
    const totalWeight = entries.reduce((sum, d) => sum + (d.capacity || 1), 0);
    const weightedDensity = entries.reduce((sum, d) => 
      sum + (d.density * (d.capacity || 1)), 0);
    
    return totalWeight > 0 ? weightedDensity / totalWeight : 0;
  }

  /**
   * Get zones sorted by density (descending).
   * @param {Object} crowdData - Zone density data
   * @returns {Array} Sorted zone entries
   */
  function getHottestZones(crowdData) {
    return Object.entries(crowdData)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.density - a.density);
  }

  /**
   * Get zones with density above threshold.
   * @param {Object} crowdData - Zone density data
   * @param {number} threshold - Density threshold
   * @returns {Array} Zones above threshold
   */
  function getCongestedZones(crowdData, threshold = 70) {
    return Object.entries(crowdData)
      .filter(([, data]) => data.density > threshold)
      .map(([id, data]) => ({ id, ...data }));
  }

  /**
   * Check if heatmap is ready.
   * @returns {boolean}
   */
  function isReady() {
    return _isInitialized;
  }

  /**
   * Cleanup resources.
   */
  function destroy() {
    if (_animationId) {
      cancelAnimationFrame(_animationId);
      _animationId = null;
    }
    _isInitialized = false;
  }

  /* ==========================================
     Public API
     ========================================== */

  return Object.freeze({
    initialize,
    updateData,
    calculateOverallDensity,
    getHottestZones,
    getCongestedZones,
    isReady,
    destroy
  });

})();
