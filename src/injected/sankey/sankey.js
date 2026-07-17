import state from "../state.js";

/**
 * Show or hide the Sankey diagram container.
 * @param {boolean} isOn
 */
export function showSankeyDiagram(isOn) {
  state.showSankey = !!isOn;

  const sankey = document.getElementById("foxesscloud-sankey-container");
  const statR = document.querySelector(".eenery_stat_r");
  if (sankey) {
    sankey.style.display = state.showSankey ? "block" : "none";
    statR.style.display = !state.showSankey ? "block" : "none";
  }
}

/**
 * Render (or update) a Sankey diagram from energy API data.
 * @param {object} energyData - The energy info response result
 */
export function renderSankeyFromData(energyData) {
  const statR = document.querySelector(".eenery_stat_r");
  let container = document.getElementById("foxesscloud-sankey-container");

  if (!container) {
    if (!statR) return;

    container = document.createElement("div");
    container.id = "foxesscloud-sankey-container";
    container.style.width = "30%";
    container.style.margin = "0";

    statR.parentNode.insertBefore(container, statR);
    statR.style.display = state.showSankey ? "block" : "none";
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
  // Compute a Solar total that reflects actual PV generation reported by the app.
  // PV generation is the portion self-consumed plus exported to grid. Exclude
  // the raw `charged` number here because `charged` can include energy
  // transferred from the grid into the battery and would double-count PV.
  const solarTotal = (pvSelfConsumption || 0) + (exported || 0);

  const nodeDisplayValues = {
    Imported: imported,
    Solar: solarTotal,
    Discharged: discharged,
    Exported: exported,
    Consumed: consumed,
    Charged: charged,
  };

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

  // For percentage calculations we prefer to base the grand total on the
  // explicit node display values (direct source values) instead of the
  // aggregated link totals which can double-count flows.
  const grandTotal =
    Object.values(nodeDisplayValues).reduce((a, b) => a + b, 0) || 1;

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
        const value = nodeDisplayValues[params.name] || 0;
        if (value > 0) {
          return `${params.name}\n${value.toFixed(2)} ${displayUnit}`;
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
          const value = nodeDisplayValues[params.name] || 0;
          const percent = ((value / Math.max(grandTotal, 1)) * 100).toFixed(1);
          return `${params.name}<br/>${value.toFixed(2)} ${displayUnit} (${percent}%)`;
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
