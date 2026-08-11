// js/pages/view-inventory.js - View Stock Inventory Component with Smooth Target List Search & Modal Product Detail View

window.initViewInventory = (function () {
  let initialized = false;
  let searchQuery = "";
  let statusFilter = "all"; // "all" | "in_stock" | "low_stock" | "no_stock"

  function normalizeSearchText(val) {
    if (val === null || val === undefined) return "";
    return String(val).toLowerCase().trim().replace(/\s+/g, " ");
  }

  function getFilteredInventoryData() {
    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const allInventory = window.DataStore ? window.DataStore.getInventory(branch) : [];

    return allInventory.filter((item) => {
      const alertThreshold = Number(item.alertLevel) || 5;
      const qty = Number(item.qty) || 0;

      const isNoStock = qty === 0;
      const isLowStock = qty > 0 && qty <= alertThreshold;
      const isInStock = qty > alertThreshold;

      // 1. Status Filter Pills
      if (statusFilter === "in_stock" && !isInStock) return false;
      if (statusFilter === "low_stock" && !isLowStock) return false;
      if (statusFilter === "no_stock" && !isNoStock) return false;

      // 2. Normalized Case-Insensitive Search Query Filter (Product Name, SKU, Category)
      if (searchQuery) {
        const q = normalizeSearchText(searchQuery);
        const matchName = normalizeSearchText(item.name).includes(q);
        const matchSku = normalizeSearchText(item.sku).includes(q);
        const matchCat = normalizeSearchText(item.category).includes(q);

        if (!matchName && !matchSku && !matchCat) return false;
      }

      return true;
    });
  }

  function renderViewInventoryUI() {
    const root = document.getElementById("view-inventory-root");
    if (!root) return;

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

    const filteredInventory = getFilteredInventoryData();

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
          ${renderInventoryListItemsHtml(filteredInventory)}
        </div>
      </div>
    `;

    bindInventoryEvents(root);
  }

  function renderInventoryListItemsHtml(filteredInventory) {
    if (filteredInventory.length === 0) {
      return `
        <div class="empty-state">
          <h4>No Products Found</h4>
          <p>${searchQuery || statusFilter !== "all" ? "No products match your search filters." : "No inventory items recorded yet."}</p>
        </div>
      `;
    }

    return filteredInventory.map((item, idx) => renderCompactInventoryTileHtml(item, idx)).join("");
  }

  function bindInventoryEvents(root) {
    const syncBtn = root.querySelector("#btn-sync-inventory");
    if (syncBtn && window.bindSyncButtonEvent) {
      window.bindSyncButtonEvent(syncBtn);
    }

    // TARGETED SEARCH: Updates ONLY list body so input focus is NEVER destroyed!
    const searchIn = root.querySelector("#inv-search-input");
    if (searchIn) {
      searchIn.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        updateInventoryListBodyOnly(root);
      });
    }

    const clearSearchBtn = root.querySelector("#btn-clear-inv-search");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        searchQuery = "";
        if (searchIn) searchIn.value = "";
        updateInventoryListBodyOnly(root);
      });
    }

    const filterBtns = root.querySelectorAll(".filter-pill[data-status]");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        statusFilter = btn.dataset.status;
        const filterName = btn.innerText.trim().replace(/\n/g, " ");
        if (window.UI) window.UI.toast(`Filtered inventory by "${filterName}"`, "info");
        renderViewInventoryUI();
      });
    });

    bindTileClickEvents(root);
  }

  function updateInventoryListBodyOnly(root) {
    const listBody = root.querySelector(".inv-list-body");
    if (!listBody) {
      renderViewInventoryUI();
      return;
    }

    const filteredInventory = getFilteredInventoryData();
    listBody.innerHTML = renderInventoryListItemsHtml(filteredInventory);
    bindTileClickEvents(root, filteredInventory);
  }

  function bindTileClickEvents(root, customFilteredInventory) {
    const filteredInventory = customFilteredInventory || getFilteredInventoryData();
    const compactTiles = root.querySelectorAll(".compact-tile, .compact-inv-tile");
    compactTiles.forEach((tile) => {
      tile.addEventListener("click", () => {
        const idx = Number(tile.dataset.index);
        const targetItem = filteredInventory[idx];
        if (targetItem) {
          openInventoryDetailModal(targetItem);
        }
      });
    });
  }

  // Top-Level Viewport Inventory Product Detailed View Modal Overlay
  function openInventoryDetailModal(item) {
    const existing = document.querySelector(".inv-detail-modal-backdrop");
    if (existing) existing.remove();

    const alertThreshold = Number(item.alertLevel) || 5;
    const qty = Number(item.qty) || 0;
    const isLow = qty <= alertThreshold;
    const unitPrice = Number(item.unitPrice || item.price || 0);
    const totalVal = qty * unitPrice;

    const backdrop = document.createElement("div");
    backdrop.className = "dp-modal-backdrop inv-detail-modal-backdrop";

    backdrop.innerHTML = `
      <div class="dp-modal-card" style="max-width: 440px; width: 92vw;">
        <!-- Header Bar -->
        <div class="dp-header">
          <div class="dp-title-bar">
            <span class="dp-title-text">PRODUCT DETAILS</span>
            <button type="button" class="dp-btn-close" id="btn-close-inv-detail">&times;</button>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">${escapeHtml(item.name || "Unnamed Product")}</h3>
            <span class="tile-badge ${isLow ? "tile-badge--unpaid" : "tile-badge--paid"}">
              ${isLow ? "⚠️ Low Stock" : "✓ In Stock"}
            </span>
          </div>
          <span style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">SKU: ${escapeHtml(item.sku || "N/A")} • Category: ${escapeHtml(item.category || "General")}</span>
        </div>

        <!-- Body Container -->
        <div class="dp-body" style="max-height: 380px; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px;">
          <!-- Stock Status Card -->
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
            <h4 class="card-section-label">Product SKU / ID</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Product SKU / ID</span>
                <span class="info-val">${escapeHtml(item.sku || item.id || "N/A")}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="dp-footer" style="justify-content: flex-end;">
          <button type="button" class="dp-btn-confirm" id="btn-close-inv-modal">Close</button>
        </div>
      </div>
    `;

    backdrop.querySelector("#btn-close-inv-detail").addEventListener("click", () => backdrop.remove());
    backdrop.querySelector("#btn-close-inv-modal").addEventListener("click", () => backdrop.remove());
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    document.body.appendChild(backdrop);
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
        renderViewInventoryUI();
      });
      window.addEventListener("inventoryDataChanged", () => renderViewInventoryUI());
    }
    renderViewInventoryUI();
  };
})();
