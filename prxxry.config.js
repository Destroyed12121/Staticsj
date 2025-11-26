// Dynamic WISP URL Configuration
// Default WISP URL: wss://wisp.rhw.one/wisp/
// This can be changed via the settings UI which updates localStorage 'proxServer' key

const basePath = '/';

let _CONFIG = {
  wispurl: localStorage.getItem("proxServer") || "wss://wisp.rhw.one/wisp/", // fallback to default WISP URL if proxServer not set
  bareurl: undefined // remove default value, rely on runtime construction
};

// Verify default WISP URL passes validation
console.assert(isValidWispUrl("wss://wisp.rhw.one/wisp/"), "Default WISP URL should pass validation");

// Valid URL patterns for WISP servers
const validWispPatterns = [
  /^wss:\/\/.+\.\w+\/wisp\/?$/,
  /^wss:\/\/[\d\.]+:\d+\/wisp\/?$/,
  /^wss:\/\/localhost:\d+\/wisp\/?$/
];

/**
 * Validates if a URL is a valid WISP server URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidWispUrl(url) {
  try {
    if (!url || typeof url !== 'string') return false;

    // Check if URL is properly formatted
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'wss:') return false;

    // Check against valid patterns
    return validWispPatterns.some(pattern => pattern.test(url));
  } catch (e) {
    console.warn('Invalid WISP URL format:', url);
    return false;
  }
}

/**
 * Updates the WISP URL in configuration when localStorage changes
 * @param {string} newUrl - The new WISP URL from localStorage
 */
function updateWispUrl(newUrl) {
  try {
    if (!newUrl || newUrl === _CONFIG.wispurl) {
      console.log('WISP URL unchanged or invalid, skipping update');
      return;
    }

    if (!isValidWispUrl(newUrl)) {
      console.warn('Invalid WISP URL format:', newUrl);
      return;
    }

    const oldUrl = _CONFIG.wispurl;
    _CONFIG.wispurl = newUrl;

    console.log(`WISP URL updated from ${oldUrl} to ${newUrl}`);

    // Broadcast message to service worker if available
    if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'config',
        wispurl: newUrl
      });
    }

    // Dispatch custom event for other parts of the app
    window.dispatchEvent(new CustomEvent('wispUrlUpdated', {
      detail: {
        oldUrl,
        newUrl,
        bareUrl: _CONFIG.bareurl
      }
    }));

  } catch (error) {
    console.error('Error updating WISP URL:', error);
  }
}

// Listen for localStorage changes on the proxServer key
window.addEventListener('storage', (event) => {
  if (event.key === 'proxServer') {
    updateWispUrl(event.newValue);
  }
});

// Also listen for our own localStorage changes (same window)
window.addEventListener('localStorageUpdate', (event) => {
  if (event.key === 'proxServer') {
    updateWispUrl(event.newValue);
  }
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { _CONFIG, isValidWispUrl, updateWispUrl, basePath };
}
