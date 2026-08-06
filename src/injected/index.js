/**
 * Fox ESS Cloud Extension — Entry Point
 *
 * This file bootstraps all modules. It is the single entry for esbuild,
 * which bundles everything into the final `injected.js`.
 *
 * Order matters:
 *   1. State (singleton)
 *   2. Chart unstack + hook (observers + initial run)
 *   3. API interceptors (fetch + XHR)
 *   4. Message handler bridge
 *   5. Progress bar + WebSocket interceptor
 */

import state from "./state.js";
import { showSankeyDiagram } from "./sankey/sankey.js";
import {
  createVerticalProgressBar,
  toggleSolarGauge,
  toggleSolarCapacity,
  toggleSolarPercentLabel,
  toggleSolarHistory,
  toggleBatteryEstimate,
  setBatteryCapacity,
} from "./progress-bar/vertical.js";
import { initializeWebSocketInterceptor } from "./websocket/ws.js";
import { applyToAllCharts } from "./chart/unstack.js";
// Side-effect imports: these modules self-initialize on import
import "./chart/hook.js";
import "./interceptor/api.js";
// Add lightweight axes + guide lines for simple echarts instances
import "./axes.js";

function toggleOpenTabsVisibility(show) {
  document
    .querySelectorAll(
      `.tab-wrap, .overviewTitle, .cookie-consent-wrapper, .backv1-btn`,
    )
    .forEach((el) => {
      el.style.display = show ? "none" : "";
    });

  // remove the grey bar at the bottom of the overview page
  document.querySelectorAll(".overview").forEach((el) => {
    el.style.height = show ? "100%" : "calc(100% - 75px)";
    el.style.paddingTop = show ? "20px" : undefined;
    el.style.paddingBottom = show ? "20px" : undefined;
  });

  const overviewRightWrap = document.querySelector(
    ".overview .overviewContent .overviewRight",
  );
  if (overviewRightWrap) {
    overviewRightWrap.style.flex = show ? "5" : "7";
  }
}

// ==================== Message Handler ====================
window.addEventListener("message", (event) => {
  // Security check - only accept messages from our extension
  if (event.data?.source !== "foxesscloud-extension") return;

  const data = event.data;
  console.log("[FoxESS] message:", data.type, data.value);

  switch (data.type) {
    case "SET_UNSTACKED":
      state.currentStackMode = data.value;
      applyToAllCharts();
      break;

    case "SHOW_SANKEY":
      showSankeyDiagram(data.value);
      break;

    case "HIDE_OPEN_TABS":
      state.hideOpenTabs = data.value;
      toggleOpenTabsVisibility(state.hideOpenTabs);
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

    // Add more message types easily here:

    default:
      console.warn("Unknown message type:", data.type);
  }
});

// ====================== VERTICAL PROGRESS BAR + WS ======================
function start() {
  createVerticalProgressBar(0);
  toggleOpenTabsVisibility(state.hideOpenTabs);
  initializeWebSocketInterceptor();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
