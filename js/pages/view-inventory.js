// js/pages/view-inventory.js - View Stock Inventory Component (Refactored to consume Modular Components)

window.initViewInventory = (function () {
  let initialized = false;
  let searchQuery = "";
  let statusFilter = "all"; // "all" | "in_stock" | "low_stock" | "no_stock"
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

    // Component Configurations
    const syncButtonHtml = window.renderSyncButtonHtml ? window.renderSyncButtonHtml("btn-sync-inventory") : "";
    
    const statCardsHtml = `
      <div class="inv-stats-row">
        ${window.renderStatCardHtml ? window.renderStatCardHtml({ cardClass: "stat-card--count", label: "Total Products", value: `${allInventory.length} Items` }) : ""}
        ${window.renderStatCardHtml ? window.renderStatCardHtml({ cardClass: lowStockCount + noStockCount > 0 ? "stat-card--revenue stat-card--alert" : "stat-card--count", label: "Low / Out Stock", value: `${lowStockCount + noStockCount > 0 ? `${lowStockCount + noStockCount} Alert` : "0 Alert"}` }) : ""}
      </div>
    `;

    const searchBoxHtml = window.renderSearchBoxHtml
      ? window.renderSearchBoxHtml({
          id: "inv-search-input",
          placeholder: "Search product name, SKU, category...",
          value: searchQuery,
          clearBtnId: "btn-clear-inv-search"
        })
      : "";

    const filterPillsConfig = [
      { status: "all", label: "All", count: allInventory.length, isActive: statusFilter === "all" },
      { status: "in_stock", label: "In Stock", count: inStockCount, colorTheme: "instock", isActive: statusFilter === "in_stock" },
      { status: "low_stock", label: "Low", count: lowStockCount, colorTheme: "lowstock", isActive: statusFilter === "low_stock" },
      { status: "no_stock", label: "No", count: noStockCount, colorTheme: "nostock", isActive: statusFilter === "no_stock" }
    ];

    const filterPillsHtml = window.renderFilterPillsHtml ? window.renderFilterPillsHtml(filterPillsConfig) : "";

    root.innerHTML = `
      <div class="view-inventory-container">
        <!-- Header & Interactive Stat Cards -->
        <div class="inv-page-header">
          <div class="header-titles">
            <h3 class="page-title">Stock Inventory</h3>
            ${syncButtonHtml}
          </div>

          ${statCardsHtml}
        </div>

        <!-- Search & Filter Controls -->
        <div class="inv-controls-bar">
          ${searchBoxHtml}
          ${filterPillsHtml}
        </div>

        <!-- Inventory Compact Cards List -->
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

    // Attach Component Event Handlers
    const syncBtn = root.querySelector("#btn-sync-inventory");
    if (syncBtn && window.bindSyncButtonEvent) {
      window.bindSyncButtonEvent(syncBtn);
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
    const compactTiles = root.querySelectorAll(".compact-tile, .compact-inv-tile");
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

  // Compact Inventory Tile Renderer using Component helper
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

    if (window.renderCompactTileHtml) {
      return window.renderCompactTileHtml({
        containerClass: `compact-inv-tile ${tileClass}`,
        index: index,
        title: item.name || "Unnamed Product",
        subtitle: `SKU: ${sku} • ${category}`,
        metric: `${qty} QTY`
      });
    }

    return `
      <div class="compact-tile compact-inv-tile ${tileClass}" data-index="${index}">
        <div class="tile-left">
          <span class="tile-title">${escapeHtml(item.name || "Unnamed Product")}</span>
          <span class="tile-subtitle">SKU: ${escapeHtml(sku)} • ${escapeHtml(category)}</span>
        </div>
        <div class="tile-right">
          <span class="tile-metric">${qty} QTY</span>
        </div>
      </div>
    `;
  }

  // Detailed Sub-Page View using Detail View Component Wrapper
  function renderDetailSubPageUI(item) {
    const root = document.getElementById("view-inventory-root");
    if (!root) return;

    const alertThreshold = Number(item.alertLevel) || 5;
    const qty = Number(item.qty) || 0;
    const isLow = qty <= alertThreshold;
    const unitPrice = Number(item.unitPrice || item.price || 0);
    const totalVal = qty * unitPrice;

    const badgeHtml = `
      <span class="tile-badge ${isLow ? "tile-badge--unpaid" : "tile-badge--paid"}">
        ${isLow ? "⚠️ Low Stock" : "✓ In Stock"}
      </span>
    `;

    const contentCardsHtml = `
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
    `;

    const subPageHtml = window.renderDetailSubPageWrapperHtml
      ? window.renderDetailSubPageWrapperHtml({
          backBtnId: "btn-back-to-inventory",
          backLabel: "Back to Inventory",
          badgeHtml: badgeHtml,
          contentCardsHtml: contentCardsHtml
        })
      : "";

    root.innerHTML = `<div class="view-inventory-container">${subPageHtml}</div>`;

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
