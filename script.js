if (typeof BareMux === 'undefined') {
    BareMux = {
        BareMuxConnection: class {
            constructor() { }
            setTransport() { }
        }
    };
}
// Wrap everything in DOMContentLoaded to ensure DOM is ready
const DEFAULT_SEARCH_ENGINES = {
    brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=' },
    duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    google: { name: 'Google', url: 'https://www.google.com/search?safe=active&q=' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' }
};

// Declare scramjet globally so it can be used by createTab and other functions
let scramjet;

document.addEventListener('DOMContentLoaded', async function () {
    const basePath = location.pathname.replace(/[^/]*$/, '');

    const { ScramjetController } = $scramjetLoadController();

    // Configure Scramjet controller with the correct prefix
    scramjet = new ScramjetController({
        prefix: basePath + 'JS/scramjet/',
        files: {
            wasm: basePath + 'JS/scramjet.wasm.wasm',
            all: basePath + 'JS/scramjet.all.js',
            sync: basePath + 'JS/scramjet.sync.js',
        },
    });

    scramjet.init();
    // Dynamic path calculation for subfolder hosting compatibility
    await navigator.serviceWorker.register(basePath + 'sw.js', { scope: basePath });
    // Send the WISP URL to the service worker once it's ready
    navigator.serviceWorker.ready.then((registration) => {
        registration.active.postMessage({
            type: "config",
            wispurl: localStorage.getItem("proxServer") || _CONFIG.wispurl,
        });
    });
});

const connection = new BareMux.BareMuxConnection(`${basePath}B/worker.js`);
const store = {
    url: "https://",
    wispurl: localStorage.getItem("proxServer") || _CONFIG.wispurl,
    bareurl: _CONFIG?.bareurl || (location.protocol === "https:" ? "https" : "http") + "://" + location.host + "/bare/"
};
connection.setTransport(`${basePath}Ep/index.mjs`, [{
    wisp: store.wispurl
}]);

// Monitor WISP connection health
setInterval(testWispHealth, 60000); // Check every minute

let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let sortableInstance = null;

function createTab(makeActive = true) {
    const frame = scramjet.createFrame();
    const tab = {
        id: nextTabId++,
        title: "Loading...",
        url: "",
        frame: frame,
        favicon: "", // Start with empty favicon
        loading: true,
        progress: 10, // Start at 10%
        faviconTimeout: null // Track favicon loading timeout
    };

    updateLoadingBar(tab);

    frame.frame.src = `${basePath}NT.html`;

    frame.addEventListener("urlchange", (e) => {
        if (!e.url || e.url === "about:blank")
            return;
        tab.url = e.url;
        tab.loading = true;
        tab.progress = 10;
        updateLoadingBar(tab);
        updateTabsUI();
        try {
            tab.favicon = new URL(e.url).origin + '/favicon.ico';
        } catch (e) {/* ignore */
        }
        try {
            // Only access title if same-origin
            if (isSameOrigin(e.url)) {
                tab.title = frame.frame.contentWindow.document.title || new URL(e.url).hostname;
            } else {
                tab.title = new URL(e.url).hostname;
            }
        } catch (e) {
            tab.title = new URL(e.url).hostname;
        }
        updateTabsUI();
        updateAddressBar();
    }
    );

    // Monitor for connection errors to trigger WISP health check
    frame.addEventListener("connectionerror", () => {
        testWispHealth();
    });

    // Set favicon timeout - 2 seconds max for favicon changing
    if (tab.favicon) {
        tab.faviconTimeout = setTimeout(() => {
            // If favicon hasn't loaded within 2 seconds, set to empty
            if (tab.favicon && tab.favicon !== "") {
                tab.favicon = "";
                updateTabsUI();
            }
        }, 2000);
    }

    frame.frame.addEventListener('load', () => {
        try {
            const newTitle = frame.frame.contentWindow.document.title;
            if (newTitle && tab.title !== newTitle) {
                tab.title = newTitle;
                tab.loading = false;
                tab.progress = 100;
                updateLoadingBar(tab);
                updateTabsUI();
            } else {
                tab.loading = false;
                tab.title = "New Tab";
                tab.progress = 100;
                updateLoadingBar(tab);
                updateTabsUI();
            }
        } catch (e) {/* Ignore cross-origin access */
            tab.loading = false;
            tab.title = "New Tab";
            tab.progress = 100;
            updateLoadingBar(tab);
            updateTabsUI();
        }
    }
    );
    tabs.push(tab);
    if (makeActive) {
        activeTabId = tab.id;
    }
    return tab;
}

function getActiveTab() {
    return tabs.find((tab) => tab.id === activeTabId);
}
function switchTab(tabId) {
    if (activeTabId === tabId)
        return;
    tabs.forEach((tab) => tab.frame.frame.classList.add("hidden"));
    activeTabId = tabId;
    const activeTab = getActiveTab();
    if (activeTab) {
        activeTab.frame.frame.classList.remove("hidden");
    }
    updateTabsUI();
    updateAddressBar();
    updateLoadingBar(activeTab);
}
function closeTab(tabId) {
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1)
        return;
    const tabToRemove = tabs[tabIndex];

    // Clear favicon timeout to prevent memory leaks
    if (tabToRemove.faviconTimeout) {
        clearTimeout(tabToRemove.faviconTimeout);
    }

    if (tabToRemove.frame.frame.parentNode) {
        tabToRemove.frame.frame.parentNode.removeChild(tabToRemove.frame.frame);
    }
    tabs.splice(tabIndex, 1);
    if (activeTabId === tabId) {
        if (tabs.length > 0) {
            const newActiveIndex = Math.min(tabIndex, tabs.length - 1);
            switchTab(tabs[newActiveIndex].id);
        } else {
            activeTabId = null;
            const newTab = createTab(true);
            document.getElementById("iframe-container").appendChild(newTab.frame.frame);
        }
    }
    updateTabsUI();
    updateAddressBar();
}
function updateTabsUI() {
    const tabsContainer = document.getElementById("tabs-container");
    if (!tabsContainer)
        return;
    const newTabButton = tabsContainer.querySelector('.new-tab');
    if (newTabButton)
        newTabButton.remove();
    tabsContainer.innerHTML = "";
    tabs.forEach((tab) => {
        const tabElement = document.createElement("div");
        tabElement.className = `tab ${tab.id === activeTabId ? "active" : ""}`;
        tabElement.setAttribute("data-tab-id", tab.id);
        tabElement.onclick = () => switchTab(tab.id);
        const faviconImg = document.createElement("img");
        faviconImg.className = "tab-favicon";
        // Only set src if favicon is not empty
        if (tab.favicon && tab.favicon.trim() !== "") {
            faviconImg.src = tab.favicon;
        }
        faviconImg.onerror = () => {
            // Set to empty string to hide favicon if it fails to load
            faviconImg.src = "";
        }
            ;
        const titleSpan = document.createElement("span");
        titleSpan.className = `tab-title ${tab.loading ? "tab-loading" : ""}`;
        titleSpan.textContent = tab.title;
        const closeButton = document.createElement("button");
        closeButton.className = "tab-close";
        closeButton.innerHTML = "&times;";
        closeButton.onclick = (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        }
            ;
        tabElement.appendChild(faviconImg);
        tabElement.appendChild(titleSpan);
        tabElement.appendChild(closeButton);
        tabsContainer.appendChild(tabElement);
    }
    );
    const newBtn = document.createElement("button");
    newBtn.className = "new-tab";
    newBtn.textContent = "+";
    newBtn.onclick = () => {
        const newTab = createTab(false);
        document.getElementById("iframe-container").appendChild(newTab.frame.frame);
        switchTab(newTab.id);
    }
        ;
    tabsContainer.appendChild(newBtn);
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    sortableInstance = new Sortable(tabsContainer, {
        animation: 200,
        direction: "horizontal",
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        filter: ".new-tab",
        onEnd: (evt) => {
            if (evt.oldIndex !== evt.newIndex) {
                const movedTab = tabs.splice(evt.oldIndex, 1)[0];
                tabs.splice(evt.newIndex, 0, movedTab);
            }
        }
    });
}
function updateAddressBar() {
    const addressBar = document.getElementById("address-bar");
    const activeTab = getActiveTab();
    if (addressBar) {
        addressBar.value = activeTab ? activeTab.url : "";
    }
}
function isSameOrigin(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.origin === window.location.origin;
    } catch {
        return false;
    }
}

