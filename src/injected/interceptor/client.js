/**
 * Signed FoxESS API client.
 *
 * The dashboard signs every backend call with a WASM helper loaded from
 * `/v2/js/signature.js` (global `Module`):
 *
 *   signature = begin_signature(token, url, lang, timestamp)
 *
 * The signature covers only the token, the URL path, the language and the
 * timestamp — not the HTTP method or body. That lets the extension issue its
 * own authenticated calls (e.g. plant detail) instead of waiting for the user
 * to navigate to a page that happens to request them.
 *
 * Everything here runs in the MAIN world, so `Module` and `localStorage` are
 * the page's own.
 */

/** Raw fetch, captured before the API interceptor patches `window.fetch`. */
const rawFetch = window.fetch.bind(window);

const AUTH_KEY = "__foxessAuth";
const AUTH_SOURCE_HEADER = "X-Auth-Platform";

/** Fields from a real request that we need to reproduce a signed call. */
function rememberAuth(values) {
  const current = window[AUTH_KEY] || {};
  const next = { ...current };

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") next[key] = value;
  }

  const gainedToken = !current.token && next.token;
  window[AUTH_KEY] = next;

  if (gainedToken) notifyAuthReady();
}

const authListeners = [];

/** Run `callback` once a token has been observed on a real API request. */
export function onAuthReady(callback) {
  if (window[AUTH_KEY]?.token) {
    callback();
    return;
  }

  authListeners.push(callback);
}

function notifyAuthReady() {
  const listeners = authListeners.splice(0, authListeners.length);
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      // A listener must never break the interceptor.
    }
  }
}

function readLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function authFromPlainHeaders(headers) {
  const find = (name) => {
    const match = Object.keys(headers).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    );
    return match ? headers[match] : undefined;
  };

  return {
    token: find("token") || readLocalStorage("token"),
    lang: find("lang"),
    timezone: find("timezone"),
  };
}

/** Capture auth fields from a `fetch(..., init)` call. */
export function captureAuthFromFetch(init) {
  const headers = init?.headers;
  if (!headers) return;

  if (typeof headers.forEach === "function" && !Array.isArray(headers)) {
    const plain = {};
    headers.forEach((value, key) => {
      plain[key] = value;
    });
    rememberAuth(authFromPlainHeaders(plain));
    return;
  }

  if (Array.isArray(headers)) {
    rememberAuth(authFromPlainHeaders(Object.fromEntries(headers)));
    return;
  }

  rememberAuth(authFromPlainHeaders(headers));
}

/** Record a single `XMLHttpRequest.setRequestHeader` call. */
export function captureAuthHeader(name, value) {
  if (!name || value === undefined) return;

  const lower = String(name).toLowerCase();
  if (lower === "token") rememberAuth({ token: value });
  else if (lower === "lang") rememberAuth({ lang: value });
  else if (lower === "timezone") rememberAuth({ timezone: value });
}

function pad(value) {
  return String(value).padStart(2, "0");
}

/** `yyyy-MM-dd HH:mm:ss` in local time, matching the site's `dt` header. */
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

/** Wait for the page's WASM signer to finish loading (max ~8 s). */
function waitForSigner() {
  return new Promise((resolve) => {
    const started = Date.now();

    const check = () => {
      const wasm = window.Module;
      if (wasm?.cwrap && (wasm.calledRun || wasm._begin_signature)) {
        resolve(true);
        return;
      }
      if (Date.now() - started > 8000) {
        resolve(false);
        return;
      }
      setTimeout(check, 100);
    };

    check();
  });
}

function signRequest(path, token, lang, timestamp) {
  const wasm = window.Module;
  if (!wasm?.cwrap) return null;

  try {
    const begin = wasm.cwrap("begin_signature", "string", [
      "string",
      "string",
      "string",
      "string",
    ]);
    const end = wasm.cwrap("end_signature", "number", ["string"]);

    const signature = begin(token, path, lang, String(timestamp));
    end(signature);
    return signature;
  } catch (err) {
    return null;
  }
}

/**
 * Perform a signed request against the FoxESS backend.
 *
 * The site's signer receives axios' `config.url`, i.e. the bare path — query
 * params are added by axios afterwards and are **not** part of the signature.
 *
 * @param {string} path absolute path, e.g. "/dew/v0/plant/detail"
 * @param {{ method?: string, body?: unknown, params?: Record<string, string> }} [options]
 * @returns {Promise<any|null>} parsed JSON, or null when unavailable
 */
let lastFailure = null;

/** Why the last `signedRequest` returned null (surfaced in the popup diagnostics). */
export function getLastRequestFailure() {
  return lastFailure;
}

export async function signedRequest(path, options = {}) {
  lastFailure = null;
  const auth = window[AUTH_KEY] || {};

  // `lang` is the site's network language code, which is what the signer
  // expects; the raw localStorage value may be a regional locale instead.
  const token = auth.token || readLocalStorage("token");
  const lang = auth.lang;
  const timezone =
    auth.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!token || !lang) {
    lastFailure = "no-auth";
    return null;
  }
  if (!(await waitForSigner())) {
    lastFailure = "signer-timeout";
    return null;
  }

  const timestamp = Date.now();
  const signature = signRequest(path, token, lang, timestamp);
  if (!signature) {
    lastFailure = "sign-failed";
    return null;
  }

  const method = options.method || "GET";
  const headers = {
    "content-type": "application/json",
    contentType: "application/json",
    lang,
    token,
    timezone,
    platform: "web",
    [AUTH_SOURCE_HEADER]: "FOX_CLOUD_WEB_2_0",
    dt: `${timezone}@${timestamp}@${formatDateTime(timestamp)}`,
    timestamp: String(timestamp),
    signature,
  };

  const query = options.params
    ? new URLSearchParams(options.params).toString()
    : "";
  const requestUrl = query ? `${path}?${query}` : path;

  try {
    const response = await rawFetch(requestUrl, {
      method,
      headers,
      credentials: "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      lastFailure = `http-${response.status}`;
      return null;
    }
    return await response.json();
  } catch (err) {
    lastFailure = `network: ${err?.message || err}`;
    return null;
  }
}

/** True once the page has revealed an auth token. */
export function hasAuthToken() {
  return Boolean(window[AUTH_KEY]?.token || readLocalStorage("token"));
}
