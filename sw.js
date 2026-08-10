// sw.js - Robust Service Worker with Network-First Strategy & Resilient PWA Pre-caching
const CACHE_NAME = "gps-app-v25";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./css/components/date-picker.css",
  "./css/pages/add-sales.css",
  "./css/pages/profile.css",
  "./css/pages/view-sales.css",
  "./css/pages/view-inventory.css",
  "./config.js",
  "./js/auth.js",
  "./js/data-store.js",
  "./js/notifications.js",
  "./js/components/date-picker.js",
  "./js/app.js",
  "./js/pages/add-sales.js",
  "./js/pages/profile.js",
  "./js/pages/view-sales.js",
  "./js/pages/view-inventory.js",
  "./manifest.json",
  "./assets/logo/logo_short_blue_black_onwhite.svg"
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

// Activate: Immediately purge old caches (v1) and claim clients
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
