const HISTORY_WINDOW_MS = 60_000; // rolling 1 minute window, x is real time
const HISTORY_MAX_POINTS = 240; // safety cap in case the socket bursts
const HISTORY_GRAPH_WIDTH = 110;
const HISTORY_GRAPH_HEIGHT = 80;
/** Fraction of the line (from the oldest point) over which it fades out. */
const HISTORY_FADE_FRACTION = 0.45;
const HISTORY_FADE_ID = "solar-history-fade";
const GAUGE_LINE_COLOR = "rgb(0,205,212)";
/** Timestamped samples: { t: epoch ms, v: percent }. */
let solarPercentHistory = [];
/** True once at least one non-zero sample has been recorded. */
let hasNonZeroHistory = false;
let lastLiveUpdateAt = 0;

const solarGaugeOptions = {
  showGauge: true,
  showCapacity: true,
  showPercent: true,
  showHistory: true
};

const DEFAULT_MIN_SOC_PERCENT = 10;
const MANUAL_CAPACITY_STORAGE_KEY = "foxess_battery_capacity";
const MANUAL_MIN_SOC_STORAGE_KEY = "foxess_min_soc";
const DETECTED_CAPACITY_STORAGE_KEY = "foxess_battery_capacity_detected";
const DETECTED_MIN_SOC_STORAGE_KEY = "foxess_min_soc_detected";

function parsePercent(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;

  return Math.max(0, Math.min(100, numeric));
}

function parseCapacity(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function readStoredValue(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function writeStoredValue(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(value));
    }
  } catch (err) {
    // Ignore storage errors; the in-memory values stay authoritative.
  }
}

/**
 * The effective battery figures are resolved from two sources:
 *   - values detected from the FoxESS page/API responses, and
 *   - values the user entered in the popup (fallback / override).
 *
 * Auto-detect can be turned off, in which case only the manual values count.
 */
const batterySources = {
  autoDetect: true,
  manualCapacityKwh: parseCapacity(
    window.__foxessBatteryCapacity ?? readStoredValue(MANUAL_CAPACITY_STORAGE_KEY)
  ),
  manualMinSocPercent: parsePercent(
    window.__foxessMinSoc ?? readStoredValue(MANUAL_MIN_SOC_STORAGE_KEY),
    DEFAULT_MIN_SOC_PERCENT
  ),
  detectedCapacityKwh: parseCapacity(
    readStoredValue(DETECTED_CAPACITY_STORAGE_KEY)
  ),
  detectedMinSocPercent: parsePercent(
    readStoredValue(DETECTED_MIN_SOC_STORAGE_KEY),
    null
  )
};

const batteryEstimateOptions = {
  showEstimate: true,
  capacityKwh: 0,
  minSocPercent: DEFAULT_MIN_SOC_PERCENT
};

function applyBatterySources() {
  const { autoDetect, detectedCapacityKwh, manualCapacityKwh } = batterySources;

  batteryEstimateOptions.capacityKwh =
    autoDetect && detectedCapacityKwh > 0
      ? detectedCapacityKwh
      : manualCapacityKwh > 0
        ? manualCapacityKwh
        : 0;

  batteryEstimateOptions.minSocPercent =
    autoDetect && batterySources.detectedMinSocPercent !== null
      ? batterySources.detectedMinSocPercent
      : batterySources.manualMinSocPercent;

  window.__foxessBatteryCapacity = batteryEstimateOptions.capacityKwh;
  window.__foxessMinSoc = batteryEstimateOptions.minSocPercent;

  updateBatteryEstimateDisplay();
}

applyBatterySources();

function formatDuration(hours) {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes === 0) return "<1m";

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0) {
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  }

  return `${m}m`;
}

function parseBatteryPower() {
  const batteryTip = document.querySelector(".tip_bat .tip_value_box");
  if (!batteryTip) return null;

  const text = batteryTip.textContent?.trim() || "";
  const match = text.match(/([-+]?\d+(?:[.,]\d+)?)\s*([kK]?W)\b/);
  if (!match) return null;

  const [, rawValue, rawUnit] = match;
  const powerValue = parseFloat(rawValue.replace(",", "."));
  if (!Number.isFinite(powerValue)) return null;

  const unit = rawUnit.toLowerCase();
  const valueKw = unit === "kw" ? powerValue : powerValue / 1000;
  return {
    valueKw,
    rawValue: powerValue,
    rawUnit: rawUnit.toUpperCase()
  };
}

