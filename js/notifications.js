/**
 * VenueFlow Notifications System
 * 
 * Real-time toast notifications and alert management
 * for the venue assistant.
 * 
 * @module notifications
 */

'use strict';

const NotificationService = (() => {

  /* ==========================================
     State
     ========================================== */

  let _container = null;
  let _isInitialized = false;
  let _toasts = [];
  let _alerts = [];
  let _onAlertCallback = null;

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Initialize the notification service.
   * Creates the toast container if it doesn't exist.
   */
  function initialize() {
    _container = document.getElementById('toast-container');
    if (!_container) {
      _container = VenueUtils.createElement('div', {
        id: 'toast-container',
        className: 'toast-container',
        role: 'alert',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      });
      document.body.appendChild(_container);
    }
    _isInitialized = true;
    console.log('[Notifications] Initialized');
  }

  /* ==========================================
     Toast Notifications
     ========================================== */

  /**
   * Show a toast notification.
   * 
   * @param {Object} options - Toast options
   * @param {string} options.title - Toast title
   * @param {string} [options.message] - Toast message
   * @param {string} [options.type='info'] - Type: 'info', 'warning', 'deal', 'emergency'
   * @param {number} [options.duration=5000] - Auto-dismiss timeout in ms (0 for no auto-dismiss)
   * @returns {string} Toast ID
   */
  function showToast({ title, message = '', type = 'info', duration = 5000 }) {
    if (!_container) initialize();

    const id = VenueUtils.generateId('toast');

    const iconMap = {
      info: 'ℹ️',
      warning: '⚠️',
      deal: '🎉',
      emergency: '🚨',
      success: '✅'
    };

    const toast = VenueUtils.createElement('div', {
      id,
      className: 'toast',
      role: 'alert',
      dataset: { type }
    });

    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${VenueUtils.sanitizeHTML(title)}</div>
        ${message ? `<div class="toast-text">${VenueUtils.sanitizeHTML(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss notification" data-toast-id="${id}">✕</button>
    `;

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismissToast(id));

    _container.appendChild(toast);
    _toasts.push({ id, element: toast, timeoutId: null });

    // Announce to screen reader
    VenueUtils.announceToScreenReader(`${title}. ${message}`);

    // Auto-dismiss
    if (duration > 0) {
      const timeoutId = setTimeout(() => dismissToast(id), duration);
      const toastEntry = _toasts.find(t => t.id === id);
      if (toastEntry) toastEntry.timeoutId = timeoutId;
    }

    return id;
  }

  /**
   * Dismiss a toast notification with animation.
   * @param {string} toastId - Toast ID to dismiss
   */
  function dismissToast(toastId) {
    const index = _toasts.findIndex(t => t.id === toastId);
    if (index === -1) return;

    const { element, timeoutId } = _toasts[index];
    if (timeoutId) clearTimeout(timeoutId);

    element.classList.add('removing');
    
    // Remove after animation
    setTimeout(() => {
      element.remove();
      _toasts.splice(index, 1);
    }, 300);
  }

  /**
   * Dismiss all active toasts.
   */
  function dismissAll() {
    [..._toasts].forEach(t => dismissToast(t.id));
  }

  /* ==========================================
     Alert Management
     ========================================== */

  /**
   * Add an alert to the alerts list.
   * @param {Object} alert - Alert data
   * @param {boolean} [showToast=true] - Also show as toast
   */
  function addAlert(alert, showToastNotification = true) {
    const alertEntry = {
      id: alert.id || VenueUtils.generateId('alert'),
      type: alert.type || 'info',
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp || Date.now(),
      read: alert.read || false
    };

    _alerts.unshift(alertEntry);

    // Keep max 50 alerts
    if (_alerts.length > 50) {
      _alerts = _alerts.slice(0, 50);
    }

    // Show toast for new alerts
    if (showToastNotification && !alert.read) {
      showToast({
        title: alertEntry.title,
        message: alertEntry.message,
        type: alertEntry.type,
        duration: alertEntry.type === 'emergency' ? 0 : 6000
      });
    }

    // Notify callback
    if (_onAlertCallback) {
      _onAlertCallback(alertEntry);
    }
  }

  /**
   * Get all alerts.
   * @returns {Array} Alert list
   */
  function getAlerts() {
    return [..._alerts];
  }

  /**
   * Get unread alert count.
   * @returns {number} Unread count
   */
  function getUnreadCount() {
    return _alerts.filter(a => !a.read).length;
  }

  /**
   * Mark an alert as read.
   * @param {string} alertId - Alert ID
   */
  function markAsRead(alertId) {
    const alert = _alerts.find(a => a.id === alertId);
    if (alert) alert.read = true;
  }

  /**
   * Mark all alerts as read.
   */
  function markAllRead() {
    _alerts.forEach(a => a.read = true);
  }

  /**
   * Set callback for new alerts.
   * @param {Function} callback - Handler for new alerts
   */
  function onAlert(callback) {
    _onAlertCallback = callback;
  }

  /**
   * Start simulated periodic alerts for demo.
   * Sends relevant venue alerts at intervals.
   */
  function startDemoAlerts() {
    const demoAlerts = [
      { type: 'info', title: '🏏 Match Update', message: 'End of over 15. Score: 142/3. Strategic timeout in 5 overs.' },
      { type: 'deal', title: '🍕 Happy Hour!', message: 'Buy 1 Get 1 free on snacks at Food Court C for the next 10 minutes!' },
      { type: 'warning', title: '⚠️ Crowd Alert', message: 'South Gate area congestion detected. Please use East or North gates.' },
      { type: 'info', title: '🎵 Fan Zone', message: 'DJ set starting at the North Stand fan zone in 5 minutes!' },
      { type: 'deal', title: '🛍️ Flash Sale', message: 'Limited edition match-day caps at 50% off! Available at Merchandise Store.' }
    ];

    let idx = 0;
    setInterval(() => {
      if (idx < demoAlerts.length) {
        addAlert({
          ...demoAlerts[idx],
          timestamp: Date.now()
        });
        idx++;
      } else {
        idx = 0;
      }
    }, 30000); // Every 30 seconds
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
    showToast,
    dismissToast,
    dismissAll,
    addAlert,
    getAlerts,
    getUnreadCount,
    markAsRead,
    markAllRead,
    onAlert,
    startDemoAlerts,
    isReady
  });

})();
