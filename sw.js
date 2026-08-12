// sw.js - Robust Service Worker with Network-First Strategy & Resilient PWA Pre-caching
const CACHE_NAME = "gps-app-v35";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./css/base.css",
  "./css/components/date-picker.css",
  "./css/components/filter-pills.css",
  "./css/components/search-box.css",
  "./css/components/sync-button.css",
  "./css/components/compact-tile.css",
  "./css/components/detail-view.css",
  "./css/components/stat-card.css",
  "./css/pages/add-sales.css",
  "./css/pages/add-stock.css",
  "./css/pages/amend-stock.css",
  "./css/pages/profile.css",
  "./css/pages/view-sales.css",
  "./css/pages/view-inventory.css",
  "./config.js",
  "./js/auth.js",
  "./js/data-store.js",
  "./js/notifications.js",
  "./js/components/date-picker.js",
  "./js/components/filter-pills.js",
  "./js/components/search-box.js",
  "./js/components/sync-button.js",
  "./js/components/compact-tile.js",
  "./js/components/detail-view.js",
  "./js/components/stat-card.js",
  "./js/components/item-suggestions.js",
  "./js/app.js",
  "./js/pages/add-sales.js",
  "./js/pages/add-stock.js",
  "./js/pages/amend-stock.js",
  "./js/pages/profile.js",
  "./js/pages/view-sales.js",
  "./js/pages/view-inventory.js",
  "./manifest.json",
  "./manifest.json?v=32",
  "./assets/logo/logo_short_blue_black_onwhite.svg",
  "./assets/logo/logo_short_blue_black_onwhite.svg?v=30",
  "./assets/logo/gps_logo_2000x2000_white_over_black.svg",
  "./assets/logo/gps_logo_2000x2000_white_over_black.svg?v=32",
  "./assets/logo/icon-192.png",
  "./assets/logo/icon-192.png?v=32",
  "./assets/logo/icon-512.png",
  "./assets/logo/icon-512.png?v=32"
];

// Install: Pre-cache essential assets safely (Promise.allSettled guarantees PWA installability even if 1 asset fails)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          ASSETS_TO_CACHE.map((url) =>
            cache.add(url).catch((err) => console.warn("PWA pre-cache notice for:", url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Immediately purge old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("ServiceWorker purging old cache:", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network-First for local HTML/JS/CSS (Always get live updates first, fallback to cache if offline)
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and external API calls (e.g. Google Apps Script POST)
  if (event.request.method !== "GET" || event.request.url.includes("script.google.com")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to offline cache
        return caches.match(event.request);
      })
  );
});
