# Fox ESS Cloud v2 Enhancements - browser extension

A Chrome extension that improves the Fox ESS Cloud (v2) experience with useful quality-of-life features.

## Features

- **Popup Controls**: Quick access to toggles directly from the extension popup
- **Unstack Charts**: On by default — Switch between stacked and unstacked view for ECharts bar and line charts
- **Sankey Diagram**: On by default — Add an energy flow Sankey diagram to the energy stats page, which replaces the Supply/Usage panel
- **Solar Production Gauge**: On by default — Real-time solar power gauge (vertical progress bar) showing current output as a percentage of PV capacity

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **"Load unpacked"** and select the **`dist/`** folder
5. Visit [https://www.foxesscloud.com/v2/](https://www.foxesscloud.com/v2/) and log in

## Usage

- Click the extension icon to open the popup controls
- Toggle the checkboxes to turn features on/off

## Development

The extension source lives in `src/` and is split into ES modules. The production build goes to `dist/`.

### Project structure

```
foxesscloud-extension/
├── src/injected/            ← Source modules (edit here)
│   ├── index.js             ← Entry point — wires everything together
│   ├── state.js             ← Shared mutable state
│   ├── chart/               ← ECharts unstack/hook modules
│   ├── sankey/              ← Sankey diagram module
│   ├── interceptor/         ← API fetch/XHR interceptors
│   ├── progress-bar/        ← Solar production gauge
│   └── websocket/           ← WebSocket interceptor
├── dist/                    ← Production build (load in Chrome)
│   ├── manifest.json
│   ├── content.js
│   ├── injected.js
│   ├── popup.html
│   └── popup.js
└── package.json
```

### Build commands

| Command             | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `npm run build`     | Production build (minified, outputs to `dist/injected.js`) |
| `npm run build:dev` | Dev build (unminified, easier debugging)                   |
| `npm run watch`     | Auto-rebuild on every file save                            |

Run `npm run watch` once and leave it running while you edit files in `src/injected/`. The `dist/injected.js` file is rebuilt automatically.

### Prerequisites

- Node.js (any recent version)
- npm

```bash
npm install
npm run watch
```

## Technical Details

- **Manifest Version**: 3
- **Build tool**: [esbuild](https://esbuild.github.io/) — fast bundler, no config needed
- Uses `chrome.scripting` + main-world injection for deep ECharts integration
- Observes DOM changes to handle dynamically loaded charts
- Intercepts `fetch`, `XMLHttpRequest`, and `WebSocket` to capture energy data and plant details

---

Made for personal use. Feel free to customize!
