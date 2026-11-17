import { renderSankeyFromData } from "../sankey/sankey.js";
import {
  captureAuthFromFetch,
  captureAuthHeader,
  getLastRequestFailure,
  onAuthReady,
  signedRequest
} from "./client.js";
import {
  updateSolarProgressFromValue,
  setBatteryCapacityDetected,
  setBatteryMinSocDetected,
  hasDetectedBatteryCapacity,
  hasDetectedMinSoc
} from "../progress-bar/vertical.js";

// ====================== ENDPOINTS ======================
const ENERGY_ENDPOINT = "/dew/w/plant/energy/info";
const PLANT_ENDPOINT = "/dew/v0/plant/detail";
const PLANT_LIST_ENDPOINT = "/dew/w/v0/plant/list";
const FLOW_PREINFO_ENDPOINT = "/dew/w/plant/flow/preInfo";
const ESS_OVERVIEW_ENDPOINT =
  "/foxess/biz/plant/w/v0/insight/ess/overview";
const BATTERY_SOC_ENDPOINT = "/dew/v0/battery/soc/get";
const BATTERY_QUICK_SETTING_ENDPOINT = "/dew/w/battery/quick/setting/get";
const DEVICES_SETTING_ENDPOINT = "/dew/w/plant/devices/setting";

/** Any FoxESS backend call; those are scanned generically as a fallback. */
const API_URL_PATTERN = /\/(dew|foxess|basic|oauth2)\//;

// Detection sources are ranked so a precise, hand-checked endpoint always wins
// over the generic "look anywhere" scan.
const PRIORITY = {
  generic: 1,
  plantDetail: 2,
  essOverview: 3,
  batterySettings: 4
};
let capacityPriority = 0;
let minSocPriority = 0;
let apiResponseCount = 0;

// ====================== HELPERS ======================

/** Parse a value into a finite number, treating blanks as "unknown". */
function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/** Extract `{ value }`-shaped fields as used by several FoxESS endpoints. */
function readNestedValue(field) {
  return toFiniteNumber(field?.value);
}

/**
 * Look for any min-SOC-shaped field on an object. `soc` alone is the current
 * charge and is deliberately ignored.
 */
function readMinSocField(node) {
  if (!node || typeof node !== "object") return null;

  for (const [key, value] of Object.entries(node)) {
    if (!/^(min.*soc|soc.*min|backup.*soc|reserve.*soc)$/i.test(key)) continue;

    const numeric = toFiniteNumber(value?.value ?? value);
    if (numeric !== null && numeric >= 0 && numeric <= 100) return numeric;
  }

  return null;
}

/**
 * Look for a battery energy capacity field on an object and return it in kWh.
 * Only battery/energy-named fields (or `*Kwh`) qualify, so `powerCapacity`
 * (inverter kW) is never mistaken for stored energy.
 */
function readBatteryCapacityField(node) {
  if (!node || typeof node !== "object") return null;

  for (const [key, raw] of Object.entries(node)) {
    if (!/capacity/i.test(key) || /power/i.test(key)) continue;
    if (!/^(battery|energy)/i.test(key) && !/kwh$/i.test(key)) continue;

    const value = toFiniteNumber(raw?.value ?? raw);
    if (value === null) continue;

    const unit = String(raw?.unit || "kWh").trim().toLowerCase();
    const kwh =
      unit === "mwh" ? value * 1000 : unit === "wh" ? value / 1000 : value;
    if (kwh > 0) return kwh;
  }

  return null;
}

/** Small inspectable snapshot: `window.__foxessBatteryDebug` in the page console. */
function recordBatteryDebug(patch) {
  const debug = (window.__foxessBatteryDebug =
    window.__foxessBatteryDebug || {});
  Object.assign(debug, patch);
}

/** Drop the query string; keeps diagnostics short and readable. */
function shortUrl(url) {
  return String(url || "").split("?")[0];
}