function toggleDevTools() {
    const activeTab = getActiveTab();
    if (!activeTab)
        return;
    const frameWindow = activeTab.frame.frame.contentWindow;
    if (!frameWindow)
        return;

    // Check if the frame source is same-origin before accessing document
    const frameSrc = activeTab.frame.frame.src;
    if (!isSameOrigin(frameSrc)) {
        alert('Developer tools cannot be toggled for cross-origin content.');
        return;
    }

    if (frameWindow.eruda) {
        frameWindow.eruda.destroy();
        delete frameWindow.eruda;
    } else {
        let script = frameWindow.document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/eruda";
        script.onload = function () {
            if (frameWindow.eruda && typeof frameWindow.eruda.init === 'function') {
                frameWindow.eruda.init();
                frameWindow.eruda.show();
            } else {
                // Retry if not immediately available
                let attempts = 0;
                const interval = setInterval(() => {
                    if (frameWindow.eruda && typeof frameWindow.eruda.init === 'function') {
                        frameWindow.eruda.init();
                        frameWindow.eruda.show();
                        clearInterval(interval);
                    } else if (attempts > 10) {
                        clearInterval(interval);
                        console.error("Eruda failed to load.");
                    }
                    attempts++;
                }, 100);
            }
        };
        frameWindow.document.body.appendChild(script);
    }
}
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'navigate' && event.data.url) {
        getActiveTab()?.frame.go(event.data.url);
    }
}
);
// Check for hash parameters after initialization
async function initializeBrowser() {
    const root = document.getElementById("app");
    root.innerHTML = `<div class="browser-container"><div class="flex tabs" id="tabs-container"></div><div class="flex nav"><button id="back-btn"><i class="fa-solid fa-chevron-left"></i></button><button id="fwd-btn"><i class="fa-solid fa-chevron-right"></i></button><button id="reload-btn"><i class="fa-solid fa-rotate-right"></i></button><input class="bar" id="address-bar" autocomplete="off" autocapitalize="off" autocorrect="off"><button id="devtools-btn"><i class="fa-solid fa-code"></i></button><button id="wisp-settings-btn" title="WISP Settings"><i class="fa-solid fa-cog"></i></button><button id="open-new-window-btn"><i class="fa-solid fa-arrow-up-right-from-square"></i></button></div><div class="loading-bar-container"><div class="loading-bar" id="loading-bar"></div></div><div class="iframe-container" id="iframe-container"></div></div>`;
    document.getElementById('back-btn').onclick = () => getActiveTab()?.frame.back();
    document.getElementById('fwd-btn').onclick = () => getActiveTab()?.frame.forward();
    document.getElementById('reload-btn').onclick = () => getActiveTab()?.frame.reload();
    document.getElementById('address-bar').onkeyup = (event) => {
        if (event.keyCode === 13)
            handleSubmit();
    }
        ;
    document.getElementById('open-new-window-btn').onclick = () => {
        const url = getActiveTab()?.url;
        if (url)
            window.open(scramjet.encodeUrl(url));
    }
        ;
    document.getElementById('devtools-btn').onclick = toggleDevTools;
    const initialTab = createTab(true);
    document.getElementById("iframe-container").appendChild(initialTab.frame.frame);
    updateTabsUI();
    updateAddressBar();

    // Check for hash parameters after initialization
    await checkHashParameters();

    // Initialize WISP events after UI is created
    initializeWISPEvents();
}

