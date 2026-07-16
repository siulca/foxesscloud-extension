/**
 * Creates / Updates a Vertical Progress Bar inside .fl_tips2
 * @param {number} percent - Value between 0 and 100
 * @returns {HTMLElement|null}
 */
function updateGaugeLabel(percent = 0) {
  const label = document.getElementById("solar-gauge-label");
  if (!label) return;

  const capacity = Number(window.pvCapacity ?? 0);
  label.innerHTML = `<b>${Number.isFinite(capacity) ? capacity.toFixed(1) : "0.0"}</b> kW<br/></br/></br><br/><b>${percent.toFixed(1)}</b> %`;
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
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            z-index: 10;
            left: -23px;
            top: 38px;
            transform: translateY(-50%);
        `;
    const capacityKw = document.createElement("div");
    capacityKw.id = "solar-gauge-label";
    capacityKw.style.cssText = `
            position: absolute;
            top: 0;
            left: -100px;
            width: 68px;
            font-size: 14px;
            line-height: 1;
            pointer-events: none;
            text-align: right;
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

    progressWrapper.appendChild(fill);
    progressWrapper.appendChild(ticks);
    container.appendChild(progressWrapper);
    container.appendChild(capacityKw);
  }

  // Update fill height
  const fill = document.getElementById("progress-fill");
  if (fill) {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    fill.style.height = `${clampedPercent}%`;
  }

  updateGaugeLabel(percent);

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
