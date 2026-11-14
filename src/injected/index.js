/**
 * Fox ESS Cloud Extension — Entry Point
 *
 * Loaded as a MAIN-world content script at document_start so the network and
 * WebSocket interceptors are installed before the dashboard boots.
 *
 * Order matters:
 *   1. WebSocket interceptor (must run before page scripts)
 *   2. API interceptors (imported for side effects, also before page scripts)
 *   3. Message bridge + settings
 *   4. Single DOM observer for dashboard charts / gauge / overlays
 */

import state from "./state.js";
import { showSankeyDiagram } from "./sankey/sankey.js";
import {
  ensureSolarGauge,
  toggleSolarGauge,
  toggleSolarCapacity,
  toggleSolarPercentLabel,
  toggleSolarHistory,
  toggleBatteryEstimate,
  setBatteryCapacity,
  setBatteryMinSoc,
} from "./progress-bar/vertical.js";
import { initializeWebSocketInterceptor } from "./websocket/ws.js";
import { applyToAllCharts } from "./chart/unstack.js";
import { startDomObserver, syncDashboardNow } from "./dom.js";
// Side-effect import: installs fetch + XHR interceptors immediately.
import "./interceptor/api.js";

const SOURCE = "foxesscloud-extension";
const STYLE_ID = "foxesscloud-styles";

// Install the WebSocket patch before any page script can create a socket.
initializeWebSocketInterceptor();

// ==================== Styles ====================

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html.foxess-hide-bloat .tab-wrap,
    html.foxess-hide-bloat .overviewTitle,
    html.foxess-hide-bloat .cookie-consent-wrapper,
    html.foxess-hide-bloat .backv1-btn {
      display: none !important;
    }

    html.foxess-hide-bloat .overview {
      height: 100% !important;
      padding-top: 20px !important;
      padding-bottom: 20px !important;
    }

    html.foxess-hide-bloat .overview .overviewContent .overviewRight {
      flex: 5 !important;
    }
  `;

  (document.head || document.documentElement)?.appendChild(style);
}

function toggleOpenTabsVisibility(show) {
  ensureStyles();
  document.documentElement?.classList.toggle("foxess-hide-bloat", !!show);
}

function applyUiState() {
  toggleOpenTabsVisibility(state.hideOpenTabs);
}

// ==================== Settings ====================

function applySettings(settings) {
  if (!settings || typeof settings !== "object") return;

  if (typeof settings.hideOpenTabs === "boolean") {
    state.hideOpenTabs = settings.hideOpenTabs;
  }
  applyUiState();

  if (typeof settings.unstackCharts === "boolean") {
    state.currentStackMode = !settings.unstackCharts;
    applyToAllCharts();
  }

  if (typeof settings.showSankey === "boolean") {
    showSankeyDiagram(settings.showSankey);
  }

  if (typeof settings.showSolarGauge === "boolean") {
    toggleSolarGauge(settings.showSolarGauge);
  }
  if (typeof settings.showSolarCapacity === "boolean") {
    toggleSolarCapacity(settings.showSolarCapacity);
  }
  if (typeof settings.showSolarPercent === "boolean") {
    toggleSolarPercentLabel(settings.showSolarPercent);
  }
  if (typeof settings.showSolarHistory === "boolean") {
    toggleSolarHistory(settings.showSolarHistory);
  }

  if (typeof settings.showBatteryEstimate === "boolean") {
    toggleBatteryEstimate(settings.showBatteryEstimate);
  }
  if (
    settings.batteryCapacityKwh !== undefined &&
    settings.batteryCapacityKwh !== null
  ) {
    setBatteryCapacity(settings.batteryCapacityKwh);
  }
  if (
    settings.minSocPercent !== undefined &&
    settings.minSocPercent !== null
  ) {
    setBatteryMinSoc(settings.minSocPercent);
  }

  // Host elements may not exist yet; this is a no-op until they do.
  ensureSolarGauge();
}

// ==================== Message Handler ====================

function announceReady() {
  window.postMessage({ source: SOURCE, type: "FOXESS_READY" }, "*");
}

window.addEventListener("message", (event) => {
  if (event.data?.source !== SOURCE) return;

  const data = event.data;

  switch (data.type) {
    case "APPLY_SETTINGS":
      applySettings(data.settings);
      break;

    case "SET_UNSTACKED":
      state.currentStackMode = data.value;
      applyToAllCharts();
      break;

    case "SHOW_SANKEY":
      showSankeyDiagram(data.value);
      break;

    case "HIDE_OPEN_TABS":
      state.hideOpenTabs = data.value;
      applyUiState();
      break;

    case "SHOW_SOLAR_GAUGE":
      toggleSolarGauge(data.value);
      break;

    case "SHOW_SOLAR_CAPACITY":
      toggleSolarCapacity(data.value);
      break;

    case "SHOW_SOLAR_PERCENT_LABEL":
      toggleSolarPercentLabel(data.value);
      break;

    case "SHOW_SOLAR_HISTORY":
      toggleSolarHistory(data.value);
      break;

    case "SHOW_BATTERY_ESTIMATE":
      toggleBatteryEstimate(data.value);
      break;

    case "SET_BATTERY_CAPACITY":
      setBatteryCapacity(data.value);
      break;

    case "SET_MIN_SOC":
      setBatteryMinSoc(data.value);
      break;

    case "FOXESS_READY":
      // Our own announcement; ignore.
      break;

    default:
      console.warn("Unknown message type:", data.type);
  }
});

// ==================== Bootstrap ====================

function start() {
  applyUiState();
  startDomObserver();
  syncDashboardNow();
  announceReady();
}

// Watch from the very beginning so the first SPA render is not missed.
startDomObserver();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}

// Ask the isolated-world bridge for persisted settings. If the bridge is not
// listening yet it sends its initial snapshot itself, so no retry timer needed.
announceReady();
