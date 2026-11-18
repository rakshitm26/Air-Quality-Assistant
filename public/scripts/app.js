// ============================================================
//  AirGuard AI — Urban Air Quality Assistant Frontend
//  PromptWars · Google Developers 2026
// ============================================================

// ── Application State ─────────────────────────────────────────
const state = {
  sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  currentLat: 28.6139, // Default: New Delhi
  currentLon: 77.2090,
  currentLocationName: "New Delhi, India",
  currentAddress: "National Capital Territory of Delhi, India",
  airData: null,
  map: null,
  marker: null,
  isStreaming: false,
};

// ── AQI Severity Color Mapping ────────────────────────────────
const AQI_COLORS = {
  good: "#10b981",
  moderate: "#eab308",
  sensitive: "#f97316",
  unhealthy: "#ef4444",
  very: "#a855f7",
  hazardous: "#be123c",
};

// ── DOM Initialization ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  initMap();
  initNavigation();
  initSearch();
  initHotspots();
  initCalculator();
  initCategoryTabs();
  initChatAssistant();

  // Load initial location (New Delhi)
  fetchLocationAir(state.currentLat, state.currentLon, state.currentLocationName);
});

// ── Leaflet Interactive Map ───────────────────────────────────
function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  state.map = L.map("map", {
    center: [state.currentLat, state.currentLon],
    zoom: 8,
    zoomControl: true,
    scrollWheelZoom: true,
  });

  // CartoDB Dark Matter Tiles (Sleek modern dark theme)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(state.map);

  // Custom Pulsing DivIcon
  const customIcon = L.divIcon({
    className: "custom-map-pin",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  state.marker = L.marker([state.currentLat, state.currentLon], {
    icon: customIcon,
    draggable: true,
  }).addTo(state.map);

  // Dragging the pin
  state.marker.on("dragend", async (e) => {
    const { lat, lng } = e.target.getLatLng();
    await onLocationSelected(lat, lng);
  });

  // Clicking anywhere on map
  state.map.on("click", async (e) => {
    const { lat, lng } = e.latlng;
    state.marker.setLatLng([lat, lng]);
    await onLocationSelected(lat, lng);
  });

  // Button: Locate on Map
  document.getElementById("btnLocateOnMap")?.addEventListener("click", () => {
    locateUserGPS();
  });
}

async function onLocationSelected(lat, lon) {
  state.currentLat = lat;
  state.currentLon = lon;

  document.getElementById("dispLat").textContent = lat.toFixed(4);
  document.getElementById("dispLon").textContent = lon.toFixed(4);

  // Reverse geocode
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    state.currentLocationName = data.city || data.display?.split(",")[0] || "Selected Pinpoint";
    state.currentAddress = data.display || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (err) {
    state.currentLocationName = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    state.currentAddress = `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  await fetchLocationAir(lat, lon, state.currentLocationName);
}

// ── Live Air Quality Data Fetcher ──────────────────────────────
async function fetchLocationAir(lat, lon, locationName) {
  showToast(`Fetching live air diagnostics for ${locationName}...`);

  try {
    const res = await fetch(`/api/aqi-live?lat=${lat}&lon=${lon}&city=${encodeURIComponent(locationName)}`);
    const data = await res.json();
    state.airData = data;

    updateUI(data);
    showToast(`Updated to ${locationName} · AQI ${data.aqi}`, data.aqi > 200 ? "warn" : "info");
  } catch (err) {
    console.error("Failed to load air data:", err);
    showToast("Error updating live air data", "warn");
  }
}

// ── UI Dashboard & Component Updates ──────────────────────────
function updateUI(data) {
  const { aqi, pm25, pm10, no2, o3, so2, co, dominant, band, timestamp } = data;

  // 1. Navigation Pill
  const navVal = document.getElementById("navAqiVal");
  const navPill = document.getElementById("navAqiPill");
  if (navVal && navPill) {
    navVal.textContent = aqi;
    const dot = navPill.querySelector(".pill-dot");
    if (dot) {
      dot.style.background = band.color;
      dot.style.boxShadow = `0 0 10px ${band.color}`;
    }
  }

  // 2. Map Floating Card
  const flName = document.getElementById("floatingLocName");
  const flChip = document.getElementById("floatingAqiChip");
  const flAddr = document.getElementById("floatingLocAddress");
  const flPm25 = document.getElementById("flPm25");
  const flPm10 = document.getElementById("flPm10");
  const flDom = document.getElementById("flDominant");

  if (flName) flName.textContent = state.currentLocationName;
  if (flAddr) flAddr.textContent = state.currentAddress;
  if (flChip) {
    flChip.textContent = `AQI ${aqi}`;
    flChip.style.background = band.color;
    flChip.style.boxShadow = `0 0 12px ${band.color}60`;
  }
  if (flPm25) flPm25.textContent = `${pm25} µg/m³`;
  if (flPm10) flPm10.textContent = `${pm10} µg/m³`;
  if (flDom) flDom.textContent = dominant || "PM2.5";

  // 3. Main Dashboard Gauge
  const dashLoc = document.getElementById("dashLocationName");
  if (dashLoc) dashLoc.textContent = state.currentLocationName;

  const numEl = document.getElementById("dashAqiNumber");
  if (numEl) numEl.textContent = aqi;

  const badgeEl = document.getElementById("dashAqiBadge");
  if (badgeEl) {
    badgeEl.textContent = band.label;
    badgeEl.style.background = band.color;
    badgeEl.style.boxShadow = `0 0 14px ${band.color}60`;
  }

  // Circular SVG Arc Progress
  const circleProgress = document.getElementById("aqiProgressCircle");
  if (circleProgress) {
    const circumference = 534; // 2 * PI * 85
    const ratio = Math.min(aqi, 500) / 500;
    const offset = circumference - (ratio * circumference);
    circleProgress.style.strokeDashoffset = offset;
    circleProgress.style.stroke = band.color;
  }

  // Assessment Box
  const assessBox = document.getElementById("gaugeAssessmentBox");
  const adviceText = document.getElementById("gaugeAdviceText");
  const assessIcon = document.getElementById("assessIcon");
  if (assessBox && adviceText) {
    adviceText.textContent = band.advice;
    assessBox.style.borderColor = `${band.color}60`;
    assessBox.style.background = band.bg;
    if (assessIcon) assessIcon.textContent = band.emoji;
  }

  const timeEl = document.getElementById("dashTimestamp");
  if (timeEl && timestamp) {
    timeEl.textContent = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // 4. Pollutants Progress Bars & Numbers
  updatePollutant("valPm25", "barPm25", pm25, 250);
  updatePollutant("valPm10", "barPm10", pm10, 350);
  updatePollutant("valNo2", "barNo2", no2, 160);
  updatePollutant("valO3", "barO3", o3, 140);
  updatePollutant("valSo2", "barSo2", so2, 80);
  updatePollutant("valCo", "barCo", co, 4000);

  // WHO Safe Limit comparison multipliers
  const whoPm25El = document.getElementById("whoRatioPm25");
  if (whoPm25El && pm25 != null) {
    const ratio = (pm25 / 15).toFixed(1);
    whoPm25El.textContent = `${ratio}x above safe limit`;
    whoPm25El.style.color = ratio > 1 ? "#fda4af" : "#86efac";
  }

  const whoPm10El = document.getElementById("whoRatioPm10");
  if (whoPm10El && pm10 != null) {
    const ratio = (pm10 / 45).toFixed(1);
    whoPm10El.textContent = `${ratio}x above safe limit`;
    whoPm10El.style.color = ratio > 1 ? "#fda4af" : "#86efac";
  }

  // 5. Active Precautions Band Glow
  document.querySelectorAll(".band-card").forEach((card) => {
    const min = parseInt(card.dataset.min, 10);
    const max = parseInt(card.dataset.max, 10);
    if (aqi >= min && aqi <= max) {
      card.classList.add("active-band");
    } else {
      card.classList.remove("active-band");
    }
  });
}

function updatePollutant(valId, barId, value, maxVal) {
  const valEl = document.getElementById(valId);
  const barEl = document.getElementById(barId);
  if (valEl) valEl.textContent = value != null ? value : "—";
  if (barEl) {
    const pct = Math.min(100, Math.max(5, ((value || 0) / maxVal) * 100));
    barEl.style.width = `${pct}%`;
  }
}

// ── Search & Geocoding Autocomplete ───────────────────────────
function initSearch() {
  const heroInput = document.getElementById("heroLocationSearch");
  const heroBtn = document.getElementById("heroSearchBtn");
  const dropdown = document.getElementById("searchDropdown");

  const mapInput = document.getElementById("mapSearchInput");
  const mapBtn = document.getElementById("mapSearchBtn");

  let debounceTimer;

  heroInput?.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      if (dropdown) dropdown.style.display = "none";
      return;
    }

    debounceTimer = setTimeout(() => {
      searchPlaces(q, dropdown, heroInput);
    }, 300);
  });

  heroBtn?.addEventListener("click", () => {
    const q = heroInput.value.trim();
    if (q) searchAndSelectFirst(q);
  });

  heroInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = heroInput.value.trim();
      if (q) searchAndSelectFirst(q);
    }
  });

  mapBtn?.addEventListener("click", () => {
    const q = mapInput.value.trim();
    if (q) searchAndSelectFirst(q);
  });

  mapInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = mapInput.value.trim();
      if (q) searchAndSelectFirst(q);
    }
  });

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (!heroInput?.contains(e.target) && !dropdown?.contains(e.target)) {
      if (dropdown) dropdown.style.display = "none";
    }
  });
}

async function searchPlaces(query, dropdownEl, inputEl) {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      dropdownEl.innerHTML = `<div class="dropdown-item" style="color:var(--text-dim)">No matching locations found</div>`;
      dropdownEl.style.display = "block";
      return;
    }

    dropdownEl.innerHTML = results.map((item) => `
      <div class="dropdown-item" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${item.name}, ${item.country}">
        <span>📍</span>
        <div>
          <strong>${item.name}</strong>
          <small style="color:var(--text-muted); display:block">${[item.admin1, item.country].filter(Boolean).join(", ")}</small>
        </div>
      </div>
    `).join("");

    dropdownEl.style.display = "block";

    dropdownEl.querySelectorAll(".dropdown-item").forEach((item) => {
      item.addEventListener("click", () => {
        const lat = parseFloat(item.dataset.lat);
        const lon = parseFloat(item.dataset.lon);
        const name = item.dataset.name;

        inputEl.value = name;
        dropdownEl.style.display = "none";
        selectPlace(lat, lon, name);
      });
    });
  } catch (err) {
    console.error("Geocode lookup failed:", err);
  }
}

async function searchAndSelectFirst(query) {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const first = (data.results || [])[0];
    if (first) {
      selectPlace(first.lat, first.lon, `${first.name}, ${first.country}`);
      const dropdown = document.getElementById("searchDropdown");
      if (dropdown) dropdown.style.display = "none";
    } else {
      showToast("Location not found. Please try a different query.", "warn");
    }
  } catch (err) {
    showToast("Search failed. Check your internet connection.", "warn");
  }
}

function selectPlace(lat, lon, name) {
  state.currentLat = lat;
  state.currentLon = lon;
  state.currentLocationName = name;
  state.currentAddress = name;

  if (state.map && state.marker) {
    state.map.flyTo([lat, lon], 11, { duration: 1.2 });
    state.marker.setLatLng([lat, lon]);
  }

  document.getElementById("dispLat").textContent = lat.toFixed(4);
  document.getElementById("dispLon").textContent = lon.toFixed(4);

  fetchLocationAir(lat, lon, name);
}

// ── GPS Geolocation ───────────────────────────────────────────
function locateUserGPS() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser.", "warn");
    return;
  }

  showToast("Locating your device via GPS...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      selectPlace(latitude, longitude, "My Current Location");
    },
    (err) => {
      console.warn("Geolocation error:", err);
      showToast("Could not access your location. Using default.", "warn");
    },
    { timeout: 8000 }
  );
}

// ── Hotspot Quick Buttons ─────────────────────────────────────
function initHotspots() {
  document.querySelectorAll(".hotspot-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      const name = btn.dataset.name;
      selectPlace(lat, lon, name);
    });
  });

  document.getElementById("btnLocateMeNav")?.addEventListener("click", () => {
    locateUserGPS();
  });
}

// ── Category Tabs (Reduce AQI) ────────────────────────────────
function initCategoryTabs() {
  const tabs = document.querySelectorAll(".cat-tab");
  const cards = document.querySelectorAll(".solution-card");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const cat = tab.dataset.cat;
      cards.forEach((card) => {
        if (cat === "all" || card.dataset.cat === cat) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

// ── Impact Calculator Checklist ───────────────────────────────
function initCalculator() {
  const checkboxes = document.querySelectorAll(".calc-check-item input[type='checkbox']");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", updateCalculatedImpact);
  });

  updateCalculatedImpact();

  document.getElementById("btnDetailedAiImpact")?.addEventListener("click", () => {
    const checked = Array.from(checkboxes)
      .filter((c) => c.checked)
      .map((c) => c.nextElementSibling.nextElementSibling.textContent.trim());

    const message = `Please give me a detailed scientific environmental and health impact calculation for adopting these sustainable practices in ${state.currentLocationName} (current AQI ${state.airData?.aqi || 200}):\n${checked.map((i) => `• ${i}`).join("\n")}`;

    // Scroll to assistant and trigger message
    const chatSec = document.getElementById("assistant");
    chatSec?.scrollIntoView({ behavior: "smooth" });

    setTimeout(() => {
      sendChatMessage(message);
    }, 600);
  });
}

function updateCalculatedImpact() {
  const checked = document.querySelectorAll(".calc-check-item input[type='checkbox']:checked");
  const count = checked.length;

  const dropEl = document.getElementById("resPmDrop");
  const cigsEl = document.getElementById("resCigs");
  const co2El = document.getElementById("resCo2");

  if (!dropEl) return;

  const pmDropPct = Math.min(85, count * 17);
  const cigsAvoided = (count * 1.05).toFixed(1);
  const co2Kg = count * 350;

  dropEl.textContent = `-${pmDropPct}%`;
  cigsEl.textContent = `${cigsAvoided}`;
  co2El.textContent = `-${co2Kg.toLocaleString()} kg`;
}

// ── GenAI Assistant (Gemini 4 Hydrogen) ────────────────────────
function initChatAssistant() {
  const sendBtn = document.getElementById("chatSendBtn");
  const textarea = document.getElementById("chatTextarea");

  sendBtn?.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (text && !state.isStreaming) {
      sendChatMessage(text);
      textarea.value = "";
      textarea.style.height = "auto";
      sendBtn.disabled = true;
    }
  });

  textarea?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn?.click();
    }
  });

  textarea?.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    if (sendBtn) sendBtn.disabled = !textarea.value.trim() || state.isStreaming;
  });

  // Suggestion Chips
  document.querySelectorAll(".chat-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.q;
      sendChatMessage(q);
    });
  });

  // Rapid Trigger Buttons
  document.getElementById("btnAiEmergency")?.addEventListener("click", () => {
    sendChatMessage("🚨 Generate an immediate emergency action plan for current smog conditions right now.");
  });

  document.getElementById("btnAiRoutine")?.addEventListener("click", () => {
    sendChatMessage("📅 Optimize my full 24-hour daily routine based on today's AQI and weather conditions.");
  });

  document.getElementById("btnAiImpact")?.addEventListener("click", () => {
    sendChatMessage("📊 Calculate the direct health and emission impact of switching to induction cooking, EV commute, and HEPA purifiers.");
  });

  document.getElementById("btnAiClear")?.addEventListener("click", () => {
    state.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const msgs = document.getElementById("chatMessages");
    if (msgs) {
      msgs.innerHTML = `
        <div class="chat-msg ai">
          <div class="msg-avatar">🌬️</div>
          <div class="msg-body">
            <div class="msg-bubble">
              <p>Conversation reset. Ready for new atmospheric analysis for <strong>${state.currentLocationName}</strong>.</p>
            </div>
          </div>
        </div>
      `;
    }
    showToast("AI session refreshed.");
  });
}

async function sendChatMessage(userText) {
  if (state.isStreaming) return;

  const msgsContainer = document.getElementById("chatMessages");
  const typingEl = document.getElementById("chatTyping");
  const sendBtn = document.getElementById("chatSendBtn");

  // Append user message bubble
  appendMessageBubble("user", userText);

  state.isStreaming = true;
  if (typingEl) typingEl.style.display = "flex";
  if (sendBtn) sendBtn.disabled = true;

  // Gather current user profile inputs
  const profile = {
    city: state.currentLocationName,
    family: document.getElementById("aiFamilyInput")?.value || "Family household",
    commute: document.getElementById("aiCommuteSelect")?.value || "Daily commute",
    concerns: document.getElementById("aiVulnerabilityInput")?.value || "General respiratory health",
  };

  const payload = {
    sessionId: state.sessionId,
    message: userText,
    profile,
    airData: state.airData || { aqi: 150, city: state.currentLocationName },
  };

  try {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    // Create empty AI response bubble
    const aiBubble = appendMessageBubble("ai", "");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "text") {
              fullText += parsed.text;
              aiBubble.innerHTML = formatMarkdown(fullText);
              msgsContainer.scrollTop = msgsContainer.scrollHeight;
            } else if (parsed.type === "init") {
              state.sessionId = parsed.sessionId;
            }
          } catch (e) {
            // Ignore parse errors on malformed chunks
          }
        }
      }
    }
  } catch (err) {
    console.error("Chat error:", err);
    appendMessageBubble("ai", "I encountered an error connecting to the Gemini engine. Please check your network or try again.");
  } finally {
    state.isStreaming = false;
    if (typingEl) typingEl.style.display = "none";
    if (sendBtn) sendBtn.disabled = false;
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  }
}

function appendMessageBubble(role, content) {
  const container = document.getElementById("chatMessages");
  if (!container) return null;

  const row = document.createElement("div");
  row.className = `chat-msg ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = role === "user" ? "👤" : "🌬️";

  const body = document.createElement("div");
  body.className = "msg-body";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = formatMarkdown(content);

  body.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(body);
  container.appendChild(row);

  container.scrollTop = container.scrollHeight;
  return bubble;
}

// ── Markdown Formatter ─────────────────────────────────────────
function formatMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^## (.*$)/gim, '<h3>$1</h3>')
    .replace(/^# (.*$)/gim, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*\• (.*$)/gim, '<li>$1</li>')
    .replace(/^\s*\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
    .replace(/\n{2,}/gim, '</p><p>')
    .replace(/\n/gim, '<br/>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ── Smooth Navigation & Scroll Spy ────────────────────────────
function initNavigation() {
  const navbar = document.getElementById("navbar");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const navMenu = document.getElementById("navMenu");

  // Sticky blur on scroll
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar?.classList.add("scrolled");
    } else {
      navbar?.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  mobileBtn?.addEventListener("click", () => {
    navMenu?.classList.toggle("open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navMenu?.classList.remove("open");
    });
  });

  // Scrollspy via Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((l) => {
            if (l.getAttribute("href") === `#${id}`) {
              l.classList.add("active");
            } else {
              l.classList.remove("active");
            }
          });
        }
      });
    },
    { threshold: 0.3 }
  );

  sections.forEach((sec) => observer.observe(sec));
}

// ── Particle Canvas Animation ─────────────────────────────────
function initParticles() {
  const canvas = document.getElementById("particlesCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  const particleCount = 45;
  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2 + 0.8,
    dx: (Math.random() - 0.5) * 0.4,
    dy: -Math.random() * 0.3 - 0.1, // gently rising
    alpha: Math.random() * 0.4 + 0.1,
  }));

  function render() {
    ctx.clearRect(0, 0, w, h);

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.fill();

      p.x += p.dx;
      p.y += p.dy;

      if (p.y < 0) {
        p.y = h + 5;
        p.x = Math.random() * w;
      }
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
    });

    requestAnimationFrame(render);
  }

  render();
}

// ── Toast Notification Helper ─────────────────────────────────
function showToast(message, type = "info") {
  const shelf = document.getElementById("toastShelf");
  if (!shelf) return;

  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.style.borderColor = type === "warn" ? "var(--aqi-unhealthy)" : "var(--accent-cyan)";
  toast.textContent = message;

  shelf.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
