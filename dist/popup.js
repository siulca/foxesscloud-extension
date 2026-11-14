document.addEventListener("DOMContentLoaded", async () => {
  const SOURCE = "foxesscloud-extension";

  // Keep in sync with dist/content.js.
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
    minSocPercent: 10,
  };
  const KEYS = Object.keys(DEFAULTS);

  const controls = {
    unstackCharts: document.getElementById("unstackCharts"),
    hideOpenTabs: document.getElementById("hideOpenTabs"),
    showSankey: document.getElementById("showSankey"),
    showSolarGauge: document.getElementById("showSolarGauge"),
    showSolarCapacity: document.getElementById("showSolarCapacity"),
    showSolarPercent: document.getElementById("showSolarPercent"),
    showSolarHistory: document.getElementById("showSolarHistory"),
    showBatteryEstimate: document.getElementById("showBatteryEstimate"),
    batteryCapacityKwh: document.getElementById("batteryCapacityKwh"),
    minSocPercent: document.getElementById("minSocPercent"),
  };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    console.error("❌ No active tab found");
    return;
  }

  const storage = chrome.storage?.local;

  const readStored = () =>
    new Promise((resolve) => {
      if (!storage) {
        resolve({ ...DEFAULTS });
        return;
      }
      storage.get(KEYS, (stored) => resolve({ ...DEFAULTS, ...stored }));
    });

  const settings = await readStored();

  const syncInputs = () => {
    controls.unstackCharts.checked = Boolean(settings.unstackCharts);
    controls.hideOpenTabs.checked = Boolean(settings.hideOpenTabs);
    controls.showSankey.checked = Boolean(settings.showSankey);
    controls.showSolarGauge.checked = Boolean(settings.showSolarGauge);
    controls.showSolarCapacity.checked = Boolean(settings.showSolarCapacity);
    controls.showSolarPercent.checked = Boolean(settings.showSolarPercent);
    controls.showSolarHistory.checked = Boolean(settings.showSolarHistory);
    controls.showBatteryEstimate.checked = Boolean(settings.showBatteryEstimate);
    controls.batteryCapacityKwh.value =
      settings.batteryCapacityKwh === 0 ? "" : settings.batteryCapacityKwh;
    controls.minSocPercent.value = settings.minSocPercent;
  };

  const sendSnapshot = () => {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        world: "ISOLATED",
        func: (message) => {
          window.postMessage(message, "*");
        },
        args: [
          {
            source: SOURCE,
            type: "APPLY_SETTINGS",
            settings: { ...settings },
          },
        ],
      })
      .catch((err) => console.warn("[FoxESS popup] Failed to send settings:", err));
  };

  const update = (key, value) => {
    settings[key] = value;
    if (storage) storage.set({ [key]: value });
    sendSnapshot();
  };

  syncInputs();
  // Apply the stored snapshot even when the page missed it during boot.
  sendSnapshot();

  controls.unstackCharts.addEventListener("change", (e) =>
    update("unstackCharts", e.target.checked),
  );
  controls.hideOpenTabs.addEventListener("change", (e) =>
    update("hideOpenTabs", e.target.checked),
  );
  controls.showSankey.addEventListener("change", (e) =>
    update("showSankey", e.target.checked),
  );
  controls.showSolarGauge.addEventListener("change", (e) =>
    update("showSolarGauge", e.target.checked),
  );
  controls.showSolarCapacity.addEventListener("change", (e) =>
    update("showSolarCapacity", e.target.checked),
  );
  controls.showSolarPercent.addEventListener("change", (e) =>
    update("showSolarPercent", e.target.checked),
  );
  controls.showSolarHistory.addEventListener("change", (e) =>
    update("showSolarHistory", e.target.checked),
  );
  controls.showBatteryEstimate.addEventListener("change", (e) =>
    update("showBatteryEstimate", e.target.checked),
  );

  const updateCapacity = (value) => {
    const numeric = parseFloat(value);
    update(
      "batteryCapacityKwh",
      Number.isFinite(numeric) && numeric > 0 ? numeric : 0,
    );
  };
  controls.batteryCapacityKwh.addEventListener("input", (e) =>
    updateCapacity(e.target.value),
  );
  controls.batteryCapacityKwh.addEventListener("change", (e) =>
    updateCapacity(e.target.value),
  );

  const updateMinSoc = (value, finalize = false) => {
    const numeric = parseFloat(value);
    if (!Number.isFinite(numeric)) {
      if (finalize) update("minSocPercent", 10);
      return;
    }
    update("minSocPercent", Math.max(0, Math.min(100, numeric)));
  };
  controls.minSocPercent.addEventListener("input", (e) =>
    updateMinSoc(e.target.value),
  );
  controls.minSocPercent.addEventListener("change", (e) =>
    updateMinSoc(e.target.value, true),
  );

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      let changed = false;
      for (const key of KEYS) {
        if (key in changes) {
          settings[key] = changes[key].newValue;
          changed = true;
        }
      }
      if (changed) syncInputs();
    });
  }
});
