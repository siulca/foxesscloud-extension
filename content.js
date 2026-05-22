// Inject the script into the page context if not already injected
(function injectEchartsScript() {
  if (document.getElementById('foxesscloud-echarts-inject')) return;
  const script = document.createElement('script');
  script.id = 'foxesscloud-echarts-inject';
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() { this.remove(); };
  (document.head || document.documentElement).appendChild(script);
})();