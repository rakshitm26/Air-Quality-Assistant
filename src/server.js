// ============================================================
//  AirGuard AI — Express REST + SSE Server
//  PromptWars Google Developers 2026
// ============================================================

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import { AirGuardAI, CITY_AQI_DB, getAQIBand } from "./airguard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Initialize AirGuard AI ──────────────────────────────────────────────────
const airguard = new AirGuardAI(process.env.GEMINI_API_KEY);

// ── EPA PM2.5 to AQI calculation helper if needed ───────────────────────────
function calculateAQIFromPM25(pm25) {
  if (pm25 == null || isNaN(pm25)) return 50;
  const c = Math.max(0, Number(pm25));
  // EPA Breakpoints (C_low, C_high, I_low, I_high)
  const bp = [
    [0.0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];

  for (const [cLow, cHigh, iLow, iHigh] of bp) {
    if (c <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
    }
  }
  return 500;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function lookupAirData(city) {
  const key = city?.toLowerCase().trim();
  return CITY_AQI_DB[key] ?? {
    aqi: 150,
    pm25: 55,
    pm10: 95,
    no2: 45,
    o3: 40,
    so2: 12,
    co: 900,
    city: city || "Selected City",
    country: "Global",
    lat: 28.6139,
    lon: 77.2090,
    season: "moderate",
  };
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── API Routes ────────────────────────────────────────────────────────────────

// GET /api/health — Server status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AirGuard AI — Urban Air Quality Assistant",
    version: "2.0.0",
    activeSessions: airguard.getActiveSessions(),
    supportedCities: Object.keys(CITY_AQI_DB),
    model: "gemini-4-hydrogen",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/geocode — Search coordinates by name worldwide
app.get("/api/geocode", async (req, res) => {
  const query = req.query.q?.trim();
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
    const response = await fetch(geoUrl);
    const data = await response.json();

    const results = (data.results || []).map((item) => ({
      name: item.name,
      admin1: item.admin1 || "",
      country: item.country || "",
      countryCode: item.country_code || "",
      lat: item.latitude,
      lon: item.longitude,
      display: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
    }));

    res.json({ results });
  } catch (err) {
    console.error("Geocode error:", err);
    res.status(500).json({ error: "Failed to resolve coordinates", details: err.message });
  }
});

// GET /api/reverse-geocode — Reverse geocode coordinates to location address
app.get("/api/reverse-geocode", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: "Valid 'lat' and 'lon' query parameters are required" });
  }

  try {
    const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(revUrl, {
      headers: {
        "User-Agent": "AirGuardAI-PromptWars/2.0 (Google Developers Hackathon)",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error HTTP ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || "Selected Area";
    const country = addr.country || "";

    res.json({
      display: data.display_name || `${city}, ${country}`,
      city,
      country,
      address: addr,
      lat,
      lon,
    });
  } catch (err) {
    console.warn("Reverse geocode fallback:", err.message);
    res.json({
      display: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`,
      city: "Selected Pinpoint",
      country: "Earth",
      lat,
      lon,
    });
  }
});

// GET /api/aqi-live — Live atmospheric & pollutant query for any coordinates
app.get("/api/aqi-live", async (req, res) => {
  try {
    let lat = parseFloat(req.query.lat);
    let lon = parseFloat(req.query.lon);
    const cityParam = req.query.city;

    // Fallback if coordinates missing
    if (isNaN(lat) || isNaN(lon)) {
      if (cityParam) {
        const fallback = lookupAirData(cityParam);
        lat = fallback.lat;
        lon = fallback.lon;
      } else {
        lat = 28.6139; // Default New Delhi
        lon = 77.2090;
      }
    }

    const apiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Air quality API responded with status ${response.status}`);
    }

    const data = await response.json();
    const cur = data.current || {};

    let aqi = cur.us_aqi;
    const pm25 = cur.pm2_5 != null ? Math.round(cur.pm2_5) : null;
    const pm10 = cur.pm10 != null ? Math.round(cur.pm10) : null;
    const no2 = cur.nitrogen_dioxide != null ? Math.round(cur.nitrogen_dioxide) : null;
    const o3 = cur.ozone != null ? Math.round(cur.ozone) : null;
    const so2 = cur.sulphur_dioxide != null ? Math.round(cur.sulphur_dioxide) : null;
    const co = cur.carbon_monoxide != null ? Math.round(cur.carbon_monoxide) : null;

    // If us_aqi is not directly returned, compute from PM2.5
    if (aqi == null && pm25 != null) {
      aqi = calculateAQIFromPM25(pm25);
    } else if (aqi == null) {
      aqi = 75; // baseline moderate fallback
    } else {
      aqi = Math.round(aqi);
    }

    const band = getAQIBand(aqi);

    // Identify dominant pollutant relative to standard WHO guidance
    let dominant = "PM2.5";
    if (pm25 && pm10 && pm10 > pm25 * 2.5) dominant = "PM10";
    if (no2 && no2 > 100) dominant = "NO₂";
    if (o3 && o3 > 120) dominant = "Ozone (O₃)";

    res.json({
      aqi,
      pm25: pm25 ?? 25,
      pm10: pm10 ?? 45,
      no2: no2 ?? 30,
      o3: o3 ?? 40,
      so2: so2 ?? 8,
      co: co ?? 600,
      dominant,
      band,
      lat,
      lon,
      city: cityParam || "Custom Location",
      country: "",
      source: "Open-Meteo & Copernicus Atmospheric Monitoring",
      timestamp: cur.time || new Date().toISOString(),
    });
  } catch (err) {
    console.error("Live AQI fetch error:", err);
    // Graceful fallback to static database
    const fallback = lookupAirData(req.query.city || "delhi");
    res.json({
      ...fallback,
      band: getAQIBand(fallback.aqi),
      source: "AirGuard AI Offline Model",
      error: "Live feed unavailable, serving calibrated seasonal estimates",
    });
  }
});

// GET /api/aqi/:city — Standard lookup
app.get("/api/aqi/:city", (req, res) => {
  const airData = lookupAirData(req.params.city);
  const band = getAQIBand(airData.aqi);
  res.json({ ...airData, band });
});

// POST /api/chat — Non-streaming chat
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message, profile = {}, airData = {} } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const sid = sessionId || generateSessionId();
    const finalAirData = airData.aqi ? airData : lookupAirData(profile.city || req.body.city);

    const result = await airguard.chat(sid, message, profile, finalAirData);

    res.json({
      sessionId: sid,
      response: result.text,
      interactionId: result.interactionId,
      airData: { ...finalAirData, band: getAQIBand(finalAirData.aqi) },
      usage: result.usage,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/stream — Streaming chat via Server-Sent Events
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { sessionId, message, profile = {}, airData = {} } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const sid = sessionId || generateSessionId();
    const finalAirData = airData.aqi ? airData : lookupAirData(profile.city || req.body.city);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Session-Id", sid);

    res.write(`data: ${JSON.stringify({ type: "init", sessionId: sid, airData: { ...finalAirData, band: getAQIBand(finalAirData.aqi) } })}\n\n`);

    for await (const chunk of airguard.chatStream(sid, message, profile, finalAirData)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      if (chunk.type === "done") break;
    }

    res.end();
  } catch (err) {
    console.error("Stream error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
    res.end();
  }
});

