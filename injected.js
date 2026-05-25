let currentStackMode = false; // false = unstacked
let showSankey = false;
let lastApplyTime = 0;
let applyTimeout = null;

// Global cache: chart ID → original series data
const originalDataCache = new Map();

function toggleUnstack(inst, stack) {
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
  } else {
  }
}

function applyToAllCharts() {
  const containers = document.querySelectorAll(".echart");

  if (containers.length === 0) {
    console.warn("⚠️ No .echart elements found on page!");
    return;
  }

  containers.forEach((container, i) => {
    const inst = window.echarts?.getInstanceByDom(container);
    if (inst) {
      toggleUnstack(inst, currentStackMode);
    }
  });
}

// ==================== Message Handler ====================
window.addEventListener("message", (event) => {
  // Security check - only accept messages from our extension
  if (event.data?.source !== "foxesscloud-extension") return;

  const data = event.data;

  switch (data.type) {
    case "SET_UNSTACKED":
      currentStackMode = data.value;
      applyToAllCharts();
      break;

    // Add more message types easily here:
    case "SHOW_SANKEY":
      showSankeyDiagram(data.value);
      break;

    // case "SHOW_BATTERY_ESTIMATE":
    //   toggleBatteryEstimate(data.value);
    //   break;

    default:
      console.warn("Unknown message type:", data.type);
  }
});

