// js/data-store.js - High Performance Branch-Scoped Data Store for Sales & Inventory
// Hybrid Storage Model: Synchronous In-Memory RAM Cache + IndexedDB Durable Storage + Offline Outbox Background Sync

window.DataStore = (function () {
  const DB_NAME = "gps_app_db_v1";
  const DB_VERSION = 1;
  const PENDING_MUTATIONS_KEY = "gps_pending_mutations_v1";

  // In-Memory RAM Cache for sub-millisecond lookups & instantaneous UI queries
  const memoryCache = {
    inventory: {},
    sales: {},
    amend_logs: {}
  };

  let dbInstance = null;
  let dbInitPromise = null;

  // --------------------------------------------------------------------------
  // IndexedDB Core Engine
  // --------------------------------------------------------------------------
  function openDatabase() {
    if (dbInstance) return Promise.resolve(dbInstance);
    if (dbInitPromise) return dbInitPromise;
    if (typeof indexedDB === "undefined") {
      return Promise.resolve(null);
    }

    dbInitPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("inventory")) {
            db.createObjectStore("inventory", { keyPath: "storeKey" });
          }
          if (!db.objectStoreNames.contains("sales")) {
            db.createObjectStore("sales", { keyPath: "storeKey" });
          }
          if (!db.objectStoreNames.contains("audit_logs")) {
            db.createObjectStore("audit_logs", { keyPath: "storeKey" });
          }
          if (!db.objectStoreNames.contains("mutations_outbox")) {
            const outbox = db.createObjectStore("mutations_outbox", { keyPath: "id" });
            outbox.createIndex("branch", "branch", { unique: false });
            outbox.createIndex("queuedAt", "queuedAt", { unique: false });
          }
        };
        req.onsuccess = (e) => {
          dbInstance = e.target.result;
          resolve(dbInstance);
        };
        req.onerror = (e) => {
          if (window.DevLogger) window.DevLogger.warn("DataStore", "IndexedDB open notice:", e ? e.target : "Error");
          resolve(null);
        };
      } catch (err) {
        if (window.DevLogger) window.DevLogger.warn("DataStore", "IndexedDB initialization caught:", err);
        resolve(null);
      }
    });

    return dbInitPromise;
  }

  function getActiveBranch() {
    return window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
  }

  function getStorageKey(type, branch) {
    const b = branch || getActiveBranch();
    return `gps_${b}_${type}_v1`;
  }

  // Asynchronously persist branch dataset to IndexedDB
  function persistToIndexedDB(type, branch, data) {
    const b = branch || getActiveBranch();
    return openDatabase().then((db) => {
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const storeName = type === "amend_logs" ? "audit_logs" : type;
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          store.put({ storeKey: b, branch: b, data: data, updatedAt: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    });
  }

  // Load from LocalStorage fallback
  function loadFromLocalStorage(type, branch) {
    const b = branch || getActiveBranch();
    const key = getStorageKey(type, b);
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function loadBranchInventory(branch) {
    const b = branch || getActiveBranch();
    if (memoryCache.inventory[b]) return memoryCache.inventory[b];
    memoryCache.inventory[b] = loadFromLocalStorage("inventory", b);
    return memoryCache.inventory[b];
  }

  function loadBranchSales(branch) {
    const b = branch || getActiveBranch();
    if (memoryCache.sales[b]) return memoryCache.sales[b];
    memoryCache.sales[b] = loadFromLocalStorage("sales", b);
    return memoryCache.sales[b];
  }

  function loadBranchAuditLogs(branch) {
    const b = branch || getActiveBranch();
    if (memoryCache.amend_logs[b]) return memoryCache.amend_logs[b];
    memoryCache.amend_logs[b] = loadFromLocalStorage("amend_logs", b);
    return memoryCache.amend_logs[b];
  }

  function saveBranchData(type, data, branch) {
    const b = branch || getActiveBranch();
    if (type === "inventory") memoryCache.inventory[b] = data;
    if (type === "sales") memoryCache.sales[b] = data;
    if (type === "amend_logs") memoryCache.amend_logs[b] = data;

    // 1. Synchronous fallback save (with QuotaExceeded pruning safety)
    const key = getStorageKey(type, b);
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      if (window.DevLogger) window.DevLogger.warn("DataStore", `Quota exceeded writing localStorage: ${key}. Pruning key to rely on IndexedDB.`, e);
      try { localStorage.removeItem(key); } catch (err) {}
    }

    // 2. Asynchronous durable save to IndexedDB
    persistToIndexedDB(type, b, data);
  }

  // Auto-migration from legacy LocalStorage to IndexedDB
  function autoMigrateLegacyStorage() {
    return openDatabase().then((db) => {
      if (!db) return false;
      const branches = ["alkhoud", "ghala"];
      branches.forEach((b) => {
        ["inventory", "sales", "amend_logs"].forEach((type) => {
          const legacyKey = getStorageKey(type, b);
          try {
            const stored = localStorage.getItem(legacyKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                persistToIndexedDB(type, b, parsed);
              }
            }
          } catch (e) {}
        });
      });
      return true;
    });
  }

  // Load from IndexedDB into RAM cache on boot
  function preloadFromIndexedDB() {
    return openDatabase().then((db) => {
      if (!db) return false;
      const branches = ["alkhoud", "ghala"];
      const promises = [];

      branches.forEach((b) => {
        ["inventory", "sales", "audit_logs"].forEach((storeName) => {
          const p = new Promise((resolve) => {
            try {
              const tx = db.transaction(storeName, "readonly");
              const store = tx.objectStore(storeName);
              const req = store.get(b);
              req.onsuccess = () => {
                if (req.result && Array.isArray(req.result.data)) {
                  const cacheKey = storeName === "audit_logs" ? "amend_logs" : storeName;
                  if (!memoryCache[cacheKey][b] || memoryCache[cacheKey][b].length === 0) {
                    memoryCache[cacheKey][b] = req.result.data;
                  }
                }
                resolve();
              };
              req.onerror = () => resolve();
            } catch (e) {
              resolve();
            }
          });
          promises.push(p);
        });
      });

      return Promise.all(promises).then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
        }
      });
    });
  }

  // Initialize DB & Preload
  if (typeof window !== "undefined") {
    openDatabase().then(() => {
      autoMigrateLegacyStorage().then(() => {
        preloadFromIndexedDB();
      });
    });
  }

  function getAuthPayload() {
    if (window.Auth && typeof window.Auth.getAuthPayload === "function") {
      return window.Auth.getAuthPayload();
    }
    const apiKey = window.APP_CONFIG && window.APP_CONFIG.apiKey ? window.APP_CONFIG.apiKey : "";
    let sessionId = "";
    try {
      const stored = localStorage.getItem("gps_session_token_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.sessionId) sessionId = parsed.sessionId;
      }
    } catch (e) {}
    return { apiKey: apiKey, sessionId: sessionId };
  }

  function getLastSyncedTime(branch) {
    const b = branch || getActiveBranch();
    try {
      return localStorage.getItem(getStorageKey("lastSynced", b)) || null;
    } catch (e) {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Offline Mutation Queue (IndexedDB Outbox + LocalStorage Backup + Background Sync)
  // --------------------------------------------------------------------------
  function triggerBackgroundSync() {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg && reg.sync && typeof reg.sync.register === "function") {
            reg.sync.register("gps-outbox-sync").catch((err) => {
              if (window.DevLogger) window.DevLogger.info("DataStore", "SyncManager register notice", err);
            });
          }
          if (reg && "periodicSync" in reg && typeof reg.periodicSync.register === "function") {
            reg.periodicSync.register("gps-catalog-refresh", { minInterval: 24 * 60 * 60 * 1000 }).catch((err) => {
              if (window.DevLogger) window.DevLogger.info("DataStore", "PeriodicSync register notice", err);
            });
          }
        })
        .catch((err) => {
          if (window.DevLogger) window.DevLogger.info("DataStore", "Background sync registration notice", err);
        });
    }
  }

  function getPendingMutations() {
    try {
      const stored = localStorage.getItem(PENDING_MUTATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function savePendingMutations(queue) {
    try {
      localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(queue));
    } catch (e) {}

    // Also persist queue into IndexedDB mutations_outbox atomically
    openDatabase().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction("mutations_outbox", "readwrite");
        const store = tx.objectStore("mutations_outbox");
        store.clear();
        queue.forEach((item) => store.put(item));
      } catch (e) {
        if (window.DevLogger) window.DevLogger.warn("DataStore", "Outbox save error in IndexedDB:", e);
      }
    });
  }

  function enqueueMutation(action, branch, payload, explicitTargetUrl) {
    const queue = getPendingMutations();
    const auth = getAuthPayload();
    const targetUrl = explicitTargetUrl || (typeof window !== "undefined" && window.APP_CONFIG && window.APP_CONFIG.googleSheetWebAppUrl ? window.APP_CONFIG.googleSheetWebAppUrl : "");

    const item = {
      id: "mut_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
      action: action,
      branch: branch,
      apiKey: auth ? (auth.apiKey || "") : "",
      sessionId: auth ? (auth.sessionId || "") : "",
      targetUrl: targetUrl,
      payload: payload,
      queuedAt: new Date().toISOString()
    };
    queue.push(item);
    savePendingMutations(queue);

    // Register Background Sync with Service Worker
    triggerBackgroundSync();

    if (window.DevLogger) {
      window.DevLogger.info("DataStore", `Enqueued offline mutation [${action}] for branch ${branch}. Total pending: ${queue.length}`);
    }
  }

  let isFlushingMutations = false;
  function flushPendingMutations(webAppUrl) {
    if (isFlushingMutations) return Promise.resolve();
    const queue = getPendingMutations();
    if (!queue.length) return Promise.resolve();

    const targetUrl = webAppUrl || (window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "");
    if (!targetUrl || !targetUrl.startsWith("http") || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return Promise.resolve();
    }

    isFlushingMutations = true;
    const auth = getAuthPayload();

    const processQueue = async () => {
      const remainingQueue = [...queue];
      while (remainingQueue.length > 0) {
        const item = remainingQueue[0];
        try {
          const bodyPayload = {
            action: item.action,
            branch: item.branch,
            ...auth,
            ...(item.payload || {})
          };
          await fetch(targetUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(bodyPayload)
          });
          remainingQueue.shift();
          savePendingMutations(remainingQueue);

          // Clean from IndexedDB
          openDatabase().then((db) => {
            if (!db) return;
            try {
              const tx = db.transaction("mutations_outbox", "readwrite");
              tx.objectStore("mutations_outbox").delete(item.id);
            } catch (e) {}
          });

          if (window.DevLogger) {
            window.DevLogger.log("DataStore", `Flushed queued mutation [${item.action}] for ${item.branch}. Remaining: ${remainingQueue.length}`);
          }
        } catch (err) {
          if (window.DevLogger) window.DevLogger.warn("DataStore", `Failed to flush mutation [${item.action}], will retry later`, { item, error: err });
          break;
        }
      }

      const flushedTotal = queue.length - remainingQueue.length;
      if (flushedTotal > 0 && window.NotificationManager && typeof window.NotificationManager.notifyOfflineSync === "function") {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        window.NotificationManager.notifyOfflineSync(flushedTotal, timeNow);
      }
      isFlushingMutations = false;
    };

    return processQueue();
  }

  function sendMutation(action, branch, payload, webAppUrl) {
    const targetUrl = webAppUrl || (window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "");
    if (!targetUrl || !targetUrl.startsWith("http") || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      enqueueMutation(action, branch, payload, targetUrl);
      return Promise.resolve({ queued: true });
    }

    const auth = getAuthPayload();
    const bodyPayload = {
      action: action,
      branch: branch,
      ...auth,
      ...(payload || {})
    };

    return fetch(targetUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(bodyPayload)
    })
      .then(() => {
        if (window.DevLogger) {
          window.DevLogger.log("DataStore", `Direct mutation [${action}] sent successfully for ${branch}`);
        }
        return flushPendingMutations(targetUrl);
      })
      .catch((err) => {
        if (window.DevLogger) window.DevLogger.warn("DataStore", `Direct mutation [${action}] failed, enqueuing for background retry`, err);
        enqueueMutation(action, branch, payload, targetUrl);
      });
  }

  // --------------------------------------------------------------------------
  // Cloud Synchronization Engine
  // --------------------------------------------------------------------------
  const inFlightSyncs = {};
  function syncFromCloud(webAppUrl, retryCount, targetBranch) {
    if (!webAppUrl || !webAppUrl.startsWith("http")) return Promise.resolve({ success: false, reason: "Invalid URL" });

    const branch = targetBranch || getActiveBranch();
    if (inFlightSyncs[branch]) {
      return inFlightSyncs[branch];
    }

    // Flush any pending mutations in the background without blocking the sync fetch
    flushPendingMutations(webAppUrl);

    const retriesSoFar = typeof retryCount === "number" ? retryCount : (retryCount ? 1 : 0);
    const cacheBuster = `_t=${Date.now()}`;
    
    const lastSynced = getLastSyncedTime(branch);
    const sinceParam = lastSynced ? `&since=${encodeURIComponent(lastSynced)}` : "";
    const auth = getAuthPayload();
    const authParams = `&apiKey=${encodeURIComponent(auth.apiKey)}` + (auth.sessionId ? `&sessionId=${encodeURIComponent(auth.sessionId)}` : "");

    const syncUrl = webAppUrl.includes("?")
      ? `${webAppUrl}&branch=${encodeURIComponent(branch)}${sinceParam}${authParams}&${cacheBuster}`
      : `${webAppUrl}?branch=${encodeURIComponent(branch)}${sinceParam}${authParams}&${cacheBuster}`;

    // Generous serverless window for Google Apps Script cold starts (20s initial, 12s retry)
    const timeoutMs = retriesSoFar === 0 ? 20000 : 12000;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const syncPromise = fetch(syncUrl, { cache: "no-store", signal: controller ? controller.signal : undefined })
      .then((res) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        delete inFlightSyncs[branch];
        if (data && data.status === "success") {
          if (Array.isArray(data.inventory)) {
            if (data.inventory.length > 0) {
              saveBranchData("inventory", data.inventory, branch);
            } else {
              const existing = loadBranchInventory(branch);
              if (!existing || existing.length === 0) {
                saveBranchData("inventory", data.inventory, branch);
              }
            }
          }
          if (Array.isArray(data.sales)) {
            const localSales = loadBranchSales(branch);
            const sixtySecsAgo = Date.now() - 60 * 1000;

            const processedCloudSales = data.sales.map((cs) => {
              const rStatus = String(cs.refundStatus || "").trim().toUpperCase();
              const isRef = rStatus === "REFUNDED" || rStatus === "YES" || cs.paymentStatus === "refunded";
              return {
                ...cs,
                refundStatus: isRef ? "REFUNDED" : "NO",
                paymentStatus: isRef ? "refunded" : (cs.paymentStatus || "paid"),
                isRefunded: isRef
              };
            });

            processedCloudSales.forEach((cs) => {
              const matchingLocal = localSales.find((ls) => {
                if (cs.id && ls.id && String(cs.id) === String(ls.id)) return true;
                if (cs.saleId && ls.saleId && String(cs.saleId) === String(ls.saleId)) return true;
                const csName = String(cs.customerName || "").trim().toLowerCase();
                const lsName = String(ls.customerName || "").trim().toLowerCase();
                const csTotal = Number(cs.grandTotal) || 0;
                const lsTotal = Number(ls.grandTotal) || 0;
                const csDate = String(cs.date || "").trim();
                const lsDate = String(ls.date || "").trim();
                return csName === lsName && Math.abs(csTotal - lsTotal) < 0.001 && (!csDate || !lsDate || csDate === lsDate);
              });

              if (matchingLocal) {
                const refundedAtMs = matchingLocal.refundedAt ? new Date(matchingLocal.refundedAt).getTime() : 0;
                if ((matchingLocal.isRefunded || matchingLocal.refundStatus === "REFUNDED") && refundedAtMs > sixtySecsAgo && !cs.isRefunded) {
                  cs.isRefunded = true;
                  cs.refundStatus = "REFUNDED";
                  cs.paymentStatus = "refunded";
                }
              }
            });

            const unmatchedLocalSales = localSales.filter((ls) => {
              const existsInCloud = processedCloudSales.some((cs) => {
                if (cs.id && ls.id && String(cs.id) === String(ls.id)) return true;
                if (cs.saleId && ls.saleId && String(cs.saleId) === String(ls.saleId)) return true;
                const csName = String(cs.customerName || "").trim().toLowerCase();
                const lsName = String(ls.customerName || "").trim().toLowerCase();
                const csTotal = Number(cs.grandTotal) || 0;
                const lsTotal = Number(ls.grandTotal) || 0;
                const csDate = String(cs.date || "").trim();
                const lsDate = String(ls.date || "").trim();
                return csName === lsName && Math.abs(csTotal - lsTotal) < 0.001 && (!csDate || !lsDate || csDate === lsDate);
              });
              return !existsInCloud;
            });

            const mergedSales = [...unmatchedLocalSales, ...processedCloudSales];
            saveBranchData("sales", mergedSales, branch);
          }
          const syncTime = new Date().toISOString();
          try {
            localStorage.setItem(getStorageKey("lastSynced", branch), syncTime);
          } catch (e) {}

          window.dispatchEvent(new CustomEvent("inventoryDataChanged", { detail: { branch, syncTime } }));
          if (window.DevLogger) {
            window.DevLogger.success("DataStore", `Successfully synced real ${branch} Google Sheet data at ${syncTime}!`, { branch, syncTime });
          }
          return { success: true, branch, syncTime, data };
        } else {
          throw new Error(data ? data.message : "Invalid response");
        }
      })
      .catch((err) => {
        delete inFlightSyncs[branch];
        if (timeoutId) clearTimeout(timeoutId);
        if (retriesSoFar < 2) {
          if (window.DevLogger) {
            window.DevLogger.warn("DataStore", `Cloud sync notice (${branch}, attempt ${retriesSoFar + 1} failed: ${err.message}), retrying on warm container in 1.5s...`, { branch, attempt: retriesSoFar + 1, error: err.message }, 3);
          }
          return new Promise((resolve) => setTimeout(resolve, 1500)).then(() =>
            syncFromCloud(webAppUrl, retriesSoFar + 1, branch)
          );
        }
        if (window.DevLogger) {
          window.DevLogger.warn("DataStore", `PWA Background sync notice for ${branch} (using local storage data): ${err.message || err}`, { branch, error: err.message || err }, 2);
        }
        return { success: false, error: err };
      });

    inFlightSyncs[branch] = syncPromise;
    return syncPromise;
  }

  // Auto-flush queue when connection is restored
  if (typeof window !== "undefined") {
    window.addEventListener("online", function () {
      const url = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
      if (url) {
        syncFromCloud(url);
      }
    });

    window.addEventListener("branchChanged", function () {
      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
    });
  }

  return {
    // Database Initialization & Preload
    openDatabase: openDatabase,
    preloadFromIndexedDB: preloadFromIndexedDB,
    autoMigrateLegacyStorage: autoMigrateLegacyStorage,

    // Getters for Active Branch
    getInventory: function (branch) {
      return [...loadBranchInventory(branch)];
    },

    getSales: function (branch) {
      return [...loadBranchSales(branch)];
    },

    getAuditLogs: function (branch) {
      return [...loadBranchAuditLogs(branch)];
    },

    findItemByName: function (nameQuery, branch) {
      if (!nameQuery || typeof nameQuery !== "string") return null;
      const q = nameQuery.trim().toLowerCase();
      if (!q) return null;
      const inv = loadBranchInventory(branch);

      const exact = inv.find((item) => (item.name || "").trim().toLowerCase() === q);
      if (exact) return exact;

      const tokens = q.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return null;

      const tokenMatches = inv.filter((item) => {
        const name = (item.name || "").toLowerCase();
        return tokens.every((t) => name.includes(t));
      });

      return tokenMatches.length === 1 ? tokenMatches[0] : null;
    },

    searchItems: function (query, branch) {
      if (!query || typeof query !== "string") return [];
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) return [];

      const tokens = trimmed.split(/\s+/).filter(Boolean);
      const inv = loadBranchInventory(branch);

      const matches = inv.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const sku = (item.sku || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        const combined = `${name} ${category} ${sku}`;

        return tokens.every((token) => combined.includes(token));
      });

      return matches.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();

        const exactA = nameA === trimmed ? 1 : 0;
        const exactB = nameB === trimmed ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;

        const startsA = nameA.startsWith(trimmed) ? 1 : 0;
        const startsB = nameB.startsWith(trimmed) ? 1 : 0;
        if (startsA !== startsB) return startsB - startsA;

        const nameMatchA = tokens.every((t) => nameA.includes(t)) ? 1 : 0;
        const nameMatchB = tokens.every((t) => nameB.includes(t)) ? 1 : 0;
        if (nameMatchA !== nameMatchB) return nameMatchB - nameMatchA;

        return 0;
      });
    },

    // Save New Sale for Active Branch
    recordSale: function (saleData, webAppUrl) {
      const branch = getActiveBranch();
      const sales = loadBranchSales(branch);
      const inventory = loadBranchInventory(branch);

      // 1. Add Sale locally to branch history
      const newSale = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        date: saleData.date || new Date().toISOString().split("T")[0],
        customerName: saleData.customerName || "Walk-in Customer",
        customerPhone: saleData.customerPhone || saleData.customerNumber || "",
        customerNumber: saleData.customerNumber || saleData.customerPhone || "",
        customerAddress: saleData.customerAddress || "",
        vatBill: saleData.vatBill || "no",
        itemsDetail: saleData.itemsDetail || "",
        items: saleData.items || [],
        subtotal: Number(saleData.subtotal) || 0,
        vatAmount: Number(saleData.vatAmount) || 0,
        discountAmount: Number(saleData.discountAmount) || 0,
        grandTotal: Number(saleData.grandTotal) || 0,
        paymentStatus: saleData.paymentStatus || "paid",
        paymentMethod: saleData.paymentMethod || "cash",
        cashAmount: Number(saleData.cashAmount || 0),
        cardAmount: Number(saleData.cardAmount || 0),
        notes: saleData.notes || "",
        recordedBy: saleData.recordedBy || "Staff",
        refundStatus: "NO"
      };

      sales.unshift(newSale);
      saveBranchData("sales", sales, branch);

      // 2. Deduct Inventory Stock locally
      if (Array.isArray(saleData.items)) {
        saleData.items.forEach((soldItem) => {
          const name = (soldItem.name || "").trim().toLowerCase();
          const qtySold = Number(soldItem.qty) || 0;

          if (name && qtySold > 0) {
            const existingIndex = inventory.findIndex(
              (inv) => (inv.name || "").trim().toLowerCase() === name
            );
            if (existingIndex >= 0) {
              inventory[existingIndex].qty = Math.max(
                0,
                (Number(inventory[existingIndex].qty) || 0) - qtySold
              );
              inventory[existingIndex].lastUpdated = new Date().toLocaleTimeString();
            } else {
              inventory.push({
                sku: "SKU-" + Date.now().toString().slice(-5),
                name: soldItem.name.trim(),
                category: "General",
                qty: 0,
                alertLevel: 5,
                lastUpdated: new Date().toLocaleTimeString()
              });
            }
          }
        });
        saveBranchData("inventory", inventory, branch);
      }

      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

      // 3. Reliable Mutation Sync with Offline Queueing
      sendMutation("add_sale", branch, newSale, webAppUrl);

      return { success: true };
    },

    // Add Stock Quantity (increments existing stock or creates new item)
    addStockQuantity: function (payload, webAppUrl) {
      const branch = getActiveBranch();
      const inventory = loadBranchInventory(branch);
      const name = (payload.name || "").trim();
      const addQty = Number(payload.addQty) || 0;

      if (!name) return { success: false, message: "Item name required" };

      const index = inventory.findIndex(
        (inv) => (inv.name || "").trim().toLowerCase() === name.toLowerCase()
      );

      if (index >= 0) {
        inventory[index].qty = (Number(inventory[index].qty) || 0) + addQty;
        inventory[index].lastUpdated = new Date().toLocaleTimeString();
        if (payload.category) inventory[index].category = payload.category;
        if (payload.alertLevel) inventory[index].alertLevel = Number(payload.alertLevel);
        if (payload.remarks) inventory[index].lastRemark = payload.remarks;
      } else {
        inventory.push({
          sku: payload.sku || "SKU-" + Date.now().toString().slice(-5),
          name: name,
          category: payload.category || "General",
          qty: addQty,
          alertLevel: Number(payload.alertLevel) || 5,
          lastRemark: payload.remarks || "",
          lastUpdated: new Date().toLocaleTimeString()
        });
      }

      saveBranchData("inventory", inventory, branch);
      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

      sendMutation("add_stock_qty", branch, {
        name: name,
        sku: payload.sku || "",
        category: payload.category || "General",
        addQty: addQty,
        alertLevel: Number(payload.alertLevel) || 5,
        remarks: payload.remarks || "",
        addedBy: payload.addedBy || "Staff"
      }, webAppUrl);

      return { success: true };
    },

    // Amend Stock Item with NaN protection and Audit Trail recording
    amendStockItem: function (arg1, arg2, arg3, arg4) {
      let originalItem, updatedFields, diffs, webAppUrl;
      if (arg1 && typeof arg1 === "object" && arg1.originalItem) {
        originalItem = arg1.originalItem;
        updatedFields = arg1.updatedFields || {};
        diffs = arg1.diffs || [];
        webAppUrl = arg2;
      } else {
        originalItem = arg1 || {};
        updatedFields = arg2 || {};
        diffs = arg3 || [];
        webAppUrl = arg4;
      }

      const branch = getActiveBranch();
      const inventory = loadBranchInventory(branch);

      const targetIdentifier = originalItem.sku || originalItem.name;
      const index = inventory.findIndex((inv) => {
        if (originalItem.sku && inv.sku) return inv.sku === originalItem.sku;
        return (inv.name || "").trim().toLowerCase() === (originalItem.name || "").trim().toLowerCase();
      });

      if (index < 0) {
        return { success: false, message: "Original item not found for amendment" };
      }

      const currentItem = inventory[index];
      const getCurrentUserSafe = () => {
        if (!window.Auth) return null;
        if (typeof window.Auth.getUser === "function") return window.Auth.getUser();
        if (typeof window.Auth.getCurrentUser === "function") return window.Auth.getCurrentUser();
        return null;
      };

      const currentUser = getCurrentUserSafe();

      // Safe number assignment preventing NaN corruption
      const targetQty = updatedFields.qty !== undefined && !isNaN(Number(updatedFields.qty))
        ? Number(updatedFields.qty)
        : (Number(currentItem.qty) || 0);

      const targetAlert = updatedFields.alertLevel !== undefined && !isNaN(Number(updatedFields.alertLevel))
        ? Number(updatedFields.alertLevel)
        : (Number(currentItem.alertLevel) || 5);

      inventory[index] = {
        ...currentItem,
        name: updatedFields.name || currentItem.name,
        category: updatedFields.category || currentItem.category,
        qty: targetQty,
        alertLevel: targetAlert,
        lastRemark: updatedFields.lastRemark !== undefined ? updatedFields.lastRemark : (currentItem.lastRemark || currentItem.remark || ""),
        lastAmendedBy: currentUser ? currentUser.name : "Staff",
        lastAmendedRemark: updatedFields.amendReason || updatedFields.remarks || "",
        lastUpdated: new Date().toLocaleTimeString()
      };

      saveBranchData("inventory", inventory, branch);

      // Record Audit Trail locally
      const auditLogKey = getStorageKey("amend_logs", branch);
      let logs = loadBranchAuditLogs(branch);

      const auditRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user: currentUser ? currentUser.email : "Staff",
        userName: currentUser ? currentUser.name : "Staff",
        branch: branch,
        sku: currentItem.sku || "N/A",
        originalName: originalItem.name,
        amendedName: updatedFields.name || originalItem.name,
        originalQty: originalItem.qty,
        amendedQty: targetQty,
        qtyDelta: Number(targetQty) - Number(originalItem.qty || 0),
        diffs: diffs,
        remarks: updatedFields.remarks || updatedFields.amendReason || "",
        reason: updatedFields.amendReason || updatedFields.remarks || ""
      };

      logs.unshift(auditRecord);
      saveBranchData("amend_logs", logs, branch);

      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

      sendMutation("amend_stock", branch, { auditRecord: auditRecord }, webAppUrl);

      return { success: true, auditRecord: auditRecord };
    },

    // Add or Update Stock Item for Active Branch
    updateStockItem: function (itemData, webAppUrl) {
      const branch = getActiveBranch();
      const inventory = loadBranchInventory(branch);
      const name = (itemData.name || "").trim();

      if (!name) return { success: false, message: "Item name required" };

      const index = inventory.findIndex(
        (inv) => (inv.name || "").trim().toLowerCase() === name.toLowerCase()
      );

      if (index >= 0) {
        inventory[index] = {
          ...inventory[index],
          ...itemData,
          lastUpdated: new Date().toLocaleTimeString()
        };
      } else {
        inventory.push({
          sku: itemData.sku || "SKU-" + Date.now().toString().slice(-5),
          name: name,
          category: itemData.category || "General",
          qty: Number(itemData.qty) || 0,
          alertLevel: Number(itemData.alertLevel) || 5,
          lastUpdated: new Date().toLocaleTimeString()
        });
      }

      saveBranchData("inventory", inventory, branch);
      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

      sendMutation("update_stock", branch, { item: itemData }, webAppUrl);

      return { success: true };
    },

    flushPendingMutations: function (webAppUrl) {
      return flushPendingMutations(webAppUrl);
    },

    syncFromCloud: syncFromCloud,

    // Sync active branch first, then other authorized branches with 1500ms spacing to prevent Google Apps Script lock/concurrency errors
    syncAllBranches: function (webAppUrl) {
      if (!webAppUrl || !webAppUrl.startsWith("http")) return Promise.resolve({ success: false });
      const active = getActiveBranch();
      const user = window.Auth ? window.Auth.getUser() : null;
      const allowed = (user && Array.isArray(user.allowedBranches) && user.allowedBranches.length > 0)
        ? user.allowedBranches
        : ["alkhoud", "ghala"];

      const sortedBranches = [active, ...allowed.filter((b) => b !== active)];

      return sortedBranches.reduce((chain, b, idx) => {
        return chain.then((prevResults) => {
          const delay = idx > 0 ? new Promise((r) => setTimeout(r, 1500)) : Promise.resolve();
          return delay.then(() => syncFromCloud(webAppUrl, 0, b)).then((res) => [...prevResults, res]);
        });
      }, Promise.resolve([])).then((results) => {
        return { success: results.some((r) => r && r.success) };
      });
    },

    getLastSyncedTime: getLastSyncedTime,

    refundSale: function (saleIdentifier, webAppUrl) {
      const branch = getActiveBranch();
      const sales = loadBranchSales(branch);
      const inventory = loadBranchInventory(branch);

      const targetIndex = sales.findIndex((s) => {
        if (!s) return false;
        if (s.id && String(s.id) === String(saleIdentifier)) return true;
        if (typeof saleIdentifier === "object" && saleIdentifier !== null) {
          if (s.id && saleIdentifier.id && String(s.id) === String(saleIdentifier.id)) return true;
          return (
            s.customerName === saleIdentifier.customerName &&
            s.date === saleIdentifier.date &&
            Math.abs(Number(s.grandTotal) - Number(saleIdentifier.grandTotal)) < 0.001
          );
        }
        return false;
      });

      if (targetIndex < 0) {
        return { success: false, message: "Target sale not found" };
      }

      const targetSale = sales[targetIndex];

      if (targetSale.refundStatus === "REFUNDED" || targetSale.isRefunded) {
        return { success: false, message: "Sale is already refunded" };
      }

      // 1. Update Sale Ledger to REFUNDED
      targetSale.refundStatus = "REFUNDED";
      targetSale.isRefunded = true;
      targetSale.paymentStatus = "refunded";
      targetSale.refundedAt = new Date().toISOString();

      sales[targetIndex] = targetSale;
      saveBranchData("sales", sales, branch);

      // 2. Restore Inventory Quantities accurately
      const itemsToRestore = [];
      if (Array.isArray(targetSale.items) && targetSale.items.length > 0) {
        targetSale.items.forEach((it) => {
          itemsToRestore.push({
            sku: it.sku || "",
            name: it.name || "",
            category: it.category || "General",
            qty: Number(it.qty) || 1
          });
        });
      } else if (targetSale.itemsDetail && typeof targetSale.itemsDetail === "string") {
        const lines = targetSale.itemsDetail.split("\n");
        lines.forEach((line) => {
          const match = line.match(/^(.*?)\s*\(Qty:\s*(\d+(?:\.\d+)?)/i);
          if (match) {
            itemsToRestore.push({
              name: match[1].trim(),
              qty: Number(match[2]) || 1
            });
          }
        });
      }

      if (itemsToRestore.length > 0) {
        itemsToRestore.forEach((soldItem) => {
          const rawName = (soldItem.name || "").trim();
          const name = rawName.toLowerCase();
          const qtyToReturn = Number(soldItem.qty) || 0;

          if (name && qtyToReturn > 0) {
            const invIndex = inventory.findIndex((inv) => {
              if (soldItem.sku && inv.sku && inv.sku === soldItem.sku) return true;
              return (inv.name || "").trim().toLowerCase() === name;
            });
            if (invIndex >= 0) {
              inventory[invIndex].qty = (Number(inventory[invIndex].qty) || 0) + qtyToReturn;
              inventory[invIndex].lastUpdated = new Date().toLocaleTimeString();
            } else {
              inventory.push({
                sku: soldItem.sku || "SKU-" + Date.now().toString().slice(-5),
                name: rawName || name,
                category: soldItem.category || "General",
                qty: qtyToReturn,
                alertLevel: 5,
                lastUpdated: new Date().toLocaleTimeString()
              });
            }
          }
        });
        saveBranchData("inventory", inventory, branch);
      }

      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

      // 3. Reliable Mutation Sync with Offline Queueing
      sendMutation("refund_sale", branch, {
        saleId: targetSale.id,
        timestamp: targetSale.timestamp || "",
        saleDate: targetSale.date || "",
        customerName: targetSale.customerName || "",
        grandTotal: targetSale.grandTotal || 0,
        itemsDetail: targetSale.itemsDetail || "",
        items: itemsToRestore && itemsToRestore.length > 0 ? itemsToRestore : (targetSale.items || []),
        refundStatus: "REFUNDED"
      }, webAppUrl);

      return { success: true, sale: targetSale };
    },

    markSaleAsPaid: function (saleIdentifier, paymentData, webAppUrl) {
      const branch = getActiveBranch();
      const sales = loadBranchSales(branch);

      const targetIndex = sales.findIndex((s) => {
        if (!s) return false;
        if (s.id && String(s.id) === String(saleIdentifier)) return true;
        if (typeof saleIdentifier === "object" && saleIdentifier !== null) {
          if (s.id && saleIdentifier.id && String(s.id) === String(saleIdentifier.id)) return true;
          return (
            s.customerName === saleIdentifier.customerName &&
            s.date === saleIdentifier.date &&
            Math.abs(Number(s.grandTotal) - Number(saleIdentifier.grandTotal)) < 0.001
          );
        }
        return false;
      });

      if (targetIndex < 0) {
        return { success: false, message: "Target sale not found" };
      }

      const targetSale = sales[targetIndex];

      if (targetSale.paymentStatus === "paid") {
        return { success: false, message: "Sale is already marked as paid" };
      }

      // 1. Update Sale Payment Status & Breakdown locally
      targetSale.paymentStatus = "paid";
      targetSale.paymentMethod = paymentData.paymentMethod || "cash";
      targetSale.cashAmount = Number(paymentData.cashAmount || 0);
      targetSale.cardAmount = Number(paymentData.cardAmount || 0);
      targetSale.paidAt = new Date().toISOString();

      sales[targetIndex] = targetSale;
      saveBranchData("sales", sales, branch);

      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

      // 2. Reliable Mutation Sync with Offline Queueing
      sendMutation("mark_sale_paid", branch, {
        saleId: targetSale.id,
        timestamp: targetSale.timestamp || "",
        saleDate: targetSale.date || "",
        customerName: targetSale.customerName || "",
        grandTotal: targetSale.grandTotal || 0,
        paymentStatus: "paid",
        paymentMethod: targetSale.paymentMethod,
        cashAmount: targetSale.cashAmount,
        cardAmount: targetSale.cardAmount
      }, webAppUrl);

      return { success: true, sale: targetSale };
    },

    clearCacheAndSync: function (webAppUrl) {
      const b = getActiveBranch();
      delete memoryCache.inventory[b];
      delete memoryCache.sales[b];
      delete memoryCache.amend_logs[b];
      try {
        localStorage.removeItem(getStorageKey("inventory", b));
        localStorage.removeItem(getStorageKey("sales", b));
        localStorage.removeItem(getStorageKey("lastSynced", b));
      } catch (e) {}

      openDatabase().then((db) => {
        if (!db) return;
        try {
          const tx1 = db.transaction("inventory", "readwrite");
          tx1.objectStore("inventory").delete(b);
          const tx2 = db.transaction("sales", "readwrite");
          tx2.objectStore("sales").delete(b);
        } catch (e) {}
      });

      return syncFromCloud(webAppUrl);
    }
  };
})();
