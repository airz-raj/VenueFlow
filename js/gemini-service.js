/**
 * VenueFlow Gemini AI Service
 * 
 * Integrates Google Gemini API for a context-aware AI assistant
 * that helps attendees with venue navigation, recommendations,
 * and real-time information.
 * 
 * Google Services: Gemini AI API
 * 
 * @module gemini-service
 */

'use strict';

const GeminiService = (() => {

  /* ==========================================
     State
     ========================================== */

  let _apiKey = null;
  let _isInitialized = false;
  let _conversationHistory = [];
  let _systemPrompt = '';

  /* ==========================================
     System Prompt
     ========================================== */

  /**
   * Build the system prompt with venue context.
   * @param {Object} venueConfig - Venue configuration
   * @returns {string} System prompt
   */
  function _buildSystemPrompt(venueConfig) {
    return `You are VenueFlow AI, a friendly and helpful smart assistant for attendees at ${venueConfig.name} in ${venueConfig.city}. 
This is a cricket stadium with a capacity of ${VenueUtils.formatNumber(venueConfig.capacity)} spectators.

Your role is to enhance the physical event experience by:
1. Helping attendees navigate the venue efficiently
2. Providing real-time crowd density and wait time information
3. Recommending the best times to visit facilities
4. Answering questions about the venue, amenities, and event
5. Providing accessibility guidance for attendees with special needs

VENUE LAYOUT:
- 4 Entry Gates: North (Gate A), South (Gate B), East (Gate C), West (Gate D)
- 3 Food Courts: North wing (A), South wing (B), East wing (C)
- 4 Restroom Blocks: N1, N2 (north side), S1, S2 (south side)
- Official Merchandise Store (west side)
- First Aid Center (central west)
- Information Desk (central)
- ATM Point (north-east)
- 2 Parking Lots: A (north), B (south)
- Seating: North Stand, South Stand, East Pavilion, West Pavilion, VIP Lounge

GUIDELINES:
- Be concise and practical in responses
- Provide specific directions (e.g., "Gate C on the east side" not just "a gate")
- When discussing crowd data, mention actual density levels
- Proactively suggest alternatives when areas are crowded
- Be warm, enthusiastic about the event, but prioritize safety
- If asked about emergencies, direct to First Aid Center or nearest security
- Keep responses to 2-3 short paragraphs maximum
- Use emojis sparingly for friendliness`;
  }

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Initialize the Gemini AI service.
   * @param {string} apiKey - Gemini API key
   * @param {Object} venueConfig - Venue configuration
   * @returns {boolean} Success status
   */
  function initialize(apiKey, venueConfig) {
    _apiKey = apiKey;
    _systemPrompt = _buildSystemPrompt(venueConfig);
    _conversationHistory = [];
    _isInitialized = true;
    console.log('[Gemini] Initialized');
    return true;
  }

  /* ==========================================
     Message Generation
     ========================================== */

  /**
   * Send a message to Gemini and get a response.
   * Falls back to intelligent local responses if API is unavailable.
   * 
   * @param {string} userMessage - User's message
   * @param {Object} [context] - Current venue context (crowd data, etc.)
   * @returns {Promise<string>} AI response
   */
  async function sendMessage(userMessage, context = {}) {
    const sanitizedMessage = VenueUtils.validateInput(userMessage, 1000);
    if (!sanitizedMessage) return "I didn't catch that. Could you please rephrase?";

    // Add to history
    _conversationHistory.push({
      role: 'user',
      content: sanitizedMessage,
      timestamp: Date.now()
    });

    // Build context-enriched prompt
    const contextPrompt = _buildContextPrompt(context);

    try {
      let response;

      if (_apiKey && _apiKey !== 'YOUR_GEMINI_API_KEY') {
        // Production: Call Gemini API
        response = await _callGeminiAPI(sanitizedMessage, contextPrompt);
      } else {
        // Simulation: Intelligent local responses
        response = await _generateLocalResponse(sanitizedMessage, context);
      }

      _conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      // Keep history manageable (last 20 turns)
      if (_conversationHistory.length > 40) {
        _conversationHistory = _conversationHistory.slice(-40);
      }

      return response;

    } catch (error) {
      console.error('[Gemini] Error:', error);
      return _generateLocalResponse(sanitizedMessage, context);
    }
  }

  /**
   * Build context enrichment for the AI prompt.
   * @param {Object} context - Current venue context
   * @returns {string} Context prompt section
   */
  function _buildContextPrompt(context) {
    const parts = [];

    if (context.crowdData) {
      const crowdedZones = Object.entries(context.crowdData)
        .filter(([, data]) => data.density > 70)
        .map(([id, data]) => `${data.name}: ${Math.round(data.density)}% (${data.trend})`)
        .join(', ');
      
      const quietZones = Object.entries(context.crowdData)
        .filter(([, data]) => data.density < 35)
        .map(([id, data]) => `${data.name}: ${Math.round(data.density)}%`)
        .join(', ');

      if (crowdedZones) parts.push(`CROWDED AREAS: ${crowdedZones}`);
      if (quietZones) parts.push(`QUIET AREAS: ${quietZones}`);
    }

    if (context.eventPhase) {
      parts.push(`CURRENT PHASE: ${context.eventPhase}`);
    }

    return parts.length > 0 ? '\n\nCURRENT REAL-TIME DATA:\n' + parts.join('\n') : '';
  }

  /**
   * Call the Gemini API via REST endpoint.
   * @param {string} message - User message
   * @param {string} contextPrompt - Context enrichment
   * @returns {Promise<string>} AI response
   */
  async function _callGeminiAPI(message, contextPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${_apiKey}`;

    const contents = [];

    // Add conversation history (last 6 turns for context window efficiency)
    const recentHistory = _conversationHistory.slice(-6);
    recentHistory.forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });

    // Current message with context
    contents.push({
      role: 'user',
      parts: [{ text: message + contextPrompt }]
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: _systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 512
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }

  /* ==========================================
     Local Response Engine (Fallback)
     ========================================== */

  /**
   * Generate intelligent local responses when API is unavailable.
   * Uses keyword matching and venue context for relevant answers.
   * 
   * @param {string} message - User message (lowercase)
   * @param {Object} context - Venue context
   * @returns {string} Generated response
   */
  function _generateLocalResponse(message, context = {}) {
    const msg = message.toLowerCase();
    const crowdData = context.crowdData || {};

    // Find the least crowded zones by type
    const findLeastCrowded = (type) => {
      return Object.entries(crowdData)
        .filter(([, d]) => d.type === type)
        .sort((a, b) => a[1].density - b[1].density);
    };

    // Greeting
    if (msg.match(/\b(hi|hello|hey|howdy|greetings)\b/)) {
      return "Hey there! 👋 Welcome to the Narendra Modi Stadium! I'm VenueFlow AI, your smart venue assistant. I can help you with:\n\n🗺️ **Navigation** – Find gates, food, restrooms\n⏱️ **Wait times** – Know before you go\n🔥 **Crowd info** – Avoid the rush\n\nWhat can I help you with?";
    }

    // Food related
    if (msg.match(/\b(food|eat|hungry|snack|drink|beverage|restaurant|court)\b/)) {
      const foodZones = findLeastCrowded('food');
      if (foodZones.length > 0) {
        const best = foodZones[0][1];
        const worst = foodZones[foodZones.length - 1][1];
        return `🍔 **Food Courts**\n\nYour best bet right now is **${best.name}** with only **${Math.round(best.density)}%** crowd density (~${Math.max(1, Math.round(best.density / 10))} min wait).\n\nI'd avoid **${worst.name}** (${Math.round(worst.density)}% crowded) for now. The north wing has great Indian cuisine options, while the south wing specializes in fast food and snacks! 🎉`;
      }
      return "🍔 There are 3 Food Courts: **A (North)** for Indian cuisine, **B (South)** for fast food, and **C (East)** for multi-cuisine. Check the Wait Times tab for current queue estimates!";
    }

    // Restroom related
    if (msg.match(/\b(restroom|bathroom|toilet|washroom|loo|wc)\b/)) {
      const restrooms = findLeastCrowded('restroom');
      if (restrooms.length > 0) {
        const best = restrooms[0][1];
        return `🚻 **Restrooms**\n\n**${best.name}** has the shortest queue right now (**${Math.round(best.density)}%** utilization, ~${Math.max(1, Math.round(best.density / 12))} min wait).\n\nThere are 4 restroom blocks: N1 & N2 on the north side, S1 & S2 on the south side. All have wheelchair-accessible facilities.`;
      }
      return "🚻 There are 4 restroom blocks around the stadium — N1 and N2 on the north side, S1 and S2 on the south side. Check the Crowd tab for real-time availability!";
    }

    // Gate / Entry related
    if (msg.match(/\b(gate|enter|entry|entrance|exit|way in|way out)\b/)) {
      const gates = findLeastCrowded('gate');
      if (gates.length > 0) {
        const best = gates[0][1];
        return `🚪 **Entry Gates**\n\n**${best.name}** currently has the least congestion (**${Math.round(best.density)}%**). I'd recommend heading there.\n\nAll 4 gates are open:\n- Gate A (North)\n- Gate B (South)\n- Gate C (East) – closest to metro\n- Gate D (West) – near VIP section`;
      }
      return "🚪 There are 4 gates: **A (North)**, **B (South)**, **C (East, closest to metro)**, and **D (West, near VIP)**. Gate C usually has shorter queues!";
    }

    // Parking
    if (msg.match(/\b(park|parking|car|vehicle|drive)\b/)) {
      return "🅿️ **Parking**\n\nThere are 2 parking areas:\n- **Parking A (North)** – Multi-level, 8000 spots. Closest to Gate A.\n- **Parking B (South)** – Open lot, 8000 spots. Use Gate B for quickest access.\n\nPro tip: If you're coming by metro, use the East Gate (Gate C) — it's the closest entrance! 🚇";
    }

    // Emergency / First Aid
    if (msg.match(/\b(emergency|first aid|medical|doctor|hurt|injury|help|ambulance|sick)\b/)) {
      return "🏥 **First Aid & Emergency**\n\nThe **First Aid Center** is located on the central west side of the stadium. It's staffed with medical professionals throughout the event.\n\n⚠️ **For emergencies**, contact the nearest security personnel or call the event helpline. Security stations are available at every gate.";
    }

    // Crowd / Density
    if (msg.match(/\b(crowd|busy|crowded|packed|empty|quiet|density|congestion)\b/)) {
      const crowded = Object.entries(crowdData)
        .filter(([, d]) => d.density > 65)
        .sort((a, b) => b[1].density - a[1].density)
        .slice(0, 3);
      
      const quiet = Object.entries(crowdData)
        .filter(([, d]) => d.density < 35)
        .sort((a, b) => a[1].density - b[1].density)
        .slice(0, 3);

      let response = "🔥 **Crowd Overview**\n\n";
      if (crowded.length > 0) {
        response += "**Busiest areas:**\n" + crowded.map(([, d]) => `- ${d.name}: ${Math.round(d.density)}% 🔴`).join('\n') + '\n\n';
      }
      if (quiet.length > 0) {
        response += "**Quietest areas:**\n" + quiet.map(([, d]) => `- ${d.name}: ${Math.round(d.density)}% 🟢`).join('\n');
      }
      return response || "Check the **Crowd** tab for real-time density information across all areas! The heatmap shows live conditions.";
    }

    // Wait time
    if (msg.match(/\b(wait|queue|line|long|how long|time)\b/)) {
      return "⏱️ **Wait Times**\n\nHead over to the **Wait Times** tab for real-time estimates at all facilities! I show predicted wait times for food courts, restrooms, merchandise, and gates.\n\n💡 **Pro tip:** Facilities on the north side are typically less crowded during the first half. Halftime is the busiest — try to visit 10 minutes before the break!";
    }

    // Merchandise
    if (msg.match(/\b(merch|merchandise|shop|store|jersey|buy|souvenir)\b/)) {
      const merchData = crowdData['merch_store'];
      const wait = merchData ? `~${Math.max(1, Math.round(merchData.density / 8))} min wait` : 'check the app';
      return `🛍️ **Official Merchandise Store**\n\nLocated on the west side of the stadium, near Gate D. Current wait: **${wait}**.\n\nThey've got official team jerseys, caps, memorabilia, and limited edition match souvenirs. Card payments accepted! 💳`;
    }

    // VIP
    if (msg.match(/\b(vip|lounge|premium|hospitality)\b/)) {
      return "✨ **VIP Lounge**\n\nThe VIP Lounge is on the west side, accessible through **Gate D**. Premium ticket holders enjoy:\n- Air-conditioned seating\n- Exclusive food & beverage service\n- Private restroom facilities\n- Dedicated parking access\n\nPlease have your VIP pass ready for verification.";
    }

    // Weather
    if (msg.match(/\b(weather|rain|sun|hot|cold|temperature)\b/)) {
      return "☀️ **Weather Update**\n\nCurrent conditions: Clear skies, 28°C. No rain expected during the match.\n\n💡 Remember to stay hydrated! Water stations are available at all gates and food courts. Sunscreen is recommended for afternoon matches.";
    }

    // Accessibility
    if (msg.match(/\b(accessible|wheelchair|disabled|disability|special needs|hearing|vision|blind)\b/)) {
      return "♿ **Accessibility**\n\nThe stadium offers full accessibility:\n- **Wheelchair access** at all 4 gates (ramped entrances)\n- **Accessible seating** in every stand section\n- **Accessible restrooms** at all 4 restroom blocks\n- **Companion seating** available\n- **Service animal** accommodations\n\nFor assistance, ask any staff member or visit the Information Desk near center court.";
    }

    // Thank you
    if (msg.match(/\b(thank|thanks|cheers|great|awesome|perfect)\b/)) {
      return "You're welcome! 😊 Enjoy the match! If you need anything else during the event — finding the quickest routes, best food spots, or avoiding crowds — I'm right here. Go team! 🏏🎉";
    }

    // Default / catch-all
    return "Great question! Here's what I can help you with at the stadium:\n\n🗺️ **\"Where's the nearest food court?\"**\n🚻 **\"Which restroom is least crowded?\"**\n🚪 **\"Best gate to enter from?\"**\n⏱️ **\"What are the current wait times?\"**\n🅿️ **\"Where can I park?\"**\n🏥 **\"Where's first aid?\"**\n\nJust ask, and I'll guide you with real-time info! 😊";
  }

  /* ==========================================
     Quick Action Suggestions
     ========================================== */

  /**
   * Get context-aware quick action chips.
   * @param {Object} [context] - Current venue context
   * @returns {Array<{label: string, query: string}>} Quick action suggestions
   */
  function getQuickActions(context = {}) {
    return [
      { label: '🍔 Best food option now', query: 'Which food court has the shortest wait right now?' },
      { label: '🚻 Nearest restroom', query: 'Which restroom is least crowded?' },
      { label: '🚪 Quickest gate', query: 'Which entry gate should I use?' },
      { label: '🔥 Crowd overview', query: 'Which areas are most and least crowded?' },
      { label: '🅿️ Parking info', query: 'Where can I park my car?' },
      { label: '🏥 First aid', query: 'Where is the first aid center?' }
    ];
  }

  /**
   * Get conversation history.
   * @returns {Array} Conversation history
   */
  function getHistory() {
    return [..._conversationHistory];
  }

  /**
   * Clear conversation history.
   */
  function clearHistory() {
    _conversationHistory = [];
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
    sendMessage,
    getQuickActions,
    getHistory,
    clearHistory,
    isReady
  });

})();
