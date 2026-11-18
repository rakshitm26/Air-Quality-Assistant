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

// ── Helpers ──────────────────────────────────────────────────────────────────
function lookupAirData(city) {
  const key = city?.toLowerCase().trim();
  return CITY_AQI_DB[key] ?? {
    aqi: 150,
    pm25: 55,
    pm10: 95,
    city: city || "Your City",
    country: "Unknown",
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
    service: "AirGuard AI",
    version: "1.0.0",
    activeSessions: airguard.getActiveSessions(),
    supportedCities: Object.keys(CITY_AQI_DB),
    model: "gemini-4-hydrogen",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/aqi/:city — Get AQI data for a city
app.get("/api/aqi/:city", (req, res) => {
  const airData = lookupAirData(req.params.city);
  const band = getAQIBand(airData.aqi);
  res.json({ ...airData, band });
});

// POST /api/chat — Non-streaming chat
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message, profile = {}, city } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const sid = sessionId || generateSessionId();
    const airData = lookupAirData(city || profile.city);

    const result = await airguard.chat(sid, message, profile, airData);

    res.json({
      sessionId: sid,
      response: result.text,
      interactionId: result.interactionId,
      airData: { ...airData, band: getAQIBand(airData.aqi) },
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
    const { sessionId, message, profile = {}, city } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const sid = sessionId || generateSessionId();
    const airData = lookupAirData(city || profile.city);

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Session-Id", sid);

    // Send initial metadata
    res.write(`data: ${JSON.stringify({ type: "init", sessionId: sid, airData: { ...airData, band: getAQIBand(airData.aqi) } })}\n\n`);

    for await (const chunk of airguard.chatStream(sid, message, profile, airData)) {
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
    const { profile = {}, city } = req.body;
    const airData = lookupAirData(city || profile.city);

    const plan = await airguard.generateEmergencyPlan(profile, airData);
    res.json({ plan, airData: { ...airData, band: getAQIBand(airData.aqi) } });
  } catch (err) {
    console.error("Emergency plan error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routine — Daily routine optimizer
app.post("/api/routine", async (req, res) => {
  try {
    const { profile = {}, city } = req.body;
    const airData = lookupAirData(city || profile.city);

    const routine = await airguard.optimizeDailyRoutine(profile, airData);
    res.json({ routine, airData: { ...airData, band: getAQIBand(airData.aqi) } });
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
╔══════════════════════════════════════════════════════════╗
║          🌬️  AirGuard AI — Server Running                 ║
║          PromptWars Google Developers 2026               ║
╠══════════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                        ║
║  API:      http://localhost:${PORT}/api/health              ║
║  Model:    gemini-4-hydrogen                             ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
