// injected.js
let currentStackMode = false; // false = unstacked (all positive)
let lastApplyTime = 0;
let applyTimeout = null;

function applyMode(inst, stack) {
  if (!inst) return;
  
  const now = Date.now();
  if (now - lastApplyTime < 400) return;   // Rate limit
  lastApplyTime = now;

  let opt = inst.getOption();
  if (!opt?.series) return;

  opt.series.forEach((s) => {
    if (!Array.isArray(s.data)) return;

    s.data = s.data.map(item => {
      if (Array.isArray(item) && item.length >= 2) {
        const value = item[1];
        if (typeof value === 'number' || !isNaN(parseFloat(value))) {
          const num = parseFloat(value);
          item[1] = stack ? num : Math.abs(num);
        }
      }
      return item;
    });

    if (s.type === 'bar') {
      s.stack = stack ? 'customStack' : null;
      s.barGap = stack ? '20%' : '35%';
    }
  });

  if (opt.yAxis?.[0]) {
    opt.yAxis[0].min = stack ? undefined : 0;
  }

  inst.setOption(opt, { notMerge: true, replaceMerge: ['series', 'yAxis'] });
  inst.resize();
}

// Message handler
window.addEventListener('message', function(event) {
  if (!event.data || event.data.source !== 'foxesscloud-extension') return;
  if (event.data.type !== 'ECHARTS_CONTROL') return;

  currentStackMode = !!event.data.stack;
  console.log(`%c[Injected] Mode set to: ${currentStackMode ? 'STACKED' : 'UNSTACKED'}`, 
              'color: green; font-weight: bold');

  applyToAllCharts();
});

// Apply to all visible charts
function applyToAllCharts() {
  document.querySelectorAll('.echart-box .echart').forEach(container => {
    let inst = window.echarts?.getInstanceByDom(container);
    if (inst) applyMode(inst, currentStackMode);
  });
}

// === Targeted MutationObserver ===
const observer = new MutationObserver((mutations) => {
  if (applyTimeout) clearTimeout(applyTimeout);

  applyTimeout = setTimeout(() => {
    const count = document.querySelectorAll('.echart-box .echart').length;
    console.log(`[Debug] Selector: .echart-box .echart, found: ${count}`);
    
    if (count > 0) applyToAllCharts();
  }, 500);
});

// Observe only .echart-box containers
document.querySelectorAll('.echart-box').forEach(box => {
  observer.observe(box, { 
    childList: true, 
    subtree: true 
  });
});

// Also observe body

function injectUnstackToggle() {
  console.log('[Injected] injectUnstackToggle called');
  const legendsContainer = document.querySelector('.rightLegends');
  if (!legendsContainer) {
    console.log('[Injected] .rightLegends not found');
    return;
  }
  if (document.getElementById('foxesscloud-unstack-toggle')) {
    console.log('[Injected] Toggle already present, skipping injection');
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'mg-l8 flex-vertical-center';
  wrapper.id = 'foxesscloud-unstack-toggle';
  wrapper.style.marginLeft = '24px';
  wrapper.style.marginTop = '16px';
  wrapper.innerHTML = `
    <button size="small" class="ant-switch-small ant-switch css-sd6ce" type="button" role="switch" aria-checked="false">
      <div class="ant-switch-handle"></div>
      <span class="ant-switch-inner">
        <span class="ant-switch-inner-checked"></span>
        <span class="ant-switch-inner-unchecked"></span>
      </span>
    </button>
    <span class="mode_sched_name mg-l8">Unstacked</span>
  `;
  legendsContainer.appendChild(wrapper);
  const btn = wrapper.querySelector('button');
  btn.addEventListener('click', function() {
    const checked = btn.getAttribute('aria-checked') === 'true';
    btn.setAttribute('aria-checked', checked ? 'false' : 'true');
    btn.classList.toggle('ant-switch-checked', !checked);
    // REVERSED: checked=true means unstacked
    window.postMessage({
      source: 'foxesscloud-extension',
      type: 'ECHARTS_CONTROL',
      stack: checked // true when checked, false when not
    }, '*');
  });
}

// MutationObserver to inject toggle when .rightLegend appears
// Efficient observer: only watch the .echart-box with .rightLegend
(function() {
  let legendBox = null;
  const bodyObserver = new MutationObserver(() => {
    // Find the first .echart-box that contains a .rightLegend
    const boxes = document.querySelectorAll('.echart-box');
    for (const box of boxes) {
      if (box.querySelector('.rightLegend')) {
        legendBox = box;
        break;
      }
    }
    if (legendBox) {
      console.log('[Injected] Found .echart-box with .rightLegend, switching observer');
      injectUnstackToggle();
      // Now observe only this box
      const boxObserver = new MutationObserver(() => {
        if (legendBox.querySelector('.rightLegend') && !document.getElementById('foxesscloud-unstack-toggle')) {
          injectUnstackToggle();
        }
      });
      boxObserver.observe(legendBox, { childList: true, subtree: true });
      bodyObserver.disconnect();
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
})();