# 🌬️ Air Quality Assistant (AirGuard AI)
### GenAI-Powered Urban Air Pollution & Winter Smog Navigator
**PromptWars · Google Developers 2026**

[![Google AI Studio](https://img.shields.io/badge/Google%20AI%20Studio-App%20Link-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.studio/apps/bf272f3b-c760-4b6e-973b-24ca0d349a9c)
[![Gemini 4 Hydrogen](https://img.shields.io/badge/Model-Gemini%204%20Hydrogen-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://aistudio.google.com/)
[![SDK](https://img.shields.io/badge/@google/genai-v3.2.0-00C49F?style=for-the-badge)](https://www.npmjs.com/package/@google/genai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Fight Smog. Breathe Smart. Maintain Clean Air.**  
> **Air Quality Assistant** is an intelligent atmospheric companion that helps families and communities navigate severe winter smog and urban air pollution. Select **any coordinate on Earth** via an interactive map, inspect real-time pollutant levels (PM2.5, PM10, NO₂, O₃, SO₂, CO), receive personalized precautions and 24-hour schedules, and learn how to reduce neighborhood emissions.
>
> 🔗 **AI Studio App**: [ai.studio/apps/bf272f3b-c760-4b6e-973b-24ca0d349a9c](https://ai.studio/apps/bf272f3b-c760-4b6e-973b-24ca0d349a9c)

---

## 📸 Key Capabilities

| Feature | Description |
|---|---|
| 🗺️ **Interactive Global Map** | Leaflet.js with CartoDB Dark Matter tiles. Click anywhere on Earth to pinpoint a location and retrieve real-time air quality data. |
| 📍 **Geocoding & GPS** | OpenStreetMap Nominatim reverse geocoding + Open-Meteo search autocomplete + "Locate Me" device GPS. |
| 🔬 **6-Pollutant Diagnostic Matrix** | Live measurements for **PM2.5, PM10, Nitrogen Dioxide (NO₂), Ozone (O₃), Sulphur Dioxide (SO₂), and Carbon Monoxide (CO)** calibrated against WHO guidelines. |
| 📊 **Dynamic Animated Gauge** | Circular SVG arc gauge with color transition according to US-EPA AQI severity bands (Good 🟢 to Hazardous ⚫). |
| 💬 **Gemini 4 Hydrogen AI Advisor** | Multi-turn stateful conversational intelligence using `@google/genai` Interactions API with real-time SSE streaming. |
| 🚨 **Emergency Smog Lockdown Protocol** | Immediate 30-minute action checklist for AQI > 300 (air sealing, HEPA filtration, vulnerability protocols). |
| 📅 **24-Hour Circadian Routine** | Hourly timeline (06:00 to 22:00) showing thermal inversion peaks, optimal ventilation windows, and low-emission commute timing. |
| 🍃 **Reduce & Maintain Low AQI** | Community solutions for clean mobility (EV/carpooling), induction cooking, dust suppression, and zero-biomass burning. |
| 📈 **Interactive Impact Calculator** | Real-time calculation of avoided PM2.5 inhalation, cigarette equivalents avoided per day, and annual CO₂ reductions. |
| 👨‍👩‍👧 **Vulnerability Safeguards** | Tailored advice for pediatric asthma, senior COPD, outdoor workers, and cardiovascular patients. |

---

## 🎨 Theme & User Experience

The application features a **unified dark cyber-atmospheric theme** matching the live web app:
- **Dark Matter Cartography**: Seamlessly styled Leaflet map with dark tiles and pulsing coordinate marker.
- **Glassmorphism Panels**: `backdrop-filter: blur(16px)` cards with subtle glowing borders.
- **Floating Particles**: Real-time canvas simulation of particulate matter and atmospheric dynamics.
- **Color-Calibrated Hazard Glows**: Dynamic color shifts based on live AQI severity.
- **Smooth Scroll Sections**: Quick jumps between Hero, Map, Dashboard, Reduce AQI, Precautions, Routine, and AI Assistant.

---

## 🏗️ Architecture

```
Air-Quality-Assistant
├── src/
│   ├── airguard.js      # 🧠 Core GenAI engine — Gemini 4 Hydrogen, system prompt, fallback engine
│   ├── server.js        # 🌐 Express server — REST, Open-Meteo live proxy, Nominatim geocoding, SSE streaming
│   └── demo.js          # 🖥️ Interactive CLI terminal demo (colored output)
├── public/
│   ├── index.html       # 🎨 Full-page scrollable responsive website with Leaflet.js map
│   ├── styles/app.css   # 💅 Cyber-atmospheric dark theme with SVG gauges & glassmorphism
│   └── scripts/app.js   # ⚡ Frontend app (Leaflet map events, SSE parser, impact calculator)
├── .env.example         # 🔑 Template for Gemini API key
├── package.json         # 📦 Dependencies and run scripts
└── README.md            # 📄 Documentation
```

### GenAI & Data Stack
- **AI Model**: `gemini-4-hydrogen` — 1M token context, high-efficiency reasoning
- **GenAI SDK**: `@google/genai` >= 3.2.0 (Interactions API with `previous_interaction_id` chaining)
- **Streaming**: Server-Sent Events (SSE) with `stream: true`
- **Geocoding**: Open-Meteo Geocoding API + OpenStreetMap Nominatim
- **Atmospheric Data**: Copernicus Atmospheric Monitoring Service (CAMS) via Open-Meteo Air Quality API

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Gemini API Key**: Get a free key at [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Clone & Install
```bash
git clone https://github.com/rakshitm26/Air-Quality-Assistant.git
cd Air-Quality-Assistant
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and set your key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```
*(Note: If you run without an API key, AirGuard AI automatically provides calibrated scientific fallback advice so you can still explore all map & AQI features!)*

### 4. Run the Application

#### 🌐 Web Interface (Recommended)
```bash
npm start
```
Open your browser to: **`http://localhost:3000`**

#### 🖥️ Interactive CLI Demo
```bash
npm run demo
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server status, model info, and active session count |
| `GET` | `/api/aqi-live?lat=&lon=&city=` | Real-time AQI + 6 pollutants for any global coordinates |
| `GET` | `/api/geocode?q=` | Autocomplete search for global cities and landmarks |
| `GET` | `/api/reverse-geocode?lat=&lon=` | Reverse geocode coordinates to street/city address |
| `POST` | `/api/chat/stream` | **Streaming SSE chat** with Gemini 4 Hydrogen |
| `POST` | `/api/chat` | Standard non-streaming chat turn |
| `POST` | `/api/emergency` | Generate an Emergency Action Plan for high AQI |
| `POST` | `/api/routine` | Generate a 24-hour optimized daily schedule |
| `POST` | `/api/impact` | Scientific calculation of lifestyle PM2.5 and CO₂ impact |
| `DELETE` | `/api/session/:id` | Clear conversation history |

### Example: Live Air Quality Query
```bash
curl "http://localhost:3000/api/aqi-live?lat=28.6139&lon=77.2090"
```
**Response:**
```json
{
  "aqi": 312,
  "pm25": 180,
  "pm10": 290,
  "no2": 85,
  "o3": 42,
  "so2": 18,
  "co": 2200,
  "dominant": "PM2.5",
  "band": {
    "label": "Hazardous",
    "emoji": "⚫",
    "color": "#7e0023"
  },
  "lat": 28.6139,
  "lon": 77.2090,
  "city": "New Delhi",
  "source": "Open-Meteo & Copernicus Atmospheric Monitoring"
}
```

---

## 🌍 Health Precautions & US-EPA AQI Bands

| AQI Band | Severity | Color | Primary Health Advice |
|---|---|---|---|
| **0 – 50** | Good | 🟢 Emerald | Clean air. Great time for outdoor exercise and deep home ventilation. |
| **51 – 100** | Moderate | 🟡 Amber | Acceptable. Sensitive people should watch for mild respiratory irritation. |
| **101 – 150** | Unhealthy (Sensitive) | 🟠 Orange | Children and respiratory patients should reduce prolonged outdoor exertion. |
| **151 – 200** | Unhealthy | 🔴 Red | Everyone may experience effects. Wear N95 outdoors; avoid cardio outside. |
| **201 – 300** | Very Unhealthy | 🟣 Purple | Health alert. Create a clean-air sanctuary room; run HEPA continuously. |
| **301+** | Hazardous | ⚫ Maroon | Emergency conditions. Full indoor lockdown; seal windows; wear N95 if outdoors. |

---

## 🏆 PromptWars Google Developers Highlights

1. **Frontier Gemini 4 Hydrogen Integration**: Utilizes the modern Interactions API with stateful memory and SSE streaming for sub-second responses.
2. **Global Precision Mapping**: Connects Leaflet.js with live satellite & atmospheric modeling for complete planetary coverage.
3. **Hyperlocal Context Injection**: Prompts automatically receive coordinates, 6 pollutant metrics, WHO safe-limit multipliers, and family profiles.
4. **Community Action Focus**: Beyond personal alerts, offers concrete steps (anti-idling, induction cooking, dust suppression) to reduce collective emissions.
5. **Unified Theme & Experience**: Cyber-atmospheric dark mode with SVG animated circular gauges, particle canvas, and responsive mobile navigation.

---

## 📄 License
MIT License © 2026 PromptWars · Google Developers
