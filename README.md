# 🌬️ AirGuard AI
### GenAI-powered assistant for winter smog and urban air pollution
**PromptWars · Google Developers 2026**

---

> **Fight Smog. Breathe Smart. Live Clean.**  
> AirGuard AI helps families and communities navigate severe winter smog and urban air pollution using the power of Gemini 4 Hydrogen — suggesting low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to their location and lifestyle.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌡️ **Live AQI Dashboard** | Real-time air quality status with color-coded hazard levels |
| 💬 **Stateful AI Chat** | Multi-turn conversations with memory via Gemini Interactions API |
| ⚡ **Streaming Responses** | Real-time SSE streaming for immediate AI feedback |
| 🚨 **Emergency Plans** | Auto-generated step-by-step emergency action plans for AQI > 300 |
| 📅 **Daily Routine Optimizer** | Full-day low-emission schedules tailored to your city + lifestyle |
| 📊 **Impact Calculator** | Quantifies how your sustainable choices reduce PM2.5 and health risk |
| 👨‍👩‍👧 **Family Profiles** | Personalized advice for children, elderly, and people with respiratory conditions |
| 🏠 **Indoor Air Hacks** | Evidence-based tips for HEPA filters, plants, ventilation timing, cooking |
| ♻️ **Sustainable Alternatives** | EV, public transport, induction cooking, clean heating suggestions |
| 🌍 **Multi-city Support** | 12 pre-loaded cities (Delhi, Beijing, Lahore, London, LA, etc.) |

---

## 🏗️ Architecture

```
AirGuard AI
├── src/
│   ├── airguard.js      # 🧠 Core GenAI engine — AirGuardAI class, system prompt, AQI data
│   ├── server.js        # 🌐 Express REST + SSE API server
│   └── demo.js          # 🖥️  Interactive CLI demo (no browser needed)
├── public/
│   ├── index.html       # 🎨 Main web UI
│   ├── styles/app.css   # 💅 Dark-mode design system
│   └── scripts/app.js   # ⚡ Frontend app (vanilla JS, no frameworks)
└── package.json
```

### GenAI Stack
- **Model**: `gemini-4-hydrogen` — 1M context, fast & multimodal
- **SDK**: `@google/genai` >= 3.2.0 (new Interactions API)
- **API Pattern**: Stateful multi-turn via `previous_interaction_id`
- **Streaming**: Server-Sent Events (SSE) with `stream: true`

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Gemini API key → [Get one free at AI Studio](https://aistudio.google.com/apikey)

### 2. Install
```bash
cd AirGuardAI
npm install
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_key_here
```

### 4. Run

**Web UI** (recommended):
```bash
npm start
# Open http://localhost:3000
```

**CLI Demo** (no browser):
```bash
npm run demo
```

**Development** (auto-reload):
```bash
npm run dev
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server status + active sessions |
| `GET` | `/api/aqi/:city` | AQI data for a city |
| `POST` | `/api/chat` | Non-streaming chat turn |
| `POST` | `/api/chat/stream` | **Streaming SSE chat** (used by UI) |
| `POST` | `/api/emergency` | Generate emergency action plan |
| `POST` | `/api/routine` | Optimize daily routine |
| `POST` | `/api/impact` | Calculate lifestyle change impact |
| `DELETE` | `/api/session/:id` | Clear conversation session |

### Example: Chat Request
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Is it safe for my kids to play outside today?",
    "city": "delhi",
    "profile": {
      "family": "2 adults, 2 kids ages 5 and 8",
      "lifestyle": "school run daily",
      "hasKids": true
    }
  }'
```

### Example: Emergency Plan
```bash
curl -X POST http://localhost:3000/api/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "city": "delhi",
    "profile": {
      "family": "2 adults, 1 elderly parent",
      "hasElderly": true,
      "respiratory": "elderly COPD"
    }
  }'
```

---

## 🎯 Supported Cities

| City | Country | Typical AQI | Category |
|---|---|---|---|
| Delhi | India | 312 | 🔴 Hazardous |
| Lahore | Pakistan | 295 | 🔴 Hazardous |
| Kolkata | India | 268 | 🟣 Very Unhealthy |
| Dhaka | Bangladesh | 278 | 🟣 Very Unhealthy |
| Beijing | China | 185 | 🔴 Unhealthy |
| Cairo | Egypt | 175 | 🔴 Unhealthy |
| Jakarta | Indonesia | 158 | 🔴 Unhealthy |
| Los Angeles | USA | 108 | 🟠 Unhealthy for Sensitive |
| Paris | France | 72 | 🟡 Moderate |
| New York | USA | 65 | 🟡 Moderate |
| Mumbai | India | 145 | 🟠 Unhealthy for Sensitive |
| London | UK | 48 | 🟢 Good |

> Add any city — unknown cities default to a moderate AQI profile. Plug in [OpenWeatherMap API](https://openweathermap.org/api/air-pollution) for live data.

---

## 🧠 AI System Design

### The System Prompt
AirGuard AI uses a carefully engineered system prompt that:
- Establishes domain expertise (IAQ, outdoor exposure, sustainable living, emergency response)
- Enforces structured output format (Status → Indoor → Outdoor → Switch → Impact → Quick Win)
- Requires empathy and avoids eco-shaming
- Provides AQI reference bands for calibrated urgency
- Handles vulnerable populations (children, elderly, respiratory conditions) specially

### Context Injection
Every AI call includes:
- Current AQI + PM2.5/PM10 readings
- User's city and seasonal pattern
- Family composition and lifestyle profile
- Previous conversation history (via `previous_interaction_id`)

### Multi-turn Memory
Session memory persists across conversation turns using the Interactions API's `previous_interaction_id` chain. Each session is identified by a unique ID, and sessions are stored server-side.

---

## 🏆 PromptWars Highlights

| Criterion | Implementation |
|---|---|
| **Prompt Engineering** | 400-word expert system prompt with structured output enforcement |
| **GenAI API Usage** | Streaming, stateful multi-turn, structured context injection |
| **Real-world Impact** | Addresses WHO-reportable air quality crisis affecting 7B+ people |
| **Personalization** | Location + family + lifestyle + health conditions |
| **UX Design** | Dark mode, animated AQI gauge, real-time streaming, particles |
| **Code Quality** | ES modules, JSDoc, error handling, clean separation of concerns |

---

## 📄 License
MIT — PromptWars Google Developers 2026
