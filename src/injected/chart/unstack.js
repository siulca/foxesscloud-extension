import state from "../state.js";

const originalSeriesCache = new WeakMap();

/**
 * Toggle ECharts bar chart between stacked and unstacked display.
 * @param {object} inst - ECharts instance
 * @param {boolean} stack - true = stacked, false = unstacked
 */
export function toggleUnstack(inst, stack) {
  if (!inst) return;

  const opt = inst.getOption();
  if (!opt?.series) return;

  // === CACHE ORIGINAL DATA (once per instance, but retry if it was empty) ===
  const cachedOriginal = originalSeriesCache.get(inst);
  const hadData = Boolean(
    cachedOriginal?.some((series) => Array.isArray(series) && series.length > 0),
  );
  const hasData = opt.series.some(
    (s) => Array.isArray(s.data) && s.data.length > 0,
  );

  if (!cachedOriginal || (hasData && !hadData)) {
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

    originalSeriesCache.set(inst, originalSeries);
  }

  const cached = originalSeriesCache.get(inst);
  let needsUpdate = false;

  opt.series.forEach((s, seriesIndex) => {
    if (!Array.isArray(s.data)) return;

    const originalSeriesData = cached?.[seriesIndex];
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
    const desiredMin = stack ? null : 0;
    if (opt.yAxis[0].min !== desiredMin) {
      opt.yAxis[0].min = desiredMin;
      needsUpdate = true;
    }
  }

  // Only touch the chart when something actually changed; this is what stops
  // the rendered -> setOption -> rendered feedback loop.
  if (!needsUpdate) return;

  inst.setOption(opt, { replaceMerge: ["series", "yAxis"] });
  inst.resize();
}

/**
 * Apply current stack/unstack mode to all ECharts charts on the page.
 */
export function applyToAllCharts() {
  const containers = document.querySelectorAll(".echart");

  if (containers.length === 0) return;

  containers.forEach((container) => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) {
      toggleUnstack(inst, state.currentStackMode);
    }
  });
}
