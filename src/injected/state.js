/**
 * Shared mutable state for the Fox ESS Cloud extension.
 * Uses getter/setter pattern so all modules share live bindings.
 */

const state = {
  // Default to stacked charts until the popup explicitly requests unstacked mode.
  _currentStackMode: true,
  _showSankey: false,
  _lastApplyTime: 0,
  _applyTimeout: null,
  _originalDataCache: new Map(),

  get currentStackMode() {
    return this._currentStackMode;
  },
  set currentStackMode(val) {
    this._currentStackMode = val;
  },

  get showSankey() {
    return this._showSankey;
  },
  set showSankey(val) {
    this._showSankey = val;
  },

  get lastApplyTime() {
    return this._lastApplyTime;
  },
  set lastApplyTime(val) {
    this._lastApplyTime = val;
  },

  get applyTimeout() {
    return this._applyTimeout;
  },
  set applyTimeout(val) {
    this._applyTimeout = val;
  },

  get originalDataCache() {
    return this._originalDataCache;
  },
};

export default state;
