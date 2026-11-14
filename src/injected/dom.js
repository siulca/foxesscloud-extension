import { hookAllCharts } from "./chart/hook.js";
import {
  ensureSolarGauge,
  refreshSolarFromDom,
} from "./progress-bar/vertical.js";
import { applyAxesOverlays } from "./axes.js";

/**
 * Single DOM observer for the whole extension.
 *
 * - Only reacts to the host elements it actually cares about.
 * - Ignores mutations caused by the extension itself (no feedback loops).
 * - Tracks which subsystem changed, so a chart render does not re-run the
 *   dashboard logic and vice versa.
 *
 * There is no polling for DOM injection or reconciliation, and the gauge's
 * history graph is drawn straight from each reading (no sampler, no interval).
 */

const DASHBOARD_HOSTS = ".fl_tips2, .tip_solar, .tip_bat";
const CHART_HOSTS = ".echart";
const HOSTS = `${DASHBOARD_HOSTS}, ${CHART_HOSTS}`;

const OWN =
  "#vertical-progress-bar, #battery-estimate-label, #solar-gauge-label, " +
  "#solar-history-wrapper, .__axes_overlay";

const DASHBOARD = 1;
const CHARTS = 2;
const EVERYTHING = DASHBOARD | CHARTS;

const DEBOUNCE_MS = 150;

let observer = null;
let pendingTimer = null;
let pendingFlags = 0;
let started = false;

function isOwn(node) {
  if (!(node instanceof Element)) return false;
  return node.matches(OWN) || !!node.closest(OWN);
}

function flagsFor(node) {
  if (!(node instanceof Element)) return 0;

  let flags = 0;
  if (node.closest(DASHBOARD_HOSTS)) flags |= DASHBOARD;
  if (node.closest(CHART_HOSTS)) flags |= CHARTS;
  return flags;
}

function flagsForSubtree(node) {
  if (!(node instanceof Element)) return 0;

  let flags = flagsFor(node);
  if (flags === EVERYTHING) return flags;

  if (!(flags & DASHBOARD) && node.querySelector(DASHBOARD_HOSTS)) {
    flags |= DASHBOARD;
  }
  if (!(flags & CHARTS) && node.querySelector(CHART_HOSTS)) {
    flags |= CHARTS;
  }
  return flags;
}

function relevance(record) {
  const target = record.target;

  if (target instanceof Element && isOwn(target)) return 0;
  if (target?.parentElement && isOwn(target.parentElement)) return 0;

  if (record.type === "characterData") {
    return target.parentElement?.closest(".tip_solar") ? DASHBOARD : 0;
  }

  if (record.type !== "childList") return 0;

  const changed = [...record.addedNodes, ...record.removedNodes].filter(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE,
  );
  if (changed.length && changed.every(isOwn)) return 0;

  let flags = flagsFor(target);

  for (const node of record.addedNodes) {
    if (isOwn(node)) continue;
    flags |= flagsForSubtree(node);
  }

  return flags;
}

function run() {
  pendingTimer = null;
  const flags = pendingFlags;
  pendingFlags = 0;

  if (flags & DASHBOARD) {
    ensureSolarGauge();
    refreshSolarFromDom();
  }

  if (flags & CHARTS) {
    hookAllCharts();
    applyAxesOverlays();
  }
}

function schedule(flags = EVERYTHING) {
  pendingFlags |= flags;
  if (pendingTimer) return;
  pendingTimer = setTimeout(run, DEBOUNCE_MS);
}

export function startDomObserver() {
  if (started) return;

  const root = document.documentElement;
  if (!root) return;

  started = true;

  observer = new MutationObserver((records) => {
    let flags = 0;
    for (const record of records) {
      flags |= relevance(record);
      if (flags === EVERYTHING) break;
    }
    if (flags) schedule(flags);
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("resize", () => schedule(EVERYTHING), {
    passive: true,
  });
}

/** Run one synchronous pass (used on startup). */
export function syncDashboardNow() {
  pendingFlags = EVERYTHING;
  run();
}
