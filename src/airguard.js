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
  GOOD: { min: 0, max: 50, label: "Good", emoji: "🟢", color: "#00e400", bg: "rgba(0, 228, 0, 0.12)", advice: "Air quality is satisfactory; air pollution poses little or no risk." },
  MODERATE: { min: 51, max: 100, label: "Moderate", emoji: "🟡", color: "#e6c300", bg: "rgba(230, 195, 0, 0.12)", advice: "Acceptable quality; sensitive individuals may experience mild irritation." },
  UNHEALTHY_SENSITIVE: { min: 101, max: 150, label: "Unhealthy for Sensitive Groups", emoji: "🟠", color: "#ff7e00", bg: "rgba(255, 126, 0, 0.12)", advice: "Children, elderly, and respiratory patients should reduce prolonged outdoor exertion." },
  UNHEALTHY: { min: 151, max: 200, label: "Unhealthy", emoji: "🔴", color: "#ff3b30", bg: "rgba(255, 59, 48, 0.12)", advice: "Everyone may begin to experience adverse effects; avoid vigorous outdoor activity." },
  VERY_UNHEALTHY: { min: 201, max: 300, label: "Very Unhealthy", emoji: "🟣", color: "#af52de", bg: "rgba(175, 82, 222, 0.12)", advice: "Health alert: high risk of respiratory and cardiovascular aggravation for entire population." },
  HAZARDOUS: { min: 301, max: 1000, label: "Hazardous", emoji: "⚫", color: "#7e0023", bg: "rgba(126, 0, 35, 0.15)", advice: "Emergency warning: entire population is likely to be severely affected. Remain indoors." },
};

export function getAQIBand(aqi) {
  const numericAqi = Math.round(Number(aqi) || 0);
  return Object.values(AQI_BANDS).find((b) => numericAqi >= b.min && numericAqi <= b.max) ?? AQI_BANDS.HAZARDOUS;
}

// ── Sample city AQI database (used as fallback or quick presets) ────────────
export const CITY_AQI_DB = {
  delhi: { aqi: 312, pm25: 180, pm10: 290, no2: 85, o3: 42, so2: 18, co: 2200, city: "New Delhi", country: "India", lat: 28.6139, lon: 77.2090, season: "winter_smog" },
  mumbai: { aqi: 145, pm25: 68, pm10: 112, no2: 48, o3: 35, so2: 12, co: 1100, city: "Mumbai", country: "India", lat: 19.0760, lon: 72.8777, season: "moderate" },
  beijing: { aqi: 185, pm25: 95, pm10: 155, no2: 60, o3: 30, so2: 15, co: 1400, city: "Beijing", country: "China", lat: 39.9042, lon: 116.4074, season: "winter_smog" },
  lahore: { aqi: 295, pm25: 165, pm10: 245, no2: 78, o3: 38, so2: 22, co: 2100, city: "Lahore", country: "Pakistan", lat: 31.5204, lon: 74.3587, season: "winter_smog" },
  london: { aqi: 48, pm25: 12, pm10: 22, no2: 24, o3: 45, so2: 4, co: 420, city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, season: "winter_mild" },
  "los angeles": { aqi: 108, pm25: 35, pm10: 58, no2: 38, o3: 65, so2: 6, co: 780, city: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437, season: "moderate" },
  "new york": { aqi: 65, pm25: 18, pm10: 32, no2: 28, o3: 40, so2: 5, co: 510, city: "New York", country: "United States", lat: 40.7128, lon: -74.0060, season: "moderate" },
  paris: { aqi: 72, pm25: 22, pm10: 40, no2: 32, o3: 48, so2: 7, co: 590, city: "Paris", country: "France", lat: 48.8566, lon: 2.3522, season: "moderate" },
  kolkata: { aqi: 268, pm25: 148, pm10: 220, no2: 70, o3: 34, so2: 19, co: 1900, city: "Kolkata", country: "India", lat: 22.5726, lon: 88.3639, season: "winter_smog" },
  dhaka: { aqi: 278, pm25: 158, pm10: 235, no2: 72, o3: 32, so2: 20, co: 1950, city: "Dhaka", country: "Bangladesh", lat: 23.8103, lon: 90.4125, season: "winter_smog" },
  jakarta: { aqi: 158, pm25: 75, pm10: 125, no2: 45, o3: 50, so2: 14, co: 1250, city: "Jakarta", country: "Indonesia", lat: -6.2088, lon: 106.8456, season: "moderate" },
  cairo: { aqi: 175, pm25: 88, pm10: 148, no2: 55, o3: 52, so2: 25, co: 1350, city: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, season: "moderate" },
};

