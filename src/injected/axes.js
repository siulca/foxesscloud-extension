/**
 * Inject light axes and horizontal guide lines into simple ECharts instances
 * found as children of `.infoItemContentSide` that carry `_echarts_instance_`.
 * This file runs as a side-effect import.
 */
// Compact DOM-overlay injector: draws three dashed LIGHT_GREY guides per chart
(() => {
  const LIGHT_GREY = "#e6e6e6";
  const OVERLAY_CLASS = "__axes_overlay";
  const LINE_CLASS = "__axes_overlay_line";

  function applyOverlayTo(el) {
    if (!el || !(el instanceof Element)) return;
    // remove existing overlay
    const prev = el.querySelectorAll(`.${OVERLAY_CLASS}`);
    prev.forEach((n) => n.remove());
    // ensure positioned container
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";
    const h = el.clientHeight || el.getBoundingClientRect().height;
    const w = el.clientWidth || el.getBoundingClientRect().width;
    if (!h || !w) return;
    const overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0 0 0 0",
      pointerEvents: "none",
      zIndex: 9999,
    });
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
    el.appendChild(overlay);
  }

  function applyToAll() {
    // target obvious chart containers
    const containers = Array.from(
      document.querySelectorAll(".infoItemContentSide .echart"),
    ).concat(
      Array.from(document.querySelectorAll(".infoItemContentSide .echart")),
    );
    containers.forEach((el) => applyOverlayTo(el));
  }

  // debounce helpers
  let t1 = null;
  function scheduleAll() {
    clearTimeout(t1);
    t1 = setTimeout(applyToAll, 120);
  }

  const obs = new MutationObserver(scheduleAll);
  try {
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {
    /* ignore */
  }
  window.addEventListener("resize", scheduleAll);

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () =>
      setTimeout(applyToAll, 50),
    );
  else setTimeout(applyToAll, 50);
})();
