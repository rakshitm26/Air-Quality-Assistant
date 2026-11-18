// ============================================================
//  AirGuard AI — Core GenAI Engine
//  PromptWars Google Developers 2026
//
//  Powered by Gemini 4 Hydrogen (google-genai SDK >= 3.2.0)
//  Uses the new Interactions API with stateful conversations
// ============================================================

import { GoogleGenAI } from "@google/genai";

// ── AQI severity bands ───────────────────────────────────────────────────────
export const AQI_BANDS = {
  GOOD: { min: 0, max: 50, label: "Good", emoji: "🟢", color: "#00e400" },
  MODERATE: { min: 51, max: 100, label: "Moderate", emoji: "🟡", color: "#ffff00" },
  UNHEALTHY_SENSITIVE: { min: 101, max: 150, label: "Unhealthy for Sensitive Groups", emoji: "🟠", color: "#ff7e00" },
  UNHEALTHY: { min: 151, max: 200, label: "Unhealthy", emoji: "🔴", color: "#ff0000" },
  VERY_UNHEALTHY: { min: 201, max: 300, label: "Very Unhealthy", emoji: "🟣", color: "#8f3f97" },
  HAZARDOUS: { min: 301, max: 500, label: "Hazardous", emoji: "⚫", color: "#7e0023" },
};

export function getAQIBand(aqi) {
  return Object.values(AQI_BANDS).find((b) => aqi >= b.min && aqi <= b.max) ?? AQI_BANDS.HAZARDOUS;
}

// ── Sample city AQI database (extend with live API in production) ────────────
export const CITY_AQI_DB = {
  delhi: { aqi: 312, pm25: 180, pm10: 290, city: "New Delhi", country: "India", season: "winter_smog" },
  mumbai: { aqi: 145, pm25: 68, pm10: 112, city: "Mumbai", country: "India", season: "moderate" },
  beijing: { aqi: 185, pm25: 95, pm10: 155, city: "Beijing", country: "China", season: "winter_smog" },
  lahore: { aqi: 295, pm25: 165, pm10: 245, city: "Lahore", country: "Pakistan", season: "winter_smog" },
  london: { aqi: 48, pm25: 12, pm10: 22, city: "London", country: "UK", season: "winter_mild" },
  "los angeles": { aqi: 108, pm25: 35, pm10: 58, city: "Los Angeles", country: "USA", season: "moderate" },
  "new york": { aqi: 65, pm25: 18, pm10: 32, city: "New York", country: "USA", season: "moderate" },
  paris: { aqi: 72, pm25: 22, pm10: 40, city: "Paris", country: "France", season: "moderate" },
  kolkata: { aqi: 268, pm25: 148, pm10: 220, city: "Kolkata", country: "India", season: "winter_smog" },
  dhaka: { aqi: 278, pm25: 158, pm10: 235, city: "Dhaka", country: "Bangladesh", season: "winter_smog" },
  jakarta: { aqi: 158, pm25: 75, pm10: 125, city: "Jakarta", country: "Indonesia", season: "moderate" },
  cairo: { aqi: 175, pm25: 88, pm10: 148, city: "Cairo", country: "Egypt", season: "moderate" },
};

// ── The master system prompt ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are AirGuard AI — a compassionate, expert air-quality advisor built to help families and communities navigate severe winter smog and urban air pollution. You were created for the PromptWars Google Developers competition.

## Your Core Mission
Help real people breathe easier, make informed choices, and reduce their personal contribution to air pollution — with empathy, clarity, and actionable science.

## Your Expertise Domains
1. **Indoor Air Quality (IAQ)** — HEPA filters, plants, ventilation timing, cooking hacks
2. **Outdoor Exposure Reduction** — route planning, timing outdoor activities, mask selection
3. **Low-Emission Daily Routines** — transport, cooking, heating, laundry timing
4. **Child & Elderly Protection** — special vulnerability, school protocols, medication alerts
5. **Sustainable Lifestyle Alternatives** — EV, carpooling, cleaner cooking, energy choices
6. **Impact Explanation** — connect choices → PM2.5 numbers → health outcomes with empathy
7. **Emergency Protocols** — when AQI > 300, what to do RIGHT NOW