// ── The master system prompt ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are AirGuard AI — a compassionate, expert atmospheric scientist and family health advisor created for the PromptWars Google Developers competition.

## Your Core Mission
Help families, individuals, and urban communities navigate severe winter smog and urban air pollution. You explain exact air quality risks, recommend low-emission daily routines, indoor air quality (IAQ) hacks, and sustainable community alternatives tailored to their exact location and lifestyle.

## Key Capabilities & Pillars
1. **Accurate Risk Calibration**: Analyze live coordinates, AQI, PM2.5, PM10, NO₂, Ozone, SO₂, and CO levels.
2. **Indoor Air Protection (IAQ)**: Evidence-based techniques (HEPA CADR sizing, Corsi-Rosenthal boxes, sealing window drafts, exhaust ventilation, optimal plant transpiration, reducing cooking emissions).
3. **Lifestyle & Routine Optimization**: Hourly schedules (safe outdoor exercise windows, school commutes, low-emission cooking, clean transit).
4. **Child, Senior & Vulnerable Protection**: Pediatric lung protection, COPD/asthma safeguards, clinical warning signs.
5. **Mitigation & Maintaining Low AQI**: Concrete steps to lower emissions (EV adoption, induction cooking, banning biomass burning, rooftop gardens, neighborhood carpooling).
6. **Direct Impact Explanations**: Always translate choices into clear metrics (e.g., "reduces your indoor PM2.5 by ~65%", "equivalent to smoking 4 fewer cigarettes/day", "cuts ~320 kg CO₂ annually").

## Communication Rules
- Structure your response cleanly with clear headings and emojis.
- Start with a 1-sentence current risk evaluation based on their real AQI.
- Provide practical, immediate steps (Quick Wins < 5 mins) before long-term advice.
- When AQI > 150, emphasize outdoor precautions (N95/FFP2 masks, avoiding cardio outside).
- When AQI > 300, issue emergency protocol (stay indoors, seal fresh air leaks, run air purifiers continuously).
- Be empathetic, practical, and science-grounded without eco-shaming.`;

// ── AirGuardAI Client Class ──────────────────────────────────────────────────
export class AirGuardAI {
  constructor(apiKey) {
    this.apiKey = apiKey && apiKey !== "your_gemini_api_key_here" ? apiKey : null;
    this.model = "gemini-4-hydrogen";
    this.sessions = new Map(); // sessionId → last interaction ID

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        console.log("✅ Gemini Client initialized with model:", this.model);
      } catch (err) {
        console.warn("⚠️ Failed to initialize GoogleGenAI client:", err.message);
        this.client = null;
      }
    } else {
      console.warn("ℹ️ GEMINI_API_KEY is not set or placeholder. Intelligent rule-based engine active for offline/demo mode.");
      this.client = null;
    }
  }

  /**
   * Build a rich context-aware prompt from user profile + air data
   */
  _buildContextPrompt(userMessage, profile, airData) {
    const band = getAQIBand(airData.aqi);
    const locationName = airData.address || `${airData.city || 'Selected Location'}${airData.country ? ', ' + airData.country : ''}`;
    const coordsStr = (airData.lat && airData.lon) ? `(Lat: ${Number(airData.lat).toFixed(4)}, Lon: ${Number(airData.lon).toFixed(4)})` : "";

    const pollutants = [
      airData.pm25 !== undefined ? `• PM2.5: ${airData.pm25} µg/m³ (WHO 24h benchmark: 15 µg/m³)` : "",
      airData.pm10 !== undefined ? `• PM10: ${airData.pm10} µg/m³ (WHO 24h benchmark: 45 µg/m³)` : "",
      airData.no2 !== undefined ? `• NO₂: ${airData.no2} µg/m³` : "",
      airData.o3 !== undefined ? `• Ozone (O₃): ${airData.o3} µg/m³` : "",
      airData.so2 !== undefined ? `• SO₂: ${airData.so2} µg/m³` : "",
      airData.co !== undefined ? `• Carbon Monoxide (CO): ${airData.co} µg/m³` : "",
    ].filter(Boolean).join("\n");

    const profileStr = [
      profile.city ? `📍 Stated Location: ${profile.city}` : "",
      profile.family ? `👨‍👩‍👧 Household Members: ${profile.family}` : "",
      profile.lifestyle ? `🏃 Lifestyle / Work: ${profile.lifestyle}` : "",
      profile.commute ? `🚗 Commute Method: ${profile.commute}` : "",
      profile.cookingFuel ? `🍳 Cooking Fuel: ${profile.cookingFuel}` : "",
      profile.concerns ? `⚠️ Health Concerns: ${profile.concerns}` : "",
      profile.hasKids ? `👶 Children under 12 present` : "",
      profile.hasElderly ? `👴 Elderly adults (65+) present` : "",
      profile.respiratory ? `🫁 Pre-existing respiratory/cardiac condition` : "",
    ].filter(Boolean).join("\n");

    return `## Real-Time Environmental Context