function parseBatteryStateOfCharge() {
  const batteryTip = document.querySelector(".tip_bat .tip_value_box");
  if (!batteryTip) return null;

  const rawText = batteryTip.textContent?.trim() || "";
  const cleaned = rawText.replace(/%/g, "").trim();
  const matches = [...cleaned.matchAll(/([-+]?[0-9]+(?:[.,][0-9]+)?)/g)];
  if (!matches.length) return null;

  const socValue = parseFloat(matches[matches.length - 1][1].replace(",", "."));
  if (!Number.isFinite(socValue)) return null;

  return Math.max(0, Math.min(100, socValue));
}

function parseBatteryFlowStatus() {
  const batteryTip = document.querySelector(".tip_bat .tip_value_box");
  if (!batteryTip) return null;

  const batteryTipRoot = batteryTip.closest(".tip_bat");
  if (!batteryTipRoot) return null;

  const statusNode = batteryTipRoot.firstElementChild;
  if (!statusNode) return null;

  const statusText = statusNode.textContent?.trim() || "";
  if (statusText.includes("Charging")) return "charging";
  if (statusText.includes("Discharging")) return "discharging";

  return null;
}

function updateBatteryEstimateDisplay() {
  const label = document.getElementById("battery-estimate-label");
  if (!label) return;

  if (!batteryEstimateOptions.showEstimate) {
    setDisplay(label, false);
    return;
  }

  let capacity = Number(batteryEstimateOptions.capacityKwh) || 0;
  const minSocPercent = parsePercent(
    batteryEstimateOptions.minSocPercent,
    DEFAULT_MIN_SOC_PERCENT
  );
  const showEstimate = batteryEstimateOptions.showEstimate;
  const batteryPower = parseBatteryPower();
  const socPercent = parseBatteryStateOfCharge();
  const batteryFlowStatus = parseBatteryFlowStatus();
  const powerKw = batteryPower?.valueKw;

  if (!Number.isFinite(capacity) || capacity <= 0) {
    const storedCapacity = parseFloat(
      localStorage.getItem("foxess_battery_capacity") || "0"
    );
    if (Number.isFinite(storedCapacity) && storedCapacity > 0) {
      capacity = storedCapacity;
    }
  }

  const isCharging =
    batteryFlowStatus === "charging"
      ? true
      : batteryFlowStatus === "discharging"
        ? false
        : powerKw > 0;
  const hasSoc = Number.isFinite(socPercent);
  // Charging targets 100 %; discharging counts only the energy above the
  // configured minimum SOC, because the battery stops there in practice.
  const energyToFull = hasSoc ? (capacity * (100 - socPercent)) / 100 : capacity;
  const usableEnergy = hasSoc
    ? (capacity * Math.max(0, socPercent - minSocPercent)) / 100
    : (capacity * (100 - minSocPercent)) / 100;
  const energyRemaining = isCharging ? energyToFull : usableEnergy;
  const energyText = hasSoc
    ? isCharging
      ? `: ${energyToFull.toFixed(1)} kWh`
      : `: ${usableEnergy.toFixed(1)} kWh`
    : "";

  if (
    !Number.isFinite(capacity) ||
    capacity <= 0 ||
    !batteryPower ||
    !Number.isFinite(powerKw) ||
    powerKw === 0
  ) {
    setHtml(label, "Battery estimate unavailable");
    setDisplay(label, true);
    return;
  }

  if (Number.isFinite(socPercent) && energyRemaining <= 0) {
    setHtml(
      label,
      isCharging ? "Battery already full" : "Battery already empty"
    );
    setDisplay(label, true);
    return;
  }

  const direction = isCharging ? "full" : "empty";
  const duration = energyRemaining / Math.abs(powerKw);
  const onePercentDuration = (capacity * 0.01) / Math.abs(powerKw);
  const onePercentDirection = isCharging ? "charge" : "discharge";

  setHtml(
    label,
    `~${formatDuration(duration)} til ${direction}${energyText}<br/>~${formatDuration(onePercentDuration)} per 1% ${onePercentDirection}`
  );
  setDisplay(label, true);
}

