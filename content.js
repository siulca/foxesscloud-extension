(() => {
  let controlPanel = null;

  function getEChartsInstances() {
    const instances = [];
    document.querySelectorAll('div[_echarts_instance_]').forEach(div => {
      const instance = echarts?.getInstanceByDom(div);
      if (instance) instances.push({ div, instance });
    });
    return instances;
  }

  function createControlPanel() {
    if (controlPanel) return;

    controlPanel = document.createElement('div');
    controlPanel.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 2147483647;
      background: white; border: 1px solid #ccc; border-radius: 8px;
      padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif; font-size: 13px; min-width: 220px;
    `;

    controlPanel.innerHTML = `
      <div style="margin-bottom:8px;font-weight:bold;">ECharts Controls</div>
      
      <label>Chart Type:</label>
      <select id="chartType" style="width:100%;margin:4px 0 10px 0;padding:4px;">
        <option value="bar">Bar (Vertical)</option>
        <option value="bar-horizontal">Bar (Horizontal)</option>
        <option value="line">Line</option>
      </select>

      <button id="toggleStack" style="width:100%;padding:8px;margin-top:8px;">
        Toggle Stacked ↔ Unstacked
      </button>

      <button id="closeBtn" style="margin-top:8px;width:100%;padding:6px;background:#eee;">Close</button>
    `;

    document.body.appendChild(controlPanel);

    const typeSelect = controlPanel.querySelector('#chartType');
    const toggleBtn = controlPanel.querySelector('#toggleStack');
    const closeBtn = controlPanel.querySelector('#closeBtn');

    typeSelect.addEventListener('change', () => applyChartType(typeSelect.value));
    toggleBtn.addEventListener('click', toggleStacked);
    closeBtn.addEventListener('click', () => controlPanel.remove());
  }

  function applyChartType(newType) {
    const charts = getEChartsInstances();
    charts.forEach(({ instance }) => {
      const option = instance.getOption();

      option.series.forEach(series => {
        if (newType === 'bar-horizontal') {
          series.type = 'bar';
          // Swap axes for horizontal
          option.xAxis = option.xAxis || [{}];
          option.yAxis = option.yAxis || [{}];
          const temp = option.xAxis[0];
          option.xAxis[0] = option.yAxis[0];
          option.yAxis[0] = temp;
          if (option.yAxis[0].type !== 'category') option.yAxis[0].type = 'category';
        } else if (newType === 'line') {
          series.type = 'line';
        } else {
          series.type = 'bar';
        }
      });

      // Re-apply
      instance.setOption(option, true); // true = not merge (replace)
    });
  }

  function toggleStacked() {
    const charts = getEChartsInstances();
    charts.forEach(({ instance }) => {
      let option = instance.getOption();
      const isCurrentlyStacked = option.series?.some(s => s.stack);

      option.series.forEach(series => {
        if (series.type === 'bar' || series.type === 'line') {
          series.stack = isCurrentlyStacked ? null : 'customStack';
        }
      });

      // For unstacked (grouped) bars, you can also adjust barGap if needed
      if (!isCurrentlyStacked) {
        option.series.forEach(s => {
          if (s.type === 'bar') s.barGap = '20%';
        });
      }

      instance.setOption(option, true);
    });
  }

  // Auto-detect and inject panel when charts are found
  function init() {
    const observer = new MutationObserver(() => {
      if (document.querySelector('div[_echarts_instance_]') && !controlPanel) {
        createControlPanel();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback check
    setTimeout(() => {
      if (getEChartsInstances().length > 0 && !controlPanel) createControlPanel();
    }, 1500);
  }

  init();
})();