// Strictly online — no caching. This SW exists solely to satisfy
// the PWA installability requirement (browsers need a registered SW).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// No fetch handler: every request goes straight to the network.
