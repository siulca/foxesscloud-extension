import { renderSankeyFromData } from "../sankey/sankey.js";
import { updateSolarProgressFromValue } from "../progress-bar/vertical.js";

// ====================== ENDPOINTS ======================
const ENERGY_ENDPOINT = "/dew/w/plant/energy/info";
const PLANT_ENDPOINT = "/dew/v0/plant/detail";

// ====================== HANDLERS ======================
function handleEnergyResponse(json) {
  if (json?.result?.production && json?.result?.consumption) {
    renderSankeyFromData(json.result);
  }
}

function handlePlantDetailResponse(json) {
  if (json?.result?.info?.pvCapacity) {
    window.pvCapacity = json.result.info.pvCapacity;
    window.plantID = json.result.plantID;

    if (window.__foxessSolarState?.value) {
      updateSolarProgressFromValue(
        window.__foxessSolarState.value,
        window.__foxessSolarState.unit,
        window.pvCapacity,
      );
    }
  }
}

// ====================== FETCH INTERCEPTOR ======================
const originalFetch = window.fetch;

window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);

  try {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

    const cloned = response.clone();
    const json = await cloned.json().catch(() => null);
    if (!json) return response;

    if (url.includes(ENERGY_ENDPOINT)) {
      handleEnergyResponse(json);
    } else if (url.includes(PLANT_ENDPOINT)) {
      handlePlantDetailResponse(json);
    }
  } catch (e) {
    console.debug("Fetch interceptor error (non-fatal)", e);
  }

  return response;
};

// ====================== XHR INTERCEPTOR ======================
const origOpen = XMLHttpRequest.prototype.open;
const origSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (...args) {
  const url = args[1];

  if (typeof url === "string") {
    this._requestType = url.includes(ENERGY_ENDPOINT)
      ? "energy"
      : url.includes(PLANT_ENDPOINT)
        ? "plant"
        : null;
  }

  return origOpen.apply(this, args);
};

XMLHttpRequest.prototype.send = function (...args) {
  if (this._requestType) {
    this.addEventListener("load", function () {
      try {
        if (this.responseText) {
          const json = JSON.parse(this.responseText);

          if (this._requestType === "energy") {
            handleEnergyResponse(json);
          } else if (this._requestType === "plant") {
            handlePlantDetailResponse(json);
          }
        }
      } catch (e) {
        console.debug("XHR parse error", e);
      }
    });
  }

  return origSend.apply(this, args);
};