function updateFlowDotWidth(show) {
  document.querySelectorAll(".power_flow .flow_dot .fl_tips4").forEach((el) => {
    el.style.width = show ? "180px" : "";
  });
}

export function setBatteryCapacity(value) {
  const capacity = parseCapacity(value);
  batterySources.manualCapacityKwh = capacity;
  writeStoredValue(
    MANUAL_CAPACITY_STORAGE_KEY,
    capacity > 0 ? capacity : null
  );

  applyBatterySources();
}

export function setBatteryMinSoc(value) {
  const minSoc = parsePercent(value, DEFAULT_MIN_SOC_PERCENT);
  batterySources.manualMinSocPercent = minSoc;
  writeStoredValue(MANUAL_MIN_SOC_STORAGE_KEY, minSoc);

  applyBatterySources();
}

/** Toggle whether API-detected values override the manual popup values. */
export function setBatteryAutoDetect(value) {
  batterySources.autoDetect = !!value;
  applyBatterySources();
}

/** True once a capacity has been detected from (or restored via) FoxESS. */
export function hasDetectedBatteryCapacity() {
  return batterySources.detectedCapacityKwh > 0;
}

/** True once a minimum SOC has been detected from (or restored via) FoxESS. */
export function hasDetectedMinSoc() {
  return batterySources.detectedMinSocPercent !== null;
}

/** Capacity (kWh) detected from a FoxESS API response. */
export function setBatteryCapacityDetected(value) {
  const capacity = parseCapacity(value);
  if (capacity <= 0 || batterySources.detectedCapacityKwh === capacity) return;

  batterySources.detectedCapacityKwh = capacity;
  writeStoredValue(DETECTED_CAPACITY_STORAGE_KEY, capacity);

  console.info("[FoxESS] battery capacity detected:", capacity, "kWh");
  if (window.__foxessBatteryDebug) {
    window.__foxessBatteryDebug.detectedCapacity = capacity;
  }

  applyBatterySources();
  reportDetectedBatteryInfo();
}

/** Minimum/discharge-floor SOC (%) detected from a FoxESS API response. */
export function setBatteryMinSocDetected(value) {
  const minSoc = parsePercent(value, null);
  if (minSoc === null || batterySources.detectedMinSocPercent === minSoc) {
    return;
  }

  batterySources.detectedMinSocPercent = minSoc;
  writeStoredValue(DETECTED_MIN_SOC_STORAGE_KEY, minSoc);

  console.info("[FoxESS] min SOC detected:", minSoc, "%");
  if (window.__foxessBatteryDebug) {
    window.__foxessBatteryDebug.detectedMinSoc = minSoc;
  }

  applyBatterySources();
  reportDetectedBatteryInfo();
}

let lastReportedCapacity = null;
let lastReportedMinSoc = null;

/**
 * Send detected values to the isolated-world bridge so the popup can display
 * them. Reports are sent only when a value actually changes, except when
 * `force` is set (the bridge may not have been listening when the values were
 * restored from storage at startup).
 */
export function reportDetectedBatteryInfo(force = false) {
  const capacity = batterySources.detectedCapacityKwh;
  const minSoc = batterySources.detectedMinSocPercent;

  if (!force && capacity === lastReportedCapacity && minSoc === lastReportedMinSoc) {
    return;
  }

  lastReportedCapacity = capacity;
  lastReportedMinSoc = minSoc;

  try {
    window.postMessage(
      {
        source: "foxesscloud-extension",
        type: "DETECTED_BATTERY_INFO",
        detectedBatteryCapacityKwh: capacity > 0 ? capacity : null,
        detectedMinSocPercent: minSoc
      },
      "*"
    );
  } catch (err) {
    // Reporting is best effort; the page still uses the detected values.
  }
}

export function toggleBatteryEstimate(show) {
  batteryEstimateOptions.showEstimate = show;
  updateFlowDotWidth(show);
  updateBatteryEstimateDisplay();
}

function setHtml(element, html) {
  if (element && element.innerHTML !== html) element.innerHTML = html;
}

function setDisplay(element, show) {
  if (!element) return;
  const display = show ? "" : "none";
  if (element.style.display !== display) element.style.display = display;
}