function submitCapacity(kwh, priority) {
  if (!Number.isFinite(kwh) || kwh <= 0 || kwh > 2000) return;
  if (priority < capacityPriority) return;

  capacityPriority = priority;
  setBatteryCapacityDetected(kwh);
}

function submitMinSoc(percent, priority) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return;
  if (priority < minSocPriority) return;

  minSocPriority = priority;
  setBatteryMinSocDetected(percent);
}

/**
 * Generic fallback scan.
 *
 * We do not know every endpoint that carries the battery capacity / minimum SOC
 * (FoxESS keeps adding plant and ESS views), so every JSON API response is also
 * searched for plausibly-named fields. Values found here rank below the
 * hand-picked endpoints above.
 */
const CAPACITY_KEY_PATTERN = /capacit/i;
const NON_BATTERY_CAPACITY_KEY =
  /power|pv|solar|inverter|bus|screen|panel|generation|load|bill|throughput/i;
const NAMED_BATTERY_CAPACITY_KEY =
  /(battery|ess|energy).*capacit|capacit.*kwh/i;
const ENERGY_UNIT_PATTERN = /^(kwh|wh|mwh)$/i;
const MIN_SOC_KEY_PATTERN =
  /^(min|backup|reserve|cutoff|cut_off|system).*soc|soc.*(min|backup|reserve|cutoff)$/i;
const MAX_SCAN_NODES = 4000;
const MAX_SCAN_DEPTH = 6;
const MAX_DEBUG_LIST = 12;
/** Account-wide rollups: their capacity spans all plants, so it is not ours. */
const AGGREGATE_URL_PATTERN = /\/summary\/|\/plant\/list/i;

/** Short API path (no query, no origin) for the popup diagnostic line. */
function apiPath(url) {
  return shortUrl(url).replace(/^https?:\/\/[^/]+/, "");
}

function pushDebugList(key, value) {
  const debug = (window.__foxessBatteryDebug =
    window.__foxessBatteryDebug || {});
  const list = Array.isArray(debug[key]) ? debug[key] : [];

  if (!list.includes(value)) list.push(value);
  debug[key] = list.slice(-MAX_DEBUG_LIST);
}

function scanBatteryFields(payload, url) {
  const state = { visited: 0, capacity: null, minSoc: null };
  const debug = (window.__foxessBatteryDebug =
    window.__foxessBatteryDebug || {});

  const allowCapacity = !AGGREGATE_URL_PATTERN.test(String(url || ""));
  pushDebugList("apiPaths", apiPath(url));

  const consider = (key, value, unit) => {
    const numeric = toFiniteNumber(value);
    const unitName = String(unit || "").trim().toLowerCase();

    if (/capacit/i.test(key)) {
      pushDebugList(
        "capacityFields",
        `${key}=${JSON.stringify(value)}${unitName ? ` ${unitName}` : ""}`
      );
    }

    if (numeric === null) return;

    if (allowCapacity && /capacit/i.test(key)) {
      // Either the name says "battery energy capacity" (unit implied kWh), or
      // the field carries an explicit energy unit. This deliberately accepts
      // bare `capacity` only when the API states the unit, so inverter kW and
      // battery Ah values are never read as stored kWh.
      const namedBatteryCapacity =
        NAMED_BATTERY_CAPACITY_KEY.test(key) &&
        !NON_BATTERY_CAPACITY_KEY.test(key);
      const unitSaysEnergy =
        ENERGY_UNIT_PATTERN.test(unitName) &&
        !NON_BATTERY_CAPACITY_KEY.test(key);

      if (namedBatteryCapacity || unitSaysEnergy) {
        const kwh =
          unitName === "mwh"
            ? numeric * 1000
            : unitName === "wh"
              ? numeric / 1000
              : numeric;

        if (kwh > 0 && kwh <= 2000) {
          if (!state.capacity || kwh > state.capacity.value) {
            state.capacity = { key, value: kwh, url: apiPath(url) };
          }
        }
      }
    }

    if (
      MIN_SOC_KEY_PATTERN.test(key) &&
      !/^soc$/i.test(key) &&
      numeric >= 0 &&
      numeric <= 100
    ) {
      if (!state.minSoc || numeric > state.minSoc.value) {
        state.minSoc = { key, value: numeric, url: apiPath(url) };
      }
    }
  };

  const walk = (node, depth) => {
    if (!node || typeof node !== "object" || depth > MAX_SCAN_DEPTH) return;
    if (state.visited > MAX_SCAN_NODES) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      state.visited += 1;

      if (value && typeof value === "object") {
        consider(key, value.value, value.unit);
        walk(value, depth + 1);
      } else {
        consider(key, value, node.unit);
      }
    }
  };

  try {
    walk(payload, 0);
  } catch (err) {
    // Malformed payloads must never break the page.
  }

  if (state.capacity) {
    debug.lastCapacityCandidate = state.capacity;
    submitCapacity(state.capacity.value, PRIORITY.generic);
  }
  if (state.minSoc) {
    debug.lastMinSocCandidate = state.minSoc;
    submitMinSoc(state.minSoc.value, PRIORITY.generic);
  }

  debug.apiResponses = apiResponseCount;
}

