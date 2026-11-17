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
    minSocPercent: 10
  };
  // Detected values are reported by the page; they are shown here but are not
  // user-editable settings.
  const DETECTED_DEFAULTS = {
    detectedBatteryCapacityKwh: null,
    detectedMinSocPercent: null,
    detectedBatteryCapacityAt: null,
    detectedMinSocAt: null
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
    batterySettings: document.getElementById("batterySettings"),
    batteryMode: document.getElementById("batteryMode"),
    batteryAutoPanel: document.getElementById("batteryAutoPanel"),
    batteryManualFields: document.getElementById("batteryManualFields"),
    detectedCapacityText: document.getElementById("detectedCapacityText"),
    detectedMinSocText: document.getElementById("detectedMinSocText"),
    batteryFreshness: document.getElementById("batteryFreshness"),
    batteryDetails: document.getElementById("batteryDetails"),
    refreshBatteryBtn: document.getElementById("refreshBatteryBtn"),
    batteryCapacityKwh: document.getElementById("batteryCapacityKwh"),
    minSocPercent: document.getElementById("minSocPercent"),
    batteryDetectLog: document.getElementById("batteryDetectLog")
  };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    console.error("❌ No active tab found");
    return;
  }

  const storage = chrome.storage?.local;
  const isFoxessTab = /^https:\/\/www\.foxesscloud\.com\//.test(tab.url || "");
  let pageState = null;
  /** Set when an explicit refresh did not return newer values. */
  let refreshIssue = null;
  let refreshRequestedAt = 0;
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
          capacityAt: localStorage.getItem(
            "foxess_battery_capacity_detected_at"
          ),
          minSoc: localStorage.getItem("foxess_min_soc_detected"),
          minSocAt: localStorage.getItem("foxess_min_soc_detected_at"),
          // Detections at/after this point happened during the current page
          // load rather than being restored from storage.
          pageStartedAt: performance.timeOrigin
        })
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
        resolve({ ...DEFAULTS, ...DETECTED_DEFAULTS, ...stored })
      );
    });

  const settings = await readStored();

  /** Copy detected values found in the page's own storage over the snapshot. */
  const applyPageState = () => {
    if (!pageState) return;

    const capacity = Number(pageState.capacity);
    if (Number.isFinite(capacity) && capacity > 0) {
      settings.detectedBatteryCapacityKwh = capacity;

      const capacityAt = Number(pageState.capacityAt);
      if (Number.isFinite(capacityAt) && capacityAt > 0) {
        settings.detectedBatteryCapacityAt = capacityAt;
      }
    }

    const minSoc = pageState.minSoc === null ? NaN : Number(pageState.minSoc);
    if (Number.isFinite(minSoc)) {
      settings.detectedMinSocPercent = minSoc;

      const minSocAt = Number(pageState.minSocAt);
      if (Number.isFinite(minSocAt) && minSocAt > 0) {
        settings.detectedMinSocAt = minSocAt;
      }
    }

    // A later successful detection clears an earlier "refresh failed" warning.
    if (refreshIssue && refreshRequestedAt) {
      const newest = Math.max(
        Number(settings.detectedBatteryCapacityAt) || 0,
        Number(settings.detectedMinSocAt) || 0,
      );
      if (newest >= refreshRequestedAt - 2000) refreshIssue = null;
    }
  };

  pageState = await readPageState();
  applyPageState();

  /** "12 min ago" style text, empty when the timestamp is unknown. */
  const formatAge = (timestamp) => {
    const at = Number(timestamp);
    if (!Number.isFinite(at) || at <= 0) return "";

    const seconds = Math.max(0, (Date.now() - at) / 1000);
    if (seconds < 120) return "just now";
    if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    return `${Math.round(seconds / 86400)} d ago`;
  };

  /** Was this value written during the current page load? */
  const isFromThisLoad = (timestamp) => {
    const at = Number(timestamp);
    const startedAt = Number(pageState?.pageStartedAt);
    return (
      Number.isFinite(at) &&
      at > 0 &&
      Number.isFinite(startedAt) &&
      at >= startedAt
    );
  };

  const syncInputs = () => {
    controls.unstackCharts.checked = Boolean(settings.unstackCharts);
    controls.hideOpenTabs.checked = Boolean(settings.hideOpenTabs);
    controls.showSankey.checked = Boolean(settings.showSankey);
    controls.showSolarGauge.checked = Boolean(settings.showSolarGauge);
    controls.showSolarCapacity.checked = Boolean(settings.showSolarCapacity);
    controls.showSolarPercent.checked = Boolean(settings.showSolarPercent);
    controls.showSolarHistory.checked = Boolean(settings.showSolarHistory);
    controls.showBatteryEstimate.checked = Boolean(
      settings.showBatteryEstimate
    );

    // The capacity/SOC settings only matter while the estimate is shown.
    controls.batterySettings.style.display = settings.showBatteryEstimate
      ? ""
      : "none";

    // Auto-detect is the default and the two modes are mutually exclusive: only
    // one of the panels is visible at a time.
    const autoDetect = settings.autoDetectBattery !== false;
    controls.batteryMode.value = autoDetect ? "auto" : "manual";
    controls.batteryAutoPanel.style.display = autoDetect ? "" : "none";
    controls.batteryManualFields.style.display = autoDetect ? "none" : "";

    controls.batteryCapacityKwh.value =
      settings.batteryCapacityKwh === 0 ? "" : settings.batteryCapacityKwh;
    controls.minSocPercent.value = settings.minSocPercent;

    const detectedCapacity = Number(settings.detectedBatteryCapacityKwh);
    const hasDetectedCapacity =
      Number.isFinite(detectedCapacity) && detectedCapacity > 0;
    const detectedMinSoc = Number(settings.detectedMinSocPercent);
    const hasDetectedMinSoc =
      settings.detectedMinSocPercent !== null &&
      settings.detectedMinSocPercent !== undefined &&
      Number.isFinite(detectedMinSoc);

    controls.detectedCapacityText.textContent = hasDetectedCapacity
      ? `${detectedCapacity} kWh`
      : "not detected yet";
    controls.detectedMinSocText.textContent = hasDetectedMinSoc
      ? `${detectedMinSoc} %`
      : "not detected yet";

    renderFreshness(hasDetectedCapacity, hasDetectedMinSoc);
    renderDiagnostics(hasDetectedCapacity, hasDetectedMinSoc);
  };

  /**
   * Tell the user whether the shown values were fetched during this page load
   * or restored from an earlier visit (i.e. possibly stale).
   */
  const renderFreshness = (hasDetectedCapacity, hasDetectedMinSoc) => {
    const node = controls.batteryFreshness;
    if (!node) return;

    if (refreshIssue) {
      node.style.color = "#c0392b";
      node.textContent = refreshIssue;
      return;
    }

    if (!hasDetectedCapacity && !hasDetectedMinSoc) {
      node.style.color = "#888";
      node.textContent = isFoxessTab
        ? "Not detected yet."
        : "Open the FoxESS Cloud dashboard to detect values.";
      return;
    }

    const stamps = [
      hasDetectedCapacity ? settings.detectedBatteryCapacityAt : null,
      hasDetectedMinSoc ? settings.detectedMinSocAt : null
    ].filter((value) => Number(value) > 0);

    const allFresh = stamps.length > 0 && stamps.every(isFromThisLoad);
    const age = stamps.length
      ? formatAge(Math.min(...stamps.map(Number)))
      : "";

    node.style.color = allFresh ? "#2e7d32" : "#b8860b";
    if (!age) {
      node.textContent = "Saved from an earlier visit. Press Refresh.";
    } else if (allFresh) {
      node.textContent = `Updated ${age}.`;
    } else {
      node.textContent = `Saved ${age}. Press Refresh.`;
    }
  };

  /**
   * Explain *why* nothing was detected: stale page script, or a page whose API
   * responses simply do not carry a capacity value.
   */
  const renderDiagnostics = (hasDetectedCapacity, hasDetectedMinSoc) => {
    const log = controls.batteryDetectLog;
    const details = controls.batteryDetails;
    if (!log || !details) return;

    // Diagnostics are a troubleshooting aid, tucked behind "Details" and only
    // offered while something is still missing (or a refresh failed).
    const needed =
      isFoxessTab &&
      (refreshIssue || !hasDetectedCapacity || !hasDetectedMinSoc);

    details.style.display = needed ? "" : "none";
    if (!needed) {
      log.textContent = "";
      return;
    }

    log.style.color = "#888";

    if (!pageState?.build) {
      details.open = true;
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
          `Capacity candidate: ${candidate.key}=${candidate.value} (${candidate.url})`
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
          : "No FoxESS API responses seen yet. Open the plant page."
      );

      if (debug.autoFetchStage) {
        parts.push(
          `Auto-fetch: ${debug.autoFetchStage}` +
            (debug.autoFetchError ? ` (${debug.autoFetchError})` : "") +
            (debug.autoFetchErrno ? ` errno ${debug.autoFetchErrno}` : "")
        );
      }
    }

    if (!hasDetectedMinSoc) {
      const candidate = debug.lastMinSocCandidate;
      if (candidate) {
        parts.push(`SOC candidate: ${candidate.key}=${candidate.value}`);
      }
      parts.push(
        "Min SOC comes from the battery settings API (backup reserve)."
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
            settings: { ...settings }
          }
        ]
      })
      .catch((err) =>
        console.warn("[FoxESS popup] Failed to send settings:", err)
      );
  };

  const update = (key, value) => {
    settings[key] = value;
    if (storage) storage.set({ [key]: value });
    sendSnapshot();
  };

  syncInputs();
  // Apply the stored snapshot even when the page missed it during boot.
  sendSnapshot();

  // Ask the page to fetch the values with signed API calls. `force` also
  // refreshes values that are already known (used by the Refresh button).
  const requestRefresh = (force = false) => {
    if (!isFoxessTab) return;

    const hasCapacity = Number(settings.detectedBatteryCapacityKwh) > 0;
    if (!force && hasCapacity) return;

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        world: "ISOLATED",
        func: (message) => window.postMessage(message, "*"),
        args: [{ source: SOURCE, type: "REFRESH_BATTERY_DETECTION" }]
      })
      .catch(() => null);
  };

  controls.refreshBatteryBtn?.addEventListener("click", async () => {
    const button = controls.refreshBatteryBtn;

    if (!isFoxessTab) {
      renderFreshness(false, false);
      return;
    }

    button.disabled = true;
    button.textContent = "Refreshing...";
    refreshIssue = null;
    const requestedAt = Date.now();
    refreshRequestedAt = requestedAt;
    requestRefresh(true);

    // The page's signed requests land within a second or two; poll briefly so
    // the fresh values and timestamps appear without reopening the popup.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      pageState = await readPageState();
      applyPageState();
      syncInputs();
    }

    const newest = Math.max(
      Number(settings.detectedBatteryCapacityAt) || 0,
      Number(settings.detectedMinSocAt) || 0
    );
    if (newest < requestedAt - 2000) {
      refreshIssue = "Refresh failed. No new data returned.";
      syncInputs();
    }

    button.disabled = false;
    button.textContent = "Refresh from FoxESS";
  });

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
    update("unstackCharts", e.target.checked)
  );
  controls.hideOpenTabs.addEventListener("change", (e) =>
    update("hideOpenTabs", e.target.checked)
  );
  controls.showSankey.addEventListener("change", (e) =>
    update("showSankey", e.target.checked)
  );
  controls.showSolarGauge.addEventListener("change", (e) =>
    update("showSolarGauge", e.target.checked)
  );
  controls.showSolarCapacity.addEventListener("change", (e) =>
    update("showSolarCapacity", e.target.checked)
  );
  controls.showSolarPercent.addEventListener("change", (e) =>
    update("showSolarPercent", e.target.checked)
  );
  controls.showSolarHistory.addEventListener("change", (e) =>
    update("showSolarHistory", e.target.checked)
  );
  controls.showBatteryEstimate.addEventListener("change", (e) => {
    update("showBatteryEstimate", e.target.checked);
    syncInputs();
  });
  controls.batteryMode.addEventListener("change", (e) => {
    update("autoDetectBattery", e.target.value === "auto");
    syncInputs();
  });

  const updateCapacity = (value) => {
    const numeric = parseFloat(value);
    update(
      "batteryCapacityKwh",
      Number.isFinite(numeric) && numeric > 0 ? numeric : 0
    );
  };
  controls.batteryCapacityKwh.addEventListener("input", (e) =>
    updateCapacity(e.target.value)
  );
  controls.batteryCapacityKwh.addEventListener("change", (e) =>
    updateCapacity(e.target.value)
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
    updateMinSoc(e.target.value)
  );
  controls.minSocPercent.addEventListener("change", (e) =>
    updateMinSoc(e.target.value, true)
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
