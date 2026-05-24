# Fox ESS Cloud Enhancements - browser extension

A Chrome extension that improves the Fox ESS Cloud (v2) experience with useful quality-of-life features.

## Features

- **Popup Controls**: Quick access to toggles directly from the extension popup
- **Unstack Charts**: On by default - Switch between stacked and unstacked view for ECharts bar and line charts
- **Sankey Diagram**: On by default - Add an energy flow Sankey diagram to the energy stats page, which replaces the Supply/Usage panel

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **"Load unpacked"** and select the extension folder
5. Visit [https://www.foxesscloud.com](https://www.foxesscloud.com) and log in

## Usage

- Click the extension icon to open the popup controls
- Toggle the checkboxes to turn the features on/off

## Technical Details

- **Manifest Version**: 3
- Uses `chrome.scripting` + main-world injection for deep ECharts integration
- Observes DOM changes to handle dynamically loaded charts

---

Made for personal use. Feel free to customize!
