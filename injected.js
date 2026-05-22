// injected.js
let currentStackMode = false;   // false = unstacked
let lastApplyTime = 0;
let applyTimeout = null;

// Global cache: chart ID → original series data
const originalDataCache = new Map();

function applyMode(inst, stack) {
    if (!inst) return;

    const now = Date.now();
    if (now - lastApplyTime < 300) return;
    lastApplyTime = now;

    const opt = inst.getOption();
    if (!opt?.series) return;

    // Generate stable chart ID
    const chartId = inst.id || `chart_${Math.random().toString(36).substr(2, 9)}`;

    // === CACHE ORIGINAL DATA (only once) ===
    if (!originalDataCache.has(chartId)) {
        const originalSeries = opt.series.map(s => {
            if (Array.isArray(s.data)) {
                return s.data.map(item => {
                    if (Array.isArray(item)) {
                        return [...item];   // deep clone [timestamp, value]
                    }
                    return item;
                });
            }
            return s.data;
        });

        originalDataCache.set(chartId, originalSeries);
    }

    const cachedOriginal = originalDataCache.get(chartId);
    let needsUpdate = false;

    opt.series.forEach((s, seriesIndex) => {
        if (!Array.isArray(s.data)) return;

        const originalSeriesData = cachedOriginal?.[seriesIndex];
        if (!originalSeriesData) return;

        s.data = s.data.map((item, index) => {
            if (Array.isArray(item) && item.length >= 2) {
                const origItem = originalSeriesData[index];
                const originalValue = Array.isArray(origItem) ? parseFloat(origItem[1]) : NaN;

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

        if (s.type === 'bar') {
            const desiredStack = stack ? 'customStack' : null;
            const desiredGap = stack ? '20%' : '35%';

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
            replaceMerge: ['series', 'yAxis'] 
        });
        inst.resize();
        //console.log(`[ApplyMode] ✅ Applied changes to chart ${chartId}`);
    } else {
        //console.log(`[ApplyMode] No changes needed for chart ${chartId}`);
    }
}

function applyToAllCharts() {
  document.querySelectorAll('.echart').forEach(container => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) applyMode(inst, currentStackMode);
  });
}

// ==================== Message Handler ====================
window.addEventListener('message', (event) => {
  if (event.data?.source !== 'foxesscloud-extension') return;
  if (event.data.type !== 'ECHARTS_CONTROL') return;

  currentStackMode = !!event.data.stack;

  applyToAllCharts();
});

// ==================== Toggle UI - Simple Checkbox ====================
function injectUnstackToggle() {
  if (document.getElementById('foxesscloud-unstack-toggle')) {
    return true;
  }

  const legendsContainer = document.querySelector('.rightLegends');
  if (!legendsContainer) {
    return false;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'mg-l8 flex-vertical-center';
  wrapper.id = 'foxesscloud-unstack-toggle';
  wrapper.style.marginLeft = '24px';
  wrapper.style.marginTop = '16px';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '8px';

  wrapper.innerHTML = `
    <input type="checkbox" id="foxess-unstack-checkbox" 
           style="width: 18px; height: 18px; accent-color: #1890ff; cursor: pointer;">
    <label for="foxess-unstack-checkbox" 
           class="mode_sched_name" 
           style="margin: 0; cursor: pointer; user-select: none;">
      Unstacked
    </label>
  `;

  legendsContainer.appendChild(wrapper);

  const checkbox = wrapper.querySelector('input');

  checkbox.addEventListener('change', function() {
    const isUnstacked = this.checked;

    window.postMessage({
      source: 'foxesscloud-extension',
      type: 'ECHARTS_CONTROL',
      stack: !isUnstacked   // checked = Unstacked → stack = false
    }, '*');
  });

  return true;
}

// ==================== ECharts Hooking ====================
function hookEchartsInstance(inst) {
  if (!inst || inst.__foxessHooked) return;
  inst.__foxessHooked = true;

  inst.on('rendered', () => {
    setTimeout(() => {
      applyMode(inst, currentStackMode);
    }, 500);
  });
}

// ==================== Observers ====================
const chartObserver = new MutationObserver(() => {
  if (applyTimeout) clearTimeout(applyTimeout);
  applyTimeout = setTimeout(() => {
    applyToAllCharts();

    document.querySelectorAll('.echart').forEach(container => {
      const inst = window.echarts?.getInstanceByDom(container);
      if (inst) hookEchartsInstance(inst);
    });
  }, 250);
});

function startObserving() {
  document.querySelectorAll('.echart').forEach(chart => {
    if (!chart.dataset.observed) {
      chartObserver.observe(chart, { childList: true, subtree: true });
      chart.dataset.observed = 'true';
    }
  });
}

const bodyObserver = new MutationObserver(() => {
  startObserving();
  
   if (!document.getElementById('foxesscloud-unstack-toggle')) {
    setTimeout(() => injectUnstackToggle(), 1000);
  }
});

bodyObserver.observe(document.body, { childList: true, subtree: true });

// ==================== Initial Setup ====================
setTimeout(() => {
  startObserving();
  injectUnstackToggle();

  document.querySelectorAll('.echart').forEach(container => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) hookEchartsInstance(inst);
  });

  applyToAllCharts();
}, 1500);