function updateGaugeLabel(percent) {
  const marker = document.getElementById("solar-percent-marker");
  const wrapper = document.getElementById("vertical-progress-bar");
  if (!marker || !wrapper) return;

  if (percent === null || !Number.isFinite(Number(percent))) {
    setHtml(marker, "<b>--</b> %");
    marker.style.top = "100%";
    return;
  }

  const clamped = Math.max(0, Math.min(100, Number(percent)));
  setHtml(marker, `<b>${clamped.toFixed(1)}</b> %`);
  marker.style.top = `${100 - clamped}%`;
}

function applyGaugeVisibility() {
  const gaugeOn = solarGaugeOptions.showGauge;
  setDisplay(document.getElementById("vertical-progress-bar"), gaugeOn);
  setDisplay(
    document.getElementById("solar-gauge-label"),
    gaugeOn && solarGaugeOptions.showCapacity
  );
  setDisplay(
    document.getElementById("solar-percent-marker"),
    gaugeOn && solarGaugeOptions.showPercent
  );
  setDisplay(
    document.getElementById("solar-history-wrapper"),
    gaugeOn && solarGaugeOptions.showHistory
  );
}

function setSolarCapacityVisible(show) {
  solarGaugeOptions.showCapacity = show;
  applyGaugeVisibility();
}

function setSolarPercentLabelVisible(show) {
  solarGaugeOptions.showPercent = show;
  applyGaugeVisibility();
}

function setSolarHistoryVisible(show) {
  solarGaugeOptions.showHistory = show;
  applyGaugeVisibility();
  if (show) renderHistoryChart();
}

/**
 * Creates (or re-attaches) the history container.
 * @returns {boolean} true when a new SVG was created, so the caller redraws it.
 */
