const CACHE_NAME = "gps-app-v77";
const DB_NAME = "gps_app_db_v1";

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
  "./js/developer.js",
  "./js/auth.js",
  "./js/data-store.js",
  "./js/notifications.js",
  "./js/notification.js",
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
  "./manifest.json?v=52",
  "./assets/logo/gps_logo_2000x2000_white_over_black.svg",
  "./assets/logo/gps_logo_2000x2000_white_over_black.svg?v=52",
  "./assets/logo/gps_logo_2000x2000_color_over_white.svg",
  "./assets/logo/gps_logo_2000x2000_color_over_white.svg?v=52",
  "./assets/logo/icon-192.png",
  "./assets/logo/icon-192.png?v=52",
  "./assets/logo/icon-512.png",
  "./assets/logo/icon-512.png?v=52"
];

// Helper: Open IndexedDB inside Service Worker context
function openSWDatabase() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

// Flush Pending Outbox Mutations from IndexedDB directly from Service Worker
async function flushIndexedDBOutboxInSW() {
  const db = await openSWDatabase();
  if (!db || !db.objectStoreNames.contains("mutations_outbox")) return;

  const pendingItems = await new Promise((resolve) => {
    try {
      const tx = db.transaction("mutations_outbox", "readonly");
      const store = tx.objectStore("mutations_outbox");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });

  if (!pendingItems.length) return;

  // Attempt to read config.js from cache to extract target Web App URL
  let targetUrl = "";
  try {
    const configResp = await caches.match("./config.js");
    if (configResp) {
      const configText = await configResp.text();
      const match = configText.match(/googleSheetWebAppUrl:\s*["']([^"']+)["']/);
      if (match) targetUrl = match[1];
    }
  } catch (e) {}

  for (const item of pendingItems) {
    const url = item.targetUrl || targetUrl;
    if (!url || !url.startsWith("http")) continue;

    try {
      const bodyPayload = {
        action: item.action,
        branch: item.branch,
        apiKey: item.apiKey || "",
        sessionId: item.sessionId || "",
        ...(item.payload || {})
      };

      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(bodyPayload)
      });

      // Remove successfully pushed item from IndexedDB outbox & notify active clients
      await new Promise((resolve) => {
        try {
          const tx = db.transaction("mutations_outbox", "readwrite");
          tx.objectStore("mutations_outbox").delete(item.id);
          tx.oncomplete = () => {
            self.clients.matchAll().then((clientList) => {
              clientList.forEach((c) => c.postMessage({ action: "outboxItemFlushed", itemId: item.id }));
            });
            resolve();
          };
          tx.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    } catch (err) {
      // If network fails again, keep in IndexedDB for the next sync attempt
      break;
    }
  }
}

// Install: Pre-cache essential assets safely
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
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .then(() => flushIndexedDBOutboxInSW())
  );
});

// Service Worker Background Sync API (Fires when device connects to internet even if app is closed)
self.addEventListener("sync", (event) => {
  if (event.tag === "gps-outbox-sync") {
    event.waitUntil(flushIndexedDBOutboxInSW());
  }
});

// Message Listener: Handles background timer scheduling from client tabs
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.action === "scheduleDelayedNotification") {
    const delayMs = Number(event.data.delayMs) || 30000;
    const title = event.data.title || "⏱️ Background Push Test";
    const body = event.data.body || "Background push notification received after app was closed!";
    const targetUrl = event.data.url || "./index.html?view=view-sales";

    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: "./assets/logo/icon-192.png",
        badge: "./assets/logo/icon-192.png",
        vibrate: [200, 100, 200],
        tag: "gps-delayed-30s-notif",
        data: { url: targetUrl }
      });
    }, delayMs);
  }
});

// Online Event Listener (Attempts SW outbox flush when network returns)
self.addEventListener("online", () => {
  flushIndexedDBOutboxInSW();
});

// Periodic Background Sync API (Fires periodically to refresh cached assets in background)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "gps-catalog-refresh") {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.add("./config.js").catch(() => {});
      })
    );
  }
});

// Notification Click Handler (Deep-links to specified view e.g. ?view=view-sales)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./index.html?view=view-sales";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes("index.html")) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
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
