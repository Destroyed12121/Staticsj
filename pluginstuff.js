document.addEventListener('DOMContentLoaded', () => {
    const getCurrentScriptPath = () => {
        const script = document.currentScript || document.querySelector('script[src*="pluginstuff.js"]');
        return script?.src || null;
    };

    const loadResources = () => {
        const scriptPath = getCurrentScriptPath();
        if (!scriptPath) return;
        const baseDir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
        const isActivePage = window.location.pathname.startsWith('/active');
        const resources = [
            // Removed effects.js injection as it's explicitly included in pages and may double-load.
            { element: 'script', props: { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-Z14CF8WQ1J' } },
            {
                element: 'script',
                props: { innerHTML: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'G-Z14CF8WQ1J');
                `}
            }
        ];

        resources.forEach(({ element, props }) => {
            const el = document.createElement(element);
            Object.assign(el, props);
            document.head.appendChild(el);
        });
    };

    const inFrame = () => {
        try {
            return window.self !== window.top;
        } catch {
            return true;
        }
    };

    const applyAntiClose = () => {
        const targetWindow = inFrame() ? window.top : window;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave?';
            return 'Are you sure you want to leave?';
        };
        const antiCloseEnabled = localStorage.getItem('antiClose') === 'true';

        try {
            targetWindow.removeEventListener('beforeunload', handler);
            if (antiCloseEnabled) {
                targetWindow.addEventListener('beforeunload', handler);
            }
        } catch {
            console.warn('Failed to apply anti-close handler');
        }
    };

    const initializeAntiClose = () => {
        applyAntiClose();
        window.addEventListener('storage', (e) => e.key === 'antiClose' && applyAntiClose());
        window.addEventListener('pageshow', applyAntiClose);
        window.addEventListener('load', applyAntiClose);
    };

    const initializePanicKey = () => {
        let panicKey = localStorage.getItem('panicKey') || 'Escape';
        let panicAction = localStorage.getItem('panicAction') || 'https://edpuzzle.com/notifications';
        const panicKeyInput = document.getElementById('panic-key');
        const panicKeyLabel = document.querySelector('label[for="panic-key"] small');
        const settingsOverlay = document.querySelector('.settings-overlay--scoped');

        if (!panicKeyInput || !panicKeyLabel) return;

        const updatePanicKeyDisplay = () => {
            const displayKey = panicKey.replace('Key', '').replace('Digit', '');
            panicKeyInput.value = displayKey;
            panicKeyInput.title = `Current panic key: ${displayKey}`;
            panicKeyLabel.textContent = `Current: ${displayKey}`;
        };

        const triggerPanicAction = () => {
            try {
                window.location.replace(panicAction);
                setTimeout(() => {
                    if (window.location.href !== panicAction) {
                        window.location.href = panicAction;
                    }
                }, 100);
            } catch {
                window.location.href = panicAction;
            }
        };

        updatePanicKeyDisplay();
        panicKeyInput.readOnly = false;
        panicKeyInput.style.cursor = 'text';
        panicKeyInput.title = 'Type a single key or press a key to set';

        panicKeyInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const newKey = e.key === ' ' ? 'Space' : e.key;
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(newKey)) {
                alert('Please use a non-modifier key.');
                return;
            }
            panicKey = newKey;
            localStorage.setItem('panicKey', panicKey);
            updatePanicKeyDisplay();
            panicKeyInput.classList.remove('active');
            if (settingsOverlay) {
                settingsOverlay.classList.remove('panic-key-active');
            }
        });

        panicKeyInput.addEventListener('focus', () => {
            panicKeyInput.classList.add('active');
            if (settingsOverlay) {
                settingsOverlay.classList.add('panic-key-active');
            }
        });

        panicKeyInput.addEventListener('blur', () => {
            panicKeyInput.classList.remove('active');
            if (settingsOverlay) {
                settingsOverlay.classList.remove('panic-key-active');
            }
            updatePanicKeyDisplay();
        });

        panicKeyInput.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            panicKey = 'Escape';
            localStorage.setItem('panicKey', panicKey);
            updatePanicKeyDisplay();
        });

        document.addEventListener('keydown', (e) => {
            const keyPressed = e.key === ' ' ? 'Space' : e.key;
            if (keyPressed !== panicKey) return;
            const activeElement = document.activeElement;
            const isTyping = ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) ||
                             activeElement.isContentEditable ||
                             (activeElement.tagName === 'DIV' && activeElement.getAttribute('role') === 'searchbox');
            if (isTyping) return;
            e.preventDefault();
            e.stopPropagation();
            triggerPanicAction();
        }, { capture: true, passive: false });

        window.addEventListener('storage', (e) => {
            if (e.key === 'panicKey') {
                panicKey = e.newValue || 'Escape';
                updatePanicKeyDisplay();
            }
            if (e.key === 'panicAction') {
                panicAction = e.newValue || 'https://edpuzzle.com/notifications';
            }
        });
    };

    const cloaks = [
        { name: "Default", icon: "https://edpuzzle.imgix.net/favicons/favicon-32.png", title: "Edpuzzle" },
        { name: "Wikipedia", icon: "https://en.wikipedia.org/favicon.ico", title: "World War II - Wikipedia" },
        { name: "Google", icon: "https://www.google.com/chrome/static/images/chrome-logo-m100.svg", title: "New Tab" },
        { name: "Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png", title: "Home" },
        { name: "Canva", icon: "https://static.canva.com/static/images/android-192x192-2.png", title: "Home - Canva" },
        { name: "Quiz", icon: "https://ssl.gstatic.com/docs/spreadsheets/forms/forms_icon_2023q4.ico", title: "You've already responded" },
        { name: "Powerschool", icon: "https://waverlyk12.powerschool.com/favicon.ico", title: "Grades and Attendance" },
    ];

    const applyCloak = (cloakName) => {
        const cloak = cloaks.find(c => c.name === cloakName) || cloaks[0];
        document.title = cloak.title;

        const existingFavicon = document.querySelector("link[rel*='icon']");
        if (existingFavicon) existingFavicon.remove();

        if (cloak.icon) {
            const link = document.createElement('link');
            link.rel = 'icon';
            const ext = cloak.icon.split('.').pop().toLowerCase();
            link.type = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/x-icon';
            link.href = cloak.icon + (cloak.icon.includes('?') ? '&' : '?') + 'v=' + Date.now();
            document.head.appendChild(link);
            localStorage.setItem('cloak', JSON.stringify({ title: cloak.title, icon: cloak.icon }));
        }
    };

    const createEffectsContainer = () => {
        const container = document.createElement('div');
        container.className = 'effects-container';
        document.body.appendChild(container);
    };

    window.openURLInAboutBlank = (url) => {
        try {
            const newWindow = window.open(url, '_blank');
            if (!newWindow) {
                throw new Error('Failed to open new window');
            }
        } catch (error) {
            console.error('Error opening URL:', error);
            const errorMessage = document.createElement('div');
            errorMessage.textContent = 'Failed to open unblocked player. Ensure pop-ups are allowed.';
            errorMessage.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 10px; background: #f44336; color: white; border-radius: 4px;';
            document.body.appendChild(errorMessage);
            setTimeout(() => errorMessage.remove(), 5000);
        }
    };

    const initializeCloak = () => {
        const savedCloak = localStorage.getItem('selectedCloak') || 'default';
        applyCloak(savedCloak);

        window.addEventListener('storage', (e) => {
            if (e.key === 'selectedCloak') applyCloak(e.newValue || 'default');
        });
        window.addEventListener('load', () => applyCloak(localStorage.getItem('selectedCloak') || 'default'));
        window.addEventListener('pageshow', () => applyCloak(localStorage.getItem('selectedCloak') || 'default'));

        const cloakSelect = document.querySelector('[data-cloak-select]');
        if (cloakSelect) {
            cloakSelect.addEventListener('change', () => {
                const selectedCloak = cloakSelect.value;
                localStorage.setItem('selectedCloak', selectedCloak);
                applyCloak(selectedCloak);
            });
            cloakSelect.value = savedCloak;
        }
    };

    loadResources();
    initializeAntiClose();
    initializePanicKey();
    createEffectsContainer();
    initializeCloak();
});