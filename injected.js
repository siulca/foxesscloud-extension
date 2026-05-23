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

// ==================== Sankey ECharts Injection (Network Intercept) ====================
function renderSankeyFromData(energyData) {
  console.log("[Sankey] Rendering with energy data:", energyData);
  // Find the target element
  const statR = document.querySelector(".eenery_stat_r");
  if (!statR || document.getElementById("foxesscloud-sankey-container")) return;

  // Extract values from actual API data structure
  // All values are strings, so parseFloat is used
  const pvProduced = parseFloat(energyData.production?.solar?.generation) || 0;
  const pvSelfConsumption =
    parseFloat(energyData.production?.selfConsumption?.generation) || 0;
  const exported =
    parseFloat(energyData.production?.gridExport?.generation) || 0;
  const discharged =
    parseFloat(energyData.production?.disCharge?.generation) || 0;
  const consumed =
    parseFloat(energyData.consumption?.consumption?.generation) || 0;
  const imported =
    parseFloat(energyData.consumption?.gridImport?.generation) || 0;
  const charged = parseFloat(energyData.consumption?.charge?.generation) || 0;

  // Node names (unique)
  const nodes = [
    {
      name: "Imported",
      itemStyle: { color: "rgb(198, 158, 255)" },
      label: {
        backgroundColor: "rgb(213, 183, 255)",
      },
    },
    {
      name: "Solar",
      itemStyle: { color: "rgb(8, 151, 156)" },
      label: {
        backgroundColor: "rgb(4, 118, 122)",
      },
    },
    {
      name: "Discharged",
      itemStyle: { color: "rgb(105, 177, 255)" },
      label: {
        backgroundColor: "rgb(149, 200, 255)",
      },
    },
    {
      name: "Exported",
      itemStyle: { color: "rgb(130, 27, 121)" },
      label: {
        backgroundColor: "rgb(178, 24, 165)",
      },
    },
    {
      name: "Consumed",
      itemStyle: { color: "rgb(250, 140, 22)" },
      label: {
        backgroundColor: "rgb(255, 163, 24)",
      },
    },
    {
      name: "Charged",
      itemStyle: { color: "rgb(235, 47, 150)" },
      label: {
        backgroundColor: "rgb(218, 3, 121)",
      },
    },
  ];

  // Realistic PV energy flows:
  // Solar → Consumed (self-consumption), Exported, Charged
  // Imported → Consumed
  // Discharged → Consumed
  // (Charged is only from Solar)
  // (Exported is only from Solar)
  const links = [];
  if (pvProduced && pvSelfConsumption)
    links.push({
      source: "Solar",
      target: "Consumed",
      value: pvSelfConsumption,
    });
  if (pvProduced && exported)
    links.push({ source: "Solar", target: "Exported", value: exported });
  if (pvProduced && charged)
    links.push({ source: "Solar", target: "Charged", value: charged });
  if (imported && consumed)
    links.push({ source: "Imported", target: "Consumed", value: imported });
  if (discharged && consumed)
    links.push({ source: "Discharged", target: "Consumed", value: discharged });
  const filteredLinks = links.filter(
    (l) => l.value > 0 && l.source && l.target,
  );

  // Create container
  const container = document.createElement("div");
  container.id = "foxesscloud-sankey-container";
  container.style.width = "100%";
  container.style.maxWidth = "400px";
  // container.style.height = "320px";
  container.style.margin = "0";

  // Insert before statR
  statR.parentNode.insertBefore(container, statR);

  // Load ECharts if not present
  function loadEcharts(cb) {
    if (window.echarts && window.echarts.init) return cb(window.echarts);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
    script.onload = () => cb(window.echarts);
    document.head.appendChild(script);
  }

  loadEcharts((echarts) => {
    // Calculate total input for each node for percentage labels
    const nodeTotals = {};
    filteredLinks.forEach((link) => {
      nodeTotals[link.target] = (nodeTotals[link.target] || 0) + link.value;
    });
    filteredLinks.forEach((link) => {
      nodeTotals[link.source] = (nodeTotals[link.source] || 0) + link.value;
    });

    // Add percentage to node labels
    const sankeyOption = {
      title: { text: "Energy Flow Sankey", left: "center", top: 0 },
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: function (params) {
          if (params.dataType === "edge") {
            // Show value and percent of source
            const percent = nodeTotals[params.data.source]
              ? (
                  (params.data.value / nodeTotals[params.data.source]) *
                  100
                ).toFixed(1)
              : "";
            return `${params.data.source} → ${params.data.target}<br/>${params.data.value} kWh (${percent}%)`;
          } else {
            // Show total for node
            return `${params.name}<br/>${nodeTotals[params.name] || 0} kWh`;
          }
        },
      },
      series: [
        {
          type: "sankey",
          top: 40,
          right: 15,
          left: 0,
          bottom: 40,
          nodeWidth: 90,
          data: nodes.map((n) => {
            // Add percent to label if node has total
            const total = nodeTotals[n.name] || 0;
            return {
              ...n,
              label: {
                ...n.label,
                width: 70,
                show: true,
                position: "insideTopLeft",
                fontWeight: "bold",
                color: "inherit",
                padding: 5,
                formatter: "{b}\n{c} kWh",
                shadowColor: "rgba(0,0,0,0.25)",
                shadowBlur: 10,
                shadowOffsetY: 2,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.25)",
                // formatter: function (params) {
                //   if (total > 0) {
                //     // Show node name and percent of total flow
                //     const percent = (
                //       (total /
                //         Object.values(nodeTotals).reduce(
                //           (a, b) => Math.max(a, b),
                //           1,
                //         )) *
                //       100
                //     ).toFixed(1);
                //     return `${params.name}\n${percent}%`;
                //   }
                //   return params.name;
                // },
              },
            };
          }),
          // orient: "vertical",
          links: filteredLinks,
          emphasis: { focus: "adjacency" },
          lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.5 },
        },
      ],
    };
    const chart = echarts.init(container);
    chart.setOption(sankeyOption);
  });
}

// Intercept fetch and XHR for the energy info endpoint
(function interceptEnergyInfo() {
  const ENDPOINT = "/dew/w/plant/energy/info";
  function handleEnergyResponse(json) {
    // Use the actual structure: { errno, msg, result }
    if (
      json &&
      json.result &&
      json.result.production &&
      json.result.consumption
    ) {
      renderSankeyFromData(json.result);
    }
  }

  // Patch fetch
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    return origFetch.apply(this, args).then(async (resp) => {
      try {
        if (typeof args[0] === "string" && args[0].includes(ENDPOINT)) {
          const clone = resp.clone();
          const json = await clone.json();
          handleEnergyResponse(json);
        }
      } catch (e) {}
      return resp;
    });
  };

  // Patch XHR
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    this._isEnergyInfo = args[1] && args[1].includes(ENDPOINT);
    return origOpen.apply(this, args);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (this._isEnergyInfo) {
      this.addEventListener("load", function () {
        try {
          const json = JSON.parse(this.responseText);
          handleEnergyResponse(json);
        } catch (e) {}
      });
    }
    return origSend.apply(this, args);
  };
})();
