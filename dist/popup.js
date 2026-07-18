document.addEventListener("DOMContentLoaded", async () => {
  const unstackCharts = document.getElementById("unstackCharts");
  const showSankey = document.getElementById("showSankey");
  const showSolarGauge = document.getElementById("showSolarGauge");
  const showSolarCapacity = document.getElementById("showSolarCapacity");
  const showSolarPercent = document.getElementById("showSolarPercent");
  const showSolarHistory = document.getElementById("showSolarHistory");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    console.error("❌ No active tab found");
    return;
  }

  // Send message using postMessage (this is what injected.js listens for)
  const sendToInjected = (type, value) => {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: (message) => {
          window.postMessage(message, "*");
        },
        args: [
          {
            source: "foxesscloud-extension",
            type: type,
            value: value,
          },
        ],
      })
      .catch((err) => console.warn("Failed to send message:", err));
  };

  sendToInjected("SET_UNSTACKED", !unstackCharts.checked);
  sendToInjected("SHOW_SOLAR_GAUGE", showSolarGauge.checked);
  sendToInjected("SHOW_SOLAR_CAPACITY", showSolarCapacity.checked);
  sendToInjected("SHOW_SOLAR_PERCENT_LABEL", showSolarPercent.checked);
  sendToInjected("SHOW_SOLAR_HISTORY", showSolarHistory.checked);

  unstackCharts.addEventListener("change", (e) => {
    sendToInjected("SET_UNSTACKED", !e.target.checked);
  });

  showSankey.addEventListener("change", (e) => {
    sendToInjected("SHOW_SANKEY", e.target.checked);
  });

  showSolarGauge.addEventListener("change", (e) => {
    sendToInjected("SHOW_SOLAR_GAUGE", e.target.checked);
  });

  showSolarCapacity.addEventListener("change", (e) => {
    sendToInjected("SHOW_SOLAR_CAPACITY", e.target.checked);
  });

  showSolarPercent.addEventListener("change", (e) => {
    sendToInjected("SHOW_SOLAR_PERCENT_LABEL", e.target.checked);
  });

  showSolarHistory.addEventListener("change", (e) => {
    sendToInjected("SHOW_SOLAR_HISTORY", e.target.checked);
  });
});
