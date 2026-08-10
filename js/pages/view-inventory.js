// js/pages/view-inventory.js - View Stock Inventory Component

window.initViewInventory = (function () {
  let initialized = false;
  let searchQuery = "";
  let selectedCategory = "all";
  let lowStockOnly = false;

  function renderViewInventoryUI() {
    const root = document.getElementById("view-inventory-root");
    if (!root) return;

    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const branchLabel = window.Auth ? window.Auth.getBranchLabel(branch) : "Al Khoud Branch";
    const allInventory = window.DataStore ? window.DataStore.getInventory(branch) : [];

    // Extract Unique Categories
    const categoriesSet = new Set();
    let lowStockCount = 0;

    allInventory.forEach((item) => {
      if (item.category) categoriesSet.add(item.category);
      if (item.qty <= (item.alertLevel || 5)) lowStockCount++;
    });
    const categories = Array.from(categoriesSet);

    // Filter Inventory Items
    const filteredInventory = allInventory.filter((item) => {
      // Low Stock Only Filter
      if (lowStockOnly && item.qty > (item.alertLevel || 5)) return false;

      // Category Filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;

      // Search Query
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
        <!-- Header & Stats Summary -->
        <div class="inv-page-header">
          <div class="header-titles">
            <h3 class="page-title">Stock Inventory</h3>
            <span class="branch-subtitle">📍 ${branchLabel}</span>
          </div>

          <div class="inv-stats-row">
            <div class="stat-card">
              <span class="stat-label">Total Unique Products</span>
              <span class="stat-value">${allInventory.length} Items</span>
            </div>
            <div class="stat-card ${lowStockCount > 0 ? "stat-card--alert" : ""}">
              <span class="stat-label">Low Stock Alerts</span>
              <span class="stat-value">${lowStockCount > 0 ? `⚠️ ${lowStockCount} Items Low` : "✓ All Good"}</span>
            </div>
          </div>
        </div>

        <!-- Controls: Search & Category Filters -->
        <div class="inv-controls-bar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="inv-search-input" class="search-input" placeholder="Search item, SKU, or category..." value="${searchQuery}" />
            ${searchQuery ? `<button type="button" class="btn-clear-search" id="btn-clear-inv-search">&times;</button>` : ""}
          </div>

          <div class="filter-pills-row">
            <button type="button" class="filter-pill ${selectedCategory === "all" && !lowStockOnly ? "filter-pill--active" : ""}" data-cat="all">All (${allInventory.length})</button>
            <button type="button" class="filter-pill filter-pill--warning ${lowStockOnly ? "filter-pill--active" : ""}" id="btn-toggle-low-stock">⚠️ Low Stock (${lowStockCount})</button>
            ${categories
              .map(
                (cat) => `
              <button type="button" class="filter-pill ${selectedCategory === cat && !lowStockOnly ? "filter-pill--active" : ""}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Inventory List Cards -->
        <div class="inv-list-body">
          ${
            filteredInventory.length === 0
              ? `
              <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h4>No Inventory Items Found</h4>
                <p>${searchQuery || selectedCategory !== "all" || lowStockOnly ? "No items match your search filters." : `No inventory items added yet for ${branchLabel}.`}</p>
              </div>
            `
              : filteredInventory
                  .map((item) => renderInventoryItemCardHtml(item))
                  .join("")
          }
        </div>
      </div>
    `;

    // Event Listeners for Search & Filter
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

    const toggleLowBtn = root.querySelector("#btn-toggle-low-stock");
    if (toggleLowBtn) {
      toggleLowBtn.addEventListener("click", () => {
        lowStockOnly = !lowStockOnly;
        if (lowStockOnly) selectedCategory = "all";
        renderViewInventoryUI();
      });
    }

    const catPills = root.querySelectorAll(".filter-pill[data-cat]");
    catPills.forEach((btn) => {
      btn.addEventListener("click", () => {
        lowStockOnly = false;
        selectedCategory = btn.dataset.cat;
        renderViewInventoryUI();
      });
    });
  }

  function renderInventoryItemCardHtml(item) {
    const isLow = item.qty <= (item.alertLevel || 5);

    return `
      <div class="inv-item-card ${isLow ? "inv-item-card--low" : ""}">
        <div class="inv-card-header">
          <div class="item-title-group">
            <h4 class="item-name">${escapeHtml(item.name)}</h4>
            <div class="item-tags">
              <span class="sku-badge">${escapeHtml(item.sku || "N/A")}</span>
              <span class="category-tag">📁 ${escapeHtml(item.category || "General")}</span>
            </div>
          </div>

          <div class="stock-display-pill ${isLow ? "stock-display-pill--low" : ""}">
            <span class="stock-qty-val">${item.qty}</span>
            <span class="stock-qty-unit">units</span>
          </div>
        </div>

        <div class="inv-card-footer">
          <span class="alert-threshold-info">Min Alert Level: ${item.alertLevel || 5}</span>
          <span class="status-indicator ${isLow ? "status-indicator--low" : "status-indicator--ok"}">
            ${isLow ? "⚠️ Low Stock Alert" : "✓ In Stock"}
          </span>
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
      window.addEventListener("branchChanged", () => renderViewInventoryUI());
      window.addEventListener("inventoryDataChanged", () => renderViewInventoryUI());
    }
    renderViewInventoryUI();
  };
})();
