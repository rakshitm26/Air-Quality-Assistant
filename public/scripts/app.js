// ============================================================
//  AirGuard AI — Frontend Application
//  PromptWars Google Developers 2026
// ============================================================

// ── State ────────────────────────────────────────────────────────────────────
let sessionId = null;
let currentCity = "delhi";
let currentAirData = null;
let isStreaming = false;

// ── DOM References ────────────────────────────────────────────────────────────
const $messages = document.getElementById("messages");
const $chatInput = document.getElementById("chatInput");
const $sendBtn = document.getElementById("sendBtn");
const $typingIndicator = document.getElementById("typingIndicator");
const $cityInput = document.getElementById("cityInput");
const $welcomeScreen = document.getElementById("welcomeScreen");
const $aqiBadge = document.getElementById("aqiBadge");
const $aqiCard = document.getElementById("aqiCard");
const $impactModal = document.getElementById("impactModal");

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  sessionId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  initParticles();
  await loadAQI(currentCity);
  setupEventListeners();
}

// ── AQI Data ──────────────────────────────────────────────────────────────────
async function loadAQI(city) {
  try {
    const res = await fetch(`/api/aqi/${encodeURIComponent(city)}`);
    const data = await res.json();
    currentAirData = data;
    updateAQIDisplay(data);
  } catch (err) {
    console.error("Failed to load AQI:", err);
    showToast("Could not load AQI data for that city.", "warning");
  }
}

function updateAQIDisplay(data) {
  const { aqi, pm25, pm10, city, country, band } = data;
  const pct = Math.min((aqi / 500) * 100, 100);

  // Header badge
  document.querySelector(".aqi-value").textContent = aqi;
  $aqiBadge.style.borderColor = band.color;
  $aqiBadge.style.color = band.color;
  $aqiBadge.classList.remove("loading");

  // Sidebar AQI card
  document.getElementById("aqiNumber").textContent = aqi;
  document.getElementById("aqiStatus").textContent = `${band.emoji} ${band.label}`;
  document.getElementById("aqiPM").textContent = `PM2.5: ${pm25} µg/m³ · PM10: ${pm10} µg/m³`;
  document.getElementById("aqiCity").textContent = `${city}, ${country}`;
  document.getElementById("aqiMeterFill").style.left = `calc(${pct}% - 6px)`;

  // AQI gauge ring color
  const gauge = document.getElementById("aqiGauge");
  gauge.style.borderColor = band.color;
  gauge.style.boxShadow = `0 0 20px ${band.color}40`;

  // AQI card class for conditional styling
  const bandClassMap = { "Good": "aqi-good", "Moderate": "aqi-moderate",
    "Unhealthy for Sensitive Groups": "aqi-sensitive", "Unhealthy": "aqi-unhealthy",
    "Very Unhealthy": "aqi-very", "Hazardous": "aqi-hazardous" };
  $aqiCard.className = `card aqi-card ${bandClassMap[band.label] || ""}`;

  // Flash hazard warning
  if (aqi >= 300) {
    showToast(`🚨 Hazardous AQI (${aqi}) detected in ${city}! Use the Emergency Plan.`, "error");
  } else if (aqi >= 200) {
    showToast(`⚠️ Very Unhealthy air in ${city} (AQI: ${aqi}). Limit outdoor exposure.`, "warning");
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function getProfile() {
  return {
    city: currentCity,
    family: document.getElementById("pFamily").value.trim(),
    lifestyle: document.getElementById("pLifestyle").value,
    commute: document.getElementById("pCommute").value,
    cookingFuel: document.getElementById("pCooking").value,
    concerns: document.getElementById("pConcerns").value.trim(),
    hasKids: document.getElementById("pKids").checked,
    hasElderly: document.getElementById("pElderly").checked,
    respiratory: document.getElementById("pRespiratory").checked
      ? "has respiratory condition" : "",
  };
}

async function sendMessage(message) {
  if (!message.trim() || isStreaming) return;

  hideWelcome();
  addMessage(message, "user");
  $chatInput.value = "";
  autoResizeTextarea();
  updateSendBtn();

  isStreaming = true;
  $typingIndicator.style.display = "flex";
  scrollToBottom();

  const aiMsgEl = addMessage("", "ai", "loading");

  try {
    const profile = getProfile();
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        message,
        profile,
        city: currentCity,
      }),
    });

    // Read SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    const bubble = aiMsgEl.querySelector(".msg-bubble");
    bubble.classList.remove("loading");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "init") {
            if (event.airData) currentAirData = event.airData;
            if (event.sessionId && !sessionId) sessionId = event.sessionId;
          } else if (event.type === "text") {
            fullText += event.text;
            bubble.innerHTML = renderMarkdown(fullText) + '<span class="cursor">▌</span>';
            scrollToBottom();
          } else if (event.type === "done") {
            bubble.innerHTML = renderMarkdown(fullText);
            updateTime(aiMsgEl);
            if (event.usage) {
              const tokenEl = document.createElement("div");
              tokenEl.className = "msg-time";
              tokenEl.textContent = `${event.usage.total_tokens?.toLocaleString() ?? "?"} tokens`;
              aiMsgEl.querySelector(".msg-content").appendChild(tokenEl);
            }
          } else if (event.type === "error") {
            bubble.innerHTML = `<span style="color:#f44">⚠️ Error: ${event.error}</span>`;
            showToast(event.error, "error");
          }
        } catch {}
      }
    }

  } catch (err) {
    const bubble = aiMsgEl.querySelector(".msg-bubble");
    bubble.classList.remove("loading");
    bubble.innerHTML = `<span style="color:#f44">⚠️ Connection error. Is the server running?</span>`;
    showToast("Connection error. Make sure the server is running.", "error");
  } finally {
    isStreaming = false;
    $typingIndicator.style.display = "none";
    updateSendBtn();
    scrollToBottom();
  }
}

