// js/pages/view-inventory.js - View Stock Inventory Component (Sales History UX Alignment)

window.initViewInventory = (function () {
  let initialized = false;
  let searchQuery = "";
  let statusFilter = "all"; // "all" | "low_stock"
  let selectedItem = null; // Currently selected item for detailed sub-page view

  function renderViewInventoryUI() {
    const root = document.getElementById("view-inventory-root");
    if (!root) return;

    // Render Detailed Sub-Page View if an inventory item tile was clicked
    if (selectedItem) {
      renderDetailSubPageUI(selectedItem);
      return;
    }

    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const allInventory = window.DataStore ? window.DataStore.getInventory(branch) : [];

    // Calculate Stock Counts (In Stock, Low Stock, No Stock)
    let inStockCount = 0;
    let lowStockCount = 0;
    let noStockCount = 0;

    allInventory.forEach((item) => {
      const alertThreshold = Number(item.alertLevel) || 5;
      const qty = Number(item.qty) || 0;

      if (qty === 0) {
        noStockCount++;
      } else if (qty <= alertThreshold) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    });

    // Filter Inventory Items based on Search Query & Status Filter
    const filteredInventory = allInventory.filter((item) => {
      const alertThreshold = Number(item.alertLevel) || 5;
      const qty = Number(item.qty) || 0;

      const isNoStock = qty === 0;
      const isLowStock = qty > 0 && qty <= alertThreshold;
      const isInStock = qty > alertThreshold;

      // 1. Status Filter Pills
      if (statusFilter === "in_stock" && !isInStock) return false;
      if (statusFilter === "low_stock" && !isLowStock) return false;
      if (statusFilter === "no_stock" && !isNoStock) return false;

      // 2. Search Query Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchSku = (item.sku || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat) return false;
      }

      return true;
    });

    root.innerHTML = `
      <div class="view-inventory-container">
        <!-- Header & Interactive Stat Cards (Identical layout to Sales View) -->
        <div class="inv-page-header">
          <div class="header-titles">
            <h3 class="page-title">Stock Inventory</h3>
            <button type="button" class="btn-sync-cloud" id="btn-sync-inventory" title="Sync Live Data from Google Sheets">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              <span>Sync</span>
            </button>
          </div>

          <div class="inv-stats-row">
            <div class="stat-card stat-card--count">
              <div class="stat-card-header">
                <span class="stat-label">Total Products</span>
              </div>
              <span class="stat-value">${allInventory.length} Items</span>
            </div>

            <div class="stat-card ${lowStockCount + noStockCount > 0 ? "stat-card--revenue stat-card--alert" : "stat-card--count"}">
              <div class="stat-card-header">
                <span class="stat-label">Low / Out Stock</span>
              </div>
              <span class="stat-value">${lowStockCount + noStockCount > 0 ? `${lowStockCount + noStockCount} Alert` : "0 Alert"}</span>
            </div>
          </div>
        </div>

        <!-- Search & Filter Controls (4 Filter Pills: All, In Stock, Low, No) -->
        <div class="inv-controls-bar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="inv-search-input" class="search-input" placeholder="Search product name, SKU, category..." value="${escapeHtml(searchQuery)}" />
            ${searchQuery ? `<button type="button" class="btn-clear-search" id="btn-clear-inv-search">&times;</button>` : ""}
          </div>

          <div class="filter-pills-row">
            <button type="button" class="filter-pill ${statusFilter === "all" ? "filter-pill--active" : ""}" data-status="all">All (${allInventory.length})</button>
            <button type="button" class="filter-pill filter-pill--instock ${statusFilter === "in_stock" ? "filter-pill--active" : ""}" data-status="in_stock">In Stock (${inStockCount})</button>
            <button type="button" class="filter-pill filter-pill--lowstock ${statusFilter === "low_stock" ? "filter-pill--active" : ""}" data-status="low_stock">Low (${lowStockCount})</button>
            <button type="button" class="filter-pill filter-pill--nostock ${statusFilter === "no_stock" ? "filter-pill--active" : ""}" data-status="no_stock">No (${noStockCount})</button>
          </div>
        </div>

        <!-- Inventory Compact Cards List (Identical structure to Sales View Compact List) -->
        <div class="inv-list-body">
          ${
            filteredInventory.length === 0
              ? `
              <div class="empty-state">
                <h4>No Products Found</h4>
                <p>${searchQuery || statusFilter !== "all" ? "No products match your search filters." : "No inventory items recorded yet."}</p>
              </div>
            `
              : filteredInventory
                  .map((item, idx) => renderCompactInventoryTileHtml(item, idx))
                  .join("")
          }
        </div>
      </div>
    `;

    // Attach Event Listeners
    const syncBtn = root.querySelector("#btn-sync-inventory");
    if (syncBtn) {
      syncBtn.addEventListener("click", () => {
        syncBtn.classList.add("is-spinning");
        const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
        if (window.DataStore && webAppUrl) {
          window.DataStore.syncFromCloud(webAppUrl).finally(() => {
            setTimeout(() => syncBtn.classList.remove("is-spinning"), 300);
          });
        } else {
          syncBtn.classList.remove("is-spinning");
        }
      });
    }

    const searchIn = root.querySelector("#inv-search-input");
    if (searchIn) {
      searchIn.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderViewInventoryUI();
      });
    }

    const clearSearchBtn = root.querySelector("#btn-clear-inv-search");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        searchQuery = "";
        renderViewInventoryUI();
      });
    }

    const filterBtns = root.querySelectorAll(".filter-pill[data-status]");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        statusFilter = btn.dataset.status;
        renderViewInventoryUI();
      });
    });

    // Compact Tile Click Handlers -> Navigates to Detailed Sub-Page View
    const compactTiles = root.querySelectorAll(".compact-inv-tile");
    compactTiles.forEach((tile) => {
      tile.addEventListener("click", () => {
        const idx = Number(tile.dataset.index);
        const targetItem = filteredInventory[idx];
        if (targetItem) {
          selectedItem = targetItem;
          renderViewInventoryUI();
        }
      });
    });
  }

  // Compact Inventory Tile Renderer (Green for In Stock, Yellow for Low Stock, Red for No Stock)
  function renderCompactInventoryTileHtml(item, index) {
    const alertThreshold = Number(item.alertLevel) || 5;
    const qty = Number(item.qty) || 0;
    const sku = item.sku || "N/A";
    const category = item.category || "General";

    let tileClass = "compact-inv-tile--ok";
    if (qty === 0) {
      tileClass = "compact-inv-tile--no";
    } else if (qty <= alertThreshold) {
      tileClass = "compact-inv-tile--low";
    }

    return `
      <div class="compact-inv-tile ${tileClass}" data-index="${index}">
        <div class="tile-left">
          <span class="tile-item-name">${escapeHtml(item.name || "Unnamed Product")}</span>
          <span class="tile-item-meta">SKU: ${escapeHtml(sku)} • ${escapeHtml(category)}</span>
        </div>
        <div class="tile-right">
          <span class="tile-qty">${qty} QTY</span>
        </div>
      </div>
    `;
  }

  // Clean Detailed Sub-Page View (Replaces Form Panel View, Displays complete product information)
  function renderDetailSubPageUI(item) {
    const root = document.getElementById("view-inventory-root");
    if (!root) return;

    const alertThreshold = Number(item.alertLevel) || 5;
    const qty = Number(item.qty) || 0;
    const isLow = qty <= alertThreshold;

    const unitPrice = Number(item.unitPrice || item.price || 0);
    const totalVal = qty * unitPrice;

    root.innerHTML = `
      <div class="view-inventory-container detail-subpage-view">
        <!-- Sub-Page Header with Back Button -->
        <div class="detail-nav-bar">
          <button type="button" class="btn-back-to-list" id="btn-back-to-inventory">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Back to Inventory</span>
          </button>

          <span class="tile-badge ${isLow ? "tile-badge--unpaid" : "tile-badge--paid"}">
            ${isLow ? "⚠️ Low Stock" : "✓ In Stock"}
          </span>
        </div>

        <div class="detail-scroll-area">
          <!-- Product Name Header Card -->
          <div class="detail-card detail-card--header">
            <div class="detail-header-top">
              <div class="header-main-meta">
                <h3 class="detail-cust-title">${escapeHtml(item.name || "Unnamed Product")}</h3>
                <span class="detail-timestamp">Category: ${escapeHtml(item.category || "General")} • SKU: ${escapeHtml(item.sku || "N/A")}</span>
              </div>
            </div>
          </div>

          <!-- Stock Level & Quantity Card -->
          <div class="detail-card">
            <h4 class="card-section-label">Stock Status</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Available Units</span>
                <span class="info-val info-val--highlight">${qty} Units</span>
              </div>
              <div class="info-item">
                <span class="info-label">Min Alert Threshold</span>
                <span class="info-val">${alertThreshold} Units</span>
              </div>
              <div class="info-item">
                <span class="info-label">Stock Health</span>
                <span class="info-val ${isLow ? "text-danger" : "text-success"}">${isLow ? "Low Stock Warning" : "Optimal Stock"}</span>
              </div>
            </div>
          </div>

          <!-- Pricing & Valuation Card -->
          <div class="detail-card">
            <h4 class="card-section-label">Pricing & Valuation</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Unit Price</span>
                <span class="info-val">OMR ${unitPrice.toFixed(3)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total Inventory Value</span>
                <span class="info-val info-val--highlight">OMR ${totalVal.toFixed(3)}</span>
              </div>
            </div>
          </div>

          <!-- System Metadata Card -->
          <div class="detail-card">
            <h4 class="card-section-label">System Metadata</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Product SKU / ID</span>
                <span class="info-val">${escapeHtml(item.sku || item.id || "N/A")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Back to Inventory Button Event Listener
    const backBtn = root.querySelector("#btn-back-to-inventory");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        selectedItem = null;
        renderViewInventoryUI();
      });
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return function initViewInventory() {
    if (!initialized) {
      initialized = true;
      window.addEventListener("branchChanged", () => {
        selectedItem = null;
        renderViewInventoryUI();
      });
      window.addEventListener("inventoryDataChanged", () => renderViewInventoryUI());
    }
    renderViewInventoryUI();
  };
})();