// ====================== HANDLERS ======================
function handleEnergyResponse(json) {
  if (json?.result?.production && json?.result?.consumption) {
    renderSankeyFromData(json.result);
  }
}

function handlePlantDetailResponse(json) {
  const result = json?.result;
  const info = result?.info;

  if (!info) {
    recordBatteryDebug({
      plantDetailSeen: true,
      plantDetailKeys: Object.keys(result || {}),
      plantDetailError: json?.errno ?? null
    });
    return;
  }

  const rawCapacity = readBatteryCapacityField(info);

  recordBatteryDebug({
    plantDetailSeen: true,
    plantID: result.plantID,
    plantDetailCapacity: info.batteryCapacity,
    plantDetailEnergyCapacity: info.energyCapacity,
    plantDetailCapacityParsed: rawCapacity,
    plantInfoCapacityFields: Object.fromEntries(
      Object.entries(info).filter(([key]) => /cap|batt|energ|soc/i.test(key))
    )
  });
  console.debug(
    "[FoxESS] plant capacity fields:",
    JSON.stringify({
      batteryCapacity: info.batteryCapacity,
      energyCapacity: info.energyCapacity
    })
  );

  if (rawCapacity !== null) {
    submitCapacity(rawCapacity, PRIORITY.plantDetail);
  }

  const minSoc = readMinSocField(info);
  if (minSoc !== null) {
    submitMinSoc(minSoc, PRIORITY.plantDetail);
  }

  if (info.pvCapacity) {
    window.pvCapacity = info.pvCapacity;
    window.plantID = json.result.plantID;

    if (window.__foxessSolarState?.value) {
      updateSolarProgressFromValue(
        window.__foxessSolarState.value,
        window.__foxessSolarState.unit,
        window.pvCapacity
      );
    }
  }
}

function handleEssOverviewResponse(json) {
  const field = json?.result?.batteryCapacityKwh;
  const raw = toFiniteNumber(field?.value);
  recordBatteryDebug({
    essOverviewCapacity: field?.value,
    essOverviewUnit: field?.unit
  });

  if (raw !== null) {
    const unit = String(field?.unit || "kWh").trim().toLowerCase();
    const capacity =
      unit === "mwh" ? raw * 1000 : unit === "wh" ? raw / 1000 : raw;

    if (capacity > 0) submitCapacity(capacity, PRIORITY.essOverview);
  }

  const minSoc = readMinSocField(json?.result);
  if (minSoc !== null) submitMinSoc(minSoc, PRIORITY.essOverview);
}

/**
 * Dashboard flow pre-info. The payload is mostly layout metadata, but it costs
 * nothing to look for capacity / min-SOC fields in case a plant exposes them.
 */
