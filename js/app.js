/**
 * VenueFlow Application Controller
 * 
 * Main orchestrator for the VenueFlow smart venue assistant.
 * Handles SPA routing, state management, UI rendering,
 * and module coordination.
 * 
 * @module app
 */

'use strict';

const VenueFlowApp = (() => {

  /* ==========================================
     State
     ========================================== */

  const state = {
    activeTab: 'map',
    currentPhase: 'active',
    crowdData: {},
    isLoading: true,
    isAssistantOpen: false
  };

  const eventBus = VenueUtils.createEventBus();

  /** Tab definitions */
  const TABS = [
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'crowd', label: 'Crowd', icon: '🔥' },
    { id: 'waits', label: 'Wait Times', icon: '⏱️' },
    { id: 'assistant', label: 'Assistant', icon: '🤖' },
    { id: 'alerts', label: 'Alerts', icon: '📢' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  /* ==========================================
     Configuration
     ========================================== */

  /**
   * Get configuration, using defaults if config.js not loaded.
   */
  function _getConfig() {
    if (typeof VENUEFLOW_CONFIG !== 'undefined') {
      return VENUEFLOW_CONFIG;
    }
    // Default config for demo
    return {
      GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',
      GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
      FIREBASE_CONFIG: {
        apiKey: 'YOUR_FIREBASE_API_KEY'
      },
      VENUE: {
        name: 'Narendra Modi Stadium',
        city: 'Ahmedabad, India',
        coordinates: { lat: 23.0927, lng: 72.5957 },
        capacity: 132000,
        mapZoom: 17
      }
    };
  }

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Initialize the entire application.
   */
  async function init() {
    console.log('[VenueFlow] Starting initialization...');
    const config = _getConfig();

    // Show splash
    _updateSplashProgress(10, 'Initializing services...');

    // 1. Initialize accessibility first
    AccessibilityService.initialize();
    _updateSplashProgress(20, 'Loaded preferences...');

    // 2. Initialize Firebase
    await FirebaseService.initialize(config.FIREBASE_CONFIG);
    _updateSplashProgress(40, 'Connected to live data...');

    // 3. Initialize Gemini
    GeminiService.initialize(config.GEMINI_API_KEY, config.VENUE);
    _updateSplashProgress(55, 'AI assistant ready...');

    // 4. Initialize Notifications
    NotificationService.initialize();
    _updateSplashProgress(65, 'Notifications enabled...');

    // 5. Set up data listeners
    _setupDataListeners();
    _updateSplashProgress(75, 'Syncing crowd data...');

    // 6. Render the UI
    _renderInitialUI();
    _updateSplashProgress(85, 'Building interface...');

    // 7. Initialize map (after DOM is ready)
    MapsService.initialize('venue-map', config.VENUE);
    _updateSplashProgress(95, 'Loading venue map...');

    // 8. Initialize heatmap
    HeatmapEngine.initialize('heatmap-canvas');

    // 9. Load alerts
    const alerts = FirebaseService.getSimulatedAlerts();
    alerts.forEach(alert => NotificationService.addAlert(alert, false));
    
    // Start demo alerts
    NotificationService.startDemoAlerts();

    // 10. Set up routing
    _setupRouting();

    // Done!
    _updateSplashProgress(100, 'Ready!');
    state.isLoading = false;

    // Hide splash after a brief moment
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) splash.classList.add('hidden');
    }, 600);

    // Navigate to initial tab
    const hash = window.location.hash.slice(1) || 'map';
    navigateTo(hash);

    console.log('[VenueFlow] Initialization complete ✓');
  }

  /* ==========================================
     Splash Screen
     ========================================== */

  /**
   * Update splash screen progress.
   * @param {number} percent - Progress percentage
   * @param {string} text - Status text
   */
  function _updateSplashProgress(percent, text) {
    const fill = document.getElementById('splash-progress-fill');
    const status = document.getElementById('splash-status');
    if (fill) fill.style.width = `${percent}%`;
    if (status) status.textContent = text;
  }

  /* ==========================================
     Data Listeners
     ========================================== */

  /**
   * Set up real-time data update listeners.
   * @private
   */
  function _setupDataListeners() {
    // Crowd data updates
    FirebaseService.onData('crowdUpdate', (data) => {
      state.crowdData = data;

      // Update heatmap
      HeatmapEngine.updateData(data);

      // Update wait times panel if visible
      if (state.activeTab === 'waits') {
        _renderWaitTimesPanel();
      }

      // Update crowd panel if visible
      if (state.activeTab === 'crowd') {
        _renderCrowdPanel();
      }

      // Update dashboard stats
      _updateDashboardStats();
    });

    // New alert listener
    NotificationService.onAlert((alert) => {
      _updateAlertBadge();
      if (state.activeTab === 'alerts') {
        _renderAlertsPanel();
      }
    });
  }

  /* ==========================================
     Routing
     ========================================== */

  /**
   * Set up hash-based SPA routing.
   * @private
   */
  function _setupRouting() {
    window.addEventListener('hashchange', () => {
      const tab = window.location.hash.slice(1) || 'map';
      navigateTo(tab);
    });
  }

  /**
   * Navigate to a tab.
   * @param {string} tabId - Tab identifier
   */
  function navigateTo(tabId) {
    const validTab = TABS.find(t => t.id === tabId);
    if (!validTab) return;

    state.activeTab = tabId;

    // Update URL without triggering hashchange
    if (window.location.hash !== `#${tabId}`) {
      history.replaceState(null, '', `#${tabId}`);
    }

    // Update tab active states
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isActive = tab.dataset.tab === tabId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // Show active panel
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
    });

    // Render panel content
    switch (tabId) {
      case 'map':
        // Force map resize
        if (typeof google !== 'undefined' && google.maps) {
          google.maps.event.trigger(document.getElementById('venue-map'), 'resize');
        }
        break;
      case 'crowd':
        _renderCrowdPanel();
        break;
      case 'waits':
        _renderWaitTimesPanel();
        break;
      case 'assistant':
        _renderAssistantPanel();
        break;
      case 'alerts':
        _renderAlertsPanel();
        NotificationService.markAllRead();
        _updateAlertBadge();
        break;
      case 'settings':
        _renderSettingsPanel();
        break;
    }

    VenueUtils.announceToScreenReader(`Navigated to ${validTab.label}`);
  }

  /* ==========================================
     Initial UI Rendering
     ========================================== */

  /**
   * Render the initial static UI structure.
   * @private
   */
  function _renderInitialUI() {
    // Render navigation tabs
    const navContainer = document.getElementById('nav-tabs');
    if (navContainer) {
      navContainer.innerHTML = TABS.map(tab => `
        <button class="nav-tab ${tab.id === state.activeTab ? 'active' : ''}" 
                data-tab="${tab.id}"
                role="tab"
                aria-selected="${tab.id === state.activeTab}"
                aria-controls="panel-${tab.id}"
                id="tab-${tab.id}"
                tabindex="${tab.id === state.activeTab ? '0' : '-1'}">
          <span class="tab-icon" aria-hidden="true">${tab.icon}</span>
          <span class="tab-label">${tab.label}</span>
          ${tab.id === 'alerts' ? '<span class="tab-badge" id="alert-badge" style="display:none;">0</span>' : ''}
        </button>
      `).join('');

      // Add click handlers
      navContainer.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => navigateTo(tab.dataset.tab));
      });

      // Keyboard navigation for tabs
      navContainer.addEventListener('keydown', (e) => {
        const tabs = [...navContainer.querySelectorAll('.nav-tab')];
        const currentIndex = tabs.indexOf(document.activeElement);
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = tabs[(currentIndex + 1) % tabs.length];
          next.focus();
          next.click();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
          prev.focus();
          prev.click();
        }
      });
    }

    // Theme toggle button handler
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const newTheme = AccessibilityService.cycleTheme();
        const icons = { dark: '🌙', light: '☀️', 'high-contrast': '🔳' };
        themeBtn.querySelector('.btn-icon').textContent = icons[newTheme] || '🌙';
      });
    }
  }

  /* ==========================================
     Dashboard Stats
     ========================================== */

  /**
   * Update the overview stats in the header.
   * @private
   */
  function _updateDashboardStats() {
    const data = state.crowdData;
    if (!data || Object.keys(data).length === 0) return;

    const overallDensity = HeatmapEngine.calculateOverallDensity(data);
    const congested = HeatmapEngine.getCongestedZones(data, 70);
    const totalAttendees = Object.values(data)
      .filter(d => d.type === 'seating')
      .reduce((sum, d) => sum + (d.currentCount || 0), 0);

    const statsContainer = document.getElementById('dashboard-stats');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="stat-card" style="animation-delay: 0s;">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${VenueUtils.formatNumber(totalAttendees)}</div>
        <div class="stat-label">Attendees</div>
      </div>
      <div class="stat-card" style="animation-delay: 0.05s;">
        <div class="stat-icon">🔥</div>
        <div class="stat-value" style="color: ${VenueUtils.getDensityColor(overallDensity)}">
          ${Math.round(overallDensity)}%
        </div>
        <div class="stat-label">Avg Density</div>
      </div>
      <div class="stat-card" style="animation-delay: 0.1s;">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${congested.length}</div>
        <div class="stat-label">Congested Zones</div>
      </div>
      <div class="stat-card" style="animation-delay: 0.15s;">
        <div class="stat-icon">🏟️</div>
        <div class="stat-value">${state.currentPhase === 'active' ? 'LIVE' : 'BREAK'}</div>
        <div class="stat-label">Event Status</div>
      </div>
    `;
  }

  /* ==========================================
     Crowd Panel
     ========================================== */

  /**
   * Render the crowd density panel.
   * @private
   */
  function _renderCrowdPanel() {
    const body = document.getElementById('crowd-body');
    if (!body) return;

    const data = state.crowdData;
    const zones = HeatmapEngine.getHottestZones(data);

    body.innerHTML = `
      <div class="heatmap-legend">
        <span class="heatmap-label">Low</span>
        <div class="heatmap-gradient-bar"></div>
        <span class="heatmap-label">Critical</span>
      </div>
      <div class="heatmap-stats" id="crowd-stats">
        ${_renderCrowdStats(data)}
      </div>
      <div style="position: relative; width: 100%; height: 350px; margin-bottom: var(--space-4); border-radius: var(--radius-xl); overflow: hidden; border: 1px solid var(--border-subtle);">
        <canvas id="heatmap-canvas" style="width: 100%; height: 100%;"></canvas>
      </div>
      <h3 style="font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3);">Zone Details</h3>
      <div class="zone-list" role="list">
        ${zones.map(zone => _renderZoneItem(zone)).join('')}
      </div>
    `;

    // Re-initialize heatmap on the new canvas
    HeatmapEngine.destroy();
    HeatmapEngine.initialize('heatmap-canvas');
    HeatmapEngine.updateData(data);
  }

  /**
   * Render crowd stats overview cards.
   * @param {Object} data - Crowd data
   * @returns {string} HTML string
   */
  function _renderCrowdStats(data) {
    const overall = HeatmapEngine.calculateOverallDensity(data);
    const congested = HeatmapEngine.getCongestedZones(data, 70);
    const quiet = HeatmapEngine.getCongestedZones(data, -Infinity)
      .filter(z => z.density < 30);

    return `
      <div class="status-card">
        <div class="status-icon ${overall > 70 ? 'danger' : overall > 40 ? 'warning' : 'success'}">
          ${overall > 70 ? '🔴' : overall > 40 ? '🟡' : '🟢'}
        </div>
        <div class="status-info">
          <div class="status-label">Overall</div>
          <div class="status-value">${Math.round(overall)}%</div>
        </div>
      </div>
      <div class="status-card">
        <div class="status-icon danger">⚠️</div>
        <div class="status-info">
          <div class="status-label">Congested</div>
          <div class="status-value">${congested.length} zones</div>
        </div>
      </div>
      <div class="status-card">
        <div class="status-icon success">✅</div>
        <div class="status-info">
          <div class="status-label">Low Traffic</div>
          <div class="status-value">${quiet.length} zones</div>
        </div>
      </div>
      <div class="status-card">
        <div class="status-icon info">📊</div>
        <div class="status-info">
          <div class="status-label">Total Zones</div>
          <div class="status-value">${Object.keys(data).length}</div>
        </div>
      </div>
    `;
  }

  /**
   * Render a single zone list item.
   * @param {Object} zone - Zone data
   * @returns {string} HTML string
   */
  function _renderZoneItem(zone) {
    const level = VenueUtils.getDensityLevel(zone.density);
    const trendIcons = { increasing: '📈', decreasing: '📉', stable: '➡️' };
    
    return `
      <div class="zone-item" role="listitem" aria-label="${VenueUtils.sanitizeHTML(zone.name)}, ${Math.round(zone.density)}% density, ${level.label}">
        <div class="zone-density-indicator" style="background: ${level.color};"></div>
        <div class="zone-info">
          <div class="zone-name">${VenueUtils.sanitizeHTML(zone.name)}</div>
          <div class="zone-details">${level.label} · ${trendIcons[zone.trend] || '➡️'} ${zone.trend}</div>
        </div>
        <div class="zone-density-value" style="color: ${level.color};">${Math.round(zone.density)}%</div>
        <div class="zone-progress-bar">
          <div class="zone-progress-fill" style="width: ${Math.round(zone.density)}%; background: ${level.color};"></div>
        </div>
      </div>
    `;
  }

  /* ==========================================
     Wait Times Panel
     ========================================== */

  /**
   * Render the wait times panel.
   * @private
   */
  function _renderWaitTimesPanel() {
    const body = document.getElementById('waits-body');
    if (!body) return;

    const estimates = WaitEstimator.estimateAllWaitTimes(state.crowdData, state.currentPhase);
    const visibleTypes = ['food', 'restroom', 'merchandise', 'gate'];
    const filtered = estimates.filter(e => visibleTypes.includes(e.type));

    body.innerHTML = `
      <div class="wait-grid">
        ${filtered.map((est, i) => _renderWaitCard(est, i)).join('')}
      </div>
    `;
  }

  /**
   * Render a wait time card with circular gauge.
   * @param {Object} est - Wait time estimate
   * @param {number} index - Card index for animation delay
   * @returns {string} HTML string
   */
  function _renderWaitCard(est, index) {
    const gaugePercent = WaitEstimator.calculateGaugePercent(est.waitMinutes, 25);
    const circumference = 2 * Math.PI * 48;
    const offset = circumference - (gaugePercent / 100) * circumference;
    const color = est.densityLevel.color;
    const categoryIcons = {
      food: '🍔', restroom: '🚻', merchandise: '🛍️', gate: '🚪', 
      parking: '🅿️', first_aid: '🏥', atm: '🏧'
    };

    return `
      <div class="wait-card" style="animation-delay: ${index * 0.05}s;" 
           role="article" aria-label="${VenueUtils.sanitizeHTML(est.name)}, estimated wait ${VenueUtils.formatWaitTime(est.waitMinutes)}">
        <div class="gauge-container">
          <svg class="gauge-svg" viewBox="0 0 108 108">
            <circle class="gauge-bg" cx="54" cy="54" r="48"/>
            <circle class="gauge-fill" cx="54" cy="54" r="48"
                    stroke="${color}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"/>
          </svg>
          <div class="gauge-text">
            <div class="gauge-value" style="color: ${color};">${VenueUtils.formatWaitTime(est.waitMinutes)}</div>
            <div class="gauge-unit">wait</div>
          </div>
        </div>
        <div class="wait-name">
          ${categoryIcons[est.type] || '📍'} ${VenueUtils.sanitizeHTML(est.name)}
        </div>
        <div class="wait-status" style="color: ${color};">
          ${est.densityLevel.label} · ${est.density}% density
        </div>
        <div class="wait-recommendation">
          <span>${VenueUtils.sanitizeHTML(est.recommendation.text)}</span>
        </div>
      </div>
    `;
  }

  /* ==========================================
     AI Assistant Panel
     ========================================== */

  /**
   * Render the AI assistant chat panel.
   * @private
   */
  function _renderAssistantPanel() {
    const panel = document.getElementById('panel-assistant');
    if (!panel || panel.querySelector('.chat-messages')) return; // Already rendered

    panel.innerHTML = `
      <div class="chat-panel">
        <div class="chat-header">
          <div class="chat-avatar" aria-hidden="true">🤖</div>
          <div class="chat-header-info">
            <div class="chat-header-name">VenueFlow AI</div>
            <div class="chat-header-status">
              <span class="live-dot" style="width: 6px; height: 6px;"></span> Online
            </div>
          </div>
          <button class="btn btn-ghost" id="btn-clear-chat" aria-label="Clear conversation">🗑️</button>
        </div>
        <div class="chat-messages" id="chat-messages" role="log" aria-label="Chat messages" aria-live="polite">
          <!-- Welcome message -->
          <div class="chat-message assistant">
            <div class="message-avatar">🤖</div>
            <div class="message-bubble">
              <strong>Hey there! 👋</strong><br><br>
              I'm your VenueFlow AI assistant for Narendra Modi Stadium. I can help you find food, restrooms, navigate gates, check crowd levels, and more!<br><br>
              Try asking me anything or use the quick actions below.
            </div>
          </div>
        </div>
        <div class="chat-chips" id="chat-chips">
          ${GeminiService.getQuickActions().map(action => `
            <button class="chip" data-query="${VenueUtils.sanitizeHTML(action.query)}" aria-label="${action.label}">
              ${action.label}
            </button>
          `).join('')}
        </div>
        <div class="chat-input-container">
          <div class="chat-input-wrapper">
            <textarea class="chat-input" id="chat-input" 
                      placeholder="Ask me anything about the venue..." 
                      rows="1" 
                      aria-label="Type your message"
                      maxlength="500"></textarea>
            <button class="chat-send-btn" id="btn-send-chat" aria-label="Send message" disabled>
              ➤
            </button>
          </div>
        </div>
      </div>
    `;

    // Set up chat interaction handlers
    _setupChatHandlers();
  }

  /**
   * Set up chat input and action handlers.
   * @private
   */
  function _setupChatHandlers() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send-chat');
    const clearBtn = document.getElementById('btn-clear-chat');
    const chipsContainer = document.getElementById('chat-chips');

    if (!input || !sendBtn) return;

    // Enable/disable send button based on input
    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
      // Auto-resize textarea
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Send on Enter (Shift+Enter for newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.value.trim()) _sendChatMessage(input.value.trim());
      }
    });

    // Send button click
    sendBtn.addEventListener('click', () => {
      if (input.value.trim()) _sendChatMessage(input.value.trim());
    });

    // Clear chat
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        GeminiService.clearHistory();
        const messages = document.getElementById('chat-messages');
        if (messages) {
          messages.innerHTML = `
            <div class="chat-message assistant">
              <div class="message-avatar">🤖</div>
              <div class="message-bubble">Conversation cleared! How can I help you? 😊</div>
            </div>
          `;
        }
      });
    }

    // Quick action chips
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (chip) _sendChatMessage(chip.dataset.query);
      });
    }
  }

  /**
   * Send a chat message and display the response.
   * @param {string} message - User message
   * @private
   */
  async function _sendChatMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send-chat');
    
    if (!messagesContainer || !input) return;

    // Display user message
    messagesContainer.innerHTML += `
      <div class="chat-message user">
        <div class="message-avatar">👤</div>
        <div class="message-bubble">${VenueUtils.sanitizeHTML(message)}</div>
      </div>
    `;

    // Clear input
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    const typingId = VenueUtils.generateId('typing');
    messagesContainer.innerHTML += `
      <div class="chat-message assistant" id="${typingId}">
        <div class="message-avatar">🤖</div>
        <div class="message-bubble">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    `;

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Get AI response
    const response = await GeminiService.sendMessage(message, {
      crowdData: state.crowdData,
      eventPhase: state.currentPhase
    });

    // Remove typing indicator
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    // Display AI response (convert markdown-like formatting to HTML)
    const formattedResponse = _formatChatResponse(response);
    messagesContainer.innerHTML += `
      <div class="chat-message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-bubble">${formattedResponse}</div>
      </div>
    `;

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Format chat response with basic markdown support.
   * @param {string} text - Raw response text
   * @returns {string} HTML formatted text
   */
  function _formatChatResponse(text) {
    return VenueUtils.sanitizeHTML(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/- (.*?)(?:<br>|$)/g, '• $1<br>');
  }

  /* ==========================================
     Alerts Panel
     ========================================== */

  /**
   * Render the alerts panel.
   * @private
   */
  function _renderAlertsPanel() {
    const body = document.getElementById('alerts-body');
    if (!body) return;

    const alerts = NotificationService.getAlerts();

    if (alerts.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📢</div>
          <div class="empty-state-title">No alerts yet</div>
          <div class="empty-state-text">You'll see real-time venue updates, deals, and important notifications here.</div>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="alerts-list" role="list" aria-label="Venue alerts">
        ${alerts.map(alert => `
          <div class="alert-card ${alert.read ? '' : 'unread'}" role="listitem"
               aria-label="${VenueUtils.sanitizeHTML(alert.title)}">
            <div class="alert-icon ${alert.type}">
              ${alert.type === 'info' ? 'ℹ️' : alert.type === 'warning' ? '⚠️' : alert.type === 'deal' ? '🎉' : '🚨'}
            </div>
            <div class="alert-content">
              <div class="alert-title">${VenueUtils.sanitizeHTML(alert.title)}</div>
              <div class="alert-text">${VenueUtils.sanitizeHTML(alert.message)}</div>
              <div class="alert-time">${VenueUtils.formatRelativeTime(alert.timestamp)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Update the alert badge count.
   * @private
   */
  function _updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    if (!badge) return;

    const count = NotificationService.getUnreadCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  /* ==========================================
     Settings Panel
     ========================================== */

  /**
   * Render the accessibility settings panel.
   * @private
   */
  function _renderSettingsPanel() {
    const body = document.getElementById('settings-body');
    if (!body) return;

    const settings = AccessibilityService.getSettings();

    body.innerHTML = `
      <div class="settings-section">
        <div class="settings-title">Appearance</div>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">Theme</div>
            <div class="settings-item-desc">Current: ${settings.theme}</div>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <button class="btn btn-secondary ${settings.theme === 'dark' ? 'btn-primary' : ''}" 
                    onclick="VenueFlowApp.setTheme('dark')" aria-label="Dark theme">🌙</button>
            <button class="btn btn-secondary ${settings.theme === 'light' ? 'btn-primary' : ''}" 
                    onclick="VenueFlowApp.setTheme('light')" aria-label="Light theme">☀️</button>
            <button class="btn btn-secondary ${settings.theme === 'high-contrast' ? 'btn-primary' : ''}" 
                    onclick="VenueFlowApp.setTheme('high-contrast')" aria-label="High contrast theme">🔳</button>
          </div>
        </div>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">Font Size</div>
            <div class="settings-item-desc" id="font-size-display">${settings.fontSize}%</div>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <button class="btn btn-secondary" onclick="VenueFlowApp.decreaseFontSize()" aria-label="Decrease font size">A-</button>
            <button class="btn btn-secondary" onclick="VenueFlowApp.resetFontSize()" aria-label="Reset font size">A</button>
            <button class="btn btn-secondary" onclick="VenueFlowApp.increaseFontSize()" aria-label="Increase font size">A+</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-title">Accessibility</div>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">Reduced Motion</div>
            <div class="settings-item-desc">Minimize animations</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings.reducedMotion ? 'checked' : ''} 
                   onchange="VenueFlowApp.setReducedMotion(this.checked)"
                   aria-label="Toggle reduced motion">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-title">About VenueFlow</div>
        <div class="settings-item" style="flex-direction: column; align-items: flex-start; gap: var(--space-2);">
          <div class="settings-item-label">Smart Venue Assistant</div>
          <div class="settings-item-desc" style="line-height: 1.6;">
            VenueFlow uses AI to enhance the physical event experience at large-scale sporting venues.
            Powered by Google Gemini AI, Google Maps, and Firebase.<br><br>
            <strong>Google Services Integration:</strong><br>
            • Google Maps JavaScript API — Venue navigation<br>
            • Google Gemini AI — Smart assistant<br>
            • Firebase Realtime Database — Live crowd data<br>
            • Firebase Auth — Session management<br>
            • Google Fonts — Typography<br><br>
            Built for PromptWars Week 1 · Physical Event Experience
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================
     Public Methods (for HTML onclick handlers)
     ========================================== */

  function setTheme(theme) {
    AccessibilityService.setTheme(theme);
    _renderSettingsPanel();
  }

  function increaseFontSize() {
    AccessibilityService.increaseFontSize();
    const display = document.getElementById('font-size-display');
    if (display) display.textContent = AccessibilityService.getSettings().fontSize + '%';
  }

  function decreaseFontSize() {
    AccessibilityService.decreaseFontSize();
    const display = document.getElementById('font-size-display');
    if (display) display.textContent = AccessibilityService.getSettings().fontSize + '%';
  }

  function resetFontSize() {
    AccessibilityService.setFontSize(100);
    const display = document.getElementById('font-size-display');
    if (display) display.textContent = '100%';
    VenueUtils.announceToScreenReader('Font size reset to 100%');
  }

  function setReducedMotion(enabled) {
    AccessibilityService.setReducedMotion(enabled);
  }

  /* ==========================================
     Public API
     ========================================== */

  return {
    init,
    navigateTo,
    setTheme,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    setReducedMotion
  };

})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  VenueFlowApp.init().catch(err => {
    console.error('[VenueFlow] Critical init error:', err);
  });
});
