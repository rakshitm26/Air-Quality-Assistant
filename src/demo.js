// ============================================================
//  AirGuard AI — Interactive CLI Demo
//  PromptWars Google Developers 2026
//
//  Run: node src/demo.js
//  Shows all major features without needing a browser
// ============================================================

import "dotenv/config";
import readline from "readline";
import { AirGuardAI, CITY_AQI_DB, getAQIBand } from "./airguard.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const DIM = "\x1b[2m";

function banner() {
  console.log(`
${CYAN}${BOLD}╔════════════════════════════════════════════════════════════╗
║          🌬️  AirGuard AI — Interactive Demo                 ║
║          PromptWars Google Developers 2026                  ║
╚════════════════════════════════════════════════════════════╝${RESET}
  `);
}

function aqiBar(aqi) {
  const band = getAQIBand(aqi);
  const filled = Math.min(Math.floor(aqi / 10), 50);
  const bar = "█".repeat(filled) + "░".repeat(50 - filled);
  return `AQI ${aqi} ${band.emoji} [${bar}] ${band.label}`;
}

async function runDemo() {
  banner();

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
    console.error(`${RED}${BOLD}ERROR: GEMINI_API_KEY not set!${RESET}`);
    console.log(`\n${YELLOW}Please create a .env file from .env.example and add your API key.${RESET}`);
    console.log(`Get your key at: ${CYAN}https://aistudio.google.com/apikey${RESET}\n`);
    process.exit(1);
  }

  const airguard = new AirGuardAI(process.env.GEMINI_API_KEY);

  // ── Demo Profile ───────────────────────────────────────────────────────────
  const demoProfile = {
    city: "delhi",
    family: "couple with 2 kids (ages 5 and 8), one elderly parent",
    lifestyle: "work-from-home parent, daily school run, occasional outdoor exercise",
    commute: "personal car (petrol), sometimes auto-rickshaw",
    cookingFuel: "LPG gas stove",
    homeType: "2BHK apartment, 3rd floor",
    concerns: "child asthma, elderly parent with COPD",
    hasKids: true,
    hasElderly: true,
    respiratory: "child has mild asthma, parent has COPD",
  };

  const airData = CITY_AQI_DB["delhi"];

  console.log(`${BOLD}📍 Demo Location:${RESET} ${airData.city}, ${airData.country}`);
  console.log(`${BOLD}${aqiBar(airData.aqi)}${RESET}`);
  console.log(`   PM2.5: ${airData.pm25} µg/m³ (WHO limit: 15 µg/m³/day)`);
  console.log(`   PM10: ${airData.pm10} µg/m³\n`);

  // ── Demo Questions ─────────────────────────────────────────────────────────
  const demoQuestions = [
    "My kids need to go to school today and my elderly parent wants to take a morning walk. Is it safe? What precautions should we take?",
    "What can I do RIGHT NOW to improve the air quality inside our apartment without spending money?",
    "We're thinking of switching from our petrol car to an EV or using public transport. How much difference would it actually make to the air quality?",
  ];

  const sessionId = `demo_${Date.now()}`;

  for (let i = 0; i < demoQuestions.length; i++) {
    const q = demoQuestions[i];
    console.log(`\n${MAGENTA}${BOLD}━━━ Question ${i + 1}/${demoQuestions.length} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`${CYAN}👤 User:${RESET} ${q}\n`);
    console.log(`${GREEN}🤖 AirGuard AI:${RESET}`);

    // Stream the response character by character
    let fullText = "";
    process.stdout.write("   ");

    for await (const chunk of airguard.chatStream(sessionId, q, demoProfile, airData)) {
      if (chunk.type === "text") {
        process.stdout.write(chunk.text);
        fullText += chunk.text;
      } else if (chunk.type === "done") {
        console.log(`\n\n${DIM}   [Tokens used: ${chunk.usage?.total_tokens ?? "N/A"}]${RESET}`);
      }
    }
  }

  // ── Emergency Plan Demo ────────────────────────────────────────────────────
  console.log(`\n${RED}${BOLD}━━━ 🚨 EMERGENCY PLAN DEMO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${DIM}Generating emergency action plan for AQI ${airData.aqi}...${RESET}\n`);

  const emergencyPlan = await airguard.generateEmergencyPlan(demoProfile, airData);
  console.log(`${RED}🚨 Emergency Plan:${RESET}\n${emergencyPlan}`);

  // ── Impact Calculator Demo ─────────────────────────────────────────────────
  console.log(`\n${YELLOW}${BOLD}━━━ 📊 IMPACT CALCULATOR DEMO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${DIM}Calculating impact of sustainable choices...${RESET}\n`);

  const impactResult = await airguard.calculateImpact({
    "Switch petrol car → electric vehicle": "Full-time switch for daily 20km commute",
    "Replace gas stove → induction cooktop": "2 hours cooking daily",
    "Plant 5 air-purifying indoor plants": "In a 1000 sq ft apartment",
    "Use N95 masks outdoors": "During AQI > 150 days",
  });
  console.log(`${YELLOW}📊 Impact Analysis:${RESET}\n${impactResult}`);

  // ── Interactive Mode ───────────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}━━━ 💬 INTERACTIVE MODE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${DIM}Type your questions about air quality. Type 'exit' to quit.${RESET}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => {
    rl.question(`${CYAN}You: ${RESET}`, async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === "exit") {
        console.log(`\n${GREEN}Thanks for using AirGuard AI! Breathe clean. 🌿${RESET}\n`);
        rl.close();
        return;
      }

      console.log(`\n${GREEN}🤖 AirGuard AI:${RESET}`);
      process.stdout.write("   ");

      for await (const chunk of airguard.chatStream(sessionId, trimmed, demoProfile, airData)) {
        if (chunk.type === "text") {
          process.stdout.write(chunk.text);
        } else if (chunk.type === "done") {
          console.log(`\n${DIM}   [Tokens: ${chunk.usage?.total_tokens ?? "N/A"}]${RESET}\n`);
        }
      }

      ask(); // Next question
    });
  };

  ask();
}

runDemo().catch((err) => {
  console.error(`\n${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
