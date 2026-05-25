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
} from "./progress-bar/vertical.js";
import { initializeWebSocketInterceptor } from "./websocket/ws.js";
import { applyToAllCharts } from "./chart/unstack.js";
// Side-effect imports: these modules self-initialize on import
import "./chart/hook.js";
import "./interceptor/api.js";

// ==================== Message Handler ====================
window.addEventListener("message", (event) => {
  // Security check - only accept messages from our extension
  if (event.data?.source !== "foxesscloud-extension") return;

  const data = event.data;

  switch (data.type) {
    case "SET_UNSTACKED":
      state.currentStackMode = data.value;
      applyToAllCharts();
      break;

    case "SHOW_SANKEY":
      showSankeyDiagram(data.value);
      break;

    case "SHOW_SOLAR_GAUGE":
      toggleSolarGauge(data.value);
      break;

    // Add more message types easily here:
    // case "SHOW_BATTERY_ESTIMATE":
    //   toggleBatteryEstimate(data.value);
    //   break;

    default:
      console.warn("Unknown message type:", data.type);
  }
});

// ====================== VERTICAL PROGRESS BAR + WS ======================
function start() {
  createVerticalProgressBar(0);
  initializeWebSocketInterceptor();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
