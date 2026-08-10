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
          .then(() => console.log(`Background sync completed for ${branch}!`))
          .catch((err) => console.error("Background sync error:", err));
      }

      return { success: true };
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
    syncFromCloud: function (webAppUrl) {
      if (!webAppUrl || !webAppUrl.startsWith("http")) return Promise.resolve();

      const branch = getActiveBranch();
      const syncUrl = `${webAppUrl}?branch=${encodeURIComponent(branch)}`;

      return fetch(syncUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.status === "success") {
            // Override local inventory with Google Sheets data if data exists
            if (Array.isArray(data.inventory)) {
              saveBranchData("inventory", data.inventory, branch);
            }
            if (Array.isArray(data.sales)) {
              saveBranchData("sales", data.sales, branch);
            }
            window.dispatchEvent(new CustomEvent("inventoryDataChanged"));
            console.log(`Successfully synced real ${branch} Google Sheet data!`);
          }
        })
        .catch((err) => console.warn("Cloud sync check error:", err));
    }
  };
})();