// ==================== ECharts Hooking ====================
function hookEchartsInstance(inst) {
  if (!inst || inst.__foxessHooked) return;
  inst.__foxessHooked = true;

  inst.on("rendered", () => {
    setTimeout(() => {
      toggleUnstack(inst, currentStackMode);
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

// ==================== Sankey Diagram ====================
function showSankeyDiagram(isOn) {
  showSankey = !!isOn;

  const sankey = document.getElementById("foxesscloud-sankey-container");
  const statR = document.querySelector(".eenery_stat_r");
  if (sankey) {
    sankey.style.display = showSankey ? "block" : "none";
    statR.style.display = !showSankey ? "block" : "none";
  }
}

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
    statR.style.display = showSankey ? "block" : "none";
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
    Solar: { color: "rgb(8, 151, 156)", labelBg: "rgb(4, 171, 177)" },
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
    itemStyle: {
      color: nodeConfig[name].color,
      shadowColor: "rgba(0,0,0,0.25)",
      shadowBlur: 10,
    },
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

(function interceptEndpoints() {
  // ====================== ENDPOINTS ======================
  const ENERGY_ENDPOINT = "/dew/w/plant/energy/info";
  const PLANT_ENDPOINT = "/dew/v0/plant/detail";

  // ====================== HANDLERS ======================
  function handleEnergyResponse(json) {
    if (json?.result?.production && json?.result?.consumption) {
      renderSankeyFromData(json.result);
    }
  }

  function handlePlantDetailResponse(json) {
    // Example: store data globally or trigger another function
    if (json?.result?.info?.pvCapacity) {
      window.pvCapacity = json.result.info.pvCapacity;
      // setTimeout(
      //   () => createVerticalProgressBar(json?.result?.info?.pvCapacity, 15),
      //   100,
      // );
    }
  }

  // ======================FETCH INTERCEPTOR ======================
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      const cloned = response.clone();
      const json = await cloned.json().catch(() => null);
      if (!json) return response;

      if (url.includes(ENERGY_ENDPOINT)) {
        handleEnergyResponse(json);
      } else if (url.includes(PLANT_ENDPOINT)) {
        handlePlantDetailResponse(json);
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

    if (typeof url === "string") {
      this._requestType = url.includes(ENERGY_ENDPOINT)
        ? "energy"
        : url.includes(PLANT_ENDPOINT)
          ? "plant"
          : null;
    }

    return origOpen.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._requestType) {
      this.addEventListener("load", function () {
        try {
          if (this.responseText) {
            const json = JSON.parse(this.responseText);

            if (this._requestType === "energy") {
              handleEnergyResponse(json);
            } else if (this._requestType === "plant") {
              handlePlantDetailResponse(json);
            }
          }
        } catch (e) {
          console.debug("XHR parse error", e);
        }
      });
    }

    return origSend.apply(this, args);
  };

  console.log("✅ Interceptors installed for:");
  console.log("   • Energy Info:", ENERGY_ENDPOINT);
  console.log("   • Plant Detail:", PLANT_ENDPOINT);
})();

/**
 * Creates / Updates a Vertical Progress Bar inside .fl_tips2
 * @param {number} percent - Value between 0 and 100
 */
function createVerticalProgressBar(percent = 0) {
  // Find target container
  const container = document.querySelector(".fl_tips2");
  if (!container) {
    console.warn("[ProgressBar] .fl_tips2 not found");
    return null;
  }

  // Create or reuse the progress bar
  let progressWrapper = document.getElementById("vertical-progress-bar");

  if (!progressWrapper) {
    progressWrapper = document.createElement("div");
    progressWrapper.id = "vertical-progress-bar";
    progressWrapper.style.cssText = `
            position: absolute;
            width: 14px;
            height: 80px;
            background: #4d4d4e;
            border: 2px solid #000;
            border-radius: 9999px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            z-index: 10;
            left: -23px;
            top: 38px;
            transform: translateY(-50%);
        `;
    const capacityKw = document.createElement("div");
    capacityKw.innerHTML = `<b>${window.pvCapacity}</b> kW`;
    capacityKw.style.cssText = `
            position: absolute;
            top: 0;
            left: -100px;
            width: 68px;
            font-size: 10px;
            line-height: 1;
            pointer-events: none;
            text-align: right;
        `;

    // Inner fill bar
    const fill = document.createElement("div");
    fill.id = "progress-fill";
    fill.style.cssText = `
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 0%;
            background: linear-gradient(to top, 
            rgb(8, 151, 156),
            rgb(0, 178, 184), 
            rgb(0, 205, 212));
            transition: height 0.4s ease-out;
            border-radius: 9999px;
        `;

    // Tick marks container
    const ticks = document.createElement("div");
    ticks.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;

    // Create ticks at 25%, 50%, 75%
    [25, 50, 75].forEach((pos) => {
      const tick = document.createElement("div");
      tick.style.cssText = `
                position: absolute;
                width: 100%;
                height: 1px;
                background: rgba(255,255,255,0.35);
                left: 0;
                top: ${100 - pos}%;
            `;
      ticks.appendChild(tick);
    });

    progressWrapper.appendChild(fill);
    progressWrapper.appendChild(ticks);
    container.appendChild(progressWrapper);
    container.appendChild(capacityKw);

    console.log("[ProgressBar] Vertical progress bar inserted into .fl_tips2");
  }

  // Update fill height
  const fill = document.getElementById("progress-fill");
  if (fill) {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    fill.style.height = `${clampedPercent}%`;
  }

  return progressWrapper;
}

// ====================== VERTICAL PROGRESS BAR + ROBUST WS ======================

(function initializeVerticalProgressBar() {
  console.log("🚀 [VerticalProgressBar] Auto-initializing...");

  // ================== CREATE / UPDATE PROGRESS BAR ==================
  // function createVerticalProgressBar(percent = 0) {
  //   const container = document.querySelector(".fl_tips2");
  //   if (!container) return;

  //   let wrapper = document.getElementById("vertical-solar-progress");
  //   if (!wrapper) {
  //     wrapper = document.createElement("div");
  //     wrapper.id = "vertical-solar-progress";
  //     wrapper.style.cssText = `
  //               position: absolute;
  //               width: 14px;
  //               height: 65px;
  //               background: #e5e7eb;
  //               border: 2px solid #2c3e50;
  //               border-radius: 9999px;
  //               overflow: hidden;
  //               box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  //               z-index: 25;
  //               right: 12px;
  //               top: 50%;
  //               transform: translateY(-50%);
  //           `;

  //     const fill = document.createElement("div");
  //     fill.id = "solar-progress-fill";
  //     fill.style.cssText = `
  //               position: absolute;
  //               bottom: 0;
  //               width: 100%;
  //               height: 0%;
  //               background: linear-gradient(to top, rgb(8,151,156), rgb(0,178,184), rgb(0,205,212));
  //               transition: height 0.4s ease;
  //           `;

  //     const ticks = document.createElement("div");
  //     ticks.style.cssText = `position:absolute; inset:0; pointer-events:none;`;
  //     [25, 50, 75].forEach((p) => {
  //       const t = document.createElement("div");
  //       t.style.cssText = `position:absolute; left:0; right:0; height:1.5px; background:rgba(255,255,255,0.9); top:${100 - p}%;`;
  //       ticks.appendChild(t);
  //     });

  //     wrapper.appendChild(fill);
  //     wrapper.appendChild(ticks);
  //     container.appendChild(wrapper);
  //     console.log("✅ [ProgressBar] Created successfully");
  //   }

  //   const fill = document.getElementById("solar-progress-fill");
  //   if (fill) fill.style.height = `${Math.max(0, Math.min(100, percent))}%`;
  // }

  // ================== STRONG WEBSOCKET INTERCEPTOR ==================
  function setupStrongWebSocketInterceptor() {
    console.log("[WS] Installing strong message interceptor...");

    // Override WebSocket prototype to catch ALL messages
    const originalWebSocket = window.WebSocket;

    window.WebSocket = function (url, protocols) {
      const ws = new originalWebSocket(url, protocols);

      // Hook this instance
      if (url && url.includes("/dew/v0/wsmaitian")) {
        console.log("🔌 [WS] Intercepted target WebSocket creation");

        ws.addEventListener("message", function (event) {
          try {
            const data = JSON.parse(event.data);

            if (data.errno === 0 && data.result?.node?.solar?.power?.value) {
              const powerW =
                parseFloat(data.result.node.solar.power.value) || 0;
              const powerKw =
                data.result.node.solar.power.unit === "W"
                  ? powerW / 1000
                  : powerW;

              console.log(`⚡ Solar Power: ${powerKw.toFixed(2)} kW`);

              createVerticalProgressBar((powerKw / window.pvCapacity) * 100);
            }
          } catch (e) {}
        });
      }

      return ws;
    };

    // Also try to catch already existing connections
    setTimeout(() => {
      console.log("[WS] Running fallback search...");
      // This will help if connection was made before our script
    }, 1000);
  }

  // ================== START ==================
  function start() {
    createVerticalProgressBar(0);
    setupStrongWebSocketInterceptor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
