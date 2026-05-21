let isUnstacked = true;
let showBatteryEstimate = false;

const sendMessage = (message) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, message);
  });
};

document.getElementById('toggle').onclick = () => {
  isUnstacked = !isUnstacked;

  sendMessage({
    type: 'SET_UNSTACKED',
    value: isUnstacked
  });

  document.getElementById('toggle').textContent = 
    isUnstacked ? "Switch to Stacked" : "Switch to Unstacked";
};

document.getElementById('showBatteryEstimate').onchange = (event) => {
  showBatteryEstimate = event.target.checked;

  sendMessage({
    type: 'SET_BATTERY_ESTIMATE',
    value: showBatteryEstimate
  });
};

// Initial label
document.getElementById('toggle').textContent = "Switch to Stacked";