// POST /api/emergency — Emergency action plan
app.post("/api/emergency", async (req, res) => {
  try {
    const { profile = {}, airData = {} } = req.body;
    const finalAirData = airData.aqi ? airData : lookupAirData(profile.city || req.body.city);

    const plan = await airguard.generateEmergencyPlan(profile, finalAirData);
    res.json({ plan, airData: { ...finalAirData, band: getAQIBand(finalAirData.aqi) } });
  } catch (err) {
    console.error("Emergency plan error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routine — Daily routine optimizer
app.post("/api/routine", async (req, res) => {
  try {
    const { profile = {}, airData = {} } = req.body;
    const finalAirData = airData.aqi ? airData : lookupAirData(profile.city || req.body.city);

    const routine = await airguard.optimizeDailyRoutine(profile, finalAirData);
    res.json({ routine, airData: { ...finalAirData, band: getAQIBand(finalAirData.aqi) } });
  } catch (err) {
    console.error("Routine error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/impact — Calculate pollution impact of lifestyle choices
app.post("/api/impact", async (req, res) => {
  try {
    const { choices = {} } = req.body;

    if (Object.keys(choices).length === 0) {
      return res.status(400).json({ error: "At least one lifestyle choice is required" });
    }

    const impact = await airguard.calculateImpact(choices);
    res.json({ impact });
  } catch (err) {
    console.error("Impact error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/session/:id — Clear a session
app.delete("/api/session/:id", (req, res) => {
  airguard.clearSession(req.params.id);
  res.json({ cleared: true, sessionId: req.params.id });
});

// ── Fallback: Serve the main HTML UI ────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════════════════════════════════════╗
║         🌬️  AirGuard AI — Urban Air Quality Assistant               ║
║         PromptWars Google Developers 2026                           ║
╠═════════════════════════════════════════════════════════════════════╣
║  URL:            http://localhost:${PORT}                             ║
║  Live Map API:   http://localhost:${PORT}/api/aqi-live?lat=28.6&lon=77.2║
║  Geocoding:      http://localhost:${PORT}/api/geocode?q=Delhi         ║
║  GenAI Engine:   Gemini 4 Hydrogen via @google/genai SDK            ║
╚═════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
