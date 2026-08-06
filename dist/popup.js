document.addEventListener("DOMContentLoaded", async () => {
  const unstackCharts = document.getElementById("unstackCharts");
  const hideOpenTabs = document.getElementById("hideOpenTabs");
  const showSankey = document.getElementById("showSankey");
  const showSolarGauge = document.getElementById("showSolarGauge");
  const showSolarCapacity = document.getElementById("showSolarCapacity");
  const showSolarPercent = document.getElementById("showSolarPercent");
  const showSolarHistory = document.getElementById("showSolarHistory");
  const showBatteryEstimate = document.getElementById("showBatteryEstimate");
  const batteryCapacityKwh = document.getElementById("batteryCapacityKwh");

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

  const loadSettings = () => {
    const sendStoredCapacity = () => {
      const capacityValue = parseFloat(batteryCapacityKwh.value) || 0;
      console.log(
        "[FoxESS popup] restore send SET_BATTERY_CAPACITY:",
        capacityValue,
      );
      sendToInjected("SET_BATTERY_CAPACITY", capacityValue);
    };

    if (!chrome?.storage?.local) {
      const saved = localStorage.getItem("foxess_battery_capacity");
      batteryCapacityKwh.value = saved ?? "";
      showBatteryEstimate.checked = true;
      console.log("[FoxESS popup] loadSettings localStorage fallback:", saved);

      sendToInjected("SET_UNSTACKED", !unstackCharts.checked);
      sendToInjected("HIDE_OPEN_TABS", hideOpenTabs.checked);
      sendToInjected("SHOW_SOLAR_GAUGE", showSolarGauge.checked);
      sendToInjected("SHOW_SOLAR_CAPACITY", showSolarCapacity.checked);
      sendToInjected("SHOW_SOLAR_PERCENT_LABEL", showSolarPercent.checked);
      sendToInjected("SHOW_SOLAR_HISTORY", showSolarHistory.checked);
      sendToInjected("SHOW_BATTERY_ESTIMATE", showBatteryEstimate.checked);
      sendStoredCapacity();
      return;
    }

    chrome.storage.local.get(
      ["showBatteryEstimate", "batteryCapacityKwh"],
      (stored) => {
        console.log("[FoxESS popup] loadSettings stored:", stored);
        showBatteryEstimate.checked = stored.showBatteryEstimate ?? true;
        batteryCapacityKwh.value =
          stored.batteryCapacityKwh ??
          localStorage.getItem("foxess_battery_capacity") ??
          "";

        sendToInjected("SET_UNSTACKED", !unstackCharts.checked);
        sendToInjected("HIDE_OPEN_TABS", hideOpenTabs.checked);
        sendToInjected("SHOW_SOLAR_GAUGE", showSolarGauge.checked);
        sendToInjected("SHOW_SOLAR_CAPACITY", showSolarCapacity.checked);
        sendToInjected("SHOW_SOLAR_PERCENT_LABEL", showSolarPercent.checked);
        sendToInjected("SHOW_SOLAR_HISTORY", showSolarHistory.checked);
        sendToInjected("SHOW_BATTERY_ESTIMATE", showBatteryEstimate.checked);
        sendStoredCapacity();
      },
    );
  };

  loadSettings();

  unstackCharts.addEventListener("change", (e) => {
    sendToInjected("SET_UNSTACKED", !e.target.checked);
  });

  hideOpenTabs.addEventListener("change", (e) => {
    sendToInjected("HIDE_OPEN_TABS", e.target.checked);
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

  showBatteryEstimate.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ showBatteryEstimate: enabled });
    }
    localStorage.setItem("foxess_show_battery_estimate", enabled ? "1" : "0");
    sendToInjected("SHOW_BATTERY_ESTIMATE", enabled);
  });

  const persistBatteryCapacity = (value) => {
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ batteryCapacityKwh: value });
    }
    localStorage.setItem("foxess_battery_capacity", value);
  };

  const updateBatteryCapacity = (value) => {
    const numericValue = parseFloat(value) || 0;
    persistBatteryCapacity(value);
    sendToInjected("SET_BATTERY_CAPACITY", numericValue);
  };

  batteryCapacityKwh.addEventListener("input", (e) => {
    updateBatteryCapacity(e.target.value);
  });

  batteryCapacityKwh.addEventListener("change", (e) => {
    updateBatteryCapacity(e.target.value);
  });

  batteryCapacityKwh.addEventListener("blur", (e) => {
    updateBatteryCapacity(e.target.value);
  });
});
