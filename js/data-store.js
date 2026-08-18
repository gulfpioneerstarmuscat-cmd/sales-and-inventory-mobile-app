// js/data-store.js - High Performance Branch-Scoped Data Store for Sales & Inventory

window.DataStore = (function () {
  function getActiveBranch() {
    return window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
  }

  function getStorageKey(type, branch) {
    const b = branch || getActiveBranch();
    return `gps_${b}_${type}_v1`;
  }

  function loadBranchInventory(branch) {
    const b = branch || getActiveBranch();
    const key = getStorageKey("inventory", b);
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function loadBranchSales(branch) {
    const b = branch || getActiveBranch();
    const key = getStorageKey("sales", b);
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveBranchData(type, data, branch) {
    const b = branch || getActiveBranch();
    const key = getStorageKey(type, b);
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Error writing localStorage:", key, e);
    }
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

  // Auto re-sync when user switches branch
  window.addEventListener("branchChanged", function () {
    window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
  });

  return {
    // Getters for Active Branch
    getInventory: function (branch) {
      return [...loadBranchInventory(branch)];
    },

    getSales: function (branch) {
      return [...loadBranchSales(branch)];
    },

    findItemByName: function (nameQuery, branch) {
      if (!nameQuery || typeof nameQuery !== "string") return null;
      const q = nameQuery.trim().toLowerCase();
      const inv = loadBranchInventory(branch);
      return inv.find((item) => item.name.toLowerCase() === q) || null;
    },

    searchItems: function (query, branch) {
      if (!query || typeof query !== "string") return [];
      const q = query.trim().toLowerCase();
      const inv = loadBranchInventory(branch);
      return inv.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    },

    // Record Sale with 0ms Instant Local Stock Deduction for Active Branch
    recordSale: function (saleData, webAppUrl) {
      const branch = getActiveBranch();
      const sales = loadBranchSales(branch);
      const inventory = loadBranchInventory(branch);

      // 1. Record Sale locally
      sales.unshift({
        ...saleData,
        refundStatus: "NO",
        isRefunded: false,
        branch: branch,
        id: Date.now(),
        timestamp: new Date().toISOString()
      });
      saveBranchData("sales", sales, branch);

      // 2. Deduct Inventory Stock locally
      if (Array.isArray(saleData.items)) {
        saleData.items.forEach((soldItem) => {
          const name = (soldItem.name || "").trim().toLowerCase();
          const qtySold = Number(soldItem.qty) || 0;

          if (name && qtySold > 0) {
            const existingIndex = inventory.findIndex(
              (inv) => inv.name.trim().toLowerCase() === name
            );
            if (existingIndex >= 0) {
              inventory[existingIndex].qty = Math.max(
                0,
                inventory[existingIndex].qty - qtySold
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

      // 3. Background Sync to Google Sheets API with branch target
      if (webAppUrl && typeof webAppUrl === "string" && webAppUrl.startsWith("http")) {
        const auth = getAuthPayload();
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "add_sale", branch: branch, ...auth, ...saleData })
        })
          .then(() => {
            console.log(`Background sync completed for ${branch}!`);
            setTimeout(() => {
              this.syncFromCloud(webAppUrl);
            }, 2500);
          })
          .catch((err) => console.error("Background sync error:", err));
      }

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
        (inv) => inv.name.trim().toLowerCase() === name.toLowerCase()
      );

      if (index >= 0) {
        inventory[index].qty = (Number(inventory[index].qty) || 0) + addQty;
        if (payload.category) inventory[index].category = payload.category;
        if (payload.alertLevel) inventory[index].alertLevel = Number(payload.alertLevel);
        if (payload.remarks) inventory[index].lastRemark = payload.remarks;
        inventory[index].lastUpdated = new Date().toLocaleTimeString();
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

      if (webAppUrl && typeof webAppUrl === "string" && webAppUrl.startsWith("http")) {
        const auth = getAuthPayload();
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "add_stock_qty", branch: branch, ...auth, ...payload })
        }).catch((err) => console.error("Add stock sync error:", err));
      }

      return { success: true };
    },

    // Amend Stock Item with Selective Updating and Deep Audit Trail Tracking
    amendStockItem: function (amendData, webAppUrl) {
      const branch = getActiveBranch();
      const inventory = loadBranchInventory(branch);
      const { originalItem, updatedFields, diffs } = amendData;
      const origName = (originalItem.name || "").trim().toLowerCase();

      const index = inventory.findIndex(
        (inv) => inv.name.trim().toLowerCase() === origName
      );

      if (index < 0) return { success: false, message: "Target item not found in inventory." };

      const currentItem = inventory[index];

      const getCurrentUserSafe = () => {
        if (!window.Auth) return null;
        if (typeof window.Auth.getUser === "function") return window.Auth.getUser();
        if (typeof window.Auth.getCurrentUser === "function") return window.Auth.getCurrentUser();
        return null;
      };

      const currentUser = getCurrentUserSafe();

      // Update selectively only changed fields
      inventory[index] = {
        ...currentItem,
        name: updatedFields.name || currentItem.name,
        category: updatedFields.category || currentItem.category,
        qty: Number(updatedFields.qty) ?? currentItem.qty,
        alertLevel: Number(updatedFields.alertLevel) ?? currentItem.alertLevel,
        lastRemark: updatedFields.lastRemark !== undefined ? updatedFields.lastRemark : (currentItem.lastRemark || currentItem.remark || ""),
        lastAmendedBy: currentUser ? currentUser.name : "Staff",
        lastAmendedRemark: updatedFields.amendReason || updatedFields.remarks || "",
        lastUpdated: new Date().toLocaleTimeString()
      };

      saveBranchData("inventory", inventory, branch);

      // Record Audit Trail locally
      const auditLogKey = getStorageKey("amend_logs", branch);
      let logs = [];
      try {
        const storedLogs = localStorage.getItem(auditLogKey);
        logs = storedLogs ? JSON.parse(storedLogs) : [];
      } catch (e) {
        logs = [];
      }

      const auditRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user: currentUser ? currentUser.email : "Staff",
        userName: currentUser ? currentUser.name : "Staff",
        branch: branch,
        sku: currentItem.sku || "N/A",
        originalName: originalItem.name,
        amendedName: updatedFields.name,
        originalQty: originalItem.qty,
        amendedQty: updatedFields.qty,
        qtyDelta: Number(updatedFields.qty) - Number(originalItem.qty),
        diffs: diffs,
        remarks: updatedFields.remarks
      };

      logs.unshift(auditRecord);
      try {
        localStorage.setItem(auditLogKey, JSON.stringify(logs));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("inventoryDataChanged"));

      if (webAppUrl && typeof webAppUrl === "string" && webAppUrl.startsWith("http")) {
        const auth = getAuthPayload();
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "amend_stock", branch: branch, ...auth, auditRecord: auditRecord })
        }).catch((err) => console.error("Amend stock sync error:", err));
      }

      return { success: true, auditRecord: auditRecord };
    },

    // Add or Update Stock Item for Active Branch
    updateStockItem: function (itemData, webAppUrl) {
      const branch = getActiveBranch();
      const inventory = loadBranchInventory(branch);
      const name = (itemData.name || "").trim();

      if (!name) return { success: false, message: "Item name required" };

      const index = inventory.findIndex(
        (inv) => inv.name.trim().toLowerCase() === name.toLowerCase()
      );

      if (index >= 0) {
        inventory[index] = {
          ...inventory[index],
          ...itemData,
          category: itemData.category || inventory[index].category || "General",
          qty: Number(itemData.qty) || 0,
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

      if (webAppUrl && typeof webAppUrl === "string" && webAppUrl.startsWith("http")) {
        const auth = getAuthPayload();
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "update_stock", branch: branch, ...auth, item: itemData })
        }).catch((err) => console.error("Stock update error:", err));
      }

      return { success: true };
    },

    // Sync Active or Target Branch data from Google Sheets Cloud (Replaces local cache with real sheet data)
    syncFromCloud: function (webAppUrl, retryCount, targetBranch) {
      if (!webAppUrl || !webAppUrl.startsWith("http")) return Promise.resolve({ success: false, reason: "Invalid URL" });

      const retriesSoFar = typeof retryCount === "number" ? retryCount : (retryCount ? 1 : 0);
      const branch = targetBranch || getActiveBranch();
      const cacheBuster = `_t=${Date.now()}`;
      
      const lastSynced = this.getLastSyncedTime(branch);
      const sinceParam = lastSynced ? `&since=${encodeURIComponent(lastSynced)}` : "";
      const auth = getAuthPayload();
      const authParams = `&apiKey=${encodeURIComponent(auth.apiKey)}` + (auth.sessionId ? `&sessionId=${encodeURIComponent(auth.sessionId)}` : "");

      const syncUrl = webAppUrl.includes("?")
        ? `${webAppUrl}&branch=${encodeURIComponent(branch)}${sinceParam}${authParams}&${cacheBuster}`
        : `${webAppUrl}?branch=${encodeURIComponent(branch)}${sinceParam}${authParams}&${cacheBuster}`;

      // Adaptive Timeouts: Attempt 1 gets 15s (serverless cold-start window), Retries get 10s (warm container window)
      const timeoutMs = retriesSoFar === 0 ? 15000 : 10000;
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

      return fetch(syncUrl, { cache: "no-store", signal: controller ? controller.signal : undefined })
        .then((res) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data && data.status === "success") {
            // Override local inventory with Google Sheets data if data exists or if local is empty
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

              // Process each cloud sale strictly according to Google Sheets data
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

              // Only preserve local refund status if refund was executed in the last 60s (in-flight POST window)
              processedCloudSales.forEach((cs) => {
                const matchingLocal = localSales.find((ls) => {
                  const csName = String(cs.customerName || "").trim().toLowerCase();
                  const lsName = String(ls.customerName || "").trim().toLowerCase();
                  const csTotal = Number(cs.grandTotal) || 0;
                  const lsTotal = Number(ls.grandTotal) || 0;
                  return csName === lsName && Math.abs(csTotal - lsTotal) < 0.001;
                });

                if (matchingLocal) {
                  const refundedAtMs = matchingLocal.refundedAt ? new Date(matchingLocal.refundedAt).getTime() : 0;
                  // If locally refunded within the last 60s, keep local refund status until POST completes
                  if ((matchingLocal.isRefunded || matchingLocal.refundStatus === "REFUNDED") && refundedAtMs > sixtySecsAgo && !cs.isRefunded) {
                    cs.isRefunded = true;
                    cs.refundStatus = "REFUNDED";
                    cs.paymentStatus = "refunded";
                  }
                }
              });

              // Preserve recent local pending sales not yet present in cloud response
              const recentPendingSales = localSales.filter((ls) => {
                const isRecent = ls.id && typeof ls.id === "number" && ls.id > sixtySecsAgo;
                if (!isRecent) return false;

                const existsInCloud = processedCloudSales.some((cs) => {
                  const csName = String(cs.customerName || "").trim().toLowerCase();
                  const lsName = String(ls.customerName || "").trim().toLowerCase();
                  const csTotal = Number(cs.grandTotal) || 0;
                  const lsTotal = Number(ls.grandTotal) || 0;
                  return csName === lsName && Math.abs(csTotal - lsTotal) < 0.001;
                });
                return !existsInCloud;
              });

              const mergedSales = [...recentPendingSales, ...processedCloudSales];
              saveBranchData("sales", mergedSales, branch);
            }
            const syncTime = new Date().toISOString();
            try {
              localStorage.setItem(getStorageKey("lastSynced", branch), syncTime);
            } catch (e) {}

            window.dispatchEvent(new CustomEvent("inventoryDataChanged", { detail: { branch, syncTime } }));
            if (window.DevLogger) {
              window.DevLogger.success("DataStore", `Successfully synced real ${branch} Google Sheet data at ${syncTime}!`, { branch, syncTime });
            } else {
              console.log(`Successfully synced real ${branch} Google Sheet data at ${syncTime}!`);
            }
            return { success: true, branch, syncTime, data };
          } else {
            throw new Error(data ? data.message : "Invalid response");
          }
        })
        .catch((err) => {
          if (timeoutId) clearTimeout(timeoutId);
          // If attempt failed or timed out, fast-retry on warm container up to 2 times after 1s delay
          if (retriesSoFar < 2) {
            if (window.DevLogger) {
              window.DevLogger.warn("DataStore", `Cloud sync notice (${branch}, attempt ${retriesSoFar + 1} failed: ${err.message}), retrying on warm container in 1s...`, { branch, attempt: retriesSoFar + 1, error: err.message }, 3);
            } else {
              console.log(`Cloud sync notice (${branch}, attempt ${retriesSoFar + 1} failed: ${err.message}), retrying on warm container in 1s...`);
            }
            return new Promise((resolve) => setTimeout(resolve, 1000)).then(() =>
              this.syncFromCloud(webAppUrl, retriesSoFar + 1, branch)
            );
          }
          if (window.DevLogger) {
            window.DevLogger.warn("DataStore", `PWA Background sync notice for ${branch} (using local storage data): ${err.message || err}`, { branch, error: err.message || err }, 2);
          } else {
            console.log(`PWA Background sync notice for ${branch} (using local storage data):`, err.message || err);
          }
          return { success: false, error: err };
        });
    },

    // Sync all authorized branches sequentially to pre-warm local cache for 0ms branch switching
    syncAllBranches: function (webAppUrl) {
      if (!webAppUrl || !webAppUrl.startsWith("http")) return Promise.resolve({ success: false });
      const user = window.Auth ? window.Auth.getUser() : null;
      const allowed = (user && Array.isArray(user.allowedBranches) && user.allowedBranches.length > 0)
        ? user.allowedBranches
        : ["alkhoud", "ghala"];

      return Promise.all(
        allowed.map((b) => this.syncFromCloud(webAppUrl, 0, b))
      ).then((results) => {
        return { success: results.some((r) => r && r.success) };
      });
    },

    getLastSyncedTime: function (branch) {
      const b = branch || getActiveBranch();
      try {
        return localStorage.getItem(getStorageKey("lastSynced", b)) || null;
      } catch (e) {
        return null;
      }
    },

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
            Number(s.grandTotal) === Number(saleIdentifier.grandTotal)
          );
        }
        return false;
      });

      if (targetIndex < 0) {
        return { success: false, message: "Target sale not found" };
      }

      const targetSale = sales[targetIndex];

      if (targetSale.refundStatus === "REFUNDED" || targetSale.paymentStatus === "refunded" || targetSale.isRefunded) {
        return { success: false, message: "Sale is already refunded" };
      }

      // 1. Mark Sale as Refunded
      targetSale.refundStatus = "REFUNDED";
      targetSale.paymentStatus = "refunded";
      targetSale.isRefunded = true;
      targetSale.refundedAt = new Date().toISOString();
      sales[targetIndex] = targetSale;
      saveBranchData("sales", sales, branch);

      // 2. Return Items Stock to Inventory (Supports items array or itemsDetail string fallback)
      let itemsToRestore = Array.isArray(targetSale.items) && targetSale.items.length > 0 ? targetSale.items : [];
      if (itemsToRestore.length === 0 && typeof targetSale.itemsDetail === "string" && targetSale.itemsDetail.trim()) {
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
            const invIndex = inventory.findIndex(
              (inv) => (inv.name || "").trim().toLowerCase() === name || name.includes((inv.name || "").trim().toLowerCase())
            );
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

      // 3. Background Sync to Cloud Backend
      const targetUrl = webAppUrl || (window.APP_CONFIG ? (window.APP_CONFIG.googleSheetWebAppUrl || window.APP_CONFIG.webAppUrl || "") : "");

      if (targetUrl && typeof targetUrl === "string" && targetUrl.startsWith("http")) {
        const auth = getAuthPayload();
        fetch(targetUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "refund_sale",
            branch: branch,
            saleId: targetSale.id,
            timestamp: targetSale.timestamp || "",
            saleDate: targetSale.date || "",
            customerName: targetSale.customerName || "",
            grandTotal: targetSale.grandTotal || 0,
            itemsDetail: targetSale.itemsDetail || "",
            items: itemsToRestore && itemsToRestore.length > 0 ? itemsToRestore : (targetSale.items || []),
            refundStatus: "REFUNDED",
            ...auth
          })
        })
          .then(() => {
            console.log(`Refund background sync completed for ${branch}!`);
            setTimeout(() => {
              this.syncFromCloud(targetUrl);
            }, 2500);
          })
          .catch((err) => console.error("Refund sync error:", err));
      }

      return { success: true, sale: targetSale };
    },

    clearCacheAndSync: function (webAppUrl) {
      const b = getActiveBranch();
      try {
        localStorage.removeItem(getStorageKey("inventory", b));
        localStorage.removeItem(getStorageKey("sales", b));
        localStorage.removeItem(getStorageKey("lastSynced", b));
      } catch (e) {}
      return this.syncFromCloud(webAppUrl);
    }
  };
})();

