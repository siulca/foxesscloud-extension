// Isolated-world bridge.
//
// The page bundle (`injected.js`) now runs as a MAIN-world content script at
// document_start, so it can install fetch/XHR/WebSocket interceptors before the
// dashboard boots. It cannot use `chrome.*`, so this bridge owns persistence and
// answers the page's READY handshake with the stored settings.
(function foxessBridge() {
  if (window.__foxessContentBridge) return;
  window.__foxessContentBridge = true;

  const SOURCE = "foxesscloud-extension";

  // Keep in sync with dist/popup.js.
  const DEFAULTS = {
    unstackCharts: false,
    hideOpenTabs: true,
    showSankey: true,
    showSolarGauge: true,
    showSolarCapacity: true,
    showSolarPercent: true,
    showSolarHistory: true,
    showBatteryEstimate: true,
    batteryCapacityKwh: 0,
  };

  const KEYS = Object.keys(DEFAULTS);

  function sendSettings(settings) {
    window.postMessage(
      { source: SOURCE, type: "APPLY_SETTINGS", settings },
      "*",
    );
  }

  function loadAndSend() {
    if (!chrome?.storage?.local) {
      sendSettings(DEFAULTS);
      return;
    }

    chrome.storage.local.get(KEYS, (stored) => {
      sendSettings({ ...DEFAULTS, ...stored });
    });
  }

  window.addEventListener("message", (event) => {
    if (event.data?.source !== SOURCE) return;
    if (event.data.type === "FOXESS_READY") loadAndSend();
  });

  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (!KEYS.some((key) => key in changes)) return;
      loadAndSend();
    });
  }

  // The page may not have registered its listener yet at document_start; the
  // READY handshake covers that, and this covers the reverse ordering.
  loadAndSend();
})();
