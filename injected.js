// injected.js
let currentStackMode = false; // false = unstacked
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
    //console.log(`[ApplyMode] ✅ Applied changes to chart ${chartId}`);
  } else {
    //console.log(`[ApplyMode] No changes needed for chart ${chartId}`);
  }
}

function applyToAllCharts() {
  document.querySelectorAll(".echart").forEach((container) => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) applyMode(inst, currentStackMode);
  });
}

// ==================== Message Handler ====================
window.addEventListener("message", (event) => {
  if (event.data?.source !== "foxesscloud-extension") return;
  if (event.data.type !== "ECHARTS_CONTROL") return;

  currentStackMode = !!event.data.stack;

  applyToAllCharts();
});

// ==================== Toggle UI - Simple Checkbox ====================
function injectUnstackToggle() {
  if (document.getElementById("foxesscloud-unstack-toggle")) {
    return true;
  }

  const legendsContainer = document.querySelector(".rightLegends");
  if (!legendsContainer) {
    return false;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "mg-l8 flex-vertical-center";
  wrapper.id = "foxesscloud-unstack-toggle";
  wrapper.style.marginLeft = "24px";
  wrapper.style.marginTop = "16px";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "8px";

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

  const checkbox = wrapper.querySelector("input");

  checkbox.addEventListener("change", function () {
    const isUnstacked = this.checked;

    window.postMessage(
      {
        source: "foxesscloud-extension",
        type: "ECHARTS_CONTROL",
        stack: !isUnstacked, // checked = Unstacked → stack = false
      },
      "*",
    );
  });

  return true;
}

// ==================== ECharts Hooking ====================
function hookEchartsInstance(inst) {
  if (!inst || inst.__foxessHooked) return;
  inst.__foxessHooked = true;

  inst.on("rendered", () => {
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

  if (!document.getElementById("foxesscloud-unstack-toggle")) {
    setTimeout(() => injectUnstackToggle(), 1000);
  }
});

bodyObserver.observe(document.body, { childList: true, subtree: true });

// ==================== Initial Setup ====================
setTimeout(() => {
  startObserving();
  injectUnstackToggle();

  document.querySelectorAll(".echart").forEach((container) => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) hookEchartsInstance(inst);
  });

  applyToAllCharts();
}, 1500);

