const slider = document.getElementById("volumeSlider");
const currentValue = document.getElementById("currentValue");
const warning = document.getElementById("warning");
const toggleBtn = document.getElementById("toggleBtn");

let isEnabled = true;

function sendBoost(factor) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "SET_BOOST", factor }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
        }
      });
    }
  });
}

function resetBoost() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "RESET_BOOST" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
        }
      });
    }
  });
}

chrome.storage.local.get(['volumeBoost', 'isEnabled'], (result) => {
  if (result.hasOwnProperty('isEnabled') && !result.isEnabled) {
    slider.value = 1.0;
    currentValue.textContent = "Volume: 1.0x";
    warning.style.display = "none";
    isEnabled = false;
    toggleBtn.textContent = "Turn On";
  } else {
    if (result.volumeBoost) {
      slider.value = result.volumeBoost;
      currentValue.textContent = `Volume: ${parseFloat(result.volumeBoost).toFixed(1)}x`;
      warning.style.display = result.volumeBoost > 5 ? "block" : "none";
    }
    isEnabled = result.hasOwnProperty('isEnabled') ? result.isEnabled : true;
    toggleBtn.textContent = isEnabled ? "Turn Off" : "Turn On";
  }
});

slider.addEventListener("input", () => {
  const value = parseFloat(slider.value);
  
  currentValue.textContent = `Volume: ${value.toFixed(1)}x`;
  warning.style.display = value > 5 ? "block" : "none";
  
  chrome.storage.local.set({ volumeBoost: value });
  
  if (!isEnabled && value !== 1.0) {
    isEnabled = true;
    toggleBtn.textContent = "Turn Off";
    slider.disabled = false;
    chrome.storage.local.set({ isEnabled: true });
  }
  
  sendBoost(value);
});

toggleBtn.addEventListener('click', () => {
  if (isEnabled) {
    isEnabled = false;
    toggleBtn.textContent = "Turn On";
    
    slider.value = 1.0;
    currentValue.textContent = "Volume: 1.0x";
    warning.style.display = "none";
    
    chrome.storage.local.set({ 
      isEnabled: false,
      volumeBoost: 1.0
    });
    
    resetBoost();
  } else {
    isEnabled = true;
    toggleBtn.textContent = "Turn Off";
    
    chrome.storage.local.set({ isEnabled: true });
    
    sendBoost(parseFloat(slider.value));
  }
});