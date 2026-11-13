import state from "../state.js";
import { toggleUnstack } from "./unstack.js";

const RENDER_DELAY_MS = 300;

/**
 * Hook an ECharts instance so it auto-applies the current stack mode after it
 * renders. Prevents double-hooking via __foxessHooked flag.
 * @param {object} inst - ECharts instance
 */
export function hookEchartsInstance(inst) {
  if (!inst || inst.__foxessHooked) return;
  inst.__foxessHooked = true;

  inst.on("rendered", () => {
    if (inst.__foxessRenderTimer) clearTimeout(inst.__foxessRenderTimer);
    inst.__foxessRenderTimer = setTimeout(() => {
      inst.__foxessRenderTimer = null;
      toggleUnstack(inst, state.currentStackMode);
    }, RENDER_DELAY_MS);
  });
}

/**
 * Hook every ECharts instance currently present in the DOM. Called from the
 * single DOM observer, not from a timer.
 */
export function hookAllCharts() {
  const echarts = window.echarts;
  if (!echarts?.getInstanceByDom) return;

  document.querySelectorAll(".echart").forEach((container) => {
    const inst = echarts.getInstanceByDom(container);
    if (!inst) return;

    const wasHooked = Boolean(inst.__foxessHooked);
    hookEchartsInstance(inst);

    // Apply the current mode once, right after hooking. Subsequent renders are
    // handled by the instance's "rendered" event.
    if (!wasHooked) {
      toggleUnstack(inst, state.currentStackMode);
    }
  });
}
