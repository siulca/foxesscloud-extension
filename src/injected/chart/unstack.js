import state from "../state.js";

/**
 * Toggle ECharts bar chart between stacked and unstacked display.
 * @param {object} inst - ECharts instance
 * @param {boolean} stack - true = stacked, false = unstacked
 */
export function toggleUnstack(inst, stack) {
  if (!inst) return;

  const now = Date.now();
  if (now - state.lastApplyTime < 300) return;
  state.lastApplyTime = now;

  const opt = inst.getOption();
  if (!opt?.series) return;

  // Generate stable chart ID
  const chartId = inst.id || `chart_${Math.random().toString(36).substr(2, 9)}`;

  // === CACHE ORIGINAL DATA (only once) ===
  if (!state.originalDataCache.has(chartId)) {
    const originalSeries = opt.series.map((s) => {
      if (Array.isArray(s.data)) {
        return s.data.map((item) => {
          if (Array.isArray(item)) {
            return [...item]; // deep clone [timestamp, value]
          }
          return item;
        });
      }
      return s.data;
    });

    state.originalDataCache.set(chartId, originalSeries);
  }

  const cachedOriginal = state.originalDataCache.get(chartId);
  let needsUpdate = false;

  opt.series.forEach((s, seriesIndex) => {
    if (!Array.isArray(s.data)) return;

    const originalSeriesData = cachedOriginal?.[seriesIndex];
    if (!originalSeriesData) return;

    s.data = s.data.map((item, index) => {
      if (Array.isArray(item) && item.length >= 2) {
        const origItem = originalSeriesData[index];
        const originalValue = Array.isArray(origItem)
          ? parseFloat(origItem[1])
          : NaN;

        if (!isNaN(originalValue)) {
          const newVal = stack ? originalValue : Math.abs(originalValue);

          if (item[1] !== newVal) {
            item[1] = newVal;
            needsUpdate = true;
          }
        }
      }
      return item;
    });

    if (s.type === "bar") {
      const desiredStack = stack ? "customStack" : null;
      const desiredGap = stack ? "20%" : "35%";

      if (s.stack !== desiredStack || s.barGap !== desiredGap) {
        s.stack = desiredStack;
        s.barGap = desiredGap;
        needsUpdate = true;
      }
    }
  });

  if (opt.yAxis?.[0]) {
    const desiredMin = stack ? undefined : 0;
    if (opt.yAxis[0].min !== desiredMin) {
      opt.yAxis[0].min = desiredMin;
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    inst.setOption(opt, {
      notMerge: true,
      replaceMerge: ["series", "yAxis"],
    });
    inst.resize();
  }
}

/**
 * Apply current stack/unstack mode to all ECharts charts on the page.
 */
export function applyToAllCharts() {
  const containers = document.querySelectorAll(".echart");

  if (containers.length === 0) {
    console.warn("⚠️ No .echart elements found on page!");
    return;
  }

  containers.forEach((container) => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) {
      toggleUnstack(inst, state.currentStackMode);
    }
  });
}