// Handle incoming search or URL from hash parameters
async function handleIncomingSearch() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    try {
        let decodedHash = decodeURIComponent(hash);
        // Handle double-encoded URLs
        let isValidUrl = false;
        try {
            new URL(decodedHash);
            isValidUrl = true;
        } catch (e) {
            // Not a valid URL
        }
        if (isValidUrl && decodedHash !== hash) {
            try {
                decodedHash = decodeURIComponent(decodedHash);
            } catch (e) {
                // Use single-decoded version if double-decode fails
            }
        }

        if (decodedHash.startsWith('search=')) {
            // Handle search query with engine parameter
            const urlParams = new URLSearchParams(decodedHash);
            const query = urlParams.get('search');
            const engine = urlParams.get('engine') || 'duckduckgo';

            if (query) {
                const addressBar = document.getElementById('address-bar');
                if (addressBar) {
                    const searchEngines = window.searchEngines || DEFAULT_SEARCH_ENGINES;

                    const searchEngine = searchEngines[engine] || searchEngines.brave;
                    const searchUrl = searchEngine.url + encodeURIComponent(query);

                    addressBar.value = searchUrl;
                    handleSubmit(searchUrl);
                }
            }
        } else if (decodedHash.startsWith('url=')) {
            // Handle direct URL navigation
            const url = decodedHash.substring(4); // Remove 'url=' prefix
            const addressBar = document.getElementById('address-bar');
            if (addressBar) {
                addressBar.value = url;
                handleSubmit();
            }
        } else if (decodedHash.startsWith('http://') || decodedHash.startsWith('https://')) {
            // Direct URL in hash
            const addressBar = document.getElementById('address-bar');
            if (addressBar) {
                addressBar.value = decodedHash;
                handleSubmit();
            }
        }
    } catch (error) {
        console.warn('Error processing hash parameter:', error);
    } finally {
        // Clear hash after processing
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }
}