function handleFlowPreInfoResponse(json) {
  const result = json?.result;
  if (!result) return;

  const capacity = readBatteryCapacityField(result);
  if (capacity !== null) submitCapacity(capacity, PRIORITY.plantDetail);

  const minSoc = readMinSocField(result);
  if (minSoc !== null) submitMinSoc(minSoc, PRIORITY.plantDetail);

  recordBatteryDebug({
    flowPreInfoCapacity: capacity,
    flowPreInfoMinSoc: minSoc
  });
}

/**
 * Battery SOC settings page.
 *
 * `minGridSOC` ("Battery Reserve Capacity") is the floor the battery stops
 * discharging at while the grid is present, which is what the estimate needs.
 * `minSOC` ("System Min. SOC") is the lower off-grid limit and is only used
 * when the reserve is not present in the response.
 */
function handleBatterySocResponse(json) {
  const result = json?.result;
  if (!result) return;

  const reserve = toFiniteNumber(result.minGridSOC);
  const systemMin = toFiniteNumber(result.minSOC);
  const minSoc = reserve !== null ? reserve : systemMin;

  recordBatteryDebug({
    batterySocMinGridSOC: result.minGridSOC,
    batterySocMinSOC: result.minSOC,
    batterySocDetected: minSoc
  });

  if (minSoc !== null && minSoc >= 0 && minSoc <= 100) {
    submitMinSoc(minSoc, PRIORITY.batterySettings);
  }
}

/**
 * Quick-settings drawer on the dashboard.
 *
 * The drawer exposes the reserve ("Battery Reserve Capacity") and the lower
 * off-grid limit ("System Min. SOC"). FoxESS documents the off-grid limit as
 * being set below the reserve, so the larger of the two is the reserve.
 */
function handleBatteryQuickSettingResponse(json) {
  const result = json?.result;
  if (!result) return;

  const candidates = [
    readNestedValue(result.backupCutOffSOC),
    readNestedValue(result.systemMinSOC),
  ].filter((value) => value !== null);

  if (!candidates.length) return;

  const minSoc = Math.max(...candidates);
  recordBatteryDebug({
    quickBackupCutOffSOC: readNestedValue(result.backupCutOffSOC),
    quickSystemMinSOC: readNestedValue(result.systemMinSOC),
    quickDetected: minSoc
  });

  if (minSoc >= 0 && minSoc <= 100) {
    submitMinSoc(minSoc, PRIORITY.batterySettings);
  }
}

function routeResponse(url, json) {
  if (!json) return;
  apiResponseCount += 1;

  if (url.includes(ENERGY_ENDPOINT)) {
    handleEnergyResponse(json);
  } else if (url.includes(PLANT_ENDPOINT)) {
    handlePlantDetailResponse(json);
  } else if (url.includes(FLOW_PREINFO_ENDPOINT)) {
    handleFlowPreInfoResponse(json);
  } else if (url.includes(ESS_OVERVIEW_ENDPOINT)) {
    handleEssOverviewResponse(json);
  } else if (url.includes(BATTERY_SOC_ENDPOINT)) {
    handleBatterySocResponse(json);
  } else if (url.includes(BATTERY_QUICK_SETTING_ENDPOINT)) {
    handleBatteryQuickSettingResponse(json);
  } else if (url.includes(PLANT_LIST_ENDPOINT)) {
    cachedPlantID = findPlantID(json) || cachedPlantID;
  } else if (url.includes(DEVICES_SETTING_ENDPOINT)) {
    cachedDeviceID = pickDeviceID(json?.result) || cachedDeviceID;
  }

  // Fallback: look for capacity / min-SOC fields anywhere in the payload.
  scanBatteryFields(json, url);
}

/** Intercept every FoxESS backend call, not only the known endpoints. */
function isApiUrl(url) {
  return typeof url === "string" && API_URL_PATTERN.test(url);
}