function ensureHistoryChart() {
  const wrapper = document.getElementById("vertical-progress-bar");
  if (!wrapper) return false;

  let historyWrapper = document.getElementById("solar-history-wrapper");
  if (!historyWrapper) {
    historyWrapper = document.createElement("div");
    historyWrapper.id = "solar-history-wrapper";
    historyWrapper.style.cssText = `
        position: absolute;
        left: -${HISTORY_GRAPH_WIDTH + 15}px;
        top: 0;
        width: ${HISTORY_GRAPH_WIDTH}px;
        height: ${HISTORY_GRAPH_HEIGHT}px;
        pointer-events: none;
      `;
    wrapper.appendChild(historyWrapper);
  } else if (historyWrapper.parentElement !== wrapper) {
    wrapper.appendChild(historyWrapper);
  }

  if (document.getElementById("solar-history-svg")) return false;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "solar-history-svg";
  svg.setAttribute(
    "viewBox",
    `0 0 ${HISTORY_GRAPH_WIDTH} ${HISTORY_GRAPH_HEIGHT}`
  );
  svg.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: visible;
    `;

  historyWrapper.appendChild(svg);
  return true;
}

/** Drop samples that fell out of the rolling window (and enforce the cap). */
function trimHistory(now = Date.now()) {
  const cutoff = now - HISTORY_WINDOW_MS;

  let first = 0;
  while (first < solarPercentHistory.length && solarPercentHistory[first].t < cutoff) {
    first++;
  }
  if (first) solarPercentHistory.splice(0, first);

  const overflow = solarPercentHistory.length - HISTORY_MAX_POINTS;
  if (overflow > 0) solarPercentHistory.splice(0, overflow);
}

function historyY(value) {
  const clamped = Math.max(0, Math.min(100, value));
  return HISTORY_GRAPH_HEIGHT - (clamped / 100) * HISTORY_GRAPH_HEIGHT;
}

function renderHistoryChart(now = Date.now()) {
  const svg = document.getElementById("solar-history-svg");
  if (!svg) return;

  trimHistory(now);

  const samples = solarPercentHistory;
  if (samples.length === 0) {
    if (svg.innerHTML !== "") svg.innerHTML = "";
    return;
  }

  // x is real time, not sample index: the newest reading always sits on the
  // right edge and older samples slide left. That keeps the line's tip on the
  // same value the gauge shows at the same instant.
  const newest = samples[samples.length - 1];
  const newestX = HISTORY_GRAPH_WIDTH;
  const xFor = (t) =>
    newestX - ((newest.t - t) / HISTORY_WINDOW_MS) * HISTORY_GRAPH_WIDTH;

  if (samples.length === 1) {
    // Show a dot immediately; the polyline appears once the second sample lands.
    svg.innerHTML = `<circle cx="${newestX}" cy="${historyY(samples[0].v)}" r="2" fill="${GAUGE_LINE_COLOR}" />`;
    return;
  }

  const points = samples
    .map((sample) => `${xFor(sample.t).toFixed(1)},${historyY(sample.v).toFixed(1)}`)
    .join(" ");

  const lastY = historyY(newest.v);
  const arrowPoints =
    `${newestX + 6},${lastY.toFixed(1)} ` +
    `${newestX - 1},${(lastY - 4).toFixed(1)} ` +
    `${newestX - 1},${(lastY + 4).toFixed(1)}`;

  // Fade the oldest end of the line to fully transparent with a stroke
  // gradient: one declarative node, no per-point opacity, nothing to composite
  // and no mask layer. The gradient ends before the newest point so the
  // arrow and the recent samples stay fully opaque.
  const oldestX = Math.min(xFor(samples[0].t), newestX - 1);
  const fadeEnd =
    oldestX + Math.max(1, (newestX - oldestX) * HISTORY_FADE_FRACTION);

  svg.innerHTML = `
      <defs>
        <linearGradient
          id="${HISTORY_FADE_ID}"
          gradientUnits="userSpaceOnUse"
          x1="${oldestX.toFixed(1)}" y1="0" x2="${fadeEnd.toFixed(1)}" y2="0"
        >
          <stop offset="0" stop-color="${GAUGE_LINE_COLOR}" stop-opacity="0" />
          <stop offset="1" stop-color="${GAUGE_LINE_COLOR}" stop-opacity="1" />
        </linearGradient>
      </defs>
      <polyline
        points="${points}"
        fill="none"
        stroke="url(#${HISTORY_FADE_ID})"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polygon
        points="${arrowPoints}"
        fill="${GAUGE_LINE_COLOR}"
      />
    `;
}

function pushHistoryPoint(percent, at = Date.now()) {
  const numeric = Number(percent);
  if (!Number.isFinite(numeric)) return false;

  const value = Math.max(0, Math.min(100, numeric));
  if (value > 0) hasNonZeroHistory = true;

  const last = solarPercentHistory[solarPercentHistory.length - 1];

  // A changed value is always recorded. An unchanged value only reaffirms the
  // time axis about once a second, so rapid dashboard re-renders cannot pile
  // up hundreds of identical points.
  if (last && last.v === value && at - last.t < 1000) return false;

  solarPercentHistory.push({ t: at, v: value });
  renderHistoryChart(at);
  return true;
}

function percentFromSolarState(solarState = window.__foxessSolarState) {
  if (!solarState) return null;

  const power = parseFloat(solarState.value) || 0;
  const powerKw = solarState.unit === "W" ? power / 1000 : power;
  const capacity = Number(window.pvCapacity);
  if (!Number.isFinite(capacity) || capacity <= 0) return null;

  return (powerKw / capacity) * 100;
}

/**
 * Record one history sample.
 *
 * This runs on the exact same call as the fill height and the percentage
 * label, so the number and the end of the line change in the same frame.
 * There is no sampler and no throttle: a reading is a point.
 */
function addHistoryPoint(percent) {
  const numeric = Number(percent);
  if (!Number.isFinite(numeric)) return false;

  // Never open the graph on a zero reading. At load the page briefly reports
  // 0 kW before the live value arrives, which would draw a false dip to the
  // bottom-left. A zero is accepted once the socket has reported (a genuine
  // night-time zero) or once a non-zero sample is already on the chart.
  if (numeric <= 0 && !lastLiveUpdateAt && !hasNonZeroHistory) return false;

  return pushHistoryPoint(numeric);
}

function historyEnabled() {
  return solarGaugeOptions.showGauge && solarGaugeOptions.showHistory;
}

let batteryEstimateObserver = null;

function ensureBatteryEstimateLabel() {
  const batteryTipRoot = document.querySelector(".tip_bat");
  let label = document.getElementById("battery-estimate-label");

  if (!label) {
    label = document.createElement("div");
    label.id = "battery-estimate-label";
    label.style.cssText = `
        display: block;
        width: 100%;
        flex-basis: 100%;
        clear: both;
        font-size: 12px;
        color: var(--color-text-label);
        line-height: 1.2;
        pointer-events: none;
        margin-top: 4px;
      `;
  }

  const host = batteryTipRoot || document.querySelector(".fl_tips2");
  if (host && label.parentElement !== host) host.appendChild(label);

  return label;
}

function observeBatteryTipElement(batteryTip) {
  if (batteryEstimateObserver) {
    batteryEstimateObserver.disconnect();
  }

  batteryEstimateObserver = new MutationObserver(() => {
    updateBatteryEstimateDisplay();
  });

  batteryEstimateObserver.observe(batteryTip, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

let observedBatteryNode = null;

function watchBatteryTipChanges() {
  const batteryTipRoot = document.querySelector(".tip_bat");
  if (!batteryTipRoot) return;

  const batteryTip = document.querySelector(".tip_bat .tip_value_box");
  const target = batteryTip || batteryTipRoot;
  if (observedBatteryNode === target) return;

  observedBatteryNode = target;

  if (batteryTip) {
    observeBatteryTipElement(batteryTip);
    return;
  }

  if (batteryEstimateObserver) {
    batteryEstimateObserver.disconnect();
  }

  batteryEstimateObserver = new MutationObserver(() => {
    const batteryTipBox = document.querySelector(".tip_bat .tip_value_box");
    if (batteryTipBox) {
      observedBatteryNode = batteryTipBox;
      observeBatteryTipElement(batteryTipBox);
      updateBatteryEstimateDisplay();
    }
  });

  batteryEstimateObserver.observe(batteryTipRoot, {
    childList: true,
    subtree: true
  });
}

function updateCapacityDisplay() {
  const label = document.getElementById("solar-gauge-label");
  if (!label) return;
  const capacity = Number(window.pvCapacity);
  const capText =
    Number.isFinite(capacity) && capacity > 0
      ? `${capacity.toFixed(3)} kW`
      : "-- kW";
  setHtml(label, capText);
}

function createGaugeElement() {
  const progressWrapper = document.createElement("div");
  progressWrapper.id = "vertical-progress-bar";
  progressWrapper.style.cssText = `
      position: absolute;
      width: 14px;
      height: 80px;
      background: #4d4d4e;
      border: 2px solid #000;
      border-radius: 9999px;
      overflow: visible;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
      z-index: 10;
      left: -23px;
      top: 38px;
      transform: translateY(-50%);
    `;

  // Inner fill bar
  const fill = document.createElement("div");
  fill.id = "progress-fill";
  fill.style.cssText = `
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 0%;
          background: linear-gradient(to top, 
          rgb(8, 151, 156),
          rgb(0, 178, 184), 
          rgb(0, 205, 212));
          transition: height 0.4s ease-out;
          border-radius: 9999px;
      `;

  // Tick marks container
  const ticks = document.createElement("div");
  ticks.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
      `;

  // Create ticks at 25%, 50%, 75%
  [25, 50, 75].forEach((pos) => {
    const tick = document.createElement("div");
    tick.style.cssText = `
              position: absolute;
              width: 100%;
              height: 1px;
              background: rgba(255,255,255,0.35);
              left: 0;
              top: ${100 - pos}%;
          `;
    ticks.appendChild(tick);
  });

  // Percentage marker element.
  const percentMarker = document.createElement("div");
  percentMarker.id = "solar-percent-marker";
  percentMarker.innerHTML = "<b>--</b> %";
  percentMarker.style.cssText = `
      position: absolute;
      left: -80px;
      width: 68px;
      text-align: right;
      pointer-events: none;
      transform: translateY(-110%);
      font-weight: bold;
      z-index: 20;
    `;

  progressWrapper.appendChild(fill);
  progressWrapper.appendChild(ticks);
  progressWrapper.appendChild(percentMarker);
  return progressWrapper;
}