// Check for hash parameters and handle them
async function checkHashParameters() {
    if (window.location.hash) {
        await handleIncomingSearch();
    }
}

// Enhanced handleSubmit to support both direct input and programmatic calls
function handleSubmit(url = null) {
    const activeTab = getActiveTab();
    const addressBar = document.getElementById("address-bar");
    if (!activeTab || !addressBar)
        return;

    let inputUrl = url || addressBar.value.trim();
    if (inputUrl === "")
        return;

    // Decode URI components before processing
    try {
        inputUrl = decodeURIComponent(inputUrl);
    } catch (e) {
        // If decoding fails, use original input
    }

    // Handle special cases where URL might be malformed
    if (!inputUrl.match(/^https?:\/\//i)) {
        if (inputUrl.includes('.') && !inputUrl.includes(' ')) {
            inputUrl = 'https://' + inputUrl;
        } else {
            inputUrl = 'https://search.brave.com/search?q=' + encodeURIComponent(inputUrl);
        }
    }

    // Final validation check
    try {
        new URL(inputUrl);
    } catch {
        inputUrl = 'https://search.brave.com/search?q=' + encodeURIComponent(inputUrl);
    }
    activeTab.frame.go(inputUrl);
}

window.addEventListener("load", async () => {
    await initializeBrowser();
}
);

// WISP Settings Modal Functionality

function openWISPSettingsModal() {
    const modal = document.getElementById('wisp-settings-modal');
    const currentUrlDisplay = document.getElementById('current-wisp-url');
    const customUrlInput = document.getElementById('custom-wisp-url');

    const currentUrl = localStorage.getItem('proxServer') || _CONFIG.wispurl;
    currentUrlDisplay.textContent = currentUrl;
    customUrlInput.value = currentUrl;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Reset all selection buttons
    document.querySelectorAll('.wisp-option-btn').forEach(btn => {
        btn.textContent = 'Select';
    });

    // Mark current URL as selected
    const selectedOption = document.querySelector(`[data-url="${currentUrl}"]`);
    if (selectedOption) {
        selectedOption.querySelector('.wisp-option-btn').textContent = 'Selected';
    }

    updateWispStatus('info', 'Ready to configure');
    updateApplyButton();
}

function closeWISPSettingsModal() {
    const modal = document.getElementById('wisp-settings-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function selectWispUrl(url) {
    // Update all selection buttons
    document.querySelectorAll('.wisp-option-btn').forEach(btn => {
        btn.textContent = 'Select';
    });

    // Mark selected option
    const selectedOption = document.querySelector(`[data-url="${url}"]`);
    if (selectedOption) {
        selectedOption.querySelector('.wisp-option-btn').textContent = 'Selected';
    }

    // Update custom URL input
    document.getElementById('custom-wisp-url').value = url;

    // Update current URL display
    document.getElementById('current-wisp-url').textContent = url;

    // Update status
    updateWispStatus('success', `Selected WISP: ${url}`);

    // Enable apply button
    updateApplyButton();
}

function saveCustomWisp() {
    const customUrl = document.getElementById('custom-wisp-url').value.trim();

    if (!customUrl) {
        updateWispStatus('error', 'Please enter a valid WISP URL');
        return;
    }

    // Basic URL validation
    if (!customUrl.startsWith('wss://') && !customUrl.startsWith('ws://')) {
        updateWispStatus('error', 'WISP URL must start with wss:// or ws://');
        return;
    }

    // Update current URL display
    document.getElementById('current-wisp-url').textContent = customUrl;

    // Update status
    updateWispStatus('success', `Custom WISP URL set: ${customUrl}`);

    // Enable apply button
    updateApplyButton();
}

function testWispConnection() {
    const testUrl = document.getElementById('custom-wisp-url').value.trim();

    if (!testUrl) {
        updateWispStatus('error', 'Please enter a WISP URL to test');
        return;
    }

    updateWispStatus('loading', 'Testing WISP connection...');

    // Create a simple WebSocket test
    try {
        const ws = new WebSocket(testUrl);
        let timeout = setTimeout(() => {
            ws.close();
            updateWispStatus('error', 'Connection timeout - WISP server may be offline');
        }, 5000);

        ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            updateWispStatus('success', 'WISP connection successful!');
        };

        ws.onerror = () => {
            clearTimeout(timeout);
            updateWispStatus('error', 'Connection failed - check URL and server status');
        };
    } catch (error) {
        updateWispStatus('error', 'Invalid WISP URL format');
    }
}

function applyWispSettings() {
    const newWispUrl = document.getElementById('current-wisp-url').textContent;

    // Save to localStorage
    localStorage.setItem('proxServer', newWispUrl);

    // Dispatch localStorageUpdate event
    const event = new CustomEvent('localStorageUpdate', {
        detail: { key: 'proxServer', newValue: newWispUrl }
    });
    window.dispatchEvent(event);

    // Message the Service Worker
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'config',
            wispurl: newWispUrl
        });
    }

    // Update store and reconnect BareMux transports
    store.wispurl = newWispUrl;
    connection.setTransport(`${basePath}Ep/index.mjs`, [{
        wisp: newWispUrl
    }]);

    // Update status
    updateWispStatus('success', 'WISP settings applied successfully!');

    // Close modal after a short delay
    setTimeout(() => {
        closeWISPSettingsModal();
    }, 1000);
}

