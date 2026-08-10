// js/pages/view-sales.js - View Sales History Component

window.initViewSales = (function () {
  let initialized = false;
  let searchQuery = "";
  let statusFilter = "all";

  function renderViewSalesUI() {
    const root = document.getElementById("view-sales-root");
    if (!root) return;

    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const branchLabel = window.Auth ? window.Auth.getBranchLabel(branch) : "Al Khoud Branch";
    const allSales = window.DataStore ? window.DataStore.getSales(branch) : [];

    // Filter Sales
    const filteredSales = allSales.filter((sale) => {
      // Status Filter
      if (statusFilter === "paid" && sale.paymentStatus !== "paid") return false;
      if (statusFilter === "not_paid" && sale.paymentStatus !== "not_paid") return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCust = (sale.customerName || "").toLowerCase().includes(q);
        const matchPhone = (sale.customerNumber || "").toLowerCase().includes(q);
        const matchEmail = (sale.customerEmail || "").toLowerCase().includes(q);
        const matchItem = (sale.itemsDetail || "").toLowerCase().includes(q);
        if (!matchCust && !matchPhone && !matchEmail && !matchItem) return false;
      }

      return true;
    });

    // Calculate Summary Metrics
    let totalRevenue = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    allSales.forEach((s) => {
      const gTotal = Number(s.grandTotal) || 0;
      if (s.paymentStatus === "paid") {
        totalRevenue += gTotal;
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    root.innerHTML = `
      <div class="view-sales-container">
        <!-- Header & Stats Summary -->
        <div class="sales-page-header">
          <div class="header-titles">
            <h3 class="page-title">Sales History</h3>
            <span class="branch-subtitle">📍 ${branchLabel}</span>
          </div>

          <div class="sales-stats-row">
            <div class="stat-card stat-card--revenue">
              <span class="stat-label">Total Revenue</span>
              <span class="stat-value">OMR ${totalRevenue.toFixed(3)}</span>
            </div>
            <div class="stat-card stat-card--count">
              <span class="stat-label">Total Sales</span>
              <span class="stat-value">${allSales.length} (${paidCount} Paid)</span>
            </div>
          </div>
        </div>

        <!-- Search & Filter Controls -->
        <div class="sales-controls-bar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="sales-search-input" class="search-input" placeholder="Search customer, phone, or item..." value="${searchQuery}" />
            ${searchQuery ? `<button type="button" class="btn-clear-search" id="btn-clear-sales-search">&times;</button>` : ""}
          </div>

          <div class="filter-pills-row">
            <button type="button" class="filter-pill ${statusFilter === "all" ? "filter-pill--active" : ""}" data-status="all">All (${allSales.length})</button>
            <button type="button" class="filter-pill ${statusFilter === "paid" ? "filter-pill--active" : ""}" data-status="paid">Paid (${paidCount})</button>
            <button type="button" class="filter-pill ${statusFilter === "not_paid" ? "filter-pill--active" : ""}" data-status="not_paid">Unpaid (${unpaidCount})</button>
          </div>
        </div>

        <!-- Sales Cards List -->
        <div class="sales-list-body">
          ${
            filteredSales.length === 0
              ? `
              <div class="empty-state">
                <div class="empty-icon">🧾</div>
                <h4>No Sales Found</h4>
                <p>${searchQuery || statusFilter !== "all" ? "No sales match your search filters." : `No sales recorded yet for ${branchLabel}.`}</p>
              </div>
            `
              : filteredSales
                  .map((sale) => renderSaleCardHtml(sale))
                  .join("")
          }
        </div>
      </div>
    `;

    // Event Listeners for Search & Filter
    const searchIn = root.querySelector("#sales-search-input");
    if (searchIn) {
      searchIn.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderViewSalesUI();
      });
    }

    const clearSearchBtn = root.querySelector("#btn-clear-sales-search");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        searchQuery = "";
        renderViewSalesUI();
      });
    }

    const filterBtns = root.querySelectorAll(".filter-pill");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        statusFilter = btn.dataset.status;
        renderViewSalesUI();
      });
    });
  }

  function renderSaleCardHtml(sale) {
    const isPaid = sale.paymentStatus === "paid";
    const dateStr = sale.date || (sale.timestamp ? new Date(sale.timestamp).toLocaleDateString() : "N/A");
    const grandTotal = Number(sale.grandTotal) || 0;

    let pMethodLabel = "Paid";
    if (sale.paymentMethod === "cash") pMethodLabel = "Paid (Cash)";
    else if (sale.paymentMethod === "card") pMethodLabel = "Paid (Card)";
    else if (sale.paymentMethod === "both") pMethodLabel = "Paid (Cash + Card)";

    // Format item details
    const itemsFormatted = (sale.itemsDetail || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return `
      <div class="sale-card">
        <div class="sale-card-header">
          <div class="customer-meta">
            <span class="customer-name">${escapeHtml(sale.customerName || "Walk-in Customer")}</span>
            ${sale.customerNumber ? `<span class="customer-phone">📞 ${escapeHtml(sale.customerNumber)}</span>` : ""}
          </div>
          <div class="sale-total">
            <span class="total-label">Grand Total</span>
            <span class="total-amount">OMR ${grandTotal.toFixed(3)}</span>
          </div>
        </div>

        <div class="sale-card-body">
          <div class="items-summary-list">
            ${
              itemsFormatted.length > 0
                ? itemsFormatted.map((it) => `<div class="item-line">• ${escapeHtml(it)}</div>`).join("")
                : `<div class="item-line">• General Sale Item</div>`
            }
          </div>
        </div>

        <div class="sale-card-footer">
          <span class="sale-date">📅 ${dateStr}</span>
          <span class="status-badge status-badge--${isPaid ? "paid" : "unpaid"}">
            ${isPaid ? `✓ ${pMethodLabel}` : "⏳ Not Paid"}
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

  return function initViewSales() {
    if (!initialized) {
      initialized = true;
      window.addEventListener("branchChanged", () => renderViewSalesUI());
      window.addEventListener("inventoryDataChanged", () => renderViewSalesUI());
    }
    renderViewSalesUI();
  };
})();
