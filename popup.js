async function runInMainWorld(fn, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: fn,
    args: args
  });
  return results[0]?.result;
}

document.getElementById('refresh').onclick = async () => {
  const count = await runInMainWorld(() => {
    let c = 0;
    document.querySelectorAll('div[_echarts_instance_]').forEach(div => {
      if (window.echarts?.getInstanceByDom?.(div)) c++;
    });
    if (window.echarts?.getInstanceById?.('ec_1779053422247')) c++;
    return c;
  });
  alert(`Found ${count || 0} instances`);
};

document.getElementById('toggle').onclick = () => {
  runInMainWorld(() => {
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
      const stacked = opt.series?.some(s => s.stack != null && s.stack !== false);

      opt.series.forEach(s => {
        if (s.type === 'bar' || s.type === 'line') {
          s.stack = stacked ? null : 'customStack';
        }
      });
      if (!stacked) opt.series.forEach(s => { if (s.type === 'bar') s.barGap = '15%'; });

      inst.setOption(opt, true);
    });
  });
};

document.getElementById('typeSelect').onchange = (e) => {
  const type = e.target.value;
  runInMainWorld((t) => {
    // Same logic as before for changing type
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