function updateWispStatus(type, message) {
    const indicator = document.getElementById('wisp-status-indicator');
    const text = document.getElementById('wisp-status-text');

    // Reset classes
    indicator.className = 'status-indicator';
    text.className = 'status-text';

    // Set new status
    switch (type) {
        case 'success':
            indicator.classList.add('status-success');
            text.classList.add('status-success');
            break;
        case 'error':
            indicator.classList.add('status-error');
            text.classList.add('status-error');
            break;
        case 'loading':
            indicator.classList.add('status-loading');
            text.classList.add('status-loading');
            break;
        case 'info':
            text.classList.add('status-info');
            break;
    }

    text.textContent = message;
}

function updateApplyButton() {
    const applyBtn = document.getElementById('apply-wisp-btn');
    const currentUrl = document.getElementById('current-wisp-url').textContent;
    const originalUrl = localStorage.getItem('proxServer') || _CONFIG.wispurl;

    applyBtn.disabled = (currentUrl === originalUrl);
}

// Initialize event listeners for WISP modal
function initializeWISPEvents() {
    // WISP settings button click
    document.getElementById('wisp-settings-btn').addEventListener('click', openWISPSettingsModal);

    // Close buttons
    document.getElementById('close-wisp-modal').addEventListener('click', closeWISPSettingsModal);
    document.getElementById('close-wisp-modal-footer').addEventListener('click', closeWISPSettingsModal);

    // Predefined WISP selection
    document.querySelectorAll('[data-action="select-wisp"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wispOption = e.target.closest('.wisp-option');
            const url = wispOption.dataset.url;
            selectWispUrl(url);
        });
    });

    // Custom WISP save
    document.getElementById('save-custom-wisp-btn').addEventListener('click', saveCustomWisp);
    document.getElementById('test-wisp-btn').addEventListener('click', testWispConnection);
    document.getElementById('apply-wisp-btn').addEventListener('click', applyWispSettings);

    // Handle Enter key in custom URL input
    const customUrlInput = document.getElementById('custom-wisp-url');
    customUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveCustomWisp();
        }
    });

    // Update apply button when custom URL changes
    customUrlInput.addEventListener('input', updateApplyButton);

    // Close modal when clicking outside
    document.getElementById('wisp-settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'wisp-settings-modal') {
            closeWISPSettingsModal();
        }
    });
}

