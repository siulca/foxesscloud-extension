const LIGHT_GREY = "#e6e6e6";
const OVERLAY_CLASS = "__axes_overlay";
const LINE_CLASS = "__axes_overlay_line";
const CHART_SELECTOR = ".infoItemContentSide .echart";

function applyOverlayTo(el) {
  if (!el || !(el instanceof Element)) return;

  const h = Math.round(el.clientHeight || el.getBoundingClientRect().height);
  const w = Math.round(el.clientWidth || el.getBoundingClientRect().width);
  if (!h || !w) return;

  const size = `${w}x${h}`;
  let overlay = el.querySelector(`.${OVERLAY_CLASS}`);

  // Already correct: do not rewrite anything (prevents observer feedback).
  if (overlay && overlay.dataset.size === size) return;

  if (!overlay) {
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";

    overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0 0 0 0",
      pointerEvents: "none",
      zIndex: 9999,
    });
    el.appendChild(overlay);
  } else {
    overlay.innerHTML = "";
  }

  overlay.dataset.size = size;

  const pad = 2; // tiny offset so top line is visible
  const p1 = pad;
  const gap = (h - pad * 2) / 2;
  const p2 = Math.round(p1 + gap);
  const p3 = Math.round(p1 + gap * 2);

  [p1, p2, p3].forEach((py) => {
    const line = document.createElement("div");
    line.className = LINE_CLASS;
    Object.assign(line.style, {
      position: "absolute",
      left: "0px",
      right: "0px",
      height: "0px",
      top: `${py}px`,
      borderTop: `1px dashed ${LIGHT_GREY}`,
      boxSizing: "border-box",
      pointerEvents: "none",
    });
    overlay.appendChild(line);
  });
}

/**
 * Apply the light guide overlays to simple ECharts instances.
 * Called from the shared DOM observer (and on resize), never from a timer.
 */
export function applyAxesOverlays() {
  document.querySelectorAll(CHART_SELECTOR).forEach((el) => applyOverlayTo(el));
}
