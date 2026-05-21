window.addEventListener('message', function(event) {
  if (!event.data || event.data.source !== 'foxesscloud-extension') return;
  if (event.data.type !== 'ECHARTS_CONTROL') return;

  const { stack } = event.data;
  console.log(`%c[Injected] === ${stack ? 'STACKED' : 'UNSTACKED'} MODE ===`, 'color: purple; font-weight: bold');

  const containers = document.querySelectorAll('.echart-box .echart');

  containers.forEach((container, cIdx) => {
    let inst = window.echarts?.getInstanceByDom(container) ||
               (container._echarts_instance_ && window.echarts?.getInstanceById(container._echarts_instance_)) ||
               container.__ecInstance || container.__echartsInstance;

    if (!inst) return;

    let opt = inst.getOption();

    console.log(`[Injected] Found ${opt.series?.length || 0} series`);

    opt.series.forEach((s, i) => {
      if (!Array.isArray(s.data)) return;

      console.group(`Series ${i}: ${s.name || 'unnamed'} (${s.type})`);

      // Handle complex array format: [x, value, label]
      s.data = s.data.map(item => {
        if (Array.isArray(item) && item.length >= 2) {
          const value = item[1];
          if (typeof value === 'number' || !isNaN(parseFloat(value))) {
            const num = parseFloat(value);
            const newValue = stack ? num : Math.abs(num);
            item[1] = newValue;   // Modify the value in place
          }
        }
        return item;
      });

      // Stacking
      if (s.type === 'bar') {
        s.stack = stack ? 'customStack' : null;
        s.barGap = stack ? '20%' : '35%';
      }

      console.log(`Mode: ${stack ? 'STACKED (original)' : 'UNSTACKED (ABS)'}`);
      console.groupEnd();
    });

    // Y-axis
    if (opt.yAxis?.[0]) {
      opt.yAxis[0].min = stack ? undefined : 0;
    }

    inst.setOption(opt, { notMerge: true, replaceMerge: ['series', 'yAxis'] });
    inst.resize();

    console.log(`[Injected] Chart ${cIdx} updated`);
  });
});