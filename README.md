# 🏟️ VenueFlow — AI-Powered Smart Venue Assistant

> **PromptWars Week 1 | Vertical: Physical Event Experience**

VenueFlow is an intelligent, real-time web application that transforms the physical event experience at large-scale sporting venues. It addresses critical pain points — crowd congestion, unpredictable wait times, navigation confusion, and lack of real-time coordination — through AI-driven insights and Google Services integration.

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
| **Tech Stack** | Vanilla HTML5 + CSS3 + JavaScript (No frameworks) |

---

## 🎯 Problem Statement

Attendees at large-scale sporting venues face recurring challenges:

- **🚶 Crowd Congestion** — Unpredictable bottlenecks at gates, concessions, and restrooms
- **⏰ Long Wait Times** — No visibility into how long a queue will take
- **🗺️ Disorientation** — Unfamiliar venues with poor wayfinding
- **📡 No Real-time Info** — Delays between events on the ground and information reaching attendees
- **♿ Accessibility Gaps** — Limited support for attendees with disabilities

---

## 💡 Solution: VenueFlow

VenueFlow solves these with 6 core features:

### 1. 🗺️ Interactive Venue Map
- Google Maps-powered zoomable venue layout
- Custom POI markers (food, restrooms, gates, first aid, merchandise, ATMs, parking)
- Click-to-view facility details with live crowd data
- Beautiful canvas-based fallback when Maps API isn't configured

### 2. 🔥 Live Crowd Heatmap
- Real-time crowd density visualization across 20 venue zones
- Animated canvas heatmap with color-coded density (green → red)
- Updates every 5 seconds via Firebase Realtime Database
- Zone-by-zone breakdown with trend indicators (increasing/decreasing/stable)

### 3. ⏱️ Smart Wait Time Predictions
- AI-powered wait time estimation algorithm considering:
  - Current crowd density
  - Facility type (food courts vs restrooms vs merchandise)
  - Event phase (pre-event, entry, live, halftime, post-event)
  - Time-of-day patterns
  - Non-linear scaling at high density
- Circular gauge visualizations
- "Best time to visit" recommendations

### 4. 🤖 Gemini AI Assistant
- Context-aware AI chatbot powered by Google Gemini
- System prompt enriched with real-time venue data (crowd levels, wait times)
- Multi-turn conversation with memory
- Quick-action chips for common queries
- Intelligent local fallback with keyword matching when API is unavailable
- Input sanitization for security

### 5. 📢 Real-Time Alerts
- Toast notification system with auto-dismiss
- Alert categories: info, warning, deal, emergency
- Match updates, flash sales, congestion warnings, weather alerts
- Screen reader announcements via ARIA live regions

### 6. ♿ Full Accessibility
- **WCAG 2.1 AA** compliant
- Three themes: Dark, Light, High Contrast
- Complete ARIA landmarks, roles, and live regions
- Keyboard navigation with focus management
- Skip-to-content links
- Font size scaling (75% – 150%)
- Reduced motion support (`prefers-reduced-motion`)
- System preference detection (color scheme, contrast, motion)

---

## 🔧 Google Services Integration

| Service | Implementation | Purpose |
|---------|---------------|---------|
| **Google Maps JavaScript API** | Interactive venue map with dark styling, custom POI markers, directions | Core navigation & wayfinding |
| **Google Gemini API** | Context-aware AI chatbot with system prompt, real-time data injection | Intelligent venue assistant |
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
│  │           Core App Controller (SPA Router)     │  │
│  │      State Management + Event Bus + Routing    │  │
│  └───────────────────┬────────────────────────────┘  │
│                      │                               │
│  ┌───────────────────┴────────────────────────────┐  │
│  │          Firebase Service Layer                │  │
│  │    (Anonymous Auth + Realtime DB + Simulation) │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
prt_cloud/
├── index.html              # Single-page application shell
├── css/
│   ├── index.css           # Design system (tokens, themes, animations)
│   ├── components.css      # Component-level styles (cards, chat, gauges)
│   └── responsive.css      # Mobile-first responsive breakpoints
├── js/
│   ├── app.js              # Main app controller & SPA router
│   ├── config.example.js   # API key template (config.js is gitignored)
│   ├── firebase-service.js # Firebase init, auth, realtime DB
│   ├── maps-service.js     # Google Maps with custom venue overlays
│   ├── gemini-service.js   # Gemini AI chat integration
│   ├── heatmap.js          # Canvas-based crowd density heatmap
│   ├── wait-estimator.js   # Wait time prediction algorithm
│   ├── notifications.js    # Toast notification system
│   ├── accessibility.js    # WCAG 2.1 AA a11y utilities
│   └── utils.js            # Shared helpers, constants, event bus
├── tests/
│   ├── unit/
│   │   ├── utils.test.js           # 29 unit tests
│   │   ├── wait-estimator.test.js  # 23 unit tests
│   │   └── heatmap.test.js         # 12 unit tests
│   └── test-runner.html    # In-browser test runner (zero deps)
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🚀 How to Run