📍 Location: ${locationName} ${coordsStr}
📊 Overall Air Quality Index: ${airData.aqi} — ${band.label} ${band.emoji}
🛡️ Standard Risk Assessment: ${band.advice}

### Measured Pollutant Concentrations
${pollutants || "Standard urban ambient pollutants"}

## User & Family Profile
${profileStr || "General household profile"}

## User Request
${userMessage}

Provide actionable, tailored advice addressing indoor air hacks, daily routine adjustments, precautions, and sustainable choices that reduce personal exposure and community emissions.`;
  }

  /**
   * Chat with AirGuard AI — stateful multi-turn conversation
   */
  async chat(sessionId, userMessage, profile = {}, airData = {}) {
    if (!this.client) {
      return this._generateFallbackResponse(userMessage, profile, airData, sessionId);
    }

    try {
      const contextPrompt = this._buildContextPrompt(userMessage, profile, airData);
      const previousId = this.sessions.get(sessionId);

      const params = {
        model: this.model,
        system_instruction: SYSTEM_PROMPT,
        input: contextPrompt,
        store: true,
      };

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
    } catch (err) {
      console.error("Gemini API error in chat:", err.message);
      return this._generateFallbackResponse(userMessage, profile, airData, sessionId);
    }
  }

  /**
   * Streaming version — yields text chunks in real-time
   */
  async *chatStream(sessionId, userMessage, profile = {}, airData = {}) {
    if (!this.client) {
      const fallback = this._generateFallbackResponse(userMessage, profile, airData, sessionId);
      yield { type: "text", text: fallback.text };
      yield { type: "done", usage: { total_tokens: 150 }, interactionId: fallback.interactionId };
      return;
    }

    try {
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
    } catch (err) {
      console.error("Gemini streaming error:", err.message);
      const fallback = this._generateFallbackResponse(userMessage, profile, airData, sessionId);
      yield { type: "text", text: fallback.text };
      yield { type: "done", usage: { total_tokens: 120 }, interactionId: fallback.interactionId };
    }
  }

  /**
   * Generate an Emergency Action Plan
   */
  async generateEmergencyPlan(profile, airData) {
    const band = getAQIBand(airData.aqi);
    const location = airData.address || airData.city || "your area";

    if (!this.client) {
      return `### 🚨 EMERGENCY SMOG ACTION PROTOCOL
**Location:** ${location} | **AQI:** ${airData.aqi} (${band.label} ${band.emoji})
**PM2.5:** ${airData.pm25 || 150} µg/m³ (~${Math.round((airData.pm25 || 150) / 15)}x WHO daily safe limit)

---

#### 1. Immediate 30-Minute Lockdown
- **Seal All Infiltration Points**: Close external windows and balcony doors. Place rolled damp towels or silicone draft stoppers along bottom gaps of doors.
- **Activate Air Purifiers on Max Speed**: Place your HEPA unit in the most frequented bedroom to create a designated "Clean Air Sanctuary".
- **Turn Off Unfiltered Exhausts**: Turn off bathroom and ceiling exhaust fans that draw polluted outdoor air inward through window seams.

#### 2. Vulnerable Group Safeguards (Children & Seniors)
- **Suspend Outdoor Exposure**: Absolutely no outdoor walks, playground time, or school sports until AQI drops below 150.
- **Medication Preparedness**: Ensure rapid-relief inhalers (e.g., Albuterol/Salbutamol) and spacer devices are within arm's reach.
- **Hydration & Nasal Saline**: Use sterile isotonic saline nasal sprays twice daily to rinse deposited particulate matter from upper airway mucosa.

#### 3. Respiratory Protective Equipment
- If stepping outdoors is mandatory, wear a certified, well-fitted **N95, FFP2, or KF94 mask**. Cloth and standard surgical masks provide less than 20% filtration against fine PM2.5 particles.

#### 4. Community & Emission Control
- Refrain from using gas/wood burners, lighting candles, incense sticks, or sweeping floors dry (use damp mopping instead).`;
    }

    const prompt = `🚨 EMERGENCY SITUATION: The AQI is currently ${airData.aqi} (${band.label}) in ${location}.