function isJsonResponse(response, text) {
  if (text === undefined) {
    const contentType = response?.headers?.get?.("content-type") || "";
    // `text/plain` is included because some proxies serve JSON that way; the
    // parse attempt below still fails safely for real non-JSON payloads.
    if (contentType && !/json|text\/plain/i.test(contentType)) return false;
    return true;
  }

  const trimmed = String(text).trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

// ====================== FETCH INTERCEPTOR ======================
const originalFetch = window.fetch;

window.fetch = async function (...args) {
  try {
    captureAuthFromFetch(args[1]);
  } catch (e) {
    // Auth capture is best effort.
  }

  const response = await originalFetch.apply(this, args);

  try {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

    if (isApiUrl(url) && isJsonResponse(response)) {
      const cloned = response.clone();
      const json = await cloned.json().catch(() => null);
      if (json) routeResponse(url, json);
    }
  } catch (e) {
    console.debug("Fetch interceptor error (non-fatal)", e);
  }

  return response;
};

// ====================== XHR INTERCEPTOR ======================
const origOpen = XMLHttpRequest.prototype.open;
const origSend = XMLHttpRequest.prototype.send;
const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
  try {
    captureAuthHeader(name, value);
  } catch (e) {
    // Auth capture is best effort.
  }

  return origSetRequestHeader.apply(this, arguments);
};

XMLHttpRequest.prototype.open = function (...args) {
  const url = args[1];

  this._foxessApiUrl =
    typeof url === "string" && isApiUrl(url) ? url : null;

  return origOpen.apply(this, args);
};

XMLHttpRequest.prototype.send = function (...args) {
  if (this._foxessApiUrl) {
    this.addEventListener(
      "load",
      function () {
        try {
          const text = this.responseText;
          if (!text || !isJsonResponse(this, text)) return;

          const url = this._foxessApiUrl;
          const json = JSON.parse(text);
          routeResponse(url, json);
        } catch (e) {
          console.debug("XHR parse error", e);
        }
      },
      { once: true }
    );
  }

  return origSend.apply(this, args);
};

// ====================== PROACTIVE DETECTION ======================
//
// Battery capacity is only rendered on some plant/ESS views, so relying on the
// user to navigate there is poor UX. The dashboard reveals a token/lang on its
// first API call; from then on we can sign and issue the same requests ourselves
// (see client.js) and pick the capacity up in the background.

let refreshInFlight = false;
let refreshAttempts = 0;

/** Find the first plant ID in an arbitrary payload. */
function findPlantID(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 5) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPlantID(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const [key, value] of Object.entries(node)) {
    if (
      /^plant_?id$/i.test(key) &&
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      const found = findPlantID(value, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/** Plant ID remembered by the SPA (selected plant) or by us. */
function storedPlantID() {
  if (typeof window.plantID === "string" && window.plantID) {
    return window.plantID;
  }

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!/plant_?id/i.test(key || "")) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const trimmed = String(raw).replace(/^"|"$/g, "");
      const found = trimmed.startsWith("{")
        ? findPlantID(JSON.parse(trimmed))
        : trimmed;

      if (found && found.length < 64) return found;
    }
  } catch (err) {
    // Ignore malformed storage.
  }

  return null;
}

/** First plant ID seen in the page's own plant-list response. */
let cachedPlantID = null;

async function resolvePlantID() {
  const stored = storedPlantID() || cachedPlantID;
  if (stored) return stored;

  // Same request shape the SPA uses for its plant list.
  const json = await signedRequest(PLANT_LIST_ENDPOINT, {
    method: "POST",
    body: { page: 1, size: 20, fuzzyCondition: "", status: 0, exportFlag: false }
  });
  const found = findPlantID(json);
  if (found) {
    cachedPlantID = found;
    recordBatteryDebug({ fetchedPlantID: found });
  }
  return found;
}

/** First device ID seen in the page's own device-settings response. */
let cachedDeviceID = null;

