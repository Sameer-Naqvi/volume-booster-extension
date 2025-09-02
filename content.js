let audioContext = null;
let gainNode = null;
let connectedVideos = new Set();
let currentBoostFactor = 1.0;

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.gain.value = currentBoostFactor;
  }
}

function connectMedia(media, factor) {
  if (!audioContext) {
    initAudioContext();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  try {
    if (connectedVideos.has(media)) {
      return;
    }
    
    const source = audioContext.createMediaElementSource(media);
    source.connect(gainNode).connect(audioContext.destination);
    connectedVideos.add(media);
    console.log("Connected new media element:", media);
    
    media.addEventListener('ended', () => {
      connectedVideos.delete(media);
    });
    
  } catch (e) {
    console.error("Error connecting media element:", e);
    if (e.name === 'InvalidStateError') {
      connectedVideos.add(media);
    }
  }
}

function boostVolume(factor) {
  currentBoostFactor = factor;
  
  if (!audioContext) {
    initAudioContext();
  }
  
  if (gainNode) {
    gainNode.gain.value = factor;
  }

  const mediaElements = document.querySelectorAll("video, audio");
  mediaElements.forEach(media => {
    if (!connectedVideos.has(media)) {
      connectMedia(media, factor);
    }
  });
  
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) {
        const iframeMedia = iframeDoc.querySelectorAll('video, audio');
        iframeMedia.forEach(media => {
          if (!connectedVideos.has(media)) {
            connectMedia(media, factor);
          }
        });
      }
    } catch (e) {
      console.log("Cannot access cross-origin iframe content");
    }
  });
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "VIDEO" || node.tagName === "AUDIO") {
          console.log("New media detected by observer:", node);
          setTimeout(() => {
            connectMedia(node, currentBoostFactor);
          }, 100);
        }
        
        if (node.querySelectorAll) {
          const nestedMedia = node.querySelectorAll("video, audio");
          nestedMedia.forEach(media => {
            console.log("New nested media detected by observer:", media);
            setTimeout(() => {
              connectMedia(media, currentBoostFactor);
            }, 100);
          });
          
          const newIframes = node.querySelectorAll('iframe');
          newIframes.forEach(iframe => {
            iframe.addEventListener('load', () => {
              setTimeout(() => {
                boostVolume(currentBoostFactor);
              }, 500);
            });
          });
        }
      }
    });
  });
});

observer.observe(document.documentElement, { 
  childList: true, 
  subtree: true,
  attributes: false,
  attributeOldValue: false,
  characterData: false
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_BOOST") {
    boostVolume(message.factor);
    console.log(`Boost factor set to ${message.factor}`);
    sendResponse({success: true});
  }
  
  if (message.type === "RESET_BOOST") {
    boostVolume(1.0);
    console.log("Boost reset to normal levels.");
    sendResponse({success: true});
  }
  
  return true; 
});

setTimeout(() => {
  boostVolume(currentBoostFactor);
}, 1000);

document.addEventListener('click', () => {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }

  boostVolume(currentBoostFactor);
}, { once: false });

document.addEventListener('play', (e) => {
  if ((e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') && !connectedVideos.has(e.target)) {
    setTimeout(() => {
      connectMedia(e.target, currentBoostFactor);
    }, 100);
  }
}, true);