async function runInMainWorld(fn, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: fn,
    args: args
  });
  return results[0]?.result;
}

// Toggle state
let isUnstacked = false;

document.getElementById('toggle').onclick = async () => {
  isUnstacked = !isUnstacked;

  await runInMainWorld((shouldUnstack) => {
    // === Force Positive Function (now inside main world) ===
    function forcePositive(option) {
      if (!option) return;

      // Series data
      if (option.series) {
        option.series.forEach(series => {
          if (Array.isArray(series.data)) {
            series.data = series.data.map(item => {
              if (typeof item === 'number') return Math.abs(item);
              if (item && typeof item === 'object' && item !== null) {
                if (typeof item.value === 'number') item.value = Math.abs(item.value);
                if (typeof item.y === 'number') item.y = Math.abs(item.y);
              }
              return item;
            });
          }
        });
      }

      // Dataset source (common in ECharts)
      if (option.dataset?.source) {
        if (Array.isArray(option.dataset.source)) {
          option.dataset.source = option.dataset.source.map(row => {
            if (Array.isArray(row)) {
              return row.map(cell => typeof cell === 'number' ? Math.abs(cell) : cell);
            }
            return row;
          });
        }
      }
    }

    // Main logic
    const instances = [];
    document.querySelectorAll('div[_echarts_instance_]').forEach(d => {
      const inst = window.echarts?.getInstanceByDom?.(d);
      if (inst) instances.push(inst);
    });
    if (window.echarts?.getInstanceById) {
      const sp = window.echarts.getInstanceById('ec_1779053422247');
      if (sp) instances.push(sp);
    }

    instances.forEach(inst => {
      if (!inst?.getOption) return;
      let opt = inst.getOption();

      // Toggle stacking
      opt.series.forEach(s => {
        if (s.type === 'bar' || s.type === 'line') {
          s.stack = shouldUnstack ? null : 'customStack';
        }
      });

      if (shouldUnstack) {
        forcePositive(opt);
        opt.series.forEach(s => {
          if (s.type === 'bar') s.barGap = '20%';
        });
      } else {
        opt.series.forEach(s => {
          if (s.type === 'bar') delete s.barGap;
        });
      }

      inst.setOption(opt, true);
    });
  }, [isUnstacked]);

  // Update button text
  document.getElementById('toggle').textContent = isUnstacked 
    ? "Switch to Stacked" 
    : "Switch to Unstacked";
};

// Chart Type Change
document.getElementById('typeSelect').onchange = (e) => {
  const type = e.target.value;
  runInMainWorld((t) => {
    const instances = [];
    document.querySelectorAll('div[_echarts_instance_]').forEach(d => {
      const inst = window.echarts?.getInstanceByDom?.(d);
      if (inst) instances.push(inst);
    });
    if (window.echarts?.getInstanceById) {
      const sp = window.echarts.getInstanceById('ec_1779053422247');
      if (sp) instances.push(sp);
    }

    instances.forEach(inst => {
      if (!inst?.getOption) return;
      let opt = inst.getOption();

      opt.series.forEach(s => {
        if (t === 'bar-horizontal') {
          s.type = 'bar';
          if (opt.xAxis && opt.yAxis) [opt.xAxis, opt.yAxis] = [opt.yAxis, opt.xAxis];
        } else if (t === 'line') {
          s.type = 'line';
        } else {
          s.type = 'bar';
        }
      });
      inst.setOption(opt, true);
    });
  }, [type]);
};

// === Your Dark Mode button code (add it back here if removed) ===

// ==================== NEW: Dark Mode Toggle ====================
const darkModeBtn = document.createElement('button');
darkModeBtn.textContent = 'Toggle Dark Mode';
darkModeBtn.style.cssText = 'width:100%; padding:10px; margin:8px 0; background:#333; color:white; border:none; border-radius:4px;';
document.body.appendChild(darkModeBtn);

let isDark = false;

darkModeBtn.onclick = async () => {
  isDark = !isDark;

  await runInMainWorld((dark) => {
    const instances = [];
    document.querySelectorAll('div[_echarts_instance_]').forEach(d => {
      const inst = window.echarts?.getInstanceByDom?.(d);
      if (inst) instances.push(inst);
    });
    if (window.echarts?.getInstanceById) {
      const sp = window.echarts.getInstanceById('ec_1779053422247');
      if (sp) instances.push(sp);
    }

    instances.forEach(inst => {
      if (!inst?.getOption) return;
      let opt = inst.getOption();

      if (dark) {
        opt.backgroundColor = '#1e1e1e';
        opt.textStyle = { color: '#ddd' };
        
        if (opt.title) opt.title.textStyle = { color: '#ddd' };
        if (opt.legend) opt.legend.textStyle = { color: '#ddd' };
        if (opt.xAxis) {
          opt.xAxis.forEach(axis => { if (axis) axis.axisLabel = { color: '#bbb' }; });
        }
        if (opt.yAxis) {
          opt.yAxis.forEach(axis => { if (axis) axis.axisLabel = { color: '#bbb' }; });
        }
        // Dark grid
        if (opt.grid) opt.grid.backgroundColor = '#2a2a2a';
      } else {
        // Reset to light (you can customize these colors)
        delete opt.backgroundColor;
        opt.textStyle = { color: '#333' };
        if (opt.title) opt.title.textStyle = { color: '#333' };
        if (opt.legend) opt.legend.textStyle = { color: '#333' };
        if (opt.xAxis) opt.xAxis.forEach(a => { if (a) a.axisLabel = { color: '#666' }; });
        if (opt.yAxis) opt.yAxis.forEach(a => { if (a) a.axisLabel = { color: '#666' }; });
      }

      inst.setOption(opt, true);
    });
  }, [isDark]);

  darkModeBtn.textContent = isDark ? 'Toggle Light Mode' : 'Toggle Dark Mode';
  darkModeBtn.style.background = isDark ? '#555' : '#333';
};