/** Pick the most battery-like device from a device-settings list. */
function pickDeviceID(devices) {
  if (!Array.isArray(devices) || !devices.length) return null;

  const battery = devices.find((device) =>
    /batter|bms|ess/i.test(
      String(device?.deviceType ?? device?.type ?? device?.deviceName ?? "")
    )
  );
  const id = (battery || devices[0])?.id ?? (battery || devices[0])?.deviceID;
  return id ? String(id) : null;
}

/**
 * The battery SOC endpoints are per device. `/dew/w/plant/devices/setting`
 * (the same call the quick-settings drawer makes) gives us the IDs.
 */
async function resolveDeviceID(plantID) {
  if (cachedDeviceID) return cachedDeviceID;

  const json = await signedRequest(DEVICES_SETTING_ENDPOINT, {
    params: { plantID }
  });
  cachedDeviceID = pickDeviceID(json?.result);
  return cachedDeviceID;
}

/**
 * Ask the backend for the plant detail (and, failing that, the ESS overview)
 * so the capacity is picked up without opening any specific page.
 */
export async function refreshBatteryFromApi(force = false) {
  if (refreshInFlight) return;

  // Never issue duplicate calls once a value is known, unless the popup
  // explicitly asked for a refresh (the user may have switched plants).
  if (!force && hasDetectedBatteryCapacity()) return;

  refreshInFlight = true;
  refreshAttempts += 1;

  try {
    recordBatteryDebug({ autoFetchAttempts: refreshAttempts });

    const plantID = await resolvePlantID();
    recordBatteryDebug({
      autoFetchStage: plantID ? "plant-id" : "no-plant-id",
      autoFetchError: getLastRequestFailure()
    });

    if (plantID) {
      const json = await signedRequest(PLANT_ENDPOINT, {
        params: { plantID }
      });
      recordBatteryDebug({
        autoFetchStage: json ? "plant-detail" : "plant-detail-failed",
        autoFetchError: getLastRequestFailure(),
        autoFetchErrno: json?.errno ?? null,
        autoFetchMsg: json?.msg ?? null
      });
      if (json) routeResponse(PLANT_ENDPOINT, json);
    }

    if (!hasDetectedBatteryCapacity()) {
      const json = await signedRequest(ESS_OVERVIEW_ENDPOINT);
      recordBatteryDebug({
        autoFetchStage: json ? "ess-overview" : "ess-overview-failed",
        autoFetchError: getLastRequestFailure(),
        autoFetchErrno: json?.errno ?? null,
        autoFetchMsg: json?.msg ?? null
      });
      if (json) routeResponse(ESS_OVERVIEW_ENDPOINT, json);
    }

    // Min SOC is stored per device, so it needs one extra lookup. A forced
    // refresh re-reads it even when a (possibly stale) value is already known.
    if (plantID && (force || !hasDetectedMinSoc())) {
      const deviceID = await resolveDeviceID(plantID);
      recordBatteryDebug({
        autoFetchStage: deviceID ? "device-id" : "no-device-id",
        autoFetchError: getLastRequestFailure()
      });

      if (deviceID) {
        const json = await signedRequest(BATTERY_QUICK_SETTING_ENDPOINT, {
          params: { deviceID }
        });
        recordBatteryDebug({
          autoFetchStage: json ? "min-soc" : "min-soc-failed",
          autoFetchError: getLastRequestFailure(),
          autoFetchErrno: json?.errno ?? null,
          autoFetchMsg: json?.msg ?? null
        });
        if (json) routeResponse(BATTERY_QUICK_SETTING_ENDPOINT, json);
      }
    }

    recordBatteryDebug({ autoFetchDone: true });
  } finally {
    refreshInFlight = false;
  }
}

onAuthReady(() => {
  // Give the dashboard a moment to finish its own initial requests first.
  setTimeout(refreshBatteryFromApi, 1200);
  setTimeout(refreshBatteryFromApi, 7000);
});