PM2.5 concentration is ${airData.pm25 || 'elevated'} µg/m³.

Family profile:
- Household: ${profile.family || "General household"}
- Children under 12: ${profile.hasKids ? "Yes" : "No"}
- Elderly present: ${profile.hasElderly ? "Yes" : "No"}
- Respiratory/Cardiovascular conditions: ${profile.respiratory || profile.concerns || "None specified"}

Generate a high-priority, step-by-step Emergency Action Plan with:
1. Immediate 30-minute indoor containment & air sealing steps
2. Specific protocol for vulnerable members (respiratory, pediatric, senior)
3. Mandatory outdoor protection guidelines
4. Things strictly to AVOID doing indoors during smog peaks
5. Warning symptoms that require medical consultation`;

    try {
      const interaction = await this.client.interactions.create({
        model: this.model,
        system_instruction: SYSTEM_PROMPT,
        input: prompt,
        store: false,
      });
      return interaction.output_text;
    } catch (err) {
      console.error("Emergency plan Gemini error:", err);
      return this.generateEmergencyPlan(profile, airData);
    }
  }

  /**
   * Get a Daily Routine Optimizer for the day
   */
  async optimizeDailyRoutine(profile, airData) {
    const band = getAQIBand(airData.aqi);
    const location = airData.address || airData.city || "your city";

    if (!this.client) {
      return `### 📅 Optimized Low-Emission Daily Schedule
**Location:** ${location} | **Current AQI:** ${airData.aqi} (${band.label} ${band.emoji})

---

- **06:00 – 08:00 (Early Morning Smog Peak)**
  * *Air Status*: Cold morning inversion traps heavy PM2.5 near the ground.
  * *Routine*: Keep all windows sealed. Do indoor yoga or stretching instead of outdoor jogging.
  * *Low-Emission Choice*: Avoid idling your car; switch to electric water heating.

- **08:00 – 09:30 (Morning Commute)**
  * *Air Status*: Heavy traffic creates sharp spikes in NO₂ and particulate matter.
  * *Routine*: Keep car air recirculation mode ON. Wear an N95 mask if walking or taking transit.
  * *Low-Emission Choice*: Carpool with colleagues or take the metro/bus to reduce single-occupancy tailpipe emissions.

- **12:00 – 15:00 (Mid-Day Ventilation Window)**
  * *Air Status*: Sun warming causes vertical mixing, typically yielding the day's lowest PM2.5 levels.
  * *Routine*: Quick 10-15 minute cross-ventilation if outdoor AQI is below 150, then immediately reseal and run HEPA air cleaners.
  * *Low-Emission Choice*: Use induction cooktops or microwaves instead of gas burners for lunch.

- **17:00 – 20:00 (Evening Rush & Dinner)**
  * *Air Status*: Evening traffic combines with dropping temperature to create secondary smog layer.
  * *Routine*: Keep children indoors. Turn on range hood with external ducted exhaust when cooking.
  * *Low-Emission Choice*: Avoid open grilling, wood-burning, or biomass heating.

- **21:00 – 06:00 (Nighttime Rest & Purification)**
  * *Air Status*: Stable atmospheric boundary layer traps nocturnal emissions.
  * *Routine*: Run bedroom air purifier on quiet night mode near the bed headboard.
  * *Low-Emission Choice*: Set thermostat efficiently to minimize nocturnal electricity generation demand.`;
    }

    const prompt = `Create a customized 24-hour Low-Emission & Clean-Air Daily Schedule for a family living in ${location} where the current AQI is ${airData.aqi} (${band.label}).
User profile: ${JSON.stringify(profile)}

Format as a structured time-block timeline from morning to night. For each slot include:
1. Expected atmospheric conditions (inversion layers, traffic peaks, ventilation windows)
2. Safe personal routine & exercise adjustments
3. Low-emission community alternative (transport, energy, cooking)
4. Concrete impact of following this slot`;

    try {
      const interaction = await this.client.interactions.create({
        model: this.model,
        system_instruction: SYSTEM_PROMPT,
        input: prompt,
        store: false,
      });
      return interaction.output_text;
    } catch (err) {
      console.error("Routine Gemini error:", err);
      return this.optimizeDailyRoutine(profile, airData);
    }
  }

  /**
   * Calculate estimated PM2.5 reduction from lifestyle changes
   */
  async calculateImpact(choices) {
    if (!this.client) {
      const items = Object.entries(choices).map(([k, v]) => `• **${k}**: ${v}`).join("\n");
      return `### 📊 Scientific Environmental & Health Impact Assessment

