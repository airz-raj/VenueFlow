/**
 * VenueFlow Accessibility Module
 * 
 * WCAG 2.1 AA compliance utilities including theme switching,
 * reduced motion, font scaling, keyboard navigation, and
 * screen reader support.
 * 
 * @module accessibility
 */

'use strict';

const AccessibilityService = (() => {

  /* ==========================================
     State
     ========================================== */

  let _settings = {
    theme: 'dark',
    reducedMotion: false,
    fontSize: 100,
    highContrast: false,
    screenReaderMode: false
  };

  let _isInitialized = false;
  const STORAGE_KEY = 'venueflow_a11y_settings';

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Initialize accessibility settings.
   * Loads saved preferences and applies them.
   */
  function initialize() {
    // Load saved settings
    _loadSettings();

    // Detect system preferences
    _detectSystemPreferences();

    // Apply settings
    _applyTheme(_settings.theme);
    _applyFontSize(_settings.fontSize);
    _applyReducedMotion(_settings.reducedMotion);

    // Set up keyboard navigation
    _setupKeyboardNav();

    // Set up skip links
    _setupSkipLinks();

    _isInitialized = true;
    console.log('[A11y] Initialized with settings:', _settings);
  }

  /* ==========================================
     System Preferences Detection
     ========================================== */

  /**
   * Detect browser/OS accessibility preferences.
   * @private
   */
  function _detectSystemPreferences() {
    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches && !_settings.reducedMotion) {
      _settings.reducedMotion = true;
    }
    motionQuery.addEventListener('change', (e) => {
      setReducedMotion(e.matches);
    });

    // Check prefers-color-scheme
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkQuery.addEventListener('change', (e) => {
      if (!_settings.highContrast) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });

    // Check prefers-contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    if (contrastQuery.matches) {
      _settings.highContrast = true;
      _settings.theme = 'high-contrast';
    }
  }

  /* ==========================================
     Settings Persistence
     ========================================== */

  /**
   * Load settings from localStorage.
   * @private
   */
  function _loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate and merge
        if (typeof parsed === 'object') {
          if (['dark', 'light', 'high-contrast'].includes(parsed.theme)) {
            _settings.theme = parsed.theme;
          }
          if (typeof parsed.reducedMotion === 'boolean') {
            _settings.reducedMotion = parsed.reducedMotion;
          }
          if (typeof parsed.fontSize === 'number' && parsed.fontSize >= 75 && parsed.fontSize <= 150) {
            _settings.fontSize = parsed.fontSize;
          }
          if (typeof parsed.highContrast === 'boolean') {
            _settings.highContrast = parsed.highContrast;
          }
        }
      }
    } catch (err) {
      console.warn('[A11y] Could not load settings:', err);
    }
  }

  /**
   * Save current settings to localStorage.
   * @private
   */
  function _saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
    } catch (err) {
      console.warn('[A11y] Could not save settings:', err);
    }
  }

  /* ==========================================
     Theme Management
     ========================================== */

  /**
   * Set the application theme.
   * @param {string} theme - 'dark', 'light', or 'high-contrast'
   */
  function setTheme(theme) {
    const validThemes = ['dark', 'light', 'high-contrast'];
    if (!validThemes.includes(theme)) return;

    _settings.theme = theme;
    _settings.highContrast = theme === 'high-contrast';
    _applyTheme(theme);
    _saveSettings();

    VenueUtils.announceToScreenReader(`Theme changed to ${theme.replace('-', ' ')}`);
  }

  /**
   * Apply theme to the document.
   * @param {string} theme - Theme name
   * @private
   */
  function _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    const themeColors = {
      dark: '#0d1117',
      light: '#f5f7fa',
      'high-contrast': '#000000'
    };
    metaTheme.content = themeColors[theme] || themeColors.dark;
  }

  /**
   * Cycle through themes.
   * @returns {string} New active theme
   */
  function cycleTheme() {
    const themes = ['dark', 'light', 'high-contrast'];
    const currentIndex = themes.indexOf(_settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    return nextTheme;
  }

  /**
   * Get the current theme.
   * @returns {string} Current theme name
   */
  function getTheme() {
    return _settings.theme;
  }

  /* ==========================================
     Font Size
     ========================================== */

  /**
   * Set the font size scale.
   * @param {number} percent - Font size percentage (75-150)
   */
  function setFontSize(percent) {
    const clamped = Math.max(75, Math.min(150, percent));
    _settings.fontSize = clamped;
    _applyFontSize(clamped);
    _saveSettings();
  }

  /**
   * Apply font size to the document.
   * @param {number} percent - Font size percentage
   * @private
   */
  function _applyFontSize(percent) {
    document.documentElement.style.fontSize = `${percent}%`;
  }

  /**
   * Increase font size by step.
   * @param {number} [step=10] - Percentage step
   */
  function increaseFontSize(step = 10) {
    setFontSize(_settings.fontSize + step);
    VenueUtils.announceToScreenReader(`Font size increased to ${_settings.fontSize}%`);
  }

  /**
   * Decrease font size by step.
   * @param {number} [step=10] - Percentage step
   */
  function decreaseFontSize(step = 10) {
    setFontSize(_settings.fontSize - step);
    VenueUtils.announceToScreenReader(`Font size decreased to ${_settings.fontSize}%`);
  }

  /* ==========================================
     Reduced Motion
     ========================================== */

  /**
   * Set reduced motion preference.
   * @param {boolean} enabled - Whether to reduce motion
   */
  function setReducedMotion(enabled) {
    _settings.reducedMotion = !!enabled;
    _applyReducedMotion(_settings.reducedMotion);
    _saveSettings();
  }

  /**
   * Apply reduced motion to the document.
   * @param {boolean} enabled - Whether reduced motion is on
   * @private
   */
  function _applyReducedMotion(enabled) {
    document.documentElement.classList.toggle('reduce-motion', enabled);
  }

  /* ==========================================
     Keyboard Navigation
     ========================================== */

  /**
   * Set up global keyboard navigation handlers.
   * @private
   */
  function _setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      // Tab navigation indicator
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }

      // Escape key: close modals/panels
      if (e.key === 'Escape') {
        const activePanel = document.querySelector('.panel-overlay.active');
        if (activePanel) {
          activePanel.classList.remove('active');
          VenueUtils.announceToScreenReader('Panel closed');
        }
      }

      // Keyboard shortcuts (Ctrl/Cmd + key)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            increaseFontSize();
            break;
          case '-':
            e.preventDefault();
            decreaseFontSize();
            break;
          case '0':
            e.preventDefault();
            setFontSize(100);
            VenueUtils.announceToScreenReader('Font size reset to 100%');
            break;
        }
      }
    });

    // Remove keyboard nav indicator on mouse click
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-nav');
    });
  }

  /**
   * Set up skip-to-content links for keyboard users.
   * @private
   */
  function _setupSkipLinks() {
    // Check if skip link already exists
    if (document.getElementById('skip-link')) return;

    const skipLink = VenueUtils.createElement('a', {
      id: 'skip-link',
      href: '#main-content',
      className: 'sr-only',
      style: {
        position: 'absolute',
        top: '-100px',
        left: '10px',
        zIndex: '10000',
        padding: '8px 16px',
        background: 'var(--color-primary)',
        color: 'white',
        borderRadius: '4px',
        textDecoration: 'none',
        fontSize: '14px'
      }
    }, ['Skip to main content']);

    // Show on focus
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '10px';
    });
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-100px';
    });

    document.body.prepend(skipLink);
  }

  /**
   * Manage focus trap within a container.
   * @param {HTMLElement} container - Container to trap focus within
   * @returns {Function} Cleanup function to remove the trap
   */
  function trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    const handler = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handler);
    firstFocusable?.focus();

    // Return cleanup function
    return () => container.removeEventListener('keydown', handler);
  }

  /* ==========================================
     Settings Access
     ========================================== */

  /**
   * Get all current settings.
   * @returns {Object} Current accessibility settings
   */
  function getSettings() {
    return { ..._settings };
  }

  /**
   * Check if service is ready.
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
    setTheme,
    cycleTheme,
    getTheme,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    setReducedMotion,
    trapFocus,
    getSettings,
    isReady
  });

})();
