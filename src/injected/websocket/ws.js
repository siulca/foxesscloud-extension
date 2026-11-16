import {
  markSolarLive,
  updateSolarProgressFromValue,
  setBatteryMinSocDetected
} from "../progress-bar/vertical.js";

/**
 * Some inverters report their minimum SOC in the live battery node. Only
 * min-SOC-shaped keys are considered: `soc` itself is the current charge and
 * must never be mistaken for the floor.
 */
function readMinSocFromBatteryNode(batteryNode) {
  if (!batteryNode || typeof batteryNode !== "object") return null;

  for (const [key, value] of Object.entries(batteryNode)) {
    if (!/^(min.*soc|soc.*min|backup.*soc|reserve.*soc)$/i.test(key)) continue;

    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 100) {
      return numeric;
    }
  }

  return null;
}

/**
 * Initialize the WebSocket interceptor for real-time solar power data.
 * Monitors /dew/v0/wsmaitian WebSocket connections and updates
 * the vertical progress bar with current solar power percentage.
 *
 * Runs at document_start so the patch is in place before the dashboard
 * creates its socket.
 */
export function initializeWebSocketInterceptor() {
  if (window.__foxessWebSocketPatched) return;
  window.__foxessWebSocketPatched = true;

  const OriginalWebSocket = window.WebSocket;
  if (!OriginalWebSocket) return;

  let currentWs = null;
  let currentListener = null;

  class FoxESSWebSocket extends OriginalWebSocket {
    constructor(url, protocols) {
      super(url, protocols);

      if (typeof url === "string" && url.includes("/dew/v0/wsmaitian")) {
        if (currentWs && currentListener) {
          currentWs.removeEventListener("message", currentListener);
        }

        currentListener = (event) => {
          try {
            const data = JSON.parse(event.data);
            const result = data?.result;
            const solar = result?.node?.solar?.power;

            const minSoc = readMinSocFromBatteryNode(result?.node?.bat);
            if (minSoc !== null) setBatteryMinSocDetected(minSoc);

            if (data.errno === 0 && solar?.value !== undefined) {
              markSolarLive();
              updateSolarProgressFromValue(solar.value, solar.unit);
            }
          } catch (e) {
            // Silent fail
          }
        };

        this.addEventListener("message", currentListener);
        currentWs = this;

        this.addEventListener("close", () => {
          if (currentWs === this) {
            currentWs = null;
            currentListener = null;
          }
        });
      }
    }
  }

  window.WebSocket = FoxESSWebSocket;
}
