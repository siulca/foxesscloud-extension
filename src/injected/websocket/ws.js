import { updateSolarProgressFromValue } from "../progress-bar/vertical.js";

/**
 * Initialize the WebSocket interceptor for real-time solar power data.
 * Monitors /dew/v0/wsmaitian WebSocket connections and updates
 * the vertical progress bar with current solar power percentage.
 */
export function initializeWebSocketInterceptor() {
  let currentWs = null;
  let currentListener = null;

  const originalWebSocket = window.WebSocket;

  window.WebSocket = function (url, protocols) {
    const ws = new originalWebSocket(url, protocols);

    // Check if this is our target socket
    if (url && url.includes("/dew/v0/wsmaitian")) {
      // Remove listener from previous socket
      if (currentWs && currentListener) {
        currentWs.removeEventListener("message", currentListener);
      }

      // Create new listener
      currentListener = function (event) {
        try {
          const data = JSON.parse(event.data);

          if (data.errno === 0 && data.result?.node?.solar?.power?.value) {
            const solarPower = data.result.node.solar.power;
            updateSolarProgressFromValue(solarPower.value, solarPower.unit);
          }
        } catch (e) {
          // Silent fail
        }
      };

      // Attach to this new socket
      ws.addEventListener("message", currentListener);
      currentWs = ws; // Update reference

      // Optional: clean up if socket closes
      ws.addEventListener("close", () => {
        if (currentWs === ws) {
          currentWs = null;
          currentListener = null;
        }
      });
    }

    return ws;
  };
}