function ensureCapacityLabel() {
  let label = document.getElementById("solar-gauge-label");
  if (!label) {
    label = document.createElement("div");
    label.id = "solar-gauge-label";
    label.style.cssText = `
        font-size: 12px;
        color: var(--color-text-label);
        line-height: 1;
        pointer-events: none;
      `;
  }

  const host =
    document.querySelector(".tip_common.tip_solar") ||
    document.querySelector(".fl_tips2");
  if (host && label.parentElement !== host) host.appendChild(label);
  return label;
}

function renderGauge(percent) {
  const container = document.querySelector(".fl_tips2");
  if (!container) return null;

  // Create or re-attach the progress bar.
  let progressWrapper = document.getElementById("vertical-progress-bar");
  if (!progressWrapper) progressWrapper = createGaugeElement();
  if (progressWrapper.parentElement !== container) {
    container.appendChild(progressWrapper);
  }

  const historyRebuilt = ensureHistoryChart();
  ensureCapacityLabel();
  ensureBatteryEstimateLabel();
  applyGaugeVisibility();

  // Only needed when the host re-render replaced the SVG; otherwise the
  // existing markup is already correct.
  if (historyRebuilt) renderHistoryChart();

  if (percent !== undefined) {
    const numeric = percent === null ? null : Number(percent);
    const clamped =
      numeric === null || !Number.isFinite(numeric)
        ? null
        : Math.max(0, Math.min(100, numeric));

    const fill = document.getElementById("progress-fill");
    if (fill) {
      const nextHeight = clamped === null ? "0%" : `${clamped}%`;
      if (fill.style.height !== nextHeight) fill.style.height = nextHeight;
    }

    updateGaugeLabel(clamped);

    // Same call, same frame: the number and the end of the line move together.
    if (clamped !== null && historyEnabled()) addHistoryPoint(clamped);
  }

  updateCapacityDisplay();
  updateBatteryEstimateDisplay();
  updateFlowDotWidth(batteryEstimateOptions.showEstimate);
  watchBatteryTipChanges();

  return progressWrapper;
}

