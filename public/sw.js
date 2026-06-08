// Strictly online — no caching.
// Chrome requires a fetch handler for desktop PWA installability,
// but we simply pass every request straight through to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => e.respondWith(fetch(e.request)));
