# 🏟️ VenueFlow — AI-Powered Smart Venue Assistant

> **PromptWars Week 1 | Vertical: Physical Event Experience**

VenueFlow is an intelligent, real-time web application that transforms the physical event experience at large-scale sporting venues. It addresses critical pain points — crowd congestion, unpredictable wait times, navigation confusion, and lack of real-time coordination — through AI-driven insights and deep Google Services integration.

![VenueFlow](https://img.shields.io/badge/VenueFlow-Smart%20Venue%20Assistant-blue?style=for-the-badge)
![Google](https://img.shields.io/badge/Powered%20by-Google%20Services-4285F4?style=for-the-badge&logo=google)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📋 Challenge Details

| Item | Details |
|------|---------|
| **Vertical** | Physical Event Experience |
| **Challenge** | Design a solution that improves the physical event experience for attendees at large-scale sporting venues |
| **Demo Venue** | Narendra Modi Stadium, Ahmedabad (World's largest cricket stadium — 132,000 capacity) |
| **Tech Stack** | Vanilla HTML5 + CSS3 + JavaScript (Zero framework dependencies) |

---

## 🎯 Problem Statement

Attendees at large-scale sporting venues face recurring challenges:

- **🚶 Crowd Congestion** — Unpredictable bottlenecks at gates, concessions, and restrooms
- **⏰ Long Wait Times** — No visibility into how long queues will take
- **🗺️ Disorientation** — Unfamiliar venues with poor wayfinding
- **📡 No Real-time Info** — Delays between ground events and attendee awareness
- **♿ Accessibility Gaps** — Limited support for attendees with disabilities

---

## 💡 Solution: VenueFlow

### 1. 🏠 Live Dashboard with Match Scoreboard
- **Real-time cricket scoreboard** — Ball-by-ball simulation with live score, batsman stats, bowler figures, and run rate
- Color-coded recent balls display (4s, 6s, wickets, dots)
- Live commentary strip with match events
- Quick stats: attendees, crowd level, congested zones, weather
- **Quick Actions grid** — One-tap access to food, restrooms, map, AI, crowd, exit routes, first aid, alerts
- Wait times preview with density bars
- Crowd status preview (busy zones vs quiet zones)
- Venue information card with match details

### 2. 🔥 Live Crowd Density Heatmap
- Real-time animated crowd density visualization across 20 venue zones
- Canvas-based heatmap with color-coded density (green → red)
- **Zone filtering** — Filter by: All, Busy, Quiet, Food, Restrooms, Gates
- **Smart alternatives** — "Try Food Court C instead — only 35% full"
- Trend indicators (↑ increasing, ↓ decreasing, → stable)
- Proper grammar handling and organized card layout

### 3. ⏱️ Smart Wait Time Predictions
- AI-powered wait time estimation considering:
  - Current crowd density
  - Facility type (food courts vs restrooms vs merchandise)
  - Event phase (pre-event, entry, live, halftime, post-event)
  - Time-of-day patterns
  - Non-linear scaling at high density
- Circular gauge visualizations
- "Best time to visit" recommendations
- Alternative facility suggestions when busy

### 4. 🗺️ Interactive Venue Map
- Google Maps-powered zoomable venue layout with dark styling
- Custom POI markers (food, restrooms, gates, first aid, merchandise, ATMs, parking)
- Click-to-view facility details with live crowd data
- Canvas-based fallback map with full POI visualization

### 5. 🤖 Gemini AI Assistant
- Context-aware AI chatbot powered by Google Gemini
- System prompt enriched with real-time venue data AND live match state
- Multi-turn conversation with memory
- Quick-action chips for common queries
- Intelligent local fallback with keyword matching

### 6. 🏏 Live Match Simulation Engine
- **Ball-by-ball cricket match simulation** driving the entire app
- Realistic probability distribution: dots (30%), singles (20%), boundaries (15%), sixes (10%), wickets (3%)
- Milestone detection (fifties, centuries)
- Bowler rotation at end of overs
- Phase transitions (active → innings break → second innings)
- Match events generate real-time alerts throughout the app

### 7. 📢 Real-Time Alerts
- Toast notification system with auto-dismiss
- Match highlights (wickets, milestones, sixes)
- Crowd alerts, flash deals, weather updates
- Alert categories: info, warning, deal, emergency

### 8. ♿ Full Accessibility (WCAG 2.1 AA)
- Three themes: Dark, Light, High Contrast
- Complete ARIA landmarks, roles, and live regions
- Keyboard navigation with focus management
- Skip-to-content links
- Font size scaling (75% – 150%)
- Reduced motion support
- System preference detection

---

## 🔧 Google Services Integration

| Service | Implementation | Purpose |
|---------|---------------|---------|
| **Google Maps JavaScript API** | Interactive venue map with dark styling, custom POI markers, directions | Core navigation & wayfinding |
| **Google Gemini API** | Context-aware AI chatbot with system prompt, real-time data + match state injection | Intelligent venue assistant |
| **Firebase Realtime Database** | Live crowd density sync across all connected clients (5s intervals) | Real-time crowd coordination |
| **Firebase Authentication** | Anonymous auth for zero-friction session tracking | Secure, privacy-first identity |
| **Google Fonts** | Inter typeface for premium, accessible typography | Design excellence |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (SPA)                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Venue Map│  │ Heatmap  │  │  Gemini AI Chat   │ │
│  │ (Maps JS)│  │ (Canvas) │  │  (REST API)       │ │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘ │
│       └──────────────┴────────────────┘              │
│                      │                               │
│  ┌───────────────────┴────────────────────────────┐  │
│  │         Core App Controller (SPA Router)       │  │
│  │    State · Event Bus · Routing · Rendering     │  │
│  └───────┬───────────────────┬────────────────────┘  │
│          │                   │                        │
│  ┌───────┴──────┐   ┌───────┴──────────────────────┐ │
│  │ Event Engine │   │    Firebase Service Layer     │ │
│  │ (Match Sim)  │   │  (Auth + Realtime DB + Sim)  │ │
│  └──────────────┘   └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
prt_cloud/
├── index.html                # Single-page application shell
├── css/
│   ├── index.css             # Design system (tokens, themes, animations)
│   ├── components.css        # Component styles (cards, chat, gauges)
│   ├── dashboard.css         # Dashboard: scoreboard, quick actions, crowd cards
│   └── responsive.css        # Mobile-first responsive breakpoints
├── js/
│   ├── app.js                # Main app controller & SPA router
│   ├── event-engine.js       # Live cricket match simulation engine
│   ├── config.example.js     # API key template (config.js is gitignored)
│   ├── firebase-service.js   # Firebase init, auth, realtime DB
│   ├── maps-service.js       # Google Maps with custom venue overlays
│   ├── gemini-service.js     # Gemini AI chat integration
│   ├── heatmap.js            # Canvas-based crowd density heatmap
│   ├── wait-estimator.js     # Wait time prediction algorithm
│   ├── notifications.js      # Toast notification system
│   ├── accessibility.js      # WCAG 2.1 AA a11y utilities
│   └── utils.js              # Shared helpers, constants, event bus
├── tests/
│   ├── unit/
│   │   ├── utils.test.js           # 29 unit tests
│   │   ├── wait-estimator.test.js  # 23 unit tests
│   │   └── heatmap.test.js         # 12 unit tests
│   └── test-runner.html      # In-browser test runner (zero deps)
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🚀 How to Run

### Quick Start (No API Keys Required)

VenueFlow works in **full demo mode** without any API keys:

1. Clone the repository:
   ```bash
   git clone https://github.com/airz-raj/prt_cloud.git
   cd prt_cloud
   ```

2. Open `index.html` in a browser:
   ```bash
   open index.html       # macOS
   xdg-open index.html   # Linux
   start index.html      # Windows
   ```

3. Or use a local server:
   ```bash
   python3 -m http.server 8080
   # Visit http://localhost:8080
   ```

**Demo mode includes:**
- ✅ Live ball-by-ball cricket match simulation
- ✅ Real-time crowd density updates (5s intervals)
- ✅ Canvas-based venue map with POI markers
- ✅ Intelligent local AI responses
- ✅ All 7 tabs fully functional

### Full Setup (With Google API Keys)

1. Copy the config template:
   ```bash
   cp js/config.example.js js/config.js
   ```

2. Edit `js/config.js` with your API keys:
   - **Google Maps API Key** — [Get it here](https://console.cloud.google.com/apis/credentials)
   - **Gemini API Key** — [Get it here](https://aistudio.google.com/app/apikey)
   - **Firebase Config** — [Get it here](https://console.firebase.google.com/)

3. Open in a browser

### Running Tests

Open `tests/test-runner.html` in any browser. **64 unit tests** run automatically with zero dependencies.

---

## 🧠 Technical Approach

### Design Philosophy

1. **Zero-Dependency Frontend** — Pure HTML/CSS/JS keeps the repo lightweight and eliminates supply chain risks
2. **Graceful Degradation** — Every Google service has an intelligent fallback
3. **Mobile-First** — Designed for actual use: attendees using phones at events
4. **Privacy-First** — Anonymous auth only; no personal data collection
5. **Real Data Simulation** — The match engine produces real, changing data that drives the entire UI

### Wait Time Algorithm

```
waitTime = (density / 10) × facilityFactor × phaseMultiplier × timeAdjustment × overflowScaling
```

- **Facility Factor**: Merchandise (1.5×) > Food (1.2×) > Gate (0.8×) > Restroom (0.6×)
- **Phase Multiplier**: Halftime (1.8×) > Post-event (1.5×) > Entry (1.3×) > Active (0.5×)
- **Overflow Scaling**: Non-linear increase above 70% density

### Match Simulation Engine

Ball-by-ball cricket simulation with realistic probability distribution:
- 30% dot balls, 20% singles, 12% doubles, 15% fours, 10% sixes, 3% wickets
- Bowler rotation, strike rotation, milestone detection
- Phase management (innings, breaks)
- Events feed into the notification and AI systems

### AI Context Injection

The Gemini assistant receives real-time context with every query:
- Current crowded and quiet zones
- Event phase and match state (score, batsmen, overs)
- This enables responses like *"Food Court A has the shortest wait right now at 42% density. India are 152/3 in 17 overs!"*

---

## 📝 Assumptions

1. **Venue Data**: POI coordinates are approximated for Narendra Modi Stadium based on publicly available aerial imagery
2. **Crowd Simulation**: Density varies using mean-reversion random walk algorithms
3. **Wait Time Model**: Multi-factor model; production deployment would calibrate with historical data
4. **Sensor Data**: Production would integrate with IoT sensors; demo uses Firebase simulation
5. **Single Venue**: Configured for one venue but architecture supports multi-venue deployment

---

## 🔒 Security

- ✅ API keys in gitignored `config.js`
- ✅ Content Security Policy (CSP) headers
- ✅ All user inputs sanitized via `sanitizeHTML()` to prevent XSS
- ✅ Input length validation (500 char limit)
- ✅ Firebase anonymous auth
- ✅ Frozen configuration objects (immutable)
- ✅ No `eval()` or unsanitized `innerHTML`
- ✅ Error boundaries in all event handlers

---

## ♿ Accessibility

- ✅ WCAG 2.1 AA compliant
- ✅ Semantic HTML5 with ARIA landmarks
- ✅ Three themes: Dark, Light, High Contrast
- ✅ Full keyboard navigation with visible focus
- ✅ Skip-to-content links
- ✅ Screen reader announcements (ARIA live regions)
- ✅ Font size scaling (Ctrl +/-)
- ✅ Reduced motion support
- ✅ System preference detection
- ✅ Focus trapping in modals
- ✅ Touch target optimization (44px minimum)

---

## 📊 Evaluation Criteria

| Criteria | Implementation |
|----------|---------------|
| **Code Quality** | Modular IIFE architecture, JSDoc, consistent naming, separation of concerns, frozen APIs |
| **Security** | CSP headers, XSS prevention, input sanitization, gitignored secrets, error boundaries |
| **Efficiency** | requestAnimationFrame, debounced events, efficient DOM updates, canvas heatmap, lazy rendering |
| **Testing** | 64 unit tests, zero-dependency test runner, covers utils/estimation/heatmap logic |
| **Accessibility** | WCAG 2.1 AA, 3 themes, keyboard nav, screen reader, font scaling, motion preferences |
| **Google Services** | Maps JS API, Gemini AI, Firebase Auth, Firebase Realtime DB, Google Fonts |

---

## 📜 License

MIT License — see [LICENSE](LICENSE)

---

Built with ❤️ for PromptWars Week 1 using Google Antigravity
