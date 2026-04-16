/**
 * VenueFlow Google Maps Service
 * 
 * Handles Google Maps initialization, custom venue overlays,
 * POI markers, and integration with the heatmap layer.
 * 
 * Google Services: Google Maps JavaScript API
 * 
 * @module maps-service
 */

'use strict';

const MapsService = (() => {

  /* ==========================================
     State
     ========================================== */

  let _map = null;
  let _markers = [];
  let _infoWindow = null;
  let _isInitialized = false;
  let _heatmapLayer = null;

  /* ==========================================
     Venue POI Data (Narendra Modi Stadium)
     ========================================== */

  const VENUE_POIS = [
    // Gates
    { id: 'gate_north', name: 'North Gate (Gate A)', category: 'gate', lat: 23.0955, lng: 72.5957, desc: 'Main north entrance with wheelchair access' },
    { id: 'gate_south', name: 'South Gate (Gate B)', category: 'gate', lat: 23.0900, lng: 72.5957, desc: 'South entrance near parking lot B' },
    { id: 'gate_east', name: 'East Gate (Gate C)', category: 'gate', lat: 23.0927, lng: 72.5985, desc: 'East entrance closest to metro' },
    { id: 'gate_west', name: 'West Gate (Gate D)', category: 'gate', lat: 23.0927, lng: 72.5929, desc: 'West entrance near VIP lounge' },

    // Food Courts
    { id: 'food_court_a', name: 'Food Court A', category: 'food', lat: 23.0948, lng: 72.5945, desc: 'North wing - Indian cuisine, beverages' },
    { id: 'food_court_b', name: 'Food Court B', category: 'food', lat: 23.0908, lng: 72.5970, desc: 'South wing - Fast food, snacks' },
    { id: 'food_court_c', name: 'Food Court C', category: 'food', lat: 23.0925, lng: 72.5982, desc: 'East wing - Multi-cuisine' },

    // Restrooms
    { id: 'restroom_n1', name: 'Restroom N1', category: 'restroom', lat: 23.0950, lng: 72.5968, desc: 'North side, near Gate A' },
    { id: 'restroom_n2', name: 'Restroom N2', category: 'restroom', lat: 23.0945, lng: 72.5942, desc: 'North-west side' },
    { id: 'restroom_s1', name: 'Restroom S1', category: 'restroom', lat: 23.0905, lng: 72.5948, desc: 'South side, near Gate B' },
    { id: 'restroom_s2', name: 'Restroom S2', category: 'restroom', lat: 23.0910, lng: 72.5972, desc: 'South-east side' },

    // Merchandise
    { id: 'merch_store', name: 'Official Merchandise', category: 'merchandise', lat: 23.0940, lng: 72.5935, desc: 'Official team merchandise & memorabilia' },

    // First Aid
    { id: 'first_aid_center', name: 'First Aid Center', category: 'first_aid', lat: 23.0920, lng: 72.5940, desc: '24/7 medical assistance' },

    // Info
    { id: 'info_desk', name: 'Information Desk', category: 'info', lat: 23.0935, lng: 72.5958, desc: 'General inquiries & lost and found' },

    // ATM
    { id: 'atm_1', name: 'ATM Point', category: 'atm', lat: 23.0942, lng: 72.5962, desc: 'Multiple bank ATMs available' },

    // Parking
    { id: 'parking_a', name: 'Parking A (North)', category: 'parking', lat: 23.0965, lng: 72.5957, desc: 'Multi-level parking, 8000 capacity' },
    { id: 'parking_b', name: 'Parking B (South)', category: 'parking', lat: 23.0888, lng: 72.5957, desc: 'Open parking, 8000 capacity' }
  ];

  /* ==========================================
     Dark Mode Map Styles
     ========================================== */

  const DARK_MAP_STYLES = [
    { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3748' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3b4a6b' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a3a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] }
  ];

  /* ==========================================
     POI Marker Icons (SVG Data URIs)
     ========================================== */

  /**
   * Generate a marker icon SVG as a data URI.
   * @param {string} emoji - Emoji to display
   * @param {string} bgColor - Background color
   * @returns {Object} Google Maps icon configuration
   */
  function _createMarkerIcon(emoji, bgColor) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <defs>
          <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
          </filter>
        </defs>
        <path d="M20 47 C20 47 38 28 38 18 C38 8 30 0 20 0 C10 0 2 8 2 18 C2 28 20 47 20 47Z" 
              fill="${bgColor}" filter="url(#shadow)" stroke="white" stroke-width="1.5"/>
        <text x="20" y="22" text-anchor="middle" font-size="16" dominant-baseline="middle">${emoji}</text>
      </svg>`;
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: typeof google !== 'undefined' ? new google.maps.Size(36, 44) : { width: 36, height: 44 },
      anchor: typeof google !== 'undefined' ? new google.maps.Point(18, 44) : { x: 18, y: 44 }
    };
  }

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Initialize the Google Map.
   * @param {string} containerId - DOM element ID for the map
   * @param {Object} venueConfig - Venue coordinates and zoom level
   * @returns {boolean} Success status
   */
  function initialize(containerId, venueConfig) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[Maps] Container not found:', containerId);
      return false;
    }

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps) {
      console.log('[Maps] Google Maps API not available, showing fallback');
      _showFallbackMap(container, venueConfig);
      return false;
    }

    try {
      _map = new google.maps.Map(container, {
        center: venueConfig.coordinates,
        zoom: venueConfig.mapZoom || 17,
        styles: DARK_MAP_STYLES,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        mapTypeId: google.maps.MapTypeId.ROADMAP
      });

      _infoWindow = new google.maps.InfoWindow();

      // Add POI markers
      _addPOIMarkers();
      
      // Add venue boundary circle
      new google.maps.Circle({
        map: _map,
        center: venueConfig.coordinates,
        radius: 350,
        fillColor: '#4F81BD',
        fillOpacity: 0.05,
        strokeColor: '#4F81BD',
        strokeOpacity: 0.3,
        strokeWeight: 2
      });

      _isInitialized = true;
      console.log('[Maps] Initialized successfully');
      return true;

    } catch (error) {
      console.error('[Maps] Initialization error:', error);
      _showFallbackMap(container, venueConfig);
      return false;
    }
  }

  /* ==========================================
     Fallback Map (No API Key)
     ========================================== */

  /**
   * Show an interactive fallback venue map when Google Maps API isn't available.
   * Uses a canvas-based representation of the stadium.
   * @param {HTMLElement} container - Container element
   * @param {Object} venueConfig - Venue configuration
   */
  function _showFallbackMap(container, venueConfig) {
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Create canvas for venue visualization
    const canvas = document.createElement('canvas');
    canvas.id = 'fallback-map-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // Info overlay
    const overlay = document.createElement('div');
    overlay.className = 'map-fallback-overlay';
    overlay.style.cssText = `
      position: absolute; top: 12px; right: 12px;
      background: hsla(220, 25%, 12%, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid hsla(220, 30%, 30%, 0.4);
      border-radius: 12px;
      padding: 12px 16px;
      max-width: 260px;
      z-index: 2;
    `;
    overlay.innerHTML = `
      <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">
        📍 ${VenueUtils.sanitizeHTML(venueConfig.name)}
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
        ${VenueUtils.sanitizeHTML(venueConfig.city)} · Capacity: ${VenueUtils.formatNumber(venueConfig.capacity)}
      </div>
      <div style="font-size: 11px; color: var(--text-tertiary); line-height: 1.4;">
        Interactive venue map with live POI locations. Add your Google Maps API key for satellite view.
      </div>
    `;
    container.appendChild(overlay);

    // Render the fallback stadium visualization
    _renderFallbackStadium(canvas);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => _renderFallbackStadium(canvas));
    resizeObserver.observe(container);

    _isInitialized = true;
  }

  /**
   * Render a stylized stadium visualization on canvas.
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  function _renderFallbackStadium(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = 'hsla(220, 20%, 25%, 0.3)';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Stadium outer ring
    const outerRadiusX = Math.min(w, h) * 0.38;
    const outerRadiusY = outerRadiusX * 0.85;
    
    ctx.strokeStyle = 'hsla(220, 70%, 55%, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Stadium inner ring (playing field)
    const innerRadiusX = outerRadiusX * 0.6;
    const innerRadiusY = outerRadiusY * 0.6;
    
    // Field fill
    ctx.fillStyle = 'hsla(140, 40%, 25%, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'hsla(140, 50%, 40%, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cricket pitch in center
    const pitchW = 12;
    const pitchH = innerRadiusY * 0.5;
    ctx.fillStyle = 'hsla(40, 40%, 45%, 0.4)';
    ctx.fillRect(cx - pitchW / 2, cy - pitchH / 2, pitchW, pitchH);
    ctx.strokeStyle = 'hsla(40, 40%, 50%, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - pitchW / 2, cy - pitchH / 2, pitchW, pitchH);

    // Section dividers in the stands
    const sections = 8;
    ctx.strokeStyle = 'hsla(220, 40%, 45%, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < sections; i++) {
      const angle = (i / sections) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(angle) * innerRadiusX * 1.05,
        cy + Math.sin(angle) * innerRadiusY * 1.05
      );
      ctx.lineTo(
        cx + Math.cos(angle) * outerRadiusX * 1.02,
        cy + Math.sin(angle) * outerRadiusY * 1.02
      );
      ctx.stroke();
    }

    // POI markers on fallback map
    const poiPositions = [
      { emoji: '🚪', label: 'Gate A', angle: -Math.PI / 2, offset: 1.12 },
      { emoji: '🚪', label: 'Gate B', angle: Math.PI / 2, offset: 1.12 },
      { emoji: '🚪', label: 'Gate C', angle: 0, offset: 1.12 },
      { emoji: '🚪', label: 'Gate D', angle: Math.PI, offset: 1.12 },
      { emoji: '🍔', label: 'Food A', angle: -Math.PI / 4, offset: 1.05 },
      { emoji: '🍔', label: 'Food B', angle: Math.PI * 3 / 4, offset: 1.05 },
      { emoji: '🍔', label: 'Food C', angle: Math.PI / 6, offset: 1.05 },
      { emoji: '🚻', label: 'WC', angle: -Math.PI / 3, offset: 1.08 },
      { emoji: '🚻', label: 'WC', angle: Math.PI * 2 / 3, offset: 1.08 },
      { emoji: '🏥', label: 'Aid', angle: Math.PI * 5 / 6, offset: 1.05 },
      { emoji: '🛍️', label: 'Merch', angle: -Math.PI * 5 / 6, offset: 1.05 },
      { emoji: '🅿️', label: 'Parking', angle: -Math.PI / 2, offset: 1.28 },
      { emoji: '🅿️', label: 'Parking', angle: Math.PI / 2, offset: 1.28 }
    ];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    poiPositions.forEach(poi => {
      const x = cx + Math.cos(poi.angle) * outerRadiusX * poi.offset;
      const y = cy + Math.sin(poi.angle) * outerRadiusY * poi.offset;

      // Marker background
      ctx.fillStyle = 'hsla(220, 25%, 18%, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'hsla(220, 30%, 40%, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Emoji
      ctx.font = '14px serif';
      ctx.fillText(poi.emoji, x, y);

      // Label
      ctx.fillStyle = 'hsla(220, 15%, 65%, 0.8)';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillText(poi.label, x, y + 22);
    });

    // Venue name
    ctx.fillStyle = 'hsla(220, 15%, 80%, 0.9)';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Narendra Modi Stadium', cx, cy + outerRadiusY + 40);
    
    ctx.fillStyle = 'hsla(220, 15%, 55%, 0.7)';
    ctx.font = '400 11px Inter, sans-serif';
    ctx.fillText('Ahmedabad · 132,000 Capacity', cx, cy + outerRadiusY + 58);
  }

  /* ==========================================
     POI Markers
     ========================================== */

  /**
   * Add all POI markers to the map.
   * @private
   */
  function _addPOIMarkers() {
    if (!_map) return;

    VENUE_POIS.forEach(poi => {
      const categoryInfo = VenueUtils.POI_CATEGORIES[poi.category.toUpperCase()] || 
                           VenueUtils.POI_CATEGORIES.INFO;
      
      const marker = new google.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng },
        map: _map,
        title: poi.name,
        icon: _createMarkerIcon(categoryInfo.icon, categoryInfo.color),
        animation: google.maps.Animation.DROP,
        optimized: true
      });

      marker.addListener('click', () => {
        const crowdData = FirebaseService.getZoneData(poi.id);
        const waitTime = crowdData ? Math.round(crowdData.density / 10) : 'N/A';
        const density = crowdData ? Math.round(crowdData.density) : 'N/A';
        const densityLevel = crowdData ? VenueUtils.getDensityLevel(crowdData.density) : null;

        const content = `
          <div class="poi-info" style="font-family: Inter, sans-serif; color: #333;">
            <div class="poi-info-name" style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">
              ${categoryInfo.icon} ${VenueUtils.sanitizeHTML(poi.name)}
            </div>
            <div class="poi-info-category" style="font-size: 11px; color: ${categoryInfo.color}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
              ${VenueUtils.sanitizeHTML(categoryInfo.label)}
            </div>
            <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
              ${VenueUtils.sanitizeHTML(poi.desc)}
            </div>
            ${crowdData ? `
              <div style="display: flex; gap: 12px; padding: 8px; background: #f5f5f5; border-radius: 8px;">
                <div style="text-align: center;">
                  <div style="font-size: 11px; color: #888;">Wait</div>
                  <div style="font-size: 16px; font-weight: 700;">${waitTime} min</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 11px; color: #888;">Crowd</div>
                  <div style="font-size: 16px; font-weight: 700; color: ${densityLevel ? densityLevel.color : '#333'};">${density}%</div>
                </div>
              </div>
            ` : ''}
          </div>
        `;

        _infoWindow.setContent(content);
        _infoWindow.open(_map, marker);
      });

      _markers.push({ marker, poi });
    });
  }

  /**
   * Filter visible markers by category.
   * @param {string|null} category - Category to show (null for all)
   */
  function filterMarkers(category) {
    _markers.forEach(({ marker, poi }) => {
      if (!category || poi.category === category) {
        marker.setMap(_map);
      } else {
        marker.setMap(null);
      }
    });
  }

  /**
   * Center map on a specific POI.
   * @param {string} poiId - POI identifier
   */
  function focusPOI(poiId) {
    const entry = _markers.find(m => m.poi.id === poiId);
    if (entry && _map) {
      _map.panTo(entry.marker.getPosition());
      _map.setZoom(19);
      google.maps.event.trigger(entry.marker, 'click');
    }
  }

  /**
   * Get all POIs.
   * @returns {Array} POI data array
   */
  function getPOIs() {
    return VENUE_POIS.map(p => ({ ...p }));
  }

  /**
   * Check if maps is ready.
   * @returns {boolean}
   */
  function isReady() {
    return _isInitialized;
  }

  /* ==========================================
     Public API
     ========================================== */

  return Object.freeze({
    initialize,
    filterMarkers,
    focusPOI,
    getPOIs,
    isReady
  });

})();
