(() => {
  console.log('[ECharts Controls] v6 - Broad + Aggressive');

  let isUnstacked = true;
  let showBatteryEstimate = false;

  const createBatteryEstimateDiv = () => {
    const div = document.createElement('div');
    div.dataset.batteryTimeEstimate = 'true';
    div.classList = ["tip_label text-cut"];
    div.textContent = '00h 00m';
    return div;
  };

  const ensureBatteryTimeEstimate = () => {
    const existingEstimates = Array.from(document.querySelectorAll('div[data-battery-time-estimate="true"]'));

    if (!showBatteryEstimate) {
      existingEstimates.forEach(el => el.remove());
      return;
    }

    const target = document.querySelector('.tip_bat .tip_value_box');
    if (!target || !target.parentNode) {
      return;
    }

    if (existingEstimates.length > 1) {
      existingEstimates.slice(1).forEach(el => el.remove());
    }

    if (existingEstimates.length === 1) {
      const existing = existingEstimates[0];
      const parent = target.parentNode;
      if (existing.nextElementSibling === parent || existing.previousElementSibling === parent) {
        return;
      }
      existing.remove();
    }

    const estimate = createBatteryEstimateDiv();
    const parent = target.parentNode;
    const grandParent = parent.parentNode;
    if (grandParent) {
      grandParent.insertBefore(estimate, parent);
    }
  };

  const forceUnstack = () => {
    let containersFound = 0;

    const selectors = [
      '.echart-box .echart'
    ];

    selectors.forEach(sel => {
      const found = document.querySelectorAll(sel);
      console.log(`[Debug] Selector: ${sel}, found: ${found.length}`);
      found.forEach(container => {
        containersFound++;

        let inst = null;
        if (window.echarts) inst = window.echarts.getInstanceByDom(container);
        // Try using _echarts_instance_ property or attribute if present
        let instanceId = null;
        if (!inst && typeof container._echarts_instance_ !== 'undefined') {
          instanceId = container._echarts_instance_;
        } else if (!inst && container.hasAttribute && container.hasAttribute('_echarts_instance_')) {
          instanceId = container.getAttribute('_echarts_instance_');
        }
        if (!inst && instanceId && window.echarts && typeof window.echarts.getInstanceById === 'function') {
          inst = window.echarts.getInstanceById(instanceId);
          console.log('[Debug] Found instance by _echarts_instance_:', instanceId, inst);
        }
        if (!inst) inst = container.__ecInstance || container.__echartsInstance;

        if (inst && typeof inst.setOption === 'function') {
          let opt = inst.getOption();
          console.log('[Debug] Calling setOption with option:', opt);

          opt.series.forEach(s => {
            if (s.type === 'bar' || s.type === 'line') {
              s.stack = isUnstacked ? null : 'customStack';
            }
          });

          if (isUnstacked) {
            opt.series.forEach(s => {
              if (s.type === 'bar') {
                s.barGap = '20%';
                if (Array.isArray(s.data)) {
                  s.data = s.data.map(item => typeof item === 'number' ? Math.abs(item) : item);
                }
              }
            });
          }

          inst.setOption(opt, true);
          console.log(`[Success] Applied to chart in container: ${sel}`);
        }
      });
    });

    ensureBatteryTimeEstimate();
  };

  const observer = new MutationObserver(() => {
    if (isUnstacked) setTimeout(forceUnstack, 100);
    setTimeout(ensureBatteryTimeEstimate, 100);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SET_UNSTACKED') {
      isUnstacked = msg.value;
      console.log(`[Preference] → ${isUnstacked ? 'UNSTACKED' : 'STACKED'}`);
      // Relay to injected script
      sendEchartsStackMessage(isUnstacked);
      // Immediately update chart (legacy logic, can be removed if only using injected)
      // forceUnstack();
    }

    if (msg.type === 'SET_BATTERY_ESTIMATE') {
      showBatteryEstimate = msg.value;
      console.log(`[Preference] → SHOW BATTERY ESTIMATE: ${showBatteryEstimate}`);
      setTimeout(ensureBatteryTimeEstimate, 50);
      setTimeout(ensureBatteryTimeEstimate, 300);
    }
  });

  setTimeout(forceUnstack, 800);
})();

// Inject the script into the page context if not already injected
(function injectEchartsScript() {
  if (document.getElementById('foxesscloud-echarts-inject')) return;
  const script = document.createElement('script');
  script.id = 'foxesscloud-echarts-inject';
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() { this.remove(); };
  (document.head || document.documentElement).appendChild(script);
})();

function sendEchartsStackMessage(stack) {
  window.postMessage({
    source: 'foxesscloud-extension',
    type: 'ECHARTS_CONTROL',
    stack
  }, '*');
}