/**
 * Re-apply the gauge from the last known reading.
 *
 * Used after an SPA re-render (the host nodes were replaced) and when settings
 * change. It never invents data: with no reading yet it only builds the DOM.
 */
export function ensureSolarGauge() {
  if (!window.__foxessSolarState) return renderGauge(undefined);
  return renderGauge(percentFromSolarState());
}

/**
 * The single entry point for solar data.
 *
 * Called from the WebSocket message handler, from the API interceptor (plant
 * capacity) and from the DOM fallback. One call updates everything: fill,
 * percentage, capacity, battery estimate and the history line.
 */
export function updateSolarProgressFromValue(
  value,
  unit = "W",
  pvCapacity = window.pvCapacity
) {
  const powerW = parseFloat(value) || 0;
  const powerKw = unit === "W" ? powerW / 1000 : powerW;
  const capacity = Number(pvCapacity);
  const percent =
    Number.isFinite(capacity) && capacity > 0
      ? (powerKw / capacity) * 100
      : null;

  window.__foxessSolarState = {
    value,
    unit
  };

  renderGauge(percent);
  return percent;
}

/** Record that live WebSocket data arrived (used to disable the DOM fallback). */
export function markSolarLive() {
  lastLiveUpdateAt = Date.now();
}

function parseSolarPowerFromDom() {
  const tip = document.querySelector(".tip_solar .tip_value_box");
  if (!tip) return null;

  const text = tip.textContent?.trim() || "";
  const match = text.match(/([-+]?\d+(?:[.,]\d+)?)\s*([kK]?W)\b/);
  if (!match) return null;

  const value = parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;

  return { value, unit: match[2].toUpperCase() };
}

/**
 * Event-driven fallback for when the WebSocket hook missed the connection.
 * Called from the DOM observer, never from a timer.
 */
export function refreshSolarFromDom(maxAgeMs = 15000) {
  if (!solarGaugeOptions.showGauge) return;
  if (Date.now() - lastLiveUpdateAt < maxAgeMs) return;

  const parsed = parseSolarPowerFromDom();
  if (!parsed) return;

  // 0 kW in the DOM is usually the boot placeholder, not a measurement.
  // Ignore it so the gauge and the history do not start from a false zero.
  if (parsed.value === 0) return;

  updateSolarProgressFromValue(parsed.value, parsed.unit, window.pvCapacity);
}

/**
 * Show or hide the solar production gauge.
 * @param {boolean} show
 */
export function toggleSolarGauge(show) {
  solarGaugeOptions.showGauge = !!show;
  applyGaugeVisibility();
}

export function toggleSolarCapacity(show) {
  setSolarCapacityVisible(show);
}

export function toggleSolarPercentLabel(show) {
  setSolarPercentLabelVisible(show);
}

export function toggleSolarHistory(show) {
  setSolarHistoryVisible(show);
}