## Communication Rules
- Always START with the user's current risk level in one clear sentence
- Use ⚠️ WARNING for AQI > 150, 🚨 EMERGENCY for AQI > 300
- Give NUMBERED action lists — never walls of text
- Include ONE "Quick Win" that takes under 5 minutes
- Include ONE "Impact Fact" — a concrete number showing what their choice does
- Tailor advice to their LOCATION, LIFESTYLE, and FAMILY COMPOSITION
- Be warm, non-judgmental, and avoid eco-shaming
- When uncertain about local specifics, say so and provide general best practices

## AQI Quick Reference
- 0-50 (Good 🟢): Normal activity fine
- 51-100 (Moderate 🟡): Sensitive groups be cautious  
- 101-150 (Unhealthy for Sensitive 🟠): Reduce prolonged outdoor exertion
- 151-200 (Unhealthy 🔴): Everyone limit outdoor activity
- 201-300 (Very Unhealthy 🟣): Avoid outdoor activity, run air purifiers
- 301+ (Hazardous ⚫): Stay indoors, seal windows, N95 required outside

## Response Format
Always structure responses with:
1. 🌍 **Current Status** — AQI reading + risk level for their location
2. 🏠 **Indoor Actions** — 2-3 specific things to do inside right now
3. 🚶 **Outdoor Safety** — timing, routes, protection if they must go out
4. ♻️ **Low-Emission Switch** — one sustainable alternative tailored to them
5. ❤️ **Impact** — what their actions actually change (PM2.5 numbers or health data)
6. ⚡ **Quick Win** — something they can do in the next 5 minutes

