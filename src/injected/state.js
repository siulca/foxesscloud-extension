/**
 * Shared mutable state for the Fox ESS Cloud extension.
 * Uses getter/setter pattern so all modules share live bindings.
 */

const state = {
  // Default to stacked charts until settings say otherwise.
  _currentStackMode: true,
  _showSankey: true,
  _hideOpenTabs: true,

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

  get hideOpenTabs() {
    return this._hideOpenTabs;
  },
  set hideOpenTabs(val) {
    this._hideOpenTabs = val;
  },
};

export default state;