// ==================== Sankey Diagram ====================
function renderSankeyFromData(energyData) {
  const statR = document.querySelector(".eenery_stat_r");
  let container = document.getElementById("foxesscloud-sankey-container");

  if (!container) {
    if (!statR) return;

    container = document.createElement("div");
    container.id = "foxesscloud-sankey-container";
    container.style.width = "30%";
    container.style.margin = "0";

    statR.parentNode.insertBefore(container, statR);
    statR.remove();
  }

  // ====================== UNIT CONVERSION ======================
  function toKWh(value, unit) {
    if (!value || isNaN(parseFloat(value))) return 0;
    const num = parseFloat(value);
    return unit?.toUpperCase() === "MWH" ? num * 1000 : num;
  }

  const pvSelfConsumption = toKWh(
    energyData.production?.selfConsumption?.generation,
    energyData.production?.selfConsumption?.unit,
  );
  const exported = toKWh(
    energyData.production?.gridExport?.generation,
    energyData.production?.gridExport?.unit,
  );
  const discharged = toKWh(
    energyData.production?.disCharge?.generation,
    energyData.production?.disCharge?.unit,
  );
  const imported = toKWh(
    energyData.consumption?.gridImport?.generation,
    energyData.consumption?.gridImport?.unit,
  );
  const consumed = toKWh(
    energyData.consumption?.consumption?.generation,
    energyData.consumption?.consumption?.unit,
  );
  const charged = toKWh(
    energyData.consumption?.charge?.generation,
    energyData.consumption?.charge?.unit,
  );

  const displayUnit = "kWh";

  // ====================== NODE CONFIG ======================
  const nodeConfig = {
    Imported: { color: "rgb(198, 158, 255)", labelBg: "rgb(213, 183, 255)" },
    Solar: { color: "rgb(8, 151, 156)", labelBg: "rgb(4, 118, 122)" },
    Discharged: { color: "rgb(105, 177, 255)", labelBg: "rgb(149, 200, 255)" },
    Exported: { color: "rgb(130, 27, 121)", labelBg: "rgb(178, 24, 165)" },
    Consumed: { color: "rgb(250, 140, 22)", labelBg: "rgb(255, 163, 24)" },
    Charged: { color: "rgb(235, 47, 150)", labelBg: "rgb(218, 3, 121)" },
  };

  // ====================== LINKS ======================
  const links = [];
  if (pvSelfConsumption > 0)
    links.push({
      source: "Solar",
      target: "Consumed",
      value: pvSelfConsumption,
    });
  if (exported > 0)
    links.push({ source: "Solar", target: "Exported", value: exported });
  if (charged > 0)
    links.push({ source: "Solar", target: "Charged", value: charged });
  if (imported > 0)
    links.push({ source: "Imported", target: "Consumed", value: imported });
  if (discharged > 0)
    links.push({ source: "Discharged", target: "Consumed", value: discharged });

  // Only include nodes with actual flow
  const activeNodeNames = new Set();
  links.forEach((link) => {
    activeNodeNames.add(link.source);
    activeNodeNames.add(link.target);
  });

  // ====================== CALCULATE TOTALS ======================
  const nodeTotals = {};
  links.forEach((link) => {
    nodeTotals[link.source] = (nodeTotals[link.source] || 0) + link.value;
    nodeTotals[link.target] = (nodeTotals[link.target] || 0) + link.value;
  });

  const grandTotal =
    Object.values(nodeTotals).reduce((a, b) => a + b, 0) / 2 || 1;

  // ====================== ACTIVE NODES WITH FULL LABELS ======================
  const activeNodes = Array.from(activeNodeNames).map((name) => ({
    name: name,
    itemStyle: { color: nodeConfig[name].color },
    label: {
      backgroundColor: nodeConfig[name].labelBg,
      width: 70,
      show: true,
      position: "insideTopLeft",
      fontWeight: "bold",
      color: "inherit",
      padding: 5,
      shadowColor: "rgba(0,0,0,0.25)",
      shadowBlur: 10,
      shadowOffsetY: 2,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.25)",
      formatter: function (params) {
        const total = nodeTotals[params.name] || 0;
        if (total > 0 && grandTotal > 0) {
          const percent = ((total / grandTotal) * 100).toFixed(1);
          return `${params.name}\n${percent}%`;
        }
        return params.name;
      },
    },
  }));

  // ====================== RENDER ======================
  function loadEcharts(cb) {
    if (window.echarts?.init) return cb(window.echarts);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
    script.onload = () => cb(window.echarts);
    document.head.appendChild(script);
  }

  loadEcharts((echarts) => {
    const sankeyOption = {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          if (params.dataType === "edge") {
            const sourceTotal = nodeTotals[params.data.source] || 1;
            const percent = ((params.data.value / sourceTotal) * 100).toFixed(
              1,
            );
            return `${params.data.source} → ${params.data.target}<br/>${params.data.value.toFixed(2)} ${displayUnit} (${percent}%)`;
          }
          const total = nodeTotals[params.name] || 0;
          const percent = ((total / grandTotal) * 100).toFixed(1);
          return `${params.name}<br/>${total.toFixed(2)} ${displayUnit} (${percent}%)`;
        },
      },
      series: [
        {
          type: "sankey",
          top: 0,
          right: 0,
          left: 0,
          bottom: 40,
          nodeWidth: 90,
          nodeGap: 16,
          layoutIterations: 32,
          orient: "horizontal",
          nodeAlign: "justify",
          data: activeNodes,
          links: links,
          emphasis: { focus: "adjacency" },
          lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.5 },
        },
      ],
    };

    if (container.__sankeyChart) {
      container.__sankeyChart.setOption(sankeyOption, true);
    } else {
      const chart = echarts.init(container);
      container.__sankeyChart = chart;
      chart.setOption(sankeyOption);
    }
  });
}

(function interceptEnergyInfo() {
  const ENDPOINT = "/dew/w/plant/energy/info";

  function handleEnergyResponse(json) {
    if (json?.result?.production && json?.result?.consumption) {
      renderSankeyFromData(json.result);
    }
  }

  // ====================== FETCH INTERCEPTOR ======================
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes(ENDPOINT)) {
        const cloned = response.clone();
        const json = await cloned.json().catch(() => null);
        if (json) handleEnergyResponse(json);
      }
    } catch (e) {
      console.debug("Fetch interceptor error (non-fatal)", e);
    }

    return response;
  };

  // ====================== XHR INTERCEPTOR ======================
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (...args) {
    const url = args[1];
    this._isEnergyInfo = typeof url === "string" && url.includes(ENDPOINT);
    return origOpen.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._isEnergyInfo) {
      this.addEventListener("load", function () {
        try {
          if (this.responseText) {
            handleEnergyResponse(JSON.parse(this.responseText));
          }
        } catch (e) {
          console.debug("XHR parse error", e);
        }
      });
    }
    return origSend.apply(this, args);
  };

  console.log("✅ Energy interceptor for Sankey Diagram installed");
})();
