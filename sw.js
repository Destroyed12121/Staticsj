// Calculate the dynamic base path for the Service Worker.
const swPath = self.location.pathname;
const basePath = swPath.substring(0, swPath.lastIndexOf('/') + 1);

// Fallback for basePath to ensure it's always defined
self.basePath = self.basePath || basePath;

self.$scramjet = {
    files: {
        wasm: `${basePath}JS/scramjet.wasm.wasm`,
        sync: `${basePath}JS/scramjet.sync.js`,
    }
};

// Load ALL required scripts at the top level.
importScripts(`${basePath}JS/scramjet.all.js`);
importScripts(`${basePath}B/index.js`);

const { ScramjetServiceWorker } = $scramjetLoadWorker();

const scramjet = new ScramjetServiceWorker({
    prefix: basePath + 'JS/scramjet/',
});

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});


self.addEventListener("fetch", (event) => {
    event.respondWith((async () => {
        // Wait for the scramjet config to be loaded before routing.
        // This can prevent race conditions on initial load.
        await scramjet.loadConfig();
        if (scramjet.route(event)) {
            return scramjet.fetch(event);
        }
        return fetch(event.request);
    })());
});

let wispConfig = {};

// Prevent Race Condition: Create a promise that resolves when the config message is received.
let resolveConfigReady;
const configReadyPromise = new Promise(resolve => {
    resolveConfigReady = resolve;
});

self.addEventListener("message", ({ data }) => {
	if (data.type === "config" && data.wispurl) {
		wispConfig.wispurl = data.wispurl;
        if (resolveConfigReady) {
            resolveConfigReady();
            resolveConfigReady = null; // Ensure it only resolves once
        }
	}
});

// The main Scramjet listener where the proxying logic happens.
scramjet.addEventListener("request", async (e) => {
	e.response = (async () => {
		// Use a single, persistent client instance on the scramjet object.
		if (!scramjet.client) {
            // Wait for the WISP URL to be sent from the main page.
            await configReadyPromise;

            if (!wispConfig.wispurl) {
                 console.error("WISP URL is missing. Cannot configure BareMux.");
                 return new Response("WISP URL configuration failed in SW.", { status: 500, statusText: "Internal Server Error" });
            }

            const connection = new BareMux.BareMuxConnection(`${basePath}B/worker.js`);
			await connection.setTransport(`${basePath}Ep/index.mjs`, [{ wisp: wispConfig.wispurl }]);
			scramjet.client = connection;
		}

		// Simplified fetch logic without the inspector parts for clarity
		return await scramjet.client.fetch(e.url, {
            method: e.method,
            body: e.body,
            headers: e.requestHeaders,
            credentials: "omit",
            mode: e.mode === "cors" ? e.mode : "same-origin",
            cache: e.cache,
            redirect: "manual",
            duplex: "half",
        });
	})();
});
