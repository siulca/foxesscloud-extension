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
    autoDetectBattery: true,
    batteryCapacityKwh: 0,
    minSocPercent: 10,
  };
  // Detected values are reported by the page; they are shown here but are not
  // user-editable settings.
  const DETECTED_DEFAULTS = {
    detectedBatteryCapacityKwh: null,
    detectedMinSocPercent: null,
  };
  const KEYS = Object.keys(DEFAULTS);
  const DETECTED_KEYS = Object.keys(DETECTED_DEFAULTS);

  const controls = {
    unstackCharts: document.getElementById("unstackCharts"),
    hideOpenTabs: document.getElementById("hideOpenTabs"),
    showSankey: document.getElementById("showSankey"),
    showSolarGauge: document.getElementById("showSolarGauge"),
    showSolarCapacity: document.getElementById("showSolarCapacity"),
    showSolarPercent: document.getElementById("showSolarPercent"),
    showSolarHistory: document.getElementById("showSolarHistory"),
    showBatteryEstimate: document.getElementById("showBatteryEstimate"),
    autoDetectBattery: document.getElementById("autoDetectBattery"),
    batteryManualFields: document.getElementById("batteryManualFields"),
    detectedCapacityText: document.getElementById("detectedCapacityText"),
    detectedMinSocText: document.getElementById("detectedMinSocText"),
    batteryCapacityKwh: document.getElementById("batteryCapacityKwh"),
    minSocPercent: document.getElementById("minSocPercent"),
    batteryDetectLog: document.getElementById("batteryDetectLog"),
  };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    console.error("❌ No active tab found");
    return;
  }

  const storage = chrome.storage?.local;
  const isFoxessTab = /^https:\/\/www\.foxesscloud\.com\//.test(tab.url || "");
  let pageState = null;

  // The page bundle keeps detected values in the page's localStorage and in
  // `window.__foxessBatteryDebug`. Running in the MAIN world lets us read both,
  // and the build marker reveals a stale page script: refreshing the page does
  // not reload unpacked-extension content scripts.
  const readPageState = () =>
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: () => ({
          build: window.__foxessBuild ?? null,
          debug: window.__foxessBatteryDebug ?? null,
          capacity: localStorage.getItem("foxess_battery_capacity_detected"),
          minSoc: localStorage.getItem("foxess_min_soc_detected"),
        }),
      })
      .then((results) => results?.[0]?.result || null)
      .catch(() => null);

  const readStored = () =>
    new Promise((resolve) => {
      if (!storage) {
        resolve({ ...DEFAULTS, ...DETECTED_DEFAULTS });
        return;
      }
      storage.get([...KEYS, ...DETECTED_KEYS], (stored) =>
        resolve({ ...DEFAULTS, ...DETECTED_DEFAULTS, ...stored }),
      );
    });

  const settings = await readStored();

  /** Copy detected values found in the page's own storage over the snapshot. */
  const applyPageState = () => {
    if (!pageState) return;

    const capacity = Number(pageState.capacity);
    if (Number.isFinite(capacity) && capacity > 0) {
      settings.detectedBatteryCapacityKwh = capacity;
    }

    const minSoc = pageState.minSoc === null ? NaN : Number(pageState.minSoc);
    if (Number.isFinite(minSoc)) {
      settings.detectedMinSocPercent = minSoc;
    }
  };

  pageState = await readPageState();
  applyPageState();

  const syncInputs = () => {
    controls.unstackCharts.checked = Boolean(settings.unstackCharts);
    controls.hideOpenTabs.checked = Boolean(settings.hideOpenTabs);
    controls.showSankey.checked = Boolean(settings.showSankey);
    controls.showSolarGauge.checked = Boolean(settings.showSolarGauge);
    controls.showSolarCapacity.checked = Boolean(settings.showSolarCapacity);
    controls.showSolarPercent.checked = Boolean(settings.showSolarPercent);
    controls.showSolarHistory.checked = Boolean(settings.showSolarHistory);
    controls.showBatteryEstimate.checked = Boolean(settings.showBatteryEstimate);
    controls.autoDetectBattery.checked = Boolean(settings.autoDetectBattery);
    controls.batteryCapacityKwh.value =
      settings.batteryCapacityKwh === 0 ? "" : settings.batteryCapacityKwh;
    controls.minSocPercent.value = settings.minSocPercent;

    // With auto-detect on, a detected value wins over the manual one, so the
    // matching input is disabled — but only once something was actually
    // detected. Otherwise the manual value stays editable as the fallback.
    const autoDetect = Boolean(settings.autoDetectBattery);
    const detectedCapacity = Number(settings.detectedBatteryCapacityKwh);
    const hasDetectedCapacity =
      Number.isFinite(detectedCapacity) && detectedCapacity > 0;
    const hasDetectedMinSoc =
      settings.detectedMinSocPercent !== null &&
      settings.detectedMinSocPercent !== undefined &&
      Number.isFinite(Number(settings.detectedMinSocPercent));

    controls.batteryCapacityKwh.disabled = autoDetect && hasDetectedCapacity;
    controls.minSocPercent.disabled = autoDetect && hasDetectedMinSoc;
    controls.batteryManualFields.style.opacity =
      autoDetect && (hasDetectedCapacity || hasDetectedMinSoc) ? "0.55" : "1";

    controls.detectedCapacityText.textContent = hasDetectedCapacity
      ? `${detectedCapacity} kWh`
      : settings.autoDetectBattery
        ? "not detected yet"
        : "ignored (auto-detect off)";

    controls.detectedMinSocText.textContent = hasDetectedMinSoc
      ? `${Number(settings.detectedMinSocPercent)} %`
      : settings.autoDetectBattery
        ? "not detected yet"
        : "ignored (auto-detect off)";

    renderDiagnostics(hasDetectedCapacity, hasDetectedMinSoc);
  };

  /**
   * Explain *why* nothing was detected: stale page script, or a page whose API
   * responses simply do not carry a capacity value.
   */
  const renderDiagnostics = (hasDetectedCapacity, hasDetectedMinSoc) => {
    const log = controls.batteryDetectLog;
    if (!log) return;

    log.style.color = "#888";
    log.style.whiteSpace = "pre-line";

    if (!isFoxessTab) {
      log.textContent = "Open the FoxESS Cloud dashboard to detect values.";
      return;
    }

    if (!pageState?.build) {
      log.style.color = "#c0392b";
      log.textContent =
        "Page script not running. Reload the extension at chrome://extensions, then refresh this page.";
      return;
    }

    const debug = pageState.debug || {};
    const parts = [];

    if (Number.isFinite(Number(debug.apiResponses))) {
      parts.push(`${debug.apiResponses} API responses read`);
    }

    if (!hasDetectedCapacity) {
      const candidate = debug.lastCapacityCandidate;
      const fields = Array.isArray(debug.capacityFields)
        ? debug.capacityFields.slice(-6)
        : [];

      if (candidate) {
        parts.push(
          `Capacity candidate: ${candidate.key}=${candidate.value} (${candidate.url})`,
        );
      }

      if (fields.length) {
        parts.push(`Capacity fields: ${fields.join(", ")}`);
      }

      const paths = Array.isArray(debug.apiPaths)
        ? debug.apiPaths.slice(-8)
        : [];
      parts.push(
        paths.length
          ? `API paths: ${paths.join(", ")}`
          : "No FoxESS API responses seen yet — open the plant page.",
      );

      if (debug.autoFetchStage) {
        parts.push(
          `Auto-fetch: ${debug.autoFetchStage}` +
            (debug.autoFetchError ? ` (${debug.autoFetchError})` : "") +
            (debug.autoFetchErrno ? ` errno ${debug.autoFetchErrno}` : ""),
        );
      }
    }

    if (!hasDetectedMinSoc) {
      const candidate = debug.lastMinSocCandidate;
      if (candidate) {
        parts.push(`SOC candidate: ${candidate.key}=${candidate.value}`);
      }
      parts.push(
        "Min SOC comes from the battery settings API (backup reserve).",
      );
    }

    log.textContent = parts.join("\n");
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

  // Ask the page to fetch the capacity if it has not been detected yet. The
  // page can sign its own API calls, so this works on any FoxESS screen.
  const requestRefresh = () => {
    if (isFoxessTab && !settings.detectedBatteryCapacityKwh) {
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          world: "ISOLATED",
          func: (message) => window.postMessage(message, "*"),
          args: [{ source: SOURCE, type: "REFRESH_BATTERY_DETECTION" }],
        })
        .catch(() => null);
    }
  };

  // Keep the detected display live while the popup is open: the dashboard may
  // fetch its data a moment after the popup opens.
  const refreshFromPage = async () => {
    pageState = await readPageState();
    applyPageState();
    syncInputs();
  };
  requestRefresh();
  setInterval(refreshFromPage, 1500);

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
  controls.autoDetectBattery.addEventListener("change", (e) => {
    update("autoDetectBattery", e.target.checked);
    syncInputs();
  });

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
      for (const key of [...KEYS, ...DETECTED_KEYS]) {
        if (key in changes) {
          settings[key] = changes[key].newValue;
          changed = true;
        }
      }
      if (changed) syncInputs();
    });
  }
});
