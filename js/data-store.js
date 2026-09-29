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
  // --------------------------------------------------------------------------
  // Single Unified Online Transaction Funnel
  // --------------------------------------------------------------------------
  function executeOnlineMutation(action, branch, payload, explicitTargetUrl) {
    const targetUrl = explicitTargetUrl || (typeof window !== "undefined" && window.APP_CONFIG && window.APP_CONFIG.googleSheetWebAppUrl ? window.APP_CONFIG.googleSheetWebAppUrl : "");

    if (!targetUrl || !targetUrl.startsWith("http")) {
      return Promise.reject(new Error("Backend Google Sheet URL not configured."));
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return Promise.reject(new Error("You are currently offline. Please reconnect to the internet to complete this action."));
    }

    const auth = getAuthPayload();
    const requestId = payload && payload.requestId ? payload.requestId : ("req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 7));
    const bodyPayload = {
      action: action,
      branch: branch,
      requestId: requestId,
      clientTimestamp: new Date().toISOString(),
      ...auth,
      ...(payload || {})
    };

    // 35-second generous timeout for Google Apps Script serverless execution and sheet locking
    const timeoutMs = 35000;
    const timeoutError = new Error(`Mutation ${action} timed out after ${timeoutMs}ms (Google Apps Script took too long to respond)`);
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => {
          try {
            controller.abort(timeoutError);
          } catch (e) {
            controller.abort();
          }
        }, timeoutMs)
      : null;

    return fetch(targetUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(bodyPayload),
      signal: controller ? controller.signal : undefined
    })
      .then((res) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && data.status === "success") {
          return data;
        } else {
          throw new Error(data ? (data.message || `Failed to process ${action} in cloud`) : "Invalid response from server");
        }
      })
      .catch((err) => {
        if (timeoutId) clearTimeout(timeoutId);

        // If add_sale timed out or had a transient network abort, verify whether Google Sheet actually received and saved the sale
        if (action === "add_sale" && typeof navigator !== "undefined" && navigator.onLine !== false) {
          if (window.DevLogger) {
            window.DevLogger.warn("DataStore", `Sale submission returned notice (${err.message}). Performing server reconciliation verification...`, { branch, requestId });
          }

          // Immediate verification attempt via direct cloud sync bypassing cache
          return syncFromCloud(targetUrl, 0, branch, true)
            .then((syncRes) => {
              if (syncRes && syncRes.success) {
                const cloudSales = (syncRes.data && Array.isArray(syncRes.data.sales)) ? syncRes.data.sales : (loadBranchSales(branch) || []);
                const targetName = String(payload.customerName || "").trim().toLowerCase();
                const targetTotal = Number(payload.grandTotal || 0);

                const foundVerified = cloudSales.find((cs) => {
                  if (payload.saleId && cs.saleId && String(payload.saleId) === String(cs.saleId)) return true;
                  if (payload.saleId && cs.id && String(payload.saleId) === String(cs.id)) return true;
                  const cName = String(cs.customerName || "").trim().toLowerCase();
                  const cTotal = Number(cs.grandTotal) || 0;
                  return (cName === targetName && Math.abs(cTotal - targetTotal) < 0.005);
                });

                if (foundVerified) {
                  if (window.DevLogger) {
                    window.DevLogger.success("DataStore", `Sale verified on server despite client timeout!`, foundVerified);
                  }
                  return {
                    status: "success",
                    verifiedOnReconciliation: true,
                    message: "Sale confirmed and verified on server.",
                    sale: foundVerified,
                    updatedInventory: syncRes.data ? syncRes.data.inventory : undefined
                  };
                }
              }
              throw err;
            })
            .catch(() => {
              throw err;
            });
        }

        if (window.DevLogger) {
          window.DevLogger.warn("DataStore", `Online mutation [${action}] failed: ${err.message || err}`, { branch, error: err.message || err });
        }
        throw err;
      });
  }

  function flushPendingMutations() {
    return Promise.resolve();
  }

  // --------------------------------------------------------------------------
  // Cloud Synchronization Engine
  // --------------------------------------------------------------------------
  const inFlightSyncs = {};
  function syncFromCloud(webAppUrl, retryCount, targetBranch, bypassCache) {
    const targetUrl = webAppUrl || (window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "");
    if (!targetUrl || !targetUrl.startsWith("http")) return Promise.resolve({ success: false, reason: "Invalid URL" });

    const branch = targetBranch || getActiveBranch();
    if (inFlightSyncs[branch] && !bypassCache) {
      return inFlightSyncs[branch];
    }

    const retriesSoFar = typeof retryCount === "number" ? retryCount : (retryCount ? 1 : 0);
    const cacheBuster = `_t=${Date.now()}`;
    const bypassParam = (bypassCache || retriesSoFar > 0) ? "&bypassCache=1" : "";
    
    const lastSynced = getLastSyncedTime(branch);
    const sinceParam = (lastSynced && !bypassCache) ? `&since=${encodeURIComponent(lastSynced)}` : "";
    const auth = getAuthPayload();
    const authParams = `&apiKey=${encodeURIComponent(auth.apiKey)}` + (auth.sessionId ? `&sessionId=${encodeURIComponent(auth.sessionId)}` : "");

    const syncUrl = targetUrl.includes("?")
      ? `${targetUrl}&branch=${encodeURIComponent(branch)}${sinceParam}${authParams}${bypassParam}&${cacheBuster}`
      : `${targetUrl}?branch=${encodeURIComponent(branch)}${sinceParam}${authParams}${bypassParam}&${cacheBuster}`;

    // 30-second window to accommodate Google Apps Script cold starts comfortably
    const timeoutMs = 30000;
    const timeoutError = new Error(`Cloud sync timed out after ${timeoutMs}ms (Google Apps Script took too long to respond)`);
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => {
          try {
            controller.abort(timeoutError);
          } catch (e) {
            controller.abort();
          }
        }, timeoutMs)
      : null;

    // Safety timeout to ensure inFlight lock is never stuck
    const safetyClearTimer = setTimeout(() => {
      delete inFlightSyncs[branch];
    }, 35000);

    const syncPromise = fetch(syncUrl, { cache: "no-store", signal: controller ? controller.signal : undefined })
      .then((res) => {
        if (timeoutId) clearTimeout(timeoutId);
        clearTimeout(safetyClearTimer);
        delete inFlightSyncs[branch];
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
              const isRef = rStatus === "REFUNDED" || rStatus === "YES" || cs.paymentStatus === "refunded" || Boolean(cs.isRefunded);
              const stableId = cs.id || cs.saleId || `sale_${branch}_${String(cs.timestamp || "").replace(/[^0-9]/g, "")}_${String(cs.customerName || "").slice(0, 4)}`;
              return {
                ...cs,
                id: stableId,
                saleId: cs.saleId || stableId,
                refundStatus: isRef ? "REFUNDED" : "NO",
                paymentStatus: isRef ? "refunded" : (cs.paymentStatus || "paid"),
                isRefunded: isRef
              };
            });

            // Match local recent sales to retain local state changes (e.g. recent refunds)
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
                return csName === lsName && Math.abs(csTotal - lsTotal) < 0.005 && (!csDate || !lsDate || csDate === lsDate);
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

            // Preserve any local sales that might not yet be in cloud (within last 3 minutes)
            const threeMinsAgo = Date.now() - 3 * 60 * 1000;
            const unmatchedLocalSales = localSales.filter((ls) => {
              let lsTimestampMs = 0;
              if (typeof ls.id === "number") {
                lsTimestampMs = ls.id;
              } else if (typeof ls.id === "string") {
                const tsMatch = ls.id.match(/_(\d{10,13})_/);
                if (tsMatch) lsTimestampMs = Number(tsMatch[1]);
              }
              if (!lsTimestampMs && ls.timestamp) {
                const parsed = new Date(ls.timestamp).getTime();
                if (!isNaN(parsed) && parsed > 0) lsTimestampMs = parsed;
              }

              const isVeryRecent = lsTimestampMs > threeMinsAgo;
              if (!isVeryRecent) return false;

              const existsInCloud = processedCloudSales.some((cs) => {
                if (cs.id && ls.id && String(cs.id) === String(ls.id)) return true;
                if (cs.saleId && ls.saleId && String(cs.saleId) === String(ls.saleId)) return true;
                const csName = String(cs.customerName || "").trim().toLowerCase();
                const lsName = String(ls.customerName || "").trim().toLowerCase();
                const csTotal = Number(cs.grandTotal) || 0;
                const lsTotal = Number(ls.grandTotal) || 0;
                const csTime = String(cs.timestamp || "").trim();
                const lsTime = String(ls.timestamp || "").trim();
                const csItems = String(cs.itemsDetail || "").trim().toLowerCase();
                const lsItems = String(ls.itemsDetail || "").trim().toLowerCase();
                return (
                  csName === lsName &&
                  Math.abs(csTotal - lsTotal) < 0.005 &&
                  (csTime === lsTime || (!csTime && !lsTime)) &&
                  (csItems === lsItems || (!csItems && !lsItems))
                );
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
          window.dispatchEvent(new CustomEvent("salesDataChanged", { detail: { branch, syncTime } }));
          if (window.DevLogger) {
            window.DevLogger.success("DataStore", `Successfully synced real ${branch} Google Sheet data at ${syncTime}!`, { branch, syncTime });
          }
          return { success: true, branch, syncTime, data };
        } else {
          throw new Error(data ? data.message : "Invalid response from Google Sheets");
        }
      })
      .catch((err) => {
        delete inFlightSyncs[branch];
        if (timeoutId) clearTimeout(timeoutId);
        clearTimeout(safetyClearTimer);

        const effectiveErr = (err && (err.name === "AbortError" || String(err.message || "").toLowerCase().includes("abort")))
          ? timeoutError
          : err;

        if (retriesSoFar < 1) {
          if (window.DevLogger) {
            window.DevLogger.warn("DataStore", `Cloud sync notice (${branch}, attempt 1 failed: ${effectiveErr.message}), retrying on warm container in 1s...`, { branch, error: effectiveErr.message }, 3);
          }
          return new Promise((resolve) => setTimeout(resolve, 1000)).then(() =>
            syncFromCloud(targetUrl, retriesSoFar + 1, branch, true)
          );
        }
        if (window.DevLogger) {
          window.DevLogger.warn("DataStore", `PWA Cloud sync notice for ${branch}: ${effectiveErr.message || effectiveErr}`, { branch, error: effectiveErr.message || effectiveErr }, 2);
        }
        return { success: false, error: effectiveErr };
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

    // Save New Sale for Active Branch (Direct Online Funnel with strict stock validation)
    recordSale: function (saleData, webAppUrl) {
      const branch = getActiveBranch();
      const inventory = loadBranchInventory(branch);

      // Pre-validation: verify all items exist and have sufficient stock locally
      if (Array.isArray(saleData.items) && saleData.items.length > 0) {
        const aggregated = {};
        for (const item of saleData.items) {
          const name = (item.name || "").trim().toLowerCase();
          const qty = Number(item.qty) || 0;
          if (!name || qty <= 0) continue;
          aggregated[name] = (aggregated[name] || 0) + qty;
        }

        for (const name in aggregated) {
          const totalRequested = aggregated[name];
          const match = inventory.find(
            (inv) => (inv.name || "").trim().toLowerCase() === name
          );

          const rawQty = match ? match.qty : null;
          const availableStock = rawQty === "" || rawQty === null || rawQty === undefined ? 0 : Number(rawQty) || 0;

          if (!match || availableStock <= 0 || totalRequested > availableStock) {
            const displayName = match ? match.name : name;
            return Promise.reject(
              new Error(`Insufficient stock for '${displayName}' (available: ${availableStock}, requested: ${totalRequested})`)
            );
          }
        }
      }

      const user = window.Auth && typeof window.Auth.getCurrentUser === "function" ? window.Auth.getCurrentUser() : null;
      const staffName = saleData.recordedBy || (user ? (user.name || user.email || "Staff") : "Staff");
      const clientSaleId = saleData.saleId || `sale_${branch}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const salePayload = {
        ...saleData,
        saleId: clientSaleId,
        recordedBy: staffName,
        timestamp: new Date().toISOString()
      };

      return executeOnlineMutation("add_sale", branch, salePayload, webAppUrl)
        .then((data) => {
          // 1. Add Sale locally to branch history upon cloud confirmation
          const sales = loadBranchSales(branch);
          const newSale = {
            id: clientSaleId,
            saleId: clientSaleId,
            timestamp: data.timestamp || new Date().toISOString(),
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
            recordedBy: staffName,
            refundStatus: "NO"
          };

          // Check if sale is already in local sales (e.g. from server reconciliation sync)
          const existingIdx = sales.findIndex((s) => s.saleId === clientSaleId || s.id === clientSaleId);
          if (existingIdx >= 0) {
            sales[existingIdx] = newSale;
          } else {
            sales.unshift(newSale);
          }
          saveBranchData("sales", sales, branch);

          // 2. Deduct Inventory Stock locally
          if (data.updatedInventory && Array.isArray(data.updatedInventory)) {
            saveBranchData("inventory", data.updatedInventory, branch);
          } else if (Array.isArray(saleData.items)) {
            saleData.items.forEach((soldItem) => {
              const name = (soldItem.name || "").trim().toLowerCase();
              const qtySold = Number(soldItem.qty) || 0;

              if (name && qtySold > 0) {
                const existingIndex = inventory.findIndex(
                  (inv) => (inv.name || "").trim().toLowerCase() === name
                );
                if (existingIndex >= 0) {
                  const currentStock = Number(inventory[existingIndex].qty) || 0;
                  inventory[existingIndex].qty = Math.max(0, currentStock - qtySold);
                  inventory[existingIndex].lastUpdated = new Date().toLocaleTimeString();
                  inventory[existingIndex].lastUpdatedBy = staffName + " (Sale)";
                }
              }
            });
            saveBranchData("inventory", inventory, branch);
          }

          window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
          window.dispatchEvent(new CustomEvent("salesDataChanged"));
          if (window.DevLogger) {
            window.DevLogger.success("DataStore", `Sale recorded online successfully for ${branch}`, newSale);
          }
          return {
            success: true,
            sale: newSale,
            verified: Boolean(data.verifiedOnReconciliation)
          };
        });
    },

    // Add Stock Quantity (Single Online Funnel with Server-Side De-duplication)
    addStockQuantity: function (payload, webAppUrl) {
      const branch = getActiveBranch();
      const name = (payload.name || "").trim();
      const addQty = Number(payload.addQty) || 0;

      if (!name) return Promise.reject(new Error("Item name required"));
      if (isNaN(addQty) || addQty <= 0) return Promise.reject(new Error("Stock quantity must be at least 1"));

      const user = window.Auth && typeof window.Auth.getCurrentUser === "function" ? window.Auth.getCurrentUser() : null;
      const staffName = payload.addedBy || (user ? (user.name || user.email || "Staff") : "Staff");

      const mutationPayload = {
        name: name,
        sku: payload.sku || "",
        category: payload.category || "General",
        addQty: addQty,
        alertLevel: Number(payload.alertLevel) || 5,
        remarks: payload.remarks || "",
        addedBy: staffName
      };

      return executeOnlineMutation("add_stock_qty", branch, mutationPayload, webAppUrl)
        .then((data) => {
          const inventory = loadBranchInventory(branch);
          const index = inventory.findIndex(
            (inv) => (inv.name || "").trim().toLowerCase() === name.toLowerCase()
          );

          if (data.inventory && Array.isArray(data.inventory)) {
            saveBranchData("inventory", data.inventory, branch);
          } else if (index >= 0) {
            inventory[index].qty = (Number(inventory[index].qty) || 0) + addQty;
            inventory[index].lastUpdated = new Date().toLocaleTimeString();
            inventory[index].lastUpdatedBy = staffName + " (+" + addQty + ")";
            if (payload.category) inventory[index].category = payload.category;
            if (payload.alertLevel) inventory[index].alertLevel = Number(payload.alertLevel);
            if (payload.remarks) {
              const existing = inventory[index].lastRemark || inventory[index].remark || "";
              const combined = existing ? (existing + "\n• " + payload.remarks) : payload.remarks;
              inventory[index].lastRemark = combined;
              inventory[index].remark = combined;
            }
            saveBranchData("inventory", inventory, branch);
          } else {
            inventory.push({
              sku: payload.sku || "SKU-" + Date.now().toString().slice(-5),
              name: name,
              category: payload.category || "General",
              qty: addQty,
              alertLevel: Number(payload.alertLevel) || 5,
              lastRemark: payload.remarks || "",
              remark: payload.remarks || "",
              lastUpdated: new Date().toLocaleTimeString(),
              lastUpdatedBy: staffName + " (+" + addQty + ")"
            });
            saveBranchData("inventory", inventory, branch);
          }

          window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
          if (window.DevLogger) {
            window.DevLogger.success("DataStore", `Stock added online successfully for ${branch}: +${addQty} ${name}`);
          }
          return { success: true, message: data.message || `Added +${addQty} stock to ${name}` };
        });
    },

    // Transfer Stock between branches (Single Online Funnel with Server-Side De-duplication)
    transferStock: function (payload, webAppUrl) {
      const fromBranch = (payload.fromBranch || getActiveBranch()).toLowerCase();
      const toBranch = (payload.toBranch || (fromBranch === "alkhoud" ? "ghala" : "alkhoud")).toLowerCase();

      if (fromBranch === toBranch) {
        return Promise.reject(new Error("Sending and receiving branches cannot be identical"));
      }

      const fromInventory = loadBranchInventory(fromBranch);
      const toInventory = loadBranchInventory(toBranch);

      // Normalize items list
      let items = [];
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        items = payload.items;
      } else if (payload.itemName || payload.name) {
        items = [{
          name: (payload.itemName || payload.name).trim(),
          category: payload.category || "General",
          sku: payload.sku || "",
          qty: Number(payload.qty || payload.transferQty) || 1
        }];
      }

      if (items.length === 0) {
        return Promise.reject(new Error("Please provide at least one item to transfer."));
      }

      const fromLabel = fromBranch === "ghala" ? "Ghala" : "Al Khoud";
      const toLabel = toBranch === "ghala" ? "Ghala" : "Al Khoud";

      // Validation phase
      const aggregatedQty = {};
      for (const it of items) {
        const rawName = (it.name || "").trim();
        const cleanKey = rawName.toLowerCase();
        const qty = Number(it.qty) || 0;

        if (!rawName) return Promise.reject(new Error("Item name cannot be empty."));
        if (qty <= 0) return Promise.reject(new Error(`Quantity for '${rawName}' must be at least 1.`));

        const matchFrom = fromInventory.find((inv) => (inv.name || "").trim().toLowerCase() === cleanKey);
        if (!matchFrom) {
          return Promise.reject(new Error(`Product '${rawName}' not found in ${fromLabel} inventory.`));
        }

        const itemCategory = (matchFrom.category || it.category || "General").trim();
        it.category = itemCategory;
        it.sku = matchFrom.sku || it.sku || "";

        const matchTo = toInventory.find(
          (inv) => (inv.name || "").trim().toLowerCase() === cleanKey &&
                   (inv.category || "General").trim().toLowerCase() === itemCategory.toLowerCase()
        );

        if (!matchTo) {
          return Promise.reject(new Error(`Product '${matchFrom.name}' (Category: '${itemCategory}') not found in ${toLabel} catalog. Both Name and Category must match in receiving branch.`));
        }

        aggregatedQty[cleanKey] = (aggregatedQty[cleanKey] || 0) + qty;
      }

      for (const cleanKey in aggregatedQty) {
        const totalReq = aggregatedQty[cleanKey];
        const matchFrom = fromInventory.find((inv) => (inv.name || "").trim().toLowerCase() === cleanKey);
        const rawStock = matchFrom ? matchFrom.qty : null;
        const availableStock = rawStock === "" || rawStock === null || rawStock === undefined ? 0 : Number(rawStock) || 0;

        if (availableStock <= 0) {
          return Promise.reject(new Error(`Product '${matchFrom.name}' is out of stock (0 available) in ${fromLabel}.`));
        }

        if (totalReq > availableStock) {
          return Promise.reject(new Error(`Insufficient stock for '${matchFrom.name}' in ${fromLabel} (Available: ${availableStock}, Total requested: ${totalReq}).`));
        }
      }

      const nowIso = new Date().toISOString();
      const customerName = payload.customerName || `${fromLabel} to ${toLabel}`;
      const user = payload.transferredBy || (window.Auth && window.Auth.getUser() ? window.Auth.getUser().name : "Staff");

      const itemsDetailStr = items
        .map((it) => `${it.name.trim()} (Qty: ${Number(it.qty) || 1})`)
        .join("\n");

      const transferMutationPayload = {
        fromBranch: fromBranch,
        toBranch: toBranch,
        customerName: customerName,
        items: items,
        itemsDetail: itemsDetailStr,
        transferredBy: user
      };

      return executeOnlineMutation("transfer_stock", fromBranch, transferMutationPayload, webAppUrl)
        .then(() => {
          const nowTimeStr = new Date().toLocaleTimeString();

          for (const it of items) {
            const cleanKey = (it.name || "").trim().toLowerCase();
            const itemCat = (it.category || "General").trim().toLowerCase();
            const transferQty = Number(it.qty) || 1;

            const fromIdx = fromInventory.findIndex((inv) => (inv.name || "").trim().toLowerCase() === cleanKey);
            if (fromIdx >= 0) {
              const currentQty = Number(fromInventory[fromIdx].qty) || 0;
              fromInventory[fromIdx].qty = Math.max(0, currentQty - transferQty);
              fromInventory[fromIdx].lastUpdated = nowTimeStr;
              fromInventory[fromIdx].lastRemark = `Transferred ${transferQty} to ${toLabel}`;
            }

            const toIdx = toInventory.findIndex(
              (inv) => (inv.name || "").trim().toLowerCase() === cleanKey &&
                       (inv.category || "General").trim().toLowerCase() === itemCat
            );
            if (toIdx >= 0) {
              const rawDest = toInventory[toIdx].qty;
              const currentDestQty = rawDest === "" || rawDest === null || rawDest === undefined ? 0 : Number(rawDest) || 0;
              toInventory[toIdx].qty = currentDestQty + transferQty;
              toInventory[toIdx].lastUpdated = nowTimeStr;
              toInventory[toIdx].lastRemark = `Received ${transferQty} from ${fromLabel}`;
            }
          }

          saveBranchData("inventory", fromInventory, fromBranch);
          saveBranchData("inventory", toInventory, toBranch);

          const fromSales = loadBranchSales(fromBranch);
          const transferSaleRecord = {
            id: Date.now(),
            timestamp: nowIso,
            date: nowIso.split("T")[0],
            customerName: customerName,
            customerPhone: "",
            customerNumber: "",
            customerEmail: "",
            customerAddress: "",
            vatBill: "no",
            itemsDetail: itemsDetailStr,
            items: items.map((it) => ({
              name: it.name.trim(),
              category: it.category || "General",
              qty: Number(it.qty) || 1,
              unitPrice: 0
            })),
            subtotal: 0,
            vatAmount: 0,
            discountAmount: 0,
            grandTotal: 0,
            paymentStatus: "transferred",
            paymentMethod: "transferred",
            cashAmount: 0,
            cardAmount: 0,
            refundStatus: "NO",
            notes: `Inter-Branch Transfer: ${items.length} product(s) transferred from ${fromLabel} to ${toLabel}`,
            recordedBy: user
          };

          fromSales.unshift(transferSaleRecord);
          saveBranchData("sales", fromSales, fromBranch);

          window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
          window.dispatchEvent(new CustomEvent("salesDataChanged"));

          return {
            success: true,
            fromBranch: fromBranch,
            toBranch: toBranch,
            transferRecord: transferSaleRecord
          };
        });
    },

    // Amend Stock Item (Single Online Funnel with Server-Side De-duplication)
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

      const index = inventory.findIndex((inv) => {
        if (originalItem.sku && inv.sku) return inv.sku === originalItem.sku;
        return (inv.name || "").trim().toLowerCase() === (originalItem.name || "").trim().toLowerCase();
      });

      if (index < 0) {
        return Promise.reject(new Error("Original item not found for amendment"));
      }

      const currentItem = inventory[index];
      const getCurrentUserSafe = () => {
        if (!window.Auth) return null;
        if (typeof window.Auth.getUser === "function") return window.Auth.getUser();
        if (typeof window.Auth.getCurrentUser === "function") return window.Auth.getCurrentUser();
        return null;
      };

      const currentUser = getCurrentUserSafe();

      const targetQty = updatedFields.qty !== undefined && !isNaN(Number(updatedFields.qty))
        ? Number(updatedFields.qty)
        : (Number(currentItem.qty) || 0);

      const targetAlert = updatedFields.alertLevel !== undefined && !isNaN(Number(updatedFields.alertLevel))
        ? Number(updatedFields.alertLevel)
        : (Number(currentItem.alertLevel) || 5);

      const updatedRemark = updatedFields.lastRemark !== undefined ? updatedFields.lastRemark : (currentItem.lastRemark || currentItem.remark || "");

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
        itemRemark: updatedRemark,
        remarks: updatedFields.remarks || updatedFields.amendReason || "",
        reason: updatedFields.amendReason || updatedFields.remarks || ""
      };

      const mutationPayload = {
        name: originalItem.name,
        auditRecord: auditRecord,
        updatedFields: updatedFields,
        diffs: diffs,
        updatedBy: currentUser ? currentUser.name : "Staff"
      };

      return executeOnlineMutation("amend_stock", branch, mutationPayload, webAppUrl)
        .then((data) => {
          if (data.inventory && Array.isArray(data.inventory)) {
            saveBranchData("inventory", data.inventory, branch);
          } else {
            inventory[index] = {
              ...currentItem,
              name: updatedFields.name || currentItem.name,
              category: updatedFields.category || currentItem.category,
              qty: targetQty,
              alertLevel: targetAlert,
              lastRemark: updatedRemark,
              remark: updatedRemark,
              lastAmendedBy: currentUser ? currentUser.name : "Staff",
              lastAmendedRemark: updatedFields.amendReason || updatedFields.remarks || "",
              lastUpdated: new Date().toLocaleTimeString()
            };
            saveBranchData("inventory", inventory, branch);
          }

          let logs = loadBranchAuditLogs(branch);
          logs.unshift(auditRecord);
          saveBranchData("amend_logs", logs, branch);

          window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

          return { success: true, auditRecord: auditRecord };
        });
    },

    // Add or Update Stock Item for Active Branch
    updateStockItem: function (itemData, webAppUrl) {
      const branch = getActiveBranch();
      const name = (itemData.name || "").trim();

      if (!name) return Promise.reject(new Error("Item name required"));

      return executeOnlineMutation("update_stock", branch, { item: itemData }, webAppUrl)
        .then((data) => {
          const inventory = loadBranchInventory(branch);
          if (data.inventory && Array.isArray(data.inventory)) {
            saveBranchData("inventory", data.inventory, branch);
          } else {
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
          }

          window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
          return { success: true };
        });
    },

    flushPendingMutations: function () {
      return Promise.resolve();
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
        return Promise.reject(new Error("Target sale not found"));
      }

      const targetSale = sales[targetIndex];

      if (targetSale.refundStatus === "REFUNDED" || targetSale.isRefunded) {
        return Promise.reject(new Error("Sale is already refunded"));
      }

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

      const user = window.Auth && typeof window.Auth.getCurrentUser === "function" ? window.Auth.getCurrentUser() : null;
      const refundedBy = user ? (user.name || user.email || "Staff") : "Staff";

      const mutationPayload = {
        saleId: targetSale.id,
        timestamp: targetSale.timestamp || "",
        saleDate: targetSale.date || "",
        customerName: targetSale.customerName || "",
        grandTotal: targetSale.grandTotal || 0,
        itemsDetail: targetSale.itemsDetail || "",
        items: itemsToRestore && itemsToRestore.length > 0 ? itemsToRestore : (targetSale.items || []),
        refundStatus: "REFUNDED",
        refundedBy: refundedBy
      };

      return executeOnlineMutation("refund_sale", branch, mutationPayload, webAppUrl)
        .then((data) => {
          targetSale.refundStatus = "REFUNDED";
          targetSale.isRefunded = true;
          targetSale.paymentStatus = "refunded";
          targetSale.refundedAt = new Date().toISOString();

          sales[targetIndex] = targetSale;
          saveBranchData("sales", sales, branch);

          if (data.updatedInventory && Array.isArray(data.updatedInventory)) {
            saveBranchData("inventory", data.updatedInventory, branch);
          } else if (itemsToRestore.length > 0) {
            const inventory = loadBranchInventory(branch);
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
                }
              }
            });
            saveBranchData("inventory", inventory, branch);
          }

          window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
          window.dispatchEvent(new CustomEvent("salesDataChanged"));

          try {
            if (window.PushNotification && typeof window.PushNotification.sendRefundAuditAlert === "function") {
              window.PushNotification.sendRefundAuditAlert(
                branch,
                targetSale.grandTotal || 0,
                targetSale.customerName || "Customer",
                refundedBy
              );
            }
          } catch (e) {}

          return { success: true, sale: targetSale };
        });
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
        return Promise.reject(new Error("Target sale not found"));
      }

      const targetSale = sales[targetIndex];

      if (targetSale.paymentStatus === "paid") {
        return Promise.reject(new Error("Sale is already marked as paid"));
      }

      const mutationPayload = {
        saleId: targetSale.id,
        timestamp: targetSale.timestamp || "",
        saleDate: targetSale.date || "",
        customerName: targetSale.customerName || "",
        grandTotal: targetSale.grandTotal || 0,
        paymentStatus: "paid",
        paymentMethod: paymentData.paymentMethod || "cash",
        cashAmount: Number(paymentData.cashAmount || 0),
        cardAmount: Number(paymentData.cardAmount || 0)
      };

      return executeOnlineMutation("mark_sale_paid", branch, mutationPayload, webAppUrl)
        .then(() => {
          targetSale.paymentStatus = "paid";
          targetSale.paymentMethod = paymentData.paymentMethod || "cash";
          targetSale.cashAmount = Number(paymentData.cashAmount || 0);
          targetSale.cardAmount = Number(paymentData.cardAmount || 0);
          targetSale.paidAt = new Date().toISOString();

          sales[targetIndex] = targetSale;
          saveBranchData("sales", sales, branch);

          window.dispatchEvent(new CustomEvent("salesDataChanged"));

          return { success: true, sale: targetSale };
        });
    },

    // Backward compatibility alias
    markSalePaid: function (saleIdentifier, paymentData, webAppUrl) {
      return this.markSaleAsPaid(saleIdentifier, paymentData, webAppUrl);
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