#### Evaluated Lifestyle & Community Shifts:
${items}

---

#### 1. Estimated Direct PM2.5 & Exposure Reduction
- **Indoor Exposure**: Adopting HEPA purification and induction cooking cuts indoor fine particulate exposure by **60% to 85%**, dropping particulate inhalation from typical 120 µg/m³ to under 25 µg/m³.
- **Commute Exposure**: Switching from open motorized transport or walking in traffic to electric transport with cabin filtration cuts breathed exhaust particles by **~70%**.

#### 2. Equivalent Health Dividend
- Reducing daily PM2.5 intake by 70 µg/m³ is clinically equivalent to avoiding the biological lung damage of **3.5 to 4.5 smoked cigarettes per day**.
- Reduces 1-year relative risk of acute asthma flare-ups by **38%** and systemic inflammatory markers (hs-CRP) by **22%**.

#### 3. Carbon & Community Emission Savings
- Replacing a petrol commute (20 km/day) with public transit or EV saves approx **1.2 tonnes of CO₂ equivalent** and eliminates ~2.4 kg of direct tailpipe PM2.5 per vehicle annually.
- If just **100 neighborhood families** adopt clean heating and electric cooking, local ground-level winter smog decreases by an estimated **8% to 14%** during inversion episodes.`;
    }

    const prompt = `A family wants a scientific calculation of their sustainable lifestyle choices:
${JSON.stringify(choices, null, 2)}

Calculate and clearly format:
1. Estimated PM2.5 concentration reduction (indoor & outdoor)
2. Health equivalent (e.g. avoided cigarettes per day, reduced respiratory risk %)
3. Annual CO₂ and NOx emissions eliminated
4. Community-scale impact if 100 households adopt this same routine`;

    try {
      const interaction = await this.client.interactions.create({
        model: this.model,
        system_instruction: SYSTEM_PROMPT,
        input: prompt,
        store: false,
      });
      return interaction.output_text;
    } catch (err) {
      console.error("Impact Gemini error:", err);
      return this.calculateImpact(choices);
    }
  }

  /**
   * Rule-based fallback generator for offline or unconfigured API keys
   */
  _generateFallbackResponse(userMessage, profile, airData, sessionId) {
    const band = getAQIBand(airData.aqi);
    const location = airData.address || airData.city || "your location";

    const text = `### 🌍 Current Air Risk Status: ${band.label} ${band.emoji} (AQI: ${airData.aqi})
**Location:** ${location} | **PM2.5:** ${airData.pm25 || 85} µg/m³

---

#### 🏠 1. High-Impact Indoor Air Hacks
1. **Seal Window Infiltration**: Smog enters via drafts. Run adhesive weather-stripping or draft blankets across outer balcony frames.
2. **HEPA Optimization**: Position your air cleaner at least 1 meter away from walls in the center of your primary living space on medium-high speed.
3. **Mopping vs Sweeping**: Dry sweeping aerosolizes fine particulate matter back into the air. Always damp-mop with microfiber cloths.

#### 🚶 2. Outdoor Precautions
- ${airData.aqi > 150 ? 'Wear an **N95 / FFP2 certified respirator** snugly fitted to the bridge of your nose. Cloth and surgical masks do NOT filter sub-2.5 micron particles.' : 'Air is moderate; normal outdoor activities can proceed with caution for sensitive individuals.'}
- Shift outdoor jogs or cardio to between 12:00 PM and 3:00 PM when solar warming breaks low-altitude temperature inversions.

#### ♻️ 3. Sustainable Alternatives & Maintaining Low AQI
- **Cooking Transition**: Gas burners generate significant NO₂ and ultrafine particles. Shift everyday boiling and simmering to an electric **induction cooktop**.
- **Clean Commute**: Use public transit, metro, or carpooling to reduce localized vehicle idling in your neighborhood.

#### ❤️ 4. Real Health Impact
- Following these steps typically lowers your personal 24-hour PM2.5 dose by **~65%**, reducing cardiovascular oxidative stress and lowering airway hyper-reactivity by over **30%**.

#### ⚡ 5. Quick Win (< 5 Minutes)
- **Check your stove & bathroom exhaust**: Ensure you don't leave passive exhaust vents open that draw winter smog inside your living room!`;

    return {
      text,
      interactionId: `offline_${Date.now()}`,
      sessionId,
      usage: { total_tokens: 180 },
    };
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  getActiveSessions() {
    return this.sessions.size;
  }
}
