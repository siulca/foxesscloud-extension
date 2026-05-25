import state from "../state.js";
import { toggleUnstack, applyToAllCharts } from "./unstack.js";

/**
 * Hook an ECharts instance so it auto-applies unstack on render.
 * Prevents double-hooking via __foxessHooked flag.
 * @param {object} inst - ECharts instance
 */
export function hookEchartsInstance(inst) {
  if (!inst || inst.__foxessHooked) return;
  inst.__foxessHooked = true;

  inst.on("rendered", () => {
    setTimeout(() => {
      toggleUnstack(inst, state.currentStackMode);
    }, 500);
  });
}

// ==================== Observers ====================

const chartObserver = new MutationObserver(() => {
  if (state.applyTimeout) clearTimeout(state.applyTimeout);
  state.applyTimeout = setTimeout(() => {
    applyToAllCharts();

    document.querySelectorAll(".echart").forEach((container) => {
      const inst = window.echarts?.getInstanceByDom(container);
      if (inst) hookEchartsInstance(inst);
    });
  }, 250);
});

function startObserving() {
  document.querySelectorAll(".echart").forEach((chart) => {
    if (!chart.dataset.observed) {
      chartObserver.observe(chart, { childList: true, subtree: true });
      chart.dataset.observed = "true";
    }
  });
}

const bodyObserver = new MutationObserver(() => {
  startObserving();
});

bodyObserver.observe(document.body, { childList: true, subtree: true });

// ==================== Initial Setup ====================
setTimeout(() => {
  startObserving();

  document.querySelectorAll(".echart").forEach((container) => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) hookEchartsInstance(inst);
  });

  applyToAllCharts();
}, 1500);