### Quick Start (No API Keys Required)

VenueFlow works in **demo/simulation mode** without any API keys:

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/prt_cloud.git
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

The app runs fully in demo mode with:
- Simulated real-time crowd data (updates every 5s)
- Canvas-based venue map with POI visualization
- Intelligent local AI responses (keyword-based)
- All UI features fully functional

### Full Setup (With Google API Keys)

1. Copy the config template:
   ```bash
   cp js/config.example.js js/config.js
   ```

2. Edit `js/config.js` with your API keys:
   - **Google Maps API Key** — [Get it here](https://console.cloud.google.com/apis/credentials)
   - **Gemini API Key** — [Get it here](https://aistudio.google.com/app/apikey)
   - **Firebase Config** — [Get it here](https://console.firebase.google.com/) → Project Settings

3. Uncomment the Google Maps script tag in `index.html` (line ~100) and add your API key

4. Open in a browser

### Running Tests

Open `tests/test-runner.html` in any browser. **64 unit tests** run automatically with zero dependencies.

---

## 🧠 Approach & Logic

### Design Philosophy

1. **Zero-Dependency Frontend** — Pure HTML/CSS/JS keeps the repo well under 1MB and eliminates supply chain risks
2. **Graceful Degradation** — Every Google service has an intelligent fallback (simulation mode, local AI, canvas map)
3. **Mobile-First** — Designed for the actual use case: attendees using phones at events
4. **Privacy-First** — Anonymous auth only; no personal data collection

### Wait Time Algorithm

The prediction engine uses a multi-factor model:

```
waitTime = (density / 10) × facilityFactor × phaseMultiplier × timeAdjustment × overflowScaling
```

- **Facility Factor**: Food (1.2×) > Merchandise (1.5×) > Gate (0.8×) > Restroom (0.6×)
- **Phase Multiplier**: Halftime (1.8×) > Post-event (1.5×) > Entry (1.3×) > Active (0.5×)
- **Overflow Scaling**: Non-linear increase above 70% density

### AI Context Injection

The Gemini assistant receives real-time context with every query:
- Current crowded zones (>70% density)
- Current quiet zones (<35% density)
- Event phase
- This enables responses like *"Food Court A has the shortest wait right now at 42% density"*

---

## 📝 Assumptions

1. **Venue Data**: POI coordinates are approximated for Narendra Modi Stadium based on publicly available aerial imagery
2. **Crowd Simulation**: In demo mode, crowd density varies realistically using mean-reversion random walk algorithms
3. **Wait Time Model**: Predictions are based on a logical multi-factor model; real-world deployment would calibrate with historical venue data
4. **Sensor Data**: Production deployment would integrate with physical IoT sensors (people counters, cameras); the demo uses Firebase simulation
5. **Single Venue**: The app is configured for one venue but the architecture supports multi-venue deployment

---

## 🔒 Security Measures

- ✅ API keys stored in gitignored `config.js`, never committed
- ✅ Content Security Policy (CSP) headers in HTML meta
- ✅ All user inputs sanitized via `sanitizeHTML()` to prevent XSS
- ✅ Input length validation (500 char limit)
- ✅ Firebase anonymous auth (no password collection)
- ✅ Frozen configuration objects (immutable)
- ✅ No `eval()` or `innerHTML` with unsanitized content
- ✅ Error boundaries in all event handlers

---

## ♿ Accessibility Features

- ✅ WCAG 2.1 AA compliant
- ✅ Semantic HTML5 with ARIA landmarks
- ✅ Three themes: Dark, Light, High Contrast
- ✅ Full keyboard navigation with visible focus indicators
- ✅ Skip-to-content links
- ✅ Screen reader announcements (ARIA live regions)
- ✅ Font size scaling (Ctrl +/-)
- ✅ Reduced motion support
- ✅ System preference detection (dark mode, contrast, motion)
- ✅ Focus trapping in modal panels
- ✅ Touch target optimization (44px minimum)

---

## 📊 Evaluation Criteria Alignment

| Criteria | Implementation |
|----------|---------------|
| **Code Quality** | Modular IIFE architecture, JSDoc comments, consistent naming, separation of concerns, frozen APIs |
| **Security** | CSP headers, XSS prevention, input sanitization, gitignored secrets, no eval, error boundaries |
| **Efficiency** | requestAnimationFrame rendering, debounced events, DOM recycling, canvas heatmap, lazy panel rendering |
| **Testing** | 64 unit tests, zero-dependency test runner, covers utils/estimation/heatmap logic |
| **Accessibility** | WCAG 2.1 AA, 3 themes, keyboard nav, screen reader support, font scaling, motion preferences |
| **Google Services** | Maps JS API, Gemini AI, Firebase Auth, Firebase Realtime DB, Google Fonts |

---

## 📜 License

MIT License — see [LICENSE](LICENSE)

---

Built with ❤️ for PromptWars Week 1 using Google Antigravity
