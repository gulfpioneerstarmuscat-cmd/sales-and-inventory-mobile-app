// js/data-store.js - High Performance Branch-Scoped Data Store for Sales & Inventory

window.DataStore = (function () {
  // Sample Fallbacks per branch if local storage and cloud have zero items
  const DEFAULT_INVENTORY = {
    alkhoud: [
      { sku: "SKU-65239E2A", name: "Beninca 600KG", category: "Gate Automation", qty: 15, alertLevel: 3 },
      { sku: "SKU-99A04B11", name: "Beninca Pupilla Photo Cell", category: "Accessories", qty: 25, alertLevel: 5 },
      { sku: "SKU-31FA78B0", name: "Beninca TO.GO 2VA Remote", category: "Remotes", qty: 40, alertLevel: 10 },
      { sku: "SKU-E84C12D5", name: "Armored Cable 3 Core 2.5mm", category: "Cables", qty: 100, alertLevel: 20 }
    ],
    ghala: [
      { sku: "SKU-65239E2A", name: "Beninca 600KG", category: "Gate Automation", qty: 8, alertLevel: 2 },
      { sku: "SKU-99A04B11", name: "Beninca Pupilla Photo Cell", category: "Accessories", qty: 12, alertLevel: 5 },
      { sku: "SKU-31FA78B0", name: "Beninca TO.GO 2VA Remote", category: "Remotes", qty: 20, alertLevel: 8 }
    ]
  };

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
      return stored ? JSON.parse(stored) : (DEFAULT_INVENTORY[b] || DEFAULT_INVENTORY.alkhoud);
    } catch (e) {
      return DEFAULT_INVENTORY[b] || DEFAULT_INVENTORY.alkhoud;
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
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "add_sale", branch: branch, ...saleData })
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
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "add_stock_qty", branch: branch, ...payload })
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
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "amend_stock", branch: branch, auditRecord: auditRecord })
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
        fetch(webAppUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "update_stock", branch: branch, item: itemData })
        }).catch((err) => console.error("Stock update error:", err));
      }

      return { success: true };
    },

    // Sync Active Branch data from Google Sheets Cloud (Replaces local cache with real sheet data)
    syncFromCloud: function (webAppUrl, retryCount) {
      if (!webAppUrl || !webAppUrl.startsWith("http")) return Promise.resolve({ success: false, reason: "Invalid URL" });

      const retriesSoFar = typeof retryCount === "number" ? retryCount : (retryCount ? 1 : 0);
      const branch = getActiveBranch();
      const cacheBuster = `_t=${Date.now()}`;
      const syncUrl = webAppUrl.includes("?")
        ? `${webAppUrl}&branch=${encodeURIComponent(branch)}&${cacheBuster}`
        : `${webAppUrl}?branch=${encodeURIComponent(branch)}&${cacheBuster}`;

      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 40000) : null;

      return fetch(syncUrl, { cache: "no-store", signal: controller ? controller.signal : undefined })
        .then((res) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data && data.status === "success") {
            // Override local inventory with Google Sheets data if data exists
            if (Array.isArray(data.inventory)) {
              saveBranchData("inventory", data.inventory, branch);
            }
            if (Array.isArray(data.sales)) {
              const localSales = loadBranchSales(branch);
              const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;

              // Preserve recent local sales not yet present in cloud response
              const recentPendingSales = localSales.filter((ls) => {
                const isRecent = ls.id && typeof ls.id === "number" && ls.id > fifteenMinsAgo;
                if (!isRecent) return false;

                const existsInCloud = data.sales.some((cs) => {
                  const csName = String(cs.customerName || "").trim().toLowerCase();
                  const lsName = String(ls.customerName || "").trim().toLowerCase();
                  const csTotal = Number(cs.grandTotal) || 0;
                  const lsTotal = Number(ls.grandTotal) || 0;
                  return csName === lsName && Math.abs(csTotal - lsTotal) < 0.001;
                });
                return !existsInCloud;
              });

              const mergedSales = [...recentPendingSales, ...data.sales];
              saveBranchData("sales", mergedSales, branch);
            }
            const syncTime = new Date().toISOString();
            try {
              localStorage.setItem(getStorageKey("lastSynced", branch), syncTime);
            } catch (e) {}

            window.dispatchEvent(new CustomEvent("inventoryDataChanged", { detail: { branch, syncTime } }));
            console.log(`Successfully synced real ${branch} Google Sheet data at ${syncTime}!`);
            return { success: true, branch, syncTime, data };
          } else {
            throw new Error(data ? data.message : "Invalid response");
          }
        })
        .catch((err) => {
          if (timeoutId) clearTimeout(timeoutId);
          // If attempt failed with transient cold-start 404 / timeout, retry up to 2 times giving container 6s to complete boot
          if (retriesSoFar < 2) {
            console.log(`Cloud sync cold-start notice (attempt ${retriesSoFar + 1} failed: ${err.message}), retrying in 6s...`);
            return new Promise((resolve) => setTimeout(resolve, 6000)).then(() =>
              this.syncFromCloud(webAppUrl, retriesSoFar + 1)
            );
          }
          console.log("PWA Background sync notice (using local storage data):", err.message || err);
          return { success: false, error: err };
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
