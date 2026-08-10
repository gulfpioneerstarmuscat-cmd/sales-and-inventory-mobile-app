// js/pages/view-sales.js - View Sales History Component with Compact Tiles & Panel Sub-Page Navigation

window.initViewSales = (function () {
  let initialized = false;
  let searchQuery = "";
  let statusFilter = "all";
  let selectedDate = "";
  let selectedSale = null;

  function renderViewSalesUI() {
    const root = document.getElementById("view-sales-root");
    if (!root) return;

    // If a sale tile was clicked, render the clean Detail Sub-Page View inside the form panel!
    if (selectedSale) {
      renderDetailSubPageUI(selectedSale);
      return;
    }

    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const allSales = window.DataStore ? window.DataStore.getSales(branch) : [];

    // Filter Sales
    const filteredSales = allSales.filter((sale) => {
      // Status Filter
      if (statusFilter === "paid" && sale.paymentStatus !== "paid") return false;
      if (statusFilter === "not_paid" && sale.paymentStatus !== "not_paid") return false;

      // Date Filter
      if (selectedDate) {
        const saleDateStr = sale.date || (sale.timestamp ? sale.timestamp.slice(0, 10) : "");
        if (saleDateStr !== selectedDate) return false;
      }

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

        <!-- Search, Date Picker & Filter Controls -->
        <div class="sales-controls-bar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="sales-search-input" class="search-input" placeholder="Search customer, phone, or item..." value="${escapeHtml(searchQuery)}" />
            ${searchQuery ? `<button type="button" class="btn-clear-search" id="btn-clear-sales-search">&times;</button>` : ""}
            
            <div class="date-picker-trigger-wrapper">
              <button type="button" class="btn-date-picker ${selectedDate ? "btn-date-picker--active" : ""}" id="btn-trigger-date" title="Filter by Date">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </button>
              <input type="date" id="sales-date-picker-input" class="hidden-date-input" value="${selectedDate}" />
            </div>
          </div>

          ${
            selectedDate
              ? `
            <div class="active-date-pill-row">
              <span class="active-date-pill">📅 Date: ${selectedDate} <button type="button" id="btn-clear-date">&times;</button></span>
            </div>
          `
              : ""
          }

          <div class="filter-pills-row">
            <button type="button" class="filter-pill ${statusFilter === "all" ? "filter-pill--active" : ""}" data-status="all">All (${allSales.length})</button>
            <button type="button" class="filter-pill filter-pill--paid ${statusFilter === "paid" ? "filter-pill--active" : ""}" data-status="paid">Paid (${paidCount})</button>
            <button type="button" class="filter-pill filter-pill--unpaid ${statusFilter === "not_paid" ? "filter-pill--active" : ""}" data-status="not_paid">Unpaid (${unpaidCount})</button>
          </div>
        </div>

        <!-- Sales Compact Cards List -->
        <div class="sales-list-body">
          ${
            filteredSales.length === 0
              ? `
              <div class="empty-state">
                <div class="empty-icon">🧾</div>
                <h4>No Sales Found</h4>
                <p>${searchQuery || selectedDate || statusFilter !== "all" ? "No sales match your search filters." : `No sales recorded yet.`}</p>
              </div>
            `
              : filteredSales
                  .map((sale, idx) => renderCompactSaleTileHtml(sale, idx))
                  .join("")
          }
        </div>
      </div>
    `;

    // Attach Event Listeners
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

    const triggerDateBtn = root.querySelector("#btn-trigger-date");
    const dateInput = root.querySelector("#sales-date-picker-input");
    if (triggerDateBtn && dateInput) {
      triggerDateBtn.addEventListener("click", () => {
        if (typeof dateInput.showPicker === "function") {
          dateInput.showPicker();
        } else {
          dateInput.focus();
          dateInput.click();
        }
      });

      dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        renderViewSalesUI();
      });
    }

    const clearDateBtn = root.querySelector("#btn-clear-date");
    if (clearDateBtn) {
      clearDateBtn.addEventListener("click", () => {
        selectedDate = "";
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

    // Compact Tile Click Handlers -> Navigates to Detailed Sub-Page View
    const compactTiles = root.querySelectorAll(".compact-sale-tile");
    compactTiles.forEach((tile) => {
      tile.addEventListener("click", () => {
        const idx = Number(tile.dataset.index);
        const targetSale = filteredSales[idx];
        if (targetSale) {
          selectedSale = targetSale;
          renderViewSalesUI();
        }
      });
    });
  }

  // Clean Date & Time Helpers
  function formatCleanDate(rawDate, timestamp) {
    if (rawDate && typeof rawDate === "string") {
      const clean = rawDate.split("T")[0];
      if (clean.length === 10) return clean;
    }
    if (timestamp) {
      try {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
      } catch (e) {}
    }
    return rawDate || "N/A";
  }

  function formatCleanTime(timestamp) {
    if (!timestamp) return "";
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      }
    } catch (e) {}
    return "";
  }

  // Compact Tile Renderer (Customer Name, Total Price, Sale Date, Paid Status)
  function renderCompactSaleTileHtml(sale, index) {
    const isPaid = sale.paymentStatus === "paid";
    const dateStr = formatCleanDate(sale.date, sale.timestamp);
    const grandTotal = Number(sale.grandTotal) || 0;

    return `
      <div class="compact-sale-tile ${isPaid ? "compact-sale-tile--paid" : "compact-sale-tile--unpaid"}" data-index="${index}">
        <div class="tile-left">
          <span class="tile-customer-name">${escapeHtml(sale.customerName || "Walk-in Customer")}</span>
          <span class="tile-date">📅 ${escapeHtml(dateStr)}</span>
        </div>
        <div class="tile-right">
          <span class="tile-amount">OMR ${grandTotal.toFixed(3)}</span>
          <span class="tile-badge ${isPaid ? "tile-badge--paid" : "tile-badge--unpaid"}">
            ${isPaid ? "✓ Paid" : "⏳ Unpaid"}
          </span>
        </div>
      </div>
    `;
  }

  // Clean Detailed Sub-Page View (Replaces Form Panel View with zero double-nesting)
  function renderDetailSubPageUI(sale) {
    const root = document.getElementById("view-sales-root");
    if (!root) return;

    const isPaid = sale.paymentStatus === "paid";
    const dateStr = formatCleanDate(sale.date, sale.timestamp);
    const timeStr = formatCleanTime(sale.timestamp);
    const dateTimeStr = timeStr ? `${dateStr} • ${timeStr}` : dateStr;

    const grandTotal = Number(sale.grandTotal) || 0;
    const cashAmt = Number(sale.cashAmount) || 0;
    const cardAmt = Number(sale.cardAmount) || 0;
    const isVat = sale.vatBill === "yes";

    let pMethodLabel = "Cash";
    if (sale.paymentMethod === "card") pMethodLabel = "Card";
    else if (sale.paymentMethod === "both") pMethodLabel = "Both (Cash + Card)";

    const itemsFormatted = (sale.itemsDetail || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    root.innerHTML = `
      <div class="view-sales-container detail-subpage-view">
        <!-- Sub-Page Header with Back Button -->
        <div class="detail-nav-bar">
          <button type="button" class="btn-back-to-list" id="btn-back-to-sales">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Back to Sales</span>
          </button>

          <span class="tile-badge ${isPaid ? "tile-badge--paid" : "tile-badge--unpaid"}">
            ${isPaid ? "✓ Paid" : "⏳ Unpaid"}
          </span>
        </div>

        <div class="detail-scroll-area">
          <!-- Sale Customer Header -->
          <div class="detail-card detail-card--header">
            <div class="detail-header-top">
              <span class="receipt-icon">🧾</span>
              <div class="header-main-meta">
                <h3 class="detail-cust-title">${escapeHtml(sale.customerName || "Walk-in Customer")}</h3>
                <span class="detail-timestamp">📅 ${escapeHtml(dateTimeStr)}</span>
              </div>
            </div>
          </div>

          <!-- Customer Contact Details -->
          <div class="detail-card">
            <h4 class="card-section-label">Customer Info</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-lbl">Phone Number</span>
                <span class="info-val">${sale.customerNumber ? `<a href="tel:${escapeHtml(sale.customerNumber)}" class="contact-link">📞 ${escapeHtml(sale.customerNumber)}</a>` : "N/A"}</span>
              </div>
              <div class="info-item">
                <span class="info-lbl">Email Address</span>
                <span class="info-val">${sale.customerEmail ? `<a href="mailto:${escapeHtml(sale.customerEmail)}" class="contact-link">✉️ ${escapeHtml(sale.customerEmail)}</a>` : "N/A"}</span>
              </div>
            </div>
          </div>

          <!-- Purchased Items Breakdown -->
          <div class="detail-card">
            <h4 class="card-section-label">Purchased Items (${itemsFormatted.length})</h4>
            <div class="purchased-items-list">
              ${
                itemsFormatted.length > 0
                  ? itemsFormatted.map((it) => `<div class="purchased-item-row"><span class="bullet">•</span> <span>${escapeHtml(it)}</span></div>`).join("")
                  : `<div class="purchased-item-row">• General Sale Item</div>`
              }
            </div>
          </div>

          <!-- Payment Breakdown -->
          <div class="detail-card detail-card--payment">
            <h4 class="card-section-label">Payment Breakdown</h4>
            <div class="pay-row">
              <span class="pay-lbl">VAT Status</span>
              <span class="pay-val">${isVat ? "Yes (5% VAT)" : "No VAT (0%)"}</span>
            </div>
            <div class="pay-row">
              <span class="pay-lbl">Payment Method</span>
              <span class="pay-val">${escapeHtml(pMethodLabel)}</span>
            </div>

            ${
              sale.paymentMethod === "both" || cashAmt > 0
                ? `
              <div class="pay-row">
                <span class="pay-lbl">Cash Paid</span>
                <span class="pay-val">OMR ${cashAmt.toFixed(3)}</span>
              </div>
            `
                : ""
            }

            ${
              sale.paymentMethod === "both" || cardAmt > 0
                ? `
              <div class="pay-row">
                <span class="pay-lbl">Card Paid</span>
                <span class="pay-val">OMR ${cardAmt.toFixed(3)}</span>
              </div>
            `
                : ""
            }

            <div class="pay-row pay-row--total">
              <span class="pay-lbl bold">Grand Total</span>
              <span class="pay-val total-amount-big">OMR ${grandTotal.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const backBtn = root.querySelector("#btn-back-to-sales");

    function returnToList() {
      selectedSale = null;
      renderViewSalesUI();
    }

    if (backBtn) backBtn.addEventListener("click", returnToList);
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
      window.addEventListener("branchChanged", () => {
        selectedSale = null;
        renderViewSalesUI();
      });
      window.addEventListener("inventoryDataChanged", () => renderViewSalesUI());
    }
    renderViewSalesUI();
  };
})();