// ── Message Rendering ─────────────────────────────────────────────────────────
function addMessage(text, role, extraClass = "") {
  const el = document.createElement("div");
  el.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = role === "ai" ? "🌬️" : "👤";

  const content = document.createElement("div");
  content.className = "msg-content";

  const bubble = document.createElement("div");
  bubble.className = `msg-bubble ${extraClass}`;
  bubble.innerHTML = extraClass === "loading" ? "" : renderMarkdown(text);

  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = formatTime(new Date());

  content.appendChild(bubble);
  if (extraClass !== "loading") content.appendChild(time);
  el.appendChild(avatar);
  el.appendChild(content);
  $messages.appendChild(el);
  scrollToBottom();
  return el;
}

function updateTime(el) {
  const existing = el.querySelector(".msg-time");
  if (existing) existing.textContent = formatTime(new Date());
}

// ── Simple Markdown Renderer ──────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // HR
    .replace(/^---$/gm, '<hr>')
    // Numbered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Bullet list items
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Wrap consecutive <li> in <ol> or <ul>  (simple heuristic)
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // Paragraphs — split by double newlines
    .split(/\n\n+/)
    .map((block) => {
      if (block.startsWith("<h") || block.startsWith("<ul") || block.startsWith("<hr") || block.startsWith("<blockquote")) return block;
      const lines = block.split("\n").join("<br>");
      return `<p>${lines}</p>`;
    })
    .join("\n");
}

// ── Special AI Actions ────────────────────────────────────────────────────────
async function runEmergencyPlan() {
  if (isStreaming) return;
  hideWelcome();
  addMessage("🚨 Generate Emergency Action Plan for current AQI conditions", "user");
  isStreaming = true;
  $typingIndicator.style.display = "flex";
  scrollToBottom();

  const bubble = addMessage("", "ai", "loading emergency-bg");

  try {
    const res = await fetch("/api/emergency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: getProfile(), city: currentCity }),
    });
    const data = await res.json();
    const b = bubble.querySelector(".msg-bubble");
    b.classList.remove("loading");
    b.classList.add("emergency-bg");
    b.innerHTML = renderMarkdown(data.plan);
    updateTime(bubble);
  } catch (err) {
    showToast("Failed to generate emergency plan", "error");
  } finally {
    isStreaming = false;
    $typingIndicator.style.display = "none";
    scrollToBottom();
  }
}

async function runDailyRoutine() {
  if (isStreaming) return;
  hideWelcome();
  addMessage("📅 Optimize my full day routine for today's air quality", "user");
  isStreaming = true;
  $typingIndicator.style.display = "flex";

  const bubble = addMessage("", "ai", "loading routine-bg");

  try {
    const res = await fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: getProfile(), city: currentCity }),
    });
    const data = await res.json();
    const b = bubble.querySelector(".msg-bubble");
    b.classList.remove("loading");
    b.classList.add("routine-bg");
    b.innerHTML = renderMarkdown(data.routine);
    updateTime(bubble);
  } catch (err) {
    showToast("Failed to generate daily routine", "error");
  } finally {
    isStreaming = false;
    $typingIndicator.style.display = "none";
    scrollToBottom();
  }
}

