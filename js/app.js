/**
 * VenueFlow Application Controller v2
 * 
 * Complete rewrite with dashboard-first design,
 * live match integration, and real functionality.
 * 
 * @module app
 */

'use strict';

const VenueFlowApp = (() => {

  /* ==========================================
     State
     ========================================== */

  const state = {
    activeTab: 'home',
    currentPhase: 'active',
    crowdData: {},
    matchState: null,
    isLoading: true,
    crowdFilter: 'all'
  };

  /** Tab definitions */
  const TABS = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'crowd', label: 'Crowd', icon: '🔥' },
    { id: 'waits', label: 'Waits', icon: '⏱️' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'assistant', label: 'Smart Plan', icon: '🧠' },
    { id: 'alerts', label: 'Alerts', icon: '📢' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  /* ==========================================
     Configuration
     ========================================== */

  function _getConfig() {
    if (typeof VENUEFLOW_CONFIG !== 'undefined') return VENUEFLOW_CONFIG;
    return {
      GOOGLE_MAPS_API_KEY: '', GEMINI_API_KEY: '',
      FIREBASE_CONFIG: { apiKey: '' },
      VENUE: {
        name: 'Narendra Modi Stadium', city: 'Ahmedabad, India',
        coordinates: { lat: 23.0927, lng: 72.5957 },
        capacity: 132000, mapZoom: 17
      }
    };
  }

  /* ==========================================
     Initialization
     ========================================== */

  async function init() {
    console.log('[VenueFlow] Starting initialization...');
    const config = _getConfig();

    _updateSplash(10, 'Loading preferences...');
    AccessibilityService.initialize();

    _updateSplash(25, 'Connecting live data...');
    await FirebaseService.initialize(config.FIREBASE_CONFIG);

    _updateSplash(40, 'Starting AI assistant...');
    GeminiService.initialize(config.GEMINI_API_KEY, config.VENUE);

    _updateSplash(55, 'Enabling notifications...');
    NotificationService.initialize();

    _updateSplash(65, 'Syncing crowd data...');
    _setupDataListeners();

    _updateSplash(75, 'Building interface...');
    _renderInitialUI();

    _updateSplash(85, 'Starting match engine...');
    EventEngine.start(6000);
    _setupEventEngine();

    _updateSplash(92, 'Loading venue map...');
    MapsService.initialize('venue-map-embed', config.VENUE);

    _updateSplash(96, 'Loading alerts...');
    const alerts = FirebaseService.getSimulatedAlerts();
    alerts.forEach(a => NotificationService.addAlert(a, false));
    NotificationService.startDemoAlerts();

    _setupRouting();
    _updateSplash(100, 'Welcome to VenueFlow!');
    state.isLoading = false;

    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) splash.classList.add('hidden');
      // Render home after splash is gone
      setTimeout(() => {
        const hash = window.location.hash.slice(1) || 'home';
        navigateTo(hash);
      }, 100);
    }, 500);

    console.log('[VenueFlow] Initialization complete ✓');
  }

  function _updateSplash(pct, text) {
    const fill = document.getElementById('splash-progress-fill');
    const st = document.getElementById('splash-status');
    if (fill) fill.style.width = pct + '%';
    if (st) st.textContent = text;
  }

  /* ==========================================
     Event Engine Integration
     ========================================== */

  function _setupEventEngine() {
    EventEngine.onEvent('matchUpdate', (matchState) => {
      state.matchState = matchState;
      state.currentPhase = matchState.phase;
      // Update home scoreboard if visible
      if (state.activeTab === 'home') _updateScoreboard();
    });

    EventEngine.onEvent('phaseChange', (info) => {
      state.currentPhase = info.phase;
      NotificationService.addAlert({
        type: info.phase === 'break' ? 'warning' : 'info',
        title: '🏏 ' + info.label,
        message: info.phase === 'break'
          ? 'Innings break! Great time to grab food or visit restrooms.'
          : 'The match continues. Enjoy!'
      });
    });

    EventEngine.onEvent('highlight', (info) => {
      NotificationService.addAlert({
        type: info.type === 'wicket' ? 'warning' : info.type === 'milestone' ? 'deal' : 'info',
        title: info.title,
        message: info.message
      });
      // Update live commentary on home
      if (state.activeTab === 'home') _updateCommentary(info);
    });
  }

  /* ==========================================
     Data Listeners
     ========================================== */

  function _setupDataListeners() {
    FirebaseService.onData('crowdUpdate', (data) => {
      state.crowdData = data;
      HeatmapEngine.updateData(data);
      if (state.activeTab === 'waits') _renderWaitsPanel();
      if (state.activeTab === 'crowd') _renderCrowdPanel();
      if (state.activeTab === 'home') _updateHomeCrowdPreview();
    });

    NotificationService.onAlert(() => {
      _updateAlertBadge();
      if (state.activeTab === 'alerts') _renderAlertsPanel();
    });
  }

  /* ==========================================
     Routing
     ========================================== */

  function _setupRouting() {
    window.addEventListener('hashchange', () => {
      navigateTo(window.location.hash.slice(1) || 'home');
    });
  }

  function navigateTo(tabId) {
    const tab = TABS.find(t => t.id === tabId);
    if (!tab) return;
    state.activeTab = tabId;

    if (window.location.hash !== '#' + tabId) {
      history.replaceState(null, '', '#' + tabId);
    }

    document.querySelectorAll('.nav-tab').forEach(t => {
      const active = t.dataset.tab === tabId;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active);
    });
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.toggle('active', p.id === 'panel-' + tabId);
    });

    switch (tabId) {
      case 'home': _renderHomePanel(); break;
      case 'crowd': _renderCrowdPanel(); break;
      case 'waits': _renderWaitsPanel(); break;
      case 'map': _renderMapPanel(); break;
      case 'assistant': _renderAssistantPanel(); break;
      case 'alerts':
        _renderAlertsPanel();
        NotificationService.markAllRead();
        _updateAlertBadge();
        break;
      case 'settings': _renderSettingsPanel(); break;
    }
    VenueUtils.announceToScreenReader('Navigated to ' + tab.label);
  }

  /* ==========================================
     Initial UI
     ========================================== */

  function _renderInitialUI() {
    const nav = document.getElementById('nav-tabs');
    if (!nav) return;

    nav.innerHTML = TABS.map(t => `
      <button class="nav-tab ${t.id === 'home' ? 'active' : ''}"
              data-tab="${t.id}" role="tab"
              aria-selected="${t.id === 'home'}"
              aria-controls="panel-${t.id}"
              id="tab-${t.id}">
        <span class="tab-icon" aria-hidden="true">${t.icon}</span>
        <span class="tab-label">${t.label}</span>
        ${t.id === 'alerts' ? '<span class="tab-badge" id="alert-badge" style="display:none;">0</span>' : ''}
      </button>
    `).join('');

    nav.querySelectorAll('.nav-tab').forEach(t => {
      t.addEventListener('click', () => navigateTo(t.dataset.tab));
    });

    nav.addEventListener('keydown', (e) => {
      const tabs = [...nav.querySelectorAll('.nav-tab')];
      const idx = tabs.indexOf(document.activeElement);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        tabs[(idx + 1) % tabs.length].focus();
        tabs[(idx + 1) % tabs.length].click();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        tabs[(idx - 1 + tabs.length) % tabs.length].focus();
        tabs[(idx - 1 + tabs.length) % tabs.length].click();
      }
    });

    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const t = AccessibilityService.cycleTheme();
        themeBtn.querySelector('.btn-icon').textContent = { dark: '🌙', light: '☀️', 'high-contrast': '🔳' }[t] || '🌙';
      });
    }
  }

  /* ==========================================
     HOME PANEL — The Star of the Show
     ========================================== */

  function _renderHomePanel() {
    const panel = document.getElementById('panel-home');
    if (!panel) return;

    const ms = state.matchState || EventEngine.getMatchState();
    const data = state.crowdData;
    const overallDensity = Object.keys(data).length ? HeatmapEngine.calculateOverallDensity(data) : 0;
    const congested = Object.keys(data).length ? HeatmapEngine.getCongestedZones(data, 70) : [];
    const totalAttendees = Object.values(data)
      .filter(d => d.type === 'seating')
      .reduce((sum, d) => sum + (d.currentCount || 0), 0);

    panel.innerHTML = `
      <!-- LIVE SCOREBOARD HERO -->
      <div class="scoreboard-hero" id="scoreboard-hero">
        <div class="scoreboard-header">
          <div class="match-badge">
            <span class="live-dot"></span>
            <span>LIVE — ${VenueUtils.sanitizeHTML(ms.matchTitle)}</span>
          </div>
          <div class="match-venue-info">${VenueUtils.sanitizeHTML(ms.venue)}</div>
        </div>
        <div class="scoreboard-body">
          <div class="team-score-main">
            <div class="team-flag">🇮🇳</div>
            <div class="team-info-block">
              <div class="team-name-lg">${VenueUtils.sanitizeHTML(ms.teamBatting)}</div>
              <div class="score-big">${ms.score.runs}<span class="score-wickets">/${ms.score.wickets}</span></div>
              <div class="score-overs">Overs: ${ms.overs} · RR: ${ms.runRate}</div>
            </div>
          </div>
          <div class="score-divider">vs</div>
          <div class="team-score-main opponent">
            <div class="team-flag">🇦🇺</div>
            <div class="team-info-block">
              <div class="team-name-lg">${VenueUtils.sanitizeHTML(ms.teamBowling)}</div>
              <div class="score-secondary">Yet to bat</div>
            </div>
          </div>
        </div>
        <div class="scoreboard-batsmen">
          ${ms.batsmen.map(b => `
            <div class="batsman-row ${b.isStriker ? 'striker' : ''}">
              <span class="batsman-name">${b.isStriker ? '🏏 ' : ''}${VenueUtils.sanitizeHTML(b.name)}</span>
              <span class="batsman-stats">${b.runs} (${b.balls}) · ${b.fours}×4 ${b.sixes}×6</span>
            </div>
          `).join('')}
          <div class="bowler-row">
            <span class="bowler-label">🎯 ${VenueUtils.sanitizeHTML(ms.bowler.name)}</span>
            <span class="bowler-stats">${ms.bowler.overs}-${ms.bowler.maidens}-${ms.bowler.runs}-${ms.bowler.wickets}</span>
          </div>
        </div>
        <div class="recent-balls" id="recent-balls">
          <span class="recent-label">Recent: </span>
          ${ms.recentBalls.slice(-12).map(b => `<span class="ball-chip ${_ballClass(b)}">${b}</span>`).join('')}
        </div>
      </div>

      <!-- LIVE COMMENTARY -->
      <div class="commentary-strip" id="commentary-strip">
        <div class="commentary-icon">📺</div>
        <div class="commentary-text" id="commentary-text">
          Partnership: ${ms.partnerships} runs · Last wicket: ${VenueUtils.sanitizeHTML(ms.lastWicket)}
        </div>
      </div>

      <!-- QUICK STATS ROW -->
      <div class="home-stats-row">
        <div class="home-stat-card">
          <div class="home-stat-icon">👥</div>
          <div class="home-stat-value">${VenueUtils.formatNumber(totalAttendees || 108000)}</div>
          <div class="home-stat-label">In Stadium</div>
        </div>
        <div class="home-stat-card">
          <div class="home-stat-icon glow-${overallDensity > 70 ? 'red' : overallDensity > 40 ? 'yellow' : 'green'}">🔥</div>
          <div class="home-stat-value" style="color: ${VenueUtils.getDensityColor(overallDensity)}">${Math.round(overallDensity)}%</div>
          <div class="home-stat-label">Crowd Level</div>
        </div>
        <div class="home-stat-card">
          <div class="home-stat-icon">⚠️</div>
          <div class="home-stat-value">${congested.length}</div>
          <div class="home-stat-label">Congested</div>
        </div>
        <div class="home-stat-card">
          <div class="home-stat-icon">🌡️</div>
          <div class="home-stat-value">${ms.weather.temp}°</div>
          <div class="home-stat-label">${ms.weather.condition}</div>
        </div>
      </div>

      <!-- QUICK ACTIONS GRID -->
      <div class="section-header">
        <h2 class="section-title">Quick Actions</h2>
        <span class="section-hint">Tap any action for instant help</span>
      </div>
      <div class="quick-actions-grid">
        ${_renderQuickAction('🍔', 'Find Food', 'Nearest food courts', '#waits')}
        ${_renderQuickAction('🚻', 'Restrooms', 'Shortest queue nearby', '#waits')}
        ${_renderQuickAction('🗺️', 'Navigate', 'Interactive venue map', '#map')}
        ${_renderQuickAction('🤖', 'Ask AI', 'Get smart assistance', '#assistant')}
        ${_renderQuickAction('🔥', 'Crowd Map', 'Live density heatmap', '#crowd')}
        ${_renderQuickAction('🚪', 'Exit Routes', 'Fastest gate to leave', '#assistant')}
        ${_renderQuickAction('🏥', 'First Aid', 'Medical assistance', '#map')}
        ${_renderQuickAction('📢', 'Alerts', 'Live notifications', '#alerts')}
      </div>

      <!-- TOP WAIT TIMES PREVIEW -->
      <div class="section-header">
        <h2 class="section-title">Current Wait Times</h2>
        <button class="section-link" onclick="VenueFlowApp.navigateTo('waits')">View All →</button>
      </div>
      <div class="home-waits-preview" id="home-waits-preview">
        ${_renderHomeWaitsPreview()}
      </div>

      <!-- CROWD PREVIEW -->
      <div class="section-header">
        <h2 class="section-title">Crowd Status</h2>
        <button class="section-link" onclick="VenueFlowApp.navigateTo('crowd')">View Map →</button>
      </div>
      <div class="home-crowd-preview" id="home-crowd-preview">
        ${_renderHomeCrowdPreview()}
      </div>

      <!-- VENUE INFO CARD -->
      <div class="venue-info-card">
        <div class="venue-info-header">
          <span class="venue-info-icon">🏟️</span>
          <div>
            <div class="venue-info-name">Narendra Modi Stadium</div>
            <div class="venue-info-sub">Ahmedabad, Gujarat · Capacity: 1,32,000</div>
          </div>
        </div>
        <div class="venue-info-details">
          <div class="venue-detail"><span>⏰</span> Started: ${ms.startTime}</div>
          <div class="venue-detail"><span>🌤️</span> ${ms.weather.condition}, ${ms.weather.temp}°C, Humidity ${ms.weather.humidity}%</div>
          <div class="venue-detail"><span>💨</span> Wind: ${ms.weather.wind}</div>
          <div class="venue-detail"><span>🎫</span> Toss: ${VenueUtils.sanitizeHTML(ms.toss)}</div>
        </div>
      </div>
    `;

    // Wire up quick actions
    panel.querySelectorAll('.quick-action-card').forEach(card => {
      card.addEventListener('click', () => {
        const href = card.dataset.href;
        if (href && href.startsWith('#')) {
          navigateTo(href.slice(1));
        }
      });
    });
  }

  function _renderQuickAction(icon, title, desc, href) {
    return `
      <button class="quick-action-card" data-href="${href}" aria-label="${title}: ${desc}">
        <div class="qa-icon">${icon}</div>
        <div class="qa-title">${title}</div>
        <div class="qa-desc">${desc}</div>
      </button>
    `;
  }

  function _renderHomeWaitsPreview() {
    if (!state.crowdData || Object.keys(state.crowdData).length === 0) {
      return '<div class="skeleton-bar" style="height:60px;"></div>'.repeat(3);
    }
    const estimates = WaitEstimator.estimateAllWaitTimes(state.crowdData, state.currentPhase);
    const top = estimates.filter(e => ['food', 'restroom', 'merchandise'].includes(e.type)).slice(0, 4);
    const icons = { food: '🍔', restroom: '🚻', merchandise: '🛍️', gate: '🚪' };

    return top.map(e => `
      <div class="hwait-item">
        <div class="hwait-icon">${icons[e.type] || '📍'}</div>
        <div class="hwait-info">
          <div class="hwait-name">${VenueUtils.sanitizeHTML(e.name)}</div>
          <div class="hwait-bar-track">
            <div class="hwait-bar-fill" style="width:${Math.min(100, e.density)}%;background:${e.densityLevel.color};"></div>
          </div>
        </div>
        <div class="hwait-time" style="color:${e.densityLevel.color}">~${VenueUtils.formatWaitTime(e.waitMinutes)}</div>
      </div>
    `).join('');
  }

  function _renderHomeCrowdPreview() {
    if (!state.crowdData || Object.keys(state.crowdData).length === 0) {
      return '<div class="skeleton-bar" style="height:40px;"></div>'.repeat(3);
    }
    const congested = HeatmapEngine.getCongestedZones(state.crowdData, 60);
    const quiet = Object.entries(state.crowdData)
      .filter(([, d]) => d.density < 35)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => a.density - b.density)
      .slice(0, 3);

    let html = '';
    if (congested.length > 0) {
      html += `<div class="crowd-preview-section">
        <div class="crowd-preview-label danger">🔴 Busy Areas</div>
        ${congested.slice(0, 3).map(z => `
          <div class="crowd-preview-item">
            <span class="cpi-name">${VenueUtils.sanitizeHTML(z.name)}</span>
            <span class="cpi-density" style="color:${VenueUtils.getDensityColor(z.density)}">${Math.round(z.density)}%</span>
          </div>
        `).join('')}
      </div>`;
    }
    if (quiet.length > 0) {
      html += `<div class="crowd-preview-section">
        <div class="crowd-preview-label success">🟢 Quiet Areas</div>
        ${quiet.map(z => `
          <div class="crowd-preview-item">
            <span class="cpi-name">${VenueUtils.sanitizeHTML(z.name)}</span>
            <span class="cpi-density" style="color:${VenueUtils.getDensityColor(z.density)}">${Math.round(z.density)}%</span>
          </div>
        `).join('')}
      </div>`;
    }
    return html || '<div style="padding:12px;color:var(--text-tertiary);">Loading crowd data...</div>';
  }

  function _updateScoreboard() {
    const ms = state.matchState;
    if (!ms) return;
    // Efficiently update only changing parts
    const hero = document.getElementById('scoreboard-hero');
    if (!hero) return;

    const scoreBig = hero.querySelector('.score-big');
    if (scoreBig) scoreBig.innerHTML = `${ms.score.runs}<span class="score-wickets">/${ms.score.wickets}</span>`;

    const overs = hero.querySelector('.score-overs');
    if (overs) overs.textContent = `Overs: ${ms.overs} · RR: ${ms.runRate}`;

    // Update batsmen
    const batsmenRows = hero.querySelectorAll('.batsman-row');
    ms.batsmen.forEach((b, i) => {
      if (batsmenRows[i]) {
        batsmenRows[i].className = 'batsman-row' + (b.isStriker ? ' striker' : '');
        batsmenRows[i].querySelector('.batsman-name').textContent = (b.isStriker ? '🏏 ' : '') + b.name;
        batsmenRows[i].querySelector('.batsman-stats').textContent = `${b.runs} (${b.balls}) · ${b.fours}×4 ${b.sixes}×6`;
      }
    });

    // Update bowler
    const bowlerStats = hero.querySelector('.bowler-stats');
    if (bowlerStats) bowlerStats.textContent = `${ms.bowler.overs}-${ms.bowler.maidens}-${ms.bowler.runs}-${ms.bowler.wickets}`;

    // Update recent balls
    const ballsContainer = document.getElementById('recent-balls');
    if (ballsContainer) {
      ballsContainer.innerHTML = `<span class="recent-label">Recent: </span>` +
        ms.recentBalls.slice(-12).map(b => `<span class="ball-chip ${_ballClass(b)}">${b}</span>`).join('');
    }
  }

  function _updateCommentary(info) {
    const el = document.getElementById('commentary-text');
    if (el) {
      el.style.animation = 'none';
      void el.offsetHeight; // force reflow
      el.style.animation = 'slideInRight 0.4s ease-out';
      el.textContent = info.commentary || info.message;
    }
  }

  function _updateHomeCrowdPreview() {
    const el = document.getElementById('home-crowd-preview');
    if (el) el.innerHTML = _renderHomeCrowdPreview();
    const wEl = document.getElementById('home-waits-preview');
    if (wEl) wEl.innerHTML = _renderHomeWaitsPreview();
  }

  function _ballClass(b) {
    if (b === '4') return 'ball-four';
    if (b === '6') return 'ball-six';
    if (b === 'W') return 'ball-wicket';
    if (b === '0') return 'ball-dot';
    if (b === 'WD' || b === 'NB') return 'ball-extra';
    return 'ball-run';
  }

  /* ==========================================
     CROWD PANEL — Redesigned
     ========================================== */

  function _renderCrowdPanel() {
    const body = document.getElementById('crowd-body');
    if (!body) return;

    const data = state.crowdData;
    const zones = HeatmapEngine.getHottestZones(data);
    const overall = HeatmapEngine.calculateOverallDensity(data);
    const congested = HeatmapEngine.getCongestedZones(data, 70);
    const quiet = zones.filter(z => z.density < 30);
    const filter = state.crowdFilter;

    // Filter zones
    const filteredZones = filter === 'all' ? zones
      : filter === 'busy' ? zones.filter(z => z.density > 60)
      : filter === 'quiet' ? zones.filter(z => z.density < 40)
      : zones.filter(z => z.type === filter);

    body.innerHTML = `
      <!-- Density Bar -->
      <div class="heatmap-legend">
        <span class="heatmap-label">Low</span>
        <div class="heatmap-gradient-bar"></div>
        <span class="heatmap-label">Critical</span>
      </div>

      <!-- Summary Cards -->
      <div class="crowd-summary-grid">
        <div class="crowd-summary-card">
          <div class="cs-circle" style="border-color:${VenueUtils.getDensityColor(overall)}">
            <span style="color:${VenueUtils.getDensityColor(overall)}">${Math.round(overall)}%</span>
          </div>
          <div class="cs-label">Overall</div>
        </div>
        <div class="crowd-summary-card">
          <div class="cs-value danger-text">${congested.length}</div>
          <div class="cs-label">Congested Zone${congested.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="crowd-summary-card">
          <div class="cs-value success-text">${quiet.length}</div>
          <div class="cs-label">Quiet Zone${quiet.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="crowd-summary-card">
          <div class="cs-value">${Object.keys(data).length}</div>
          <div class="cs-label">Total Zones</div>
        </div>
      </div>

      <!-- Heatmap Canvas -->
      <div class="heatmap-container">
        <canvas id="heatmap-canvas"></canvas>
      </div>

      <!-- Filter Tabs -->
      <div class="crowd-filter-tabs" role="tablist" aria-label="Filter zones">
        ${['all', 'busy', 'quiet', 'food', 'restroom', 'gate'].map(f => `
          <button class="filter-tab ${filter === f ? 'active' : ''}" data-filter="${f}"
                  role="tab" aria-selected="${filter === f}">
            ${f === 'all' ? '📋 All' : f === 'busy' ? '🔴 Busy' : f === 'quiet' ? '🟢 Quiet'
              : f === 'food' ? '🍔 Food' : f === 'restroom' ? '🚻 WC' : '🚪 Gates'}
          </button>
        `).join('')}
      </div>

      <!-- Zone List -->
      <div class="crowd-zone-list" role="list" aria-label="Zone density list">
        ${filteredZones.length === 0
          ? '<div class="empty-filter">No zones match this filter.</div>'
          : filteredZones.map((z, i) => _renderCrowdZoneCard(z, i)).join('')}
      </div>
    `;

    // Wire up filters
    body.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.crowdFilter = btn.dataset.filter;
        _renderCrowdPanel();
      });
    });

    // Re-init heatmap
    HeatmapEngine.destroy();
    HeatmapEngine.initialize('heatmap-canvas');
    HeatmapEngine.updateData(data);
  }

  function _renderCrowdZoneCard(zone, index) {
    const level = VenueUtils.getDensityLevel(zone.density);
    const trendIcon = zone.trend === 'increasing' ? '↑' : zone.trend === 'decreasing' ? '↓' : '→';
    const trendClass = zone.trend === 'increasing' ? 'trend-up' : zone.trend === 'decreasing' ? 'trend-down' : 'trend-stable';
    const typeIcons = { food: '🍔', restroom: '🚻', gate: '🚪', merchandise: '🛍️', seating: '💺', parking: '🅿️', first_aid: '🏥', atm: '🏧' };
    const alt = WaitEstimator.findBestAlternative(zone.id, state.crowdData);

    return `
      <div class="crowd-zone-card" role="listitem" style="animation-delay:${index * 0.03}s">
        <div class="czc-header">
          <div class="czc-icon">${typeIcons[zone.type] || '📍'}</div>
          <div class="czc-info">
            <div class="czc-name">${VenueUtils.sanitizeHTML(zone.name)}</div>
            <div class="czc-type">${zone.type ? zone.type.charAt(0).toUpperCase() + zone.type.slice(1) : 'Zone'}</div>
          </div>
          <div class="czc-density">
            <span class="czc-density-val" style="color:${level.color}">${Math.round(zone.density)}%</span>
            <span class="czc-trend ${trendClass}">${trendIcon}</span>
          </div>
        </div>
        <div class="czc-bar">
          <div class="czc-bar-fill" style="width:${Math.round(zone.density)}%;background:${level.color};"></div>
        </div>
        ${alt && zone.density > 60 ? `
          <div class="czc-alt">
            💡 Try <strong>${VenueUtils.sanitizeHTML(alt.name)}</strong> instead — only ${Math.round(alt.density)}% full
          </div>
        ` : ''}
      </div>
    `;
  }

  /* ==========================================
     WAIT TIMES PANEL
     ========================================== */

  function _renderWaitsPanel() {
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

  function _renderWaitCard(est, index) {
    const gp = WaitEstimator.calculateGaugePercent(est.waitMinutes, 25);
    const circ = 2 * Math.PI * 48;
    const off = circ - (gp / 100) * circ;
    const color = est.densityLevel.color;
    const icons = { food: '🍔', restroom: '🚻', merchandise: '🛍️', gate: '🚪', parking: '🅿️', first_aid: '🏥', atm: '🏧' };
    const alt = WaitEstimator.findBestAlternative(est.zoneId, state.crowdData);

    return `
      <div class="wait-card" style="animation-delay:${index * 0.04}s"
           role="article" aria-label="${VenueUtils.sanitizeHTML(est.name)}, wait ${VenueUtils.formatWaitTime(est.waitMinutes)}">
        <div class="gauge-container">
          <svg class="gauge-svg" viewBox="0 0 108 108">
            <circle class="gauge-bg" cx="54" cy="54" r="48"/>
            <circle class="gauge-fill" cx="54" cy="54" r="48" stroke="${color}"
                    stroke-dasharray="${circ}" stroke-dashoffset="${off}"/>
          </svg>
          <div class="gauge-text">
            <div class="gauge-value" style="color:${color}">${VenueUtils.formatWaitTime(est.waitMinutes)}</div>
            <div class="gauge-unit">wait</div>
          </div>
        </div>
        <div class="wait-name">${icons[est.type] || '📍'} ${VenueUtils.sanitizeHTML(est.name)}</div>
        <div class="wait-status" style="color:${color}">${est.densityLevel.label} · ${est.density}%</div>
        <div class="wait-recommendation">${VenueUtils.sanitizeHTML(est.recommendation.text)}</div>
        ${alt && est.density > 55 ? `
          <div class="wait-alt">
            💡 <strong>${VenueUtils.sanitizeHTML(alt.name)}</strong> — ${Math.round(alt.density)}% density
          </div>
        ` : ''}
      </div>
    `;
  }

  /* ==========================================
     MAP PANEL
     ========================================== */

  function _renderMapPanel() {
    // Map is already in the DOM; just trigger resize
    if (typeof google !== 'undefined' && google.maps) {
      google.maps.event.trigger(document.getElementById('venue-map-embed'), 'resize');
    }
  }

  /* ==========================================
     SMART PLAN PANEL (AI Tab)
     ========================================== */

  function _renderAssistantPanel() {
    const panel = document.getElementById('panel-assistant');
    if (!panel) return;

    const plan = SmartAdvisor.generateVenuePlan(
      state.crowdData, state.currentPhase, state.matchState, 'north_stand'
    );

    const POI_NAMES = {
      gate_north: 'Gate A (North)', gate_south: 'Gate B (South)', gate_east: 'Gate C (East)', gate_west: 'Gate D (West)',
      food_court_a: 'Food Court A', food_court_b: 'Food Court B', food_court_c: 'Food Court C',
      restroom_n1: 'WC N1', restroom_n2: 'WC N2', restroom_s1: 'WC S1', restroom_s2: 'WC S2',
      merch_store: 'Merchandise', first_aid_center: 'First Aid', north_stand: 'North Stand',
      south_stand: 'South Stand', east_pavilion: 'East Pavilion', west_pavilion: 'West Pavilion',
      vip_lounge: 'VIP Lounge', parking_a: 'Parking A', parking_b: 'Parking B',
      info_desk: 'Info Desk', atm_1: 'ATM'
    };

    panel.innerHTML = `
      <div class="panel-header">
        <h1 class="panel-title">🧠 Smart Venue Plan</h1>
        <p class="panel-subtitle">AI-optimized recommendations based on live crowd data, walking distances, and trends.</p>
      </div>
      <div class="plan-location-bar">
        <span>📍 Your location: <strong>North Stand</strong></span>
        <span class="plan-timestamp">Updated ${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="plan-sections">
        ${plan.sections.map(s => _renderPlanSection(s, POI_NAMES)).join('')}
      </div>

      <!-- AI Chat below the plan -->
      <div class="section-header" style="margin-top:var(--space-4);">
        <h2 class="section-title">💬 Ask AI Assistant</h2>
      </div>
      <div class="ai-chat-compact">
        <div class="chat-messages-compact" id="chat-messages" role="log" aria-live="polite">
          <div class="chat-msg-compact assistant">
            <span class="chat-tag">AI</span>
            <span>Need specific help? Ask me about any facility, route, or strategy.</span>
          </div>
        </div>
        <div class="chat-input-container">
          <div class="chat-input-wrapper">
            <textarea class="chat-input" id="chat-input" placeholder="e.g. quickest route to food from east pavilion?"
                      rows="1" aria-label="Message" maxlength="500"></textarea>
            <button class="chat-send-btn" id="btn-send-chat" aria-label="Send" disabled>➤</button>
          </div>
        </div>
      </div>

      <button class="btn btn-secondary" style="width:100%;margin-top:var(--space-3);"
              onclick="VenueFlowApp.refreshPlan()">🔄 Refresh Plan</button>
    `;
    _setupChatHandlers();
  }

  function _renderPlanSection(section, names) {
    if (section.id === 'forecast') {
      return `
        <div class="plan-card plan-forecast">
          <div class="plan-card-header">
            <span class="plan-icon">${section.icon}</span>
            <span class="plan-card-title">${section.title}</span>
          </div>
          <div class="plan-forecast-summary">${section.summary}</div>
          ${section.hotspots.length > 0 ? `
            <div class="plan-hotspot-list">
              ${section.hotspots.map(h => `
                <div class="plan-hotspot">
                  <span class="ph-name">${VenueUtils.sanitizeHTML(h.name)}</span>
                  <span class="ph-current" style="color:${VenueUtils.getDensityColor(h.current)}">${h.current}%</span>
                  <span class="ph-arrow">→</span>
                  <span class="ph-predicted" style="color:${VenueUtils.getDensityColor(h.predicted)}">${h.predicted}%</span>
                  <span class="ph-reason">${VenueUtils.sanitizeHTML(h.reasoning)}</span>
                </div>
              `).join('')}
            </div>
          ` : '<div style="color:var(--text-tertiary);font-size:var(--font-size-sm);padding:8px 0;">All zones comfortable ✅</div>'}
        </div>
      `;
    }

    const route = section.route;
    const routeStr = route && route.path
      ? route.path.map(p => names[p] || p).join(' → ')
      : '';

    return `
      <div class="plan-card">
        <div class="plan-card-header">
          <span class="plan-icon">${section.icon}</span>
          <span class="plan-card-title">${section.title}</span>
          <span class="plan-score" title="Recommendation score (lower = better)">Score: ${section.score}</span>
        </div>
        <div class="plan-recommendation">
          <div class="plan-rec-name">${VenueUtils.sanitizeHTML(section.recommendation)}</div>
          <div class="plan-rec-stats">
            <span class="prs" style="color:${VenueUtils.getDensityColor(section.density)}">
              ${section.density}% density
            </span>
            ${section.waitTime !== undefined ? `<span class="prs">⏱ ~${VenueUtils.formatWaitTime(section.waitTime)} wait</span>` : ''}
            ${section.walkTime !== null ? `<span class="prs">🚶 ${section.walkTime} min walk</span>` : ''}
            ${section.totalTime ? `<span class="prs total">📊 ${VenueUtils.formatWaitTime(section.totalTime)} total</span>` : ''}
          </div>
        </div>
        ${routeStr ? `<div class="plan-route"><span class="plan-route-label">Route:</span> ${routeStr}</div>` : ''}
        ${section.forecast ? `
          <div class="plan-forecast-inline">
            📈 15 min forecast: ${section.forecast.predicted}% (${section.forecast.confidence} confidence) — ${section.forecast.reasoning}
          </div>
        ` : ''}
        ${section.tip ? `<div class="plan-tip">💡 ${section.tip}</div>` : ''}
        ${section.alternatives && section.alternatives.length > 0 ? `
          <div class="plan-alternatives">
            <div class="plan-alt-label">Alternatives:</div>
            ${section.alternatives.map(a => `
              <div class="plan-alt-item">
                <span>${VenueUtils.sanitizeHTML(a.name)}</span>
                <span style="color:${VenueUtils.getDensityColor(a.density)}">${a.density}%</span>
                ${a.totalTime ? `<span class="plan-alt-time">${VenueUtils.formatWaitTime(a.totalTime)}</span>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function refreshPlan() {
    _renderAssistantPanel();
    VenueUtils.announceToScreenReader('Smart Plan refreshed with latest data');
  }

  function _setupChatHandlers() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send-chat');
    if (!input || !sendBtn) return;

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.value.trim()) _sendChat(input.value.trim()); }
    });
    sendBtn.addEventListener('click', () => { if (input.value.trim()) _sendChat(input.value.trim()); });
  }

  async function _sendChat(msg) {
    const container = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send-chat');
    if (!container || !input) return;

    container.innerHTML += `<div class="chat-msg-compact user"><span class="chat-tag">You</span><span>${VenueUtils.sanitizeHTML(msg)}</span></div>`;
    input.value = ''; input.style.height = 'auto'; sendBtn.disabled = true;

    const tid = VenueUtils.generateId('t');
    container.innerHTML += `<div class="chat-msg-compact assistant" id="${tid}"><span class="chat-tag">AI</span><span class="typing-dots">...</span></div>`;
    container.scrollTop = container.scrollHeight;

    const context = { crowdData: state.crowdData, eventPhase: state.currentPhase, matchState: state.matchState };
    const response = await GeminiService.sendMessage(msg, context);

    const te = document.getElementById(tid); if (te) te.remove();
    const formatted = VenueUtils.sanitizeHTML(response)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/- (.*?)(?:<br>|$)/g, '• $1<br>');
    container.innerHTML += `<div class="chat-msg-compact assistant"><span class="chat-tag">AI</span><span>${formatted}</span></div>`;
    container.scrollTop = container.scrollHeight;
  }

  /* ==========================================
     ALERTS PANEL
     ========================================== */

  function _renderAlertsPanel() {
    const body = document.getElementById('alerts-body');
    if (!body) return;
    const alerts = NotificationService.getAlerts();

    if (alerts.length === 0) {
      body.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📢</div><div class="empty-state-title">No alerts yet</div><div class="empty-state-text">Real-time venue updates will appear here.</div></div>';
      return;
    }

    body.innerHTML = `<div class="alerts-list" role="list">${alerts.map(a => `
      <div class="alert-card ${a.read ? '' : 'unread'}" role="listitem">
        <div class="alert-icon ${a.type}">${a.type === 'info' ? 'ℹ️' : a.type === 'warning' ? '⚠️' : a.type === 'deal' ? '🎉' : '🚨'}</div>
        <div class="alert-content">
          <div class="alert-title">${VenueUtils.sanitizeHTML(a.title)}</div>
          <div class="alert-text">${VenueUtils.sanitizeHTML(a.message)}</div>
          <div class="alert-time">${VenueUtils.formatRelativeTime(a.timestamp)}</div>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function _updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    if (!badge) return;
    const count = NotificationService.getUnreadCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  /* ==========================================
     SETTINGS PANEL
     ========================================== */

  function _renderSettingsPanel() {
    const body = document.getElementById('settings-body');
    if (!body) return;
    const s = AccessibilityService.getSettings();

    body.innerHTML = `
      <div class="settings-section">
        <div class="settings-title">Appearance</div>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">Theme</div>
            <div class="settings-item-desc">Current: ${s.theme}</div>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn-secondary ${s.theme === 'dark' ? 'btn-primary' : ''}" onclick="VenueFlowApp.setTheme('dark')">🌙</button>
            <button class="btn btn-secondary ${s.theme === 'light' ? 'btn-primary' : ''}" onclick="VenueFlowApp.setTheme('light')">☀️</button>
            <button class="btn btn-secondary ${s.theme === 'high-contrast' ? 'btn-primary' : ''}" onclick="VenueFlowApp.setTheme('high-contrast')">🔳</button>
          </div>
        </div>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">Font Size</div>
            <div class="settings-item-desc" id="font-size-display">${s.fontSize}%</div>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn-secondary" onclick="VenueFlowApp.decreaseFontSize()">A-</button>
            <button class="btn btn-secondary" onclick="VenueFlowApp.resetFontSize()">A</button>
            <button class="btn btn-secondary" onclick="VenueFlowApp.increaseFontSize()">A+</button>
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
          <label class="toggle"><input type="checkbox" ${s.reducedMotion ? 'checked' : ''} onchange="VenueFlowApp.setReducedMotion(this.checked)"><span class="toggle-slider"></span></label>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-title">Match Simulation</div>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">Live Engine</div>
            <div class="settings-item-desc">Ball-by-ball simulation driving real-time data</div>
          </div>
          <span style="color:var(--color-success);font-weight:700;">● Running</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-title">About VenueFlow</div>
        <div class="settings-item" style="flex-direction:column;align-items:flex-start;gap:var(--space-2);">
          <div class="settings-item-desc" style="line-height:1.7;">
            VenueFlow uses AI to enhance the physical event experience at large-scale sporting venues.<br><br>
            <strong>Google Services:</strong><br>
            • Google Maps JS API — Venue navigation<br>
            • Google Gemini AI — Smart assistant<br>
            • Firebase Realtime Database — Live crowd data<br>
            • Firebase Auth — Anonymous sessions<br>
            • Google Fonts — Typography<br><br>
            Built for PromptWars Week 1 · Physical Event Experience
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================
     Public API
     ========================================== */

  function setTheme(t) { AccessibilityService.setTheme(t); _renderSettingsPanel(); }
  function increaseFontSize() { AccessibilityService.increaseFontSize(); const d = document.getElementById('font-size-display'); if (d) d.textContent = AccessibilityService.getSettings().fontSize + '%'; }
  function decreaseFontSize() { AccessibilityService.decreaseFontSize(); const d = document.getElementById('font-size-display'); if (d) d.textContent = AccessibilityService.getSettings().fontSize + '%'; }
  function resetFontSize() { AccessibilityService.setFontSize(100); const d = document.getElementById('font-size-display'); if (d) d.textContent = '100%'; }
  function setReducedMotion(e) { AccessibilityService.setReducedMotion(e); }

  return {
    init, navigateTo, refreshPlan,
    setTheme, increaseFontSize, decreaseFontSize, resetFontSize, setReducedMotion
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  VenueFlowApp.init().catch(e => console.error('[VenueFlow] Init error:', e));
});
