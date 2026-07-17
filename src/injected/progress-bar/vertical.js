/**
 * Creates / Updates a Vertical Progress Bar inside .fl_tips2
 * @param {number} percent - Value between 0 and 100
 * @returns {HTMLElement|null}
 */
function updateGaugeLabel(percent = 0) {
  // Update the percent marker positioned alongside the bar using fixed
  // viewport coordinates computed from the wrapper's bounding box.
  const marker = document.getElementById("solar-percent-marker");
  const wrapper = document.getElementById("vertical-progress-bar");
  if (!marker || !wrapper) return;

  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  marker.innerHTML = `<b>${clamped.toFixed(1)}</b> %`;

  // Compute position relative to the wrapper so the marker remains inside
  // the vertical bar DOM and follows the fill.
  const wrapRect = wrapper.getBoundingClientRect();
  const relY = (1 - clamped / 100) * wrapRect.height;
  marker.style.top = `${relY}px`;
  // marker.style.left = `-100px`;
}

function updateCapacityDisplay() {
  const label = document.getElementById("solar-gauge-label");
  if (!label) return;
  const capacity = Number(window.pvCapacity ?? 0);
  const capText = `${Number.isFinite(capacity) ? capacity.toFixed(1) : "0.0"} kW`;
  label.innerHTML = capText;
}

export function createVerticalProgressBar(percent = 0) {
  // Find target container
  const container = document.querySelector(".fl_tips2");
  if (!container) {
    console.warn("[ProgressBar] .fl_tips2 not found");
    return null;
  }

  // Create or reuse the progress bar
  let progressWrapper = document.getElementById("vertical-progress-bar");

  if (!progressWrapper) {
    progressWrapper = document.createElement("div");
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
    const capacityKw = document.createElement("div");
    capacityKw.id = "solar-gauge-label";
    capacityKw.style.cssText = `
        font-size: 12px;
        color: var(--color-text-label);
        line-height: 1;
        pointer-events: none;
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
    // Percentage marker element. We'll position it using viewport coords so
    // it won't be clipped by the wrapper's overflow.
    const percentMarker = document.createElement("div");
    percentMarker.id = "solar-percent-marker";
    // Position marker absolutely relative to the progress wrapper so it stays
    // visually grouped with the bar but outside the rounded clip area.
    percentMarker.style.cssText = `
        position: absolute;
        left: -80px;
        width: 68px;
        text-align: right;
        pointer-events: none;
        transform: translateY(-90%);
        font-weight: bold;
        z-index: 20;
      `;

    progressWrapper.appendChild(fill);
    progressWrapper.appendChild(ticks);
    progressWrapper.appendChild(percentMarker);
    container.appendChild(progressWrapper);

    // Attach capacity display to the solar tip box if present, otherwise
    // fall back to placing it next to the progress bar.
    const solarTip = document.querySelector(".tip_common.tip_solar");
    if (solarTip) {
      solarTip.appendChild(capacityKw);
    } else {
      container.appendChild(capacityKw);
    }
  }

  // Update fill height
  const fill = document.getElementById("progress-fill");
  if (fill) {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    fill.style.height = `${clampedPercent}%`;
  }

  updateGaugeLabel(percent);

  // Ensure capacity number is shown/updated in its (new) location.
  updateCapacityDisplay();

  return progressWrapper;
}

export function updateSolarProgressFromValue(
  value,
  unit = "W",
  pvCapacity = window.pvCapacity,
) {
  const powerW = parseFloat(value) || 0;
  const powerKw = unit === "W" ? powerW / 1000 : powerW;
  const capacity = Number(pvCapacity) || 1;
  const percent = capacity > 0 ? (powerKw / capacity) * 100 : 0;

  window.__foxessSolarState = {
    value,
    unit,
  };

  createVerticalProgressBar(percent);
  return percent;
}

/**
 * Show or hide the solar production gauge.
 * @param {boolean} show
 */
export function toggleSolarGauge(show) {
  const wrapper = document.getElementById("vertical-progress-bar");
  const label = document.getElementById("solar-gauge-label");
  const display = show ? "" : "none";
  if (wrapper) wrapper.style.display = display;
  if (label) label.style.display = display;
}
