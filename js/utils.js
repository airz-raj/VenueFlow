/**
 * VenueFlow Utility Functions
 * 
 * Shared helpers and constants used across the application.
 * Pure functions with no side effects for testability.
 * 
 * @module utils
 */

'use strict';

const VenueUtils = (() => {

  /* ==========================================
     Constants
     ========================================== */

  /** Venue Points of Interest */
  const POI_CATEGORIES = Object.freeze({
    FOOD: { id: 'food', label: 'Food & Beverage', icon: '🍔', color: '#FF8C42' },
    RESTROOM: { id: 'restroom', label: 'Restrooms', icon: '🚻', color: '#5B9BD5' },
    GATE: { id: 'gate', label: 'Entry Gates', icon: '🚪', color: '#70C1B3' },
    MERCH: { id: 'merchandise', label: 'Merchandise', icon: '🛍️', color: '#C084FC' },
    FIRST_AID: { id: 'first_aid', label: 'First Aid', icon: '🏥', color: '#EF4444' },
    INFO: { id: 'info', label: 'Information', icon: 'ℹ️', color: '#60A5FA' },
    PARKING: { id: 'parking', label: 'Parking', icon: '🅿️', color: '#A3A3A3' },
    ATM: { id: 'atm', label: 'ATM', icon: '🏧', color: '#34D399' },
    SEATING: { id: 'seating', label: 'Seating Section', icon: '💺', color: '#FBBF24' }
  });

  /** Event phases and their characteristics */
  const EVENT_PHASES = Object.freeze({
    PRE_EVENT: { id: 'pre_event', label: 'Pre-Event', crowdMultiplier: 0.4 },
    ENTRY: { id: 'entry', label: 'Gates Open', crowdMultiplier: 0.8 },
    ACTIVE: { id: 'active', label: 'Match Live', crowdMultiplier: 0.6 },
    BREAK: { id: 'break', label: 'Half-Time / Break', crowdMultiplier: 1.0 },
    POST_EVENT: { id: 'post_event', label: 'Post-Event', crowdMultiplier: 0.9 }
  });

  /** Crowd density levels */
  const DENSITY_LEVELS = Object.freeze({
    LOW: { id: 'low', label: 'Low', maxPercent: 30, color: 'hsl(150, 70%, 45%)' },
    MODERATE: { id: 'moderate', label: 'Moderate', maxPercent: 55, color: 'hsl(55, 90%, 50%)' },
    HIGH: { id: 'high', label: 'High', maxPercent: 80, color: 'hsl(25, 90%, 50%)' },
    CRITICAL: { id: 'critical', label: 'Very High', maxPercent: 100, color: 'hsl(0, 80%, 50%)' }
  });

  /* ==========================================
     Time & Formatting Helpers
     ========================================== */

  /**
   * Format minutes into a human-readable string.
   * @param {number} minutes - Number of minutes
   * @returns {string} Formatted string (e.g., "5 min", "1h 20m")
   */
  function formatWaitTime(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) return '--';
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  /**
   * Format a timestamp into relative time ("2m ago", "1h ago").
   * @param {number} timestamp - Unix timestamp in ms
   * @returns {string} Relative time string
   */
  function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 0) return 'just now';
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  /**
   * Format a number with commas for display.
   * @param {number} num - Number to format
   * @returns {string} Formatted number string
   */
  function formatNumber(num) {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('en-IN');
  }

  /* ==========================================
     Density & Crowd Helpers
     ========================================== */

  /**
   * Get density level based on percentage.
   * @param {number} percent - Crowd density percentage (0-100)
   * @returns {Object} Density level object
   */
  function getDensityLevel(percent) {
    if (percent <= DENSITY_LEVELS.LOW.maxPercent) return DENSITY_LEVELS.LOW;
    if (percent <= DENSITY_LEVELS.MODERATE.maxPercent) return DENSITY_LEVELS.MODERATE;
    if (percent <= DENSITY_LEVELS.HIGH.maxPercent) return DENSITY_LEVELS.HIGH;
    return DENSITY_LEVELS.CRITICAL;
  }

  /**
   * Calculate density color for a given percentage using interpolation.
   * @param {number} percent - Density percentage (0-100)
   * @returns {string} HSL color string
   */
  function getDensityColor(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    // Interpolate hue: green (150) → yellow (55) → orange (25) → red (0)
    const hue = 150 - (clamped / 100) * 150;
    const saturation = 70 + (clamped / 100) * 15;
    const lightness = 45 + (clamped > 70 ? (clamped - 70) * 0.2 : 0);
    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
  }

  /* ==========================================
     Input Sanitization (Security)
     ========================================== */

  /**
   * Sanitize a string to prevent XSS.
   * Escapes HTML special characters.
   * @param {string} str - Input string to sanitize
   * @returns {string} Sanitized string safe for innerHTML
   */
  function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Validate that a string is a safe user input.
   * @param {string} input - User input
   * @param {number} [maxLength=500] - Maximum allowed length
   * @returns {string} Trimmed, validated input
   */
  function validateInput(input, maxLength = 500) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
  }

  /* ==========================================
     Performance Helpers
     ========================================== */

  /**
   * Debounce a function call.
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle a function call.
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum interval in milliseconds
   * @returns {Function} Throttled function
   */
  function throttle(fn, limit) {
    let inThrottle = false;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
      }
    };
  }

  /* ==========================================
     Event Bus (Pub/Sub)
     ========================================== */

  /**
   * Simple event bus for cross-module communication.
   * @returns {Object} Event bus with on/off/emit methods
   */
  function createEventBus() {
    const listeners = new Map();

    return Object.freeze({
      /**
       * Subscribe to an event.
       * @param {string} event - Event name
       * @param {Function} callback - Event handler
       */
      on(event, callback) {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);
      },

      /**
       * Unsubscribe from an event.
       * @param {string} event - Event name
       * @param {Function} callback - Event handler to remove
       */
      off(event, callback) {
        const cbs = listeners.get(event);
        if (cbs) cbs.delete(callback);
      },

      /**
       * Emit an event.
       * @param {string} event - Event name
       * @param {*} data - Event data
       */
      emit(event, data) {
        const cbs = listeners.get(event);
        if (cbs) {
          cbs.forEach(cb => {
            try {
              cb(data);
            } catch (err) {
              console.error(`[EventBus] Error in handler for "${event}":`, err);
            }
          });
        }
      }
    });
  }

  /* ==========================================
     DOM Helpers
     ========================================== */

  /**
   * Create an HTML element with attributes and children.
   * @param {string} tag - HTML tag name
   * @param {Object} [attrs] - Attributes to set
   * @param {(string|Node)[]} [children] - Child nodes or text
   * @returns {HTMLElement} Created element
   */
  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else {
        el.setAttribute(key, value);
      }
    }

    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }

    return el;
  }

  /**
   * Announces a message to screen readers via a live region.
   * @param {string} message - Message to announce
   * @param {'polite'|'assertive'} [priority='polite'] - ARIA live priority
   */
  function announceToScreenReader(message, priority = 'polite') {
    let region = document.getElementById('sr-announcements');
    if (!region) {
      region = createElement('div', {
        id: 'sr-announcements',
        'aria-live': priority,
        'aria-atomic': 'true',
        className: 'sr-only',
        role: 'status'
      });
      document.body.appendChild(region);
    }
    region.setAttribute('aria-live', priority);
    region.textContent = '';
    // Small delay to trigger screen reader re-read
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }

  /* ==========================================
     Unique ID Generator
     ========================================== */

  let _idCounter = 0;

  /**
   * Generate a unique ID string.
   * @param {string} [prefix='vf'] - Prefix for the ID
   * @returns {string} Unique ID
   */
  function generateId(prefix = 'vf') {
    _idCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${_idCounter}`;
  }

  /* ==========================================
     Public API
     ========================================== */

  return Object.freeze({
    POI_CATEGORIES,
    EVENT_PHASES,
    DENSITY_LEVELS,
    formatWaitTime,
    formatRelativeTime,
    formatNumber,
    getDensityLevel,
    getDensityColor,
    sanitizeHTML,
    validateInput,
    debounce,
    throttle,
    createEventBus,
    createElement,
    announceToScreenReader,
    generateId
  });

})();
