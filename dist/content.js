// Inject the script into the page context if not already injected
(function injectEchartsScript() {
  if (document.getElementById("foxesscloud-echarts-inject")) return;
  const script = document.createElement("script");
  script.id = "foxesscloud-echarts-inject";
  script.src = chrome.runtime.getURL("injected.js");

  function sendMessageToPage(message) {
    window.postMessage(message, "*");
  }

  function restoreBatterySettings() {
    chrome.storage.local.get(
      ["showBatteryEstimate", "batteryCapacityKwh"],
      (stored) => {
        console.log("[FoxESS] restoreBatterySettings:", stored);
        const storedCapacity = parseFloat(stored.batteryCapacityKwh);
        const fallbackCapacity = parseFloat(
          localStorage.getItem("foxess_battery_capacity") || "0",
        );
        const capacity =
          Number.isFinite(storedCapacity) && storedCapacity > 0
            ? storedCapacity
            : Number.isFinite(fallbackCapacity) && fallbackCapacity > 0
              ? fallbackCapacity
              : 0;

        if (capacity > 0) {
          localStorage.setItem("foxess_battery_capacity", String(capacity));
        }

        if (
          Number.isFinite(storedCapacity) &&
          storedCapacity > 0 &&
          storedCapacity !== capacity
        ) {
          console.log(
            "[FoxESS] restoreBatterySettings using stored capacity from page localStorage:",
            capacity,
          );
        }

        console.log(
          "[FoxESS] restoreBatterySettings sending capacity:",
          capacity,
        );
        sendMessageToPage({
          source: "foxesscloud-extension",
          type: "SHOW_BATTERY_ESTIMATE",
          value: stored.showBatteryEstimate ?? true,
        });
        sendMessageToPage({
          source: "foxesscloud-extension",
          type: "SET_BATTERY_CAPACITY",
          value: capacity,
        });
      },
    );
  }

  script.onload = function () {
    restoreBatterySettings();
    this.remove();
  };

  (document.head || document.documentElement).appendChild(script);
})();
