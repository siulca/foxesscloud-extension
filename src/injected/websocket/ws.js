import { createVerticalProgressBar } from "../progress-bar/vertical.js";

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

          if (
            data.errno === 0 &&
            window.plantID === data.result.plantId &&
            data.result?.node?.solar?.power?.value
          ) {
            const powerW = parseFloat(data.result.node.solar.power.value) || 0;
            const powerKw =
              data.result.node.solar.power.unit === "W"
                ? powerW / 1000
                : powerW;
            const percent = (powerKw / (window.pvCapacity || 1)) * 100;

            createVerticalProgressBar(percent);
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
