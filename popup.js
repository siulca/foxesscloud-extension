document.addEventListener("DOMContentLoaded", async () => {
  const unstackCharts = document.getElementById("unstackCharts");
  const showSankey = document.getElementById("showSankey");

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

  unstackCharts.addEventListener("change", (e) => {
    sendToInjected("SET_UNSTACKED", !e.target.checked);
  });

  showSankey.addEventListener("change", (e) => {
    sendToInjected("SHOW_SANKEY", e.target.checked);
  });

  console.log("✅ Popup ready - controls should now work");
});
