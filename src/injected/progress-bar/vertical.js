const HISTORY_LIMIT = 12;
const HISTORY_POINT_SPACING = 10;
const HISTORY_GRAPH_WIDTH = (HISTORY_LIMIT - 1) * HISTORY_POINT_SPACING;
const HISTORY_GRAPH_HEIGHT = 80;
const HISTORY_INTERVAL_MS = 5_000; // 12 points -> ~1 minute rolling window
const GAUGE_LINE_COLOR = "rgb(0,205,212)";
let solarPercentHistory = [];
/** Absolute time at which the next history point becomes due. */
let nextHistoryDueAt = 0;
/** The one and only history timer (a self-scheduling timeout, not an interval). */
let historyTimer = null;
/** Absolute time the armed timer is targeting, used to avoid re-arming churn. */
let historyTimerAt = 0;
let lastLiveUpdateAt = 0;

const solarGaugeOptions = {
  showGauge: true,
  showCapacity: true,
  showPercent: true,
  showHistory: true
};

const batteryEstimateOptions = {
  showEstimate: true,
  capacityKwh:
    Number(
      window.__foxessBatteryCapacity ??
        parseFloat(localStorage.getItem("foxess_battery_capacity") || "0")
    ) || 0
};

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
  const energyRemaining = Number.isFinite(socPercent)
    ? capacity * (isCharging ? (100 - socPercent) / 100 : socPercent / 100)
    : capacity;
  const energyAtSoc = Number.isFinite(socPercent)
    ? capacity * (socPercent / 100)
    : null;
  const energyText = Number.isFinite(socPercent)
    ? isCharging
      ? `: ${energyRemaining.toFixed(1)} kWh`
      : `: ${energyAtSoc.toFixed(1)} kWh`
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
  const capacity = Number(value) || 0;
  batteryEstimateOptions.capacityKwh = capacity;
  window.__foxessBatteryCapacity = capacity;

  if (capacity > 0) {
    try {
      localStorage.setItem("foxess_battery_capacity", String(capacity));
    } catch (err) {
      console.warn(
        "[FoxESS] failed to save battery capacity to page localStorage",
        err
      );
    }
  } else {
    try {
      localStorage.removeItem("foxess_battery_capacity");
    } catch (err) {
      // Ignore storage errors; the in-memory value is authoritative.
    }
  }

  updateBatteryEstimateDisplay();
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

  // Arms the single history timer, or cancels it when the graph is hidden.
  rescheduleHistoryTimer();
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
}

function ensureHistoryChart() {
  const wrapper = document.getElementById("vertical-progress-bar");
  if (!wrapper) return;

  let historyWrapper = document.getElementById("solar-history-wrapper");
  if (historyWrapper) {
    if (historyWrapper.parentElement !== wrapper) {
      wrapper.appendChild(historyWrapper);
    }
    return;
  }

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
  wrapper.appendChild(historyWrapper);
}