Remember: You're not just an information bot — you're a trusted family health advisor fighting invisible air pollution together with your users.`;

// ── AirGuardAI Client Class ──────────────────────────────────────────────────
export class AirGuardAI {
  constructor(apiKey) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is required. Set it in your .env file.");
    this.client = new GoogleGenAI({ apiKey });
    this.model = "gemini-4-hydrogen";
    this.sessions = new Map(); // sessionId → last interaction ID
  }

  /**
   * Build a rich context-aware prompt from user profile + air data
   */
  _buildContextPrompt(userMessage, profile, airData) {
    const band = getAQIBand(airData.aqi);
    const profileStr = [
      profile.city ? `📍 Location: ${profile.city}` : "",
      profile.family ? `👨‍👩‍👧 Household: ${profile.family}` : "",
      profile.lifestyle ? `🏃 Lifestyle: ${profile.lifestyle}` : "",
      profile.concerns ? `⚠️ Special concerns: ${profile.concerns}` : "",
      profile.commute ? `🚗 Commute type: ${profile.commute}` : "",
      profile.cookingFuel ? `🍳 Cooking fuel: ${profile.cookingFuel}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `## Current Air Quality Context
📊 AQI: ${airData.aqi} — ${band.label} ${band.emoji}
🫁 PM2.5: ${airData.pm25} µg/m³ (WHO limit: 15 µg/m³/day)
💨 PM10: ${airData.pm10} µg/m³
🗺️ City: ${airData.city}, ${airData.country}
🌡️ Season/Pattern: ${airData.season?.replace(/_/g, " ")}

## User Profile
${profileStr || "No profile provided — giving general advice"}

## User's Question / Request
${userMessage}

Please provide personalized, actionable advice based on this exact context.`;
  }

  /**
   * Chat with AirGuard AI — stateful multi-turn conversation
   * @param {string} sessionId   - Unique session identifier
   * @param {string} userMessage - What the user typed
   * @param {object} profile     - User profile (city, family, lifestyle, etc.)
   * @param {object} airData     - Current AQI data for their location
   * @returns {Promise<{text: string, sessionId: string, usage: object}>}
   */
  async chat(sessionId, userMessage, profile = {}, airData = {}) {
    const contextPrompt = this._buildContextPrompt(userMessage, profile, airData);
    const previousId = this.sessions.get(sessionId);

    const params = {
      model: this.model,
      system_instruction: SYSTEM_PROMPT,
      input: contextPrompt,
      store: true,
    };

    // Link to previous turn for stateful conversation memory
    if (previousId) {
      params.previous_interaction_id = previousId;
    }

    const interaction = await this.client.interactions.create(params);
    this.sessions.set(sessionId, interaction.id);

    return {
      text: interaction.output_text,
      interactionId: interaction.id,
      sessionId,
      usage: interaction.usage,
    };
  }

  /**
   * Streaming version — yields text chunks in real-time
   */
  async *chatStream(sessionId, userMessage, profile = {}, airData = {}) {
    const contextPrompt = this._buildContextPrompt(userMessage, profile, airData);
    const previousId = this.sessions.get(sessionId);

    const params = {
      model: this.model,
      system_instruction: SYSTEM_PROMPT,
      input: contextPrompt,
      store: true,
      stream: true,
    };

    if (previousId) {
      params.previous_interaction_id = previousId;
    }

    let lastInteractionId = null;

    for await (const event of this.client.interactions.create(params)) {
      if (event.event_type === "step.delta" && event.delta?.type === "text") {
        yield { type: "text", text: event.delta.text };
      } else if (event.event_type === "interaction.completed") {
        lastInteractionId = event.interaction?.id;
        yield {
          type: "done",
          usage: event.interaction?.usage,
          interactionId: lastInteractionId,
        };
      }
    }

    if (lastInteractionId) {
      this.sessions.set(sessionId, lastInteractionId);
    }
  }

  /**
   * Generate a personalized "Emergency Action Plan" for Hazardous AQI
   */
  async generateEmergencyPlan(profile, airData) {
    const { city, aqi, pm25 } = airData;
    const prompt = `🚨 EMERGENCY SITUATION: AQI is ${aqi} (PM2.5: ${pm25} µg/m³) in ${city}.

User profile:
- Family: ${profile.family || "unspecified"}
- Has kids under 12: ${profile.hasKids ? "YES" : "No"}
- Elderly members: ${profile.hasElderly ? "YES" : "No"}
- Pre-existing respiratory conditions: ${profile.respiratory || "None mentioned"}
- Home type: ${profile.homeType || "unspecified"}

Generate a NUMBERED EMERGENCY ACTION PLAN with:
1. Immediate steps (next 30 minutes)
2. Home preparation checklist
3. When to seek medical attention
4. How to tell if indoor air quality is improving
5. Resources and helpline information

Be urgent but calm. This is a real health emergency.`;

    const interaction = await this.client.interactions.create({
      model: this.model,
      system_instruction: SYSTEM_PROMPT,
      input: prompt,
      store: false, // Emergency plans don't need to be stored
    });

    return interaction.output_text;
  }

  /**
   * Get a "Daily Routine Optimizer" — full day plan for given AQI
   */
  async optimizeDailyRoutine(profile, airData) {
    const prompt = `Create a FULL DAY low-emission routine for someone living in ${airData.city} (AQI: ${airData.aqi}).

Their lifestyle: ${JSON.stringify(profile)}

Format as a time-based schedule from 6 AM to 10 PM with:
- Each time slot: activity + air quality consideration + emission impact
- Mark outdoor windows (when AQI is typically lowest: usually 6-9 AM)
- Suggest emission alternatives for each major activity
- Include a "pollution budget" concept — how many outdoor minutes are safe today

Make it practical and human — not a lecture.`;

    const interaction = await this.client.interactions.create({
      model: this.model,
      system_instruction: SYSTEM_PROMPT,
      input: prompt,
      store: false,
    });

    return interaction.output_text;
  }

  /**
   * Calculate estimated PM2.5 reduction from lifestyle changes
   */
  async calculateImpact(choices) {
    const prompt = `A family wants to know the real impact of their sustainable choices.

Their planned changes:
${Object.entries(choices)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

Calculate and explain:
1. Estimated PM2.5 reduction (µg/m³) from each change
2. Equivalent in "fewer cigarettes breathed per day"
3. Annual carbon footprint reduction (kg CO₂)
4. Projected health outcome improvement (% risk reduction)
5. Community-scale impact if 100 families did the same

Use real scientific data and cite approximate sources. Make the numbers feel meaningful, not abstract.`;

    const interaction = await this.client.interactions.create({
      model: this.model,
      system_instruction: SYSTEM_PROMPT,
      input: prompt,
      store: false,
    });

    return interaction.output_text;
  }

  /** Clear a user's conversation session */
  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /** List all active sessions (for admin/monitoring) */
  getActiveSessions() {
    return this.sessions.size;
  }
}
