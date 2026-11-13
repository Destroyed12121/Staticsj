// Calculate the dynamic base path for the Service Worker.
const swPath = self.location.pathname;
const basePath = swPath.substring(0, swPath.lastIndexOf("/") + 1);

self.basePath = self.basePath || basePath;

// Load the Scramjet controller service worker runtime.
importScripts(`${basePath}JS/controller.sw.js`);

self.addEventListener("fetch", (event) => {
	if ($scramjetController.shouldRoute(event)) {
		event.respondWith($scramjetController.route(event));
	}
});
