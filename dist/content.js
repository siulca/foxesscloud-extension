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
    autoDetectBattery: true,
    batteryCapacityKwh: 0,
    minSocPercent: 10,
  };

  // Values detected from the FoxESS API. They are read alongside the settings
  // but are not user-editable, so changing them must not trigger a re-send.
  const DETECTED_KEYS = [
    "detectedBatteryCapacityKwh",
    "detectedMinSocPercent",
  ];

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

    chrome.storage.local.get([...KEYS, ...DETECTED_KEYS], (stored) => {
      sendSettings({ ...DEFAULTS, ...stored });
    });
  }

  function persistDetectedValues(data) {
    if (!chrome?.storage?.local) return;

    const update = {};
    for (const key of DETECTED_KEYS) {
      if (data[key] !== undefined) update[key] = data[key];
    }

    if (Object.keys(update).length) chrome.storage.local.set(update);
  }

  window.addEventListener("message", (event) => {
    if (event.data?.source !== SOURCE) return;

    if (event.data.type === "FOXESS_READY") {
      loadAndSend();
      return;
    }

    if (event.data.type === "DETECTED_BATTERY_INFO") {
      persistDetectedValues(event.data);
    }
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
