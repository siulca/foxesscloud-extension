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
    <input type="checkbox" id="foxess-unstack-checkbox" checked
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

// ==================== Sankey ECharts Injection ====================
function injectSankeyGraph() {

  // Retry logic for async data
  if (!window.__foxesscloudSankeyRetry) window.__foxesscloudSankeyRetry = 0;
  const MAX_RETRIES = 10;
  const statR = document.querySelector('.eenery_stat_r');
  if (!statR || document.getElementById('foxesscloud-sankey-container')) {
    window.__foxesscloudSankeyRetry = 0;
    return;
  }

  // Parse DOM for data
  const rows = statR.querySelectorAll('.eenery_stat_row');
  if (rows.length < 2) return;
  const supplyCols = rows[0].querySelectorAll('.eenery_stat_col');
  const usageCols = rows[1].querySelectorAll('.eenery_stat_col');

  // Helper to extract value and label
  function getColData(col) {
    const valueText = col.querySelector('.eenery_stat_col_nu')?.textContent || '';
    const value = parseFloat(valueText);
    const label = col.querySelector('.eenery_stat_col_na')?.textContent.trim() || '';
    console.log(label, value, valueText)
    return { label, value: isNaN(value) ? 0 : value };
  }

  // Extract data
  const supplyData = Array.from(supplyCols).map(getColData);
  const usageData = Array.from(usageCols).map(getColData);


  // Map supply/usage by label for easy access
  const supplyMap = Object.fromEntries(supplyData.map(d => [d.label, d.value]));
  const usageMap = Object.fromEntries(usageData.map(d => [d.label, d.value]));

  // Node names (unique)
  const nodeNames = [
    'Imported', 'PV Produced', 'Discharged',
    'Exported', 'Consumed', 'Charged'
  ];
  const nodes = nodeNames.map(name => ({ name }));

  // Realistic PV energy flows:
  // PV Produced → Consumed, Exported, Charged
  // Imported → Consumed
  // Discharged → Consumed
  // (Charged is only from PV Produced)
  // (Exported is only from PV Produced)
  // Use available values, fallback to 0 if missing
  const links = [];
  // PV Produced flows
  if (supplyMap['PV Produced'] && usageMap['Consumed']) {
    // Estimate PV to Consumed: Consumed - Imported - Discharged (if positive)
    let pvToConsumed = usageMap['Consumed'] - (supplyMap['Imported'] || 0) - (supplyMap['Discharged'] || 0);
    if (pvToConsumed < 0) pvToConsumed = 0;
    links.push({ source: 'PV Produced', target: 'Consumed', value: pvToConsumed });
  }
  if (supplyMap['PV Produced'] && usageMap['Exported']) {
    links.push({ source: 'PV Produced', target: 'Exported', value: usageMap['Exported'] });
  }
  if (supplyMap['PV Produced'] && usageMap['Charged']) {
    links.push({ source: 'PV Produced', target: 'Charged', value: usageMap['Charged'] });
  }
  // Imported flows
  if (supplyMap['Imported'] && usageMap['Consumed']) {
    links.push({ source: 'Imported', target: 'Consumed', value: supplyMap['Imported'] });
  }
  // Discharged flows
  if (supplyMap['Discharged'] && usageMap['Consumed']) {
    links.push({ source: 'Discharged', target: 'Consumed', value: supplyMap['Discharged'] });
  }


  // Remove links with zero or negative value
  const filteredLinks = links.filter(l => l.value > 0 && l.source && l.target);

  // If no valid links, retry after a short delay (async data)
  if (filteredLinks.length === 0 && window.__foxesscloudSankeyRetry < MAX_RETRIES) {
    window.__foxesscloudSankeyRetry++;
    setTimeout(injectSankeyGraph, 500);
    return;
  }
  window.__foxesscloudSankeyRetry = 0;

  // Create container
  const container = document.createElement('div');
  container.id = 'foxesscloud-sankey-container';
  container.style.width = '100%';
  container.style.height = '320px';
  container.style.marginBottom = '16px';

  // Insert before statR
  statR.parentNode.insertBefore(container, statR);

  // Load ECharts if not present
  function loadEcharts(cb) {
    if (window.echarts && window.echarts.init) return cb(window.echarts);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
    script.onload = () => cb(window.echarts);
    document.head.appendChild(script);
  }

  loadEcharts((echarts) => {
    const sankeyOption = {
      title: { text: 'Energy Flow Sankey', left: 'center', top: 10 },
      tooltip: { trigger: 'item', triggerOn: 'mousemove' },
      series: [{
        type: 'sankey',
        data: nodes,
        links: filteredLinks,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { color: '#333', fontWeight: 'bold' }
      }]
    };
    const chart = echarts.init(container);
    chart.setOption(sankeyOption);
  });
}

// Observe and inject Sankey when DOM is ready
const sankeyObserver = new MutationObserver(() => {
  injectSankeyGraph();
});
sankeyObserver.observe(document.body, { childList: true, subtree: true });
// Also try once on load
setTimeout(injectSankeyGraph, 2000);