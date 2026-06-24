/* Logbook service worker — makes the app work offline and installable.
   Strategy: serve from cache first for instant loads, refresh the cache in
   the background, and fall back to the cache when the network is unavailable.
   The app is fully self-contained (one HTML file, no external assets), so
   caching each visited page is all that's needed for true offline use. */

var CACHE = "logbook-v1";

self.addEventListener("install", function (e) {
  // Activate this worker as soon as it's installed.
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      // Drop any old caches from previous versions.
      return Promise.all(
        names.map(function (n) {
          if (n !== CACHE) return caches.delete(n);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  // Only handle same-origin GET requests; let everything else pass through.
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req)
          .then(function (resp) {
            if (resp && resp.status === 200) cache.put(req, resp.clone());
            return resp;
          })
          .catch(function () {
            // Offline and not cached: for navigations, fall back to the
            // cached app page if we have one.
            if (req.mode === "navigate") return cache.match("./") || cached;
            return cached;
          });
        // Cache-first: instant load, with a background refresh.
        return cached || network;
      });
    })
  );
});