// WISP events are now initialized at the end of initializeBrowser()

// Notification system for WISP failures
function showWispBrokenNotification() {
    NotificationManager.notify('WISP Connection Error: The WISP server may be down. Please check your settings.', 'error', 5000);
}

function testWispHealth() {
    const wispUrl = localStorage.getItem('proxServer') || _CONFIG.wispurl;
    try {
        const ws = new WebSocket(wispUrl);
        let timeout = setTimeout(() => {
            ws.close();
            showWispBrokenNotification();
        }, 5000);

        ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
        };

        ws.onerror = () => {
            clearTimeout(timeout);
            showWispBrokenNotification();
        };
    } catch (error) {
        showWispBrokenNotification();
    }
}
function addNewShortcutButton(container) {
    const button = document.createElement('button');
    button.className = 'shortcut-btn add-new';
    button.innerHTML = '+';
    container.appendChild(button);
    button.addEventListener('click', () => {
        const name = prompt('Shortcut name');
        const url = prompt('Shortcut URL');
        if (name && url) {
            let shortcuts = JSON.parse(localStorage.getItem('shortcuts') || '[]');
            shortcuts.push({ name, url });
            localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
        }
    });
}

function updateLoadingBar(tab) {
    const loadingBar = document.getElementById("loading-bar");
    if (!loadingBar || !tab) return;

    // Only update if it's the active tab
    if (tab.id !== activeTabId) return;

    if (tab.loading) {
        loadingBar.style.width = `${tab.progress}%`;
        loadingBar.style.opacity = "1";

        // Simulate progress if it's not complete
        if (tab.progress < 90) {
            // Clear existing interval if any (we'd need to store it on the tab to do this properly, 
            // but for now a simple increment check is okay or we can just let it jump)
            // A better approach for "fake" progress:
            if (!tab.progressInterval) {
                tab.progressInterval = setInterval(() => {
                    if (!tab.loading || tab.progress >= 90) {
                        clearInterval(tab.progressInterval);
                        tab.progressInterval = null;
                        return;
                    }
                    tab.progress += (Math.random() * 10);
                    if (tab.progress > 90) tab.progress = 90;
                    if (activeTabId === tab.id) {
                        loadingBar.style.width = `${tab.progress}%`;
                    }
                }, 500);
            }
        }
    } else {
        loadingBar.style.width = "100%";
        setTimeout(() => {
            if (activeTabId === tab.id && !tab.loading) {
                loadingBar.style.opacity = "0";
                setTimeout(() => {
                    if (activeTabId === tab.id && !tab.loading) {
                        loadingBar.style.width = "0%";
                    }
                }, 200);
            }
        }, 200);

        if (tab.progressInterval) {
            clearInterval(tab.progressInterval);
            tab.progressInterval = null;
        }
    }
}

module.exports = { addNewShortcutButton };