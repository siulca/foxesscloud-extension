import {
  markSolarLive,
  updateSolarProgressFromValue
} from "../progress-bar/vertical.js";

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
            const solar = data?.result?.node?.solar?.power;

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