async function runImpactCalc() {
  const checked = [...document.querySelectorAll(".impact-option input:checked")];
  if (checked.length === 0) {
    showToast("Select at least one lifestyle change to calculate impact.", "warning");
    return;
  }

  $impactModal.style.display = "none";
  hideWelcome();

  const choices = {};
  checked.forEach((cb) => { choices[cb.value.split(" ")[0]] = cb.value; });

  addMessage(`📊 Calculate my impact for: ${checked.map(c => c.value.split(" ")[0]).join(", ")}`, "user");
  isStreaming = true;
  $typingIndicator.style.display = "flex";

  const bubble = addMessage("", "ai", "loading impact-bg");

  try {
    const res = await fetch("/api/impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choices }),
    });
    const data = await res.json();
    const b = bubble.querySelector(".msg-bubble");
    b.classList.remove("loading");
    b.classList.add("impact-bg");
    b.innerHTML = renderMarkdown(data.impact);
    updateTime(bubble);
  } catch (err) {
    showToast("Failed to calculate impact", "error");
  } finally {
    isStreaming = false;
    $typingIndicator.style.display = "none";
    scrollToBottom();
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  // Send on Enter (Shift+Enter = new line)
  $chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage($chatInput.value);
    }
  });

  $chatInput.addEventListener("input", () => {
    autoResizeTextarea();
    updateSendBtn();
  });

  $sendBtn.addEventListener("click", () => sendMessage($chatInput.value));

  // City update
  document.getElementById("updateCityBtn").addEventListener("click", async () => {
    const city = $cityInput.value.trim();
    if (!city) return;
    currentCity = city.toLowerCase();
    await loadAQI(currentCity);
    showToast(`📍 Switched to ${city}`, "success");
  });

  $cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("updateCityBtn").click();
  });

  // Profile collapse
  document.getElementById("toggleProfile").addEventListener("click", () => {
    const fields = document.getElementById("profileFields");
    const btn = document.getElementById("toggleProfile");
    const hidden = fields.style.display === "none";
    fields.style.display = hidden ? "" : "none";
    btn.textContent = hidden ? "▼" : "▶";
  });

  // Quick action buttons
  document.getElementById("btnEmergency").addEventListener("click", runEmergencyPlan);
  document.getElementById("btnRoutine").addEventListener("click", runDailyRoutine);
  document.getElementById("btnImpact").addEventListener("click", () => {
    $impactModal.style.display = "flex";
  });
  document.getElementById("btnClear").addEventListener("click", () => {
    $messages.innerHTML = "";
    $welcomeScreen && $messages.appendChild($welcomeScreen);
    $welcomeScreen && ($welcomeScreen.style.display = "");
    sessionId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    showToast("New conversation started 🌿", "success");
  });

  // Suggestion chips
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.q;
      $chatInput.value = q;
      autoResizeTextarea();
      updateSendBtn();
      sendMessage(q);
    });
  });

  // Impact modal
  document.getElementById("closeImpact").addEventListener("click", () => {
    $impactModal.style.display = "none";
  });
  document.getElementById("calcImpactBtn").addEventListener("click", runImpactCalc);
  $impactModal.addEventListener("click", (e) => {
    if (e.target === $impactModal) $impactModal.style.display = "none";
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function hideWelcome() {
  if ($welcomeScreen) $welcomeScreen.style.display = "none";
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    $messages.scrollTop = $messages.scrollHeight;
  });
}

function autoResizeTextarea() {
  $chatInput.style.height = "auto";
  $chatInput.style.height = Math.min($chatInput.scrollHeight, 120) + "px";
}

function updateSendBtn() {
  $sendBtn.disabled = !$chatInput.value.trim() || isStreaming;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById("toastContainer").appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// ── Particle Background ───────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let W, H, particles;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? "74,158,255" : "0,212,255",
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => { resize(); createParticles(); });
  resize(); createParticles(); draw();
}

// ── Kickoff ───────────────────────────────────────────────────────────────────
init();