function renderHistoryChart() {
  const svg = document.getElementById("solar-history-svg");
  if (!svg) return;

  const values = solarPercentHistory.slice(-HISTORY_LIMIT);
  if (values.length === 0) {
    svg.innerHTML = "";
    return;
  }

  if (values.length === 1) {
    // Show a dot immediately; the polyline appears once the second sample lands.
    const y = HISTORY_GRAPH_HEIGHT - (values[0] / 100) * HISTORY_GRAPH_HEIGHT;
    svg.innerHTML = `<circle cx="${HISTORY_GRAPH_WIDTH}" cy="${y}" r="2" fill="${GAUGE_LINE_COLOR}" />`;
    return;
  }

  const pointCount = values.length;
  const startX = HISTORY_GRAPH_WIDTH - (pointCount - 1) * HISTORY_POINT_SPACING;
  const points = values
    .map((value, index) => {
      const x = startX + index * HISTORY_POINT_SPACING;
      const y = HISTORY_GRAPH_HEIGHT - (value / 100) * HISTORY_GRAPH_HEIGHT;
      return `${x},${y}`;
    })
    .join(" ");

  const lastValue = values[values.length - 1];
  const lastX = startX + (values.length - 1) * HISTORY_POINT_SPACING;
  const lastY = HISTORY_GRAPH_HEIGHT - (lastValue / 100) * HISTORY_GRAPH_HEIGHT;
  const arrowPoints = `${lastX + 6},${lastY} ${lastX - 1},${lastY - 4} ${lastX - 1},${lastY + 4}`;

  svg.innerHTML = `
      <polyline
        points="${points}"
        fill="none"
        stroke="${GAUGE_LINE_COLOR}"
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

function pushHistoryPoint(percent) {
  const numeric = Number(percent);
  if (!Number.isFinite(numeric)) return;

  const clamped = Math.max(0, Math.min(100, numeric));
  solarPercentHistory.push(clamped);
  if (solarPercentHistory.length > HISTORY_LIMIT) solarPercentHistory.shift();
  renderHistoryChart();
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
 * Record a history value, but only when the current 5 s slot is due.
 *
 * This is called from two places, and both share the same clock:
 *   - the WebSocket value path, so a point is drawn as soon as a new reading
 *     arrives after the slot has elapsed (event driven);
 *   - the single deadline timer, which only fires when no reading arrived by
 *     the slot boundary (watchdog, so a constant value still extends the line).
 *
 * The due time is advanced on an absolute grid, so points never drift apart
 * even if timers or socket messages are late.
 */
function addHistoryPoint(percent, force = false) {
  const now = Date.now();
  if (!nextHistoryDueAt) nextHistoryDueAt = now;
  if (!force && now < nextHistoryDueAt) return false;

  const numeric = Number(percent);
  if (!Number.isFinite(numeric)) return false;

  pushHistoryPoint(numeric);

  if (nextHistoryDueAt <= now) {
    const missedSlots = Math.floor((now - nextHistoryDueAt) / HISTORY_INTERVAL_MS);
    nextHistoryDueAt += (missedSlots + 1) * HISTORY_INTERVAL_MS;
  }

  return true;
}

function historyEnabled() {
  return (
    solarGaugeOptions.showGauge &&
    solarGaugeOptions.showHistory &&
    Boolean(document.getElementById("solar-history-svg"))
  );
}

function stopHistoryTimer() {
  if (!historyTimer) return;
  clearTimeout(historyTimer);
  historyTimer = null;
  historyTimerAt = 0;
}

/**
 * Arms the single history timer for the current grid slot. Safe to call on
 * every reading/observer pass: if the timer is already armed for the same slot
 * nothing happens, so there is no clearTimeout/setTimeout churn.
 */
function rescheduleHistoryTimer() {
  if (!historyEnabled()) {
    stopHistoryTimer();
    return;
  }

  if (!nextHistoryDueAt) nextHistoryDueAt = Date.now();
  if (historyTimer && historyTimerAt === nextHistoryDueAt) return;

  stopHistoryTimer();

  // A "deadline" timeout, not an interval: it sleeps until the next grid slot
  // and is re-armed whenever a point is recorded.
  historyTimerAt = nextHistoryDueAt;
  historyTimer = setTimeout(
    historyTick,
    Math.max(0, nextHistoryDueAt - Date.now())
  );
}

function historyTick() {
  historyTimer = null;
  historyTimerAt = 0;
  if (!historyEnabled()) return;

  addHistoryPoint(percentFromSolarState(), true);
  rescheduleHistoryTimer();
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

  ensureHistoryChart();
  ensureCapacityLabel();
  ensureBatteryEstimateLabel();
  applyGaugeVisibility();

  // Redraw in case the host re-render replaced the SVG between samples.
  renderHistoryChart();

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
    if (clamped !== null && historyEnabled()) {
      // Draw immediately when a reading arrives on/after a slot boundary.
      if (addHistoryPoint(clamped)) rescheduleHistoryTimer();
    }
  }

  updateCapacityDisplay();
  updateBatteryEstimateDisplay();
  updateFlowDotWidth(batteryEstimateOptions.showEstimate);
  watchBatteryTipChanges();

  return progressWrapper;
}

export function createVerticalProgressBar(percent = 0) {
  return renderGauge(percent);
}

export function ensureSolarGauge() {
  if (!window.__foxessSolarState) return renderGauge(undefined);
  return renderGauge(percentFromSolarState());
}

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

  createVerticalProgressBar(percent);
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
