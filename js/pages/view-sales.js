// js/pages/view-sales.js - View Sales History Component with Component Helpers

window.initViewSales = (function () {
  let initialized = false;
  let searchQuery = "";
  let statusFilter = "today"; // Default filter pill: "today"
  let selectedDate = "";
  let selectedSale = null;

  // Month Stats Filter State (Default: Current Month YYYY-MM)
  let selectedStatsMonth = getCurrentMonthKey();
  let isMonthPickerOpen = false;

  function getCurrentMonthKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function getTodayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatMonthLabel(monthKey) {
    if (monthKey === "all") return "ALL TIME";
    const parts = monthKey.split("-");
    if (parts.length !== 2) return monthKey;
    const year = parts[0];
    const monthIndex = Number(parts[1]) - 1;
    const d = new Date(Number(year), monthIndex, 1);
    const monthName = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    return `${monthName} ${year}`;
  }

  // Normalize Date to YYYY-MM-DD for internal comparisons & filtering
  function getNormalizedYMD(rawDate) {
    if (!rawDate) return "";

    if (typeof rawDate === "string") {
      const str = rawDate.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const parts = str.split("-");
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      if (str.includes("/")) {
        const cleanStr = str.replace(/[^\d\/]/g, "");
        const parts = cleanStr.split("/");
        if (parts.length === 3) {
          const d = parts[0].padStart(2, "0");
          const m = parts[1].padStart(2, "0");
          const y = parts[2].length === 2 ? "20" + parts[2] : parts[2];
          return `${y}-${m}-${d}`;
        }
      }
    }

    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    return String(rawDate).slice(0, 10);
  }

  function formatDisplaySaleDate(rawDate) {
    const ymd = getNormalizedYMD(rawDate);
    if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      const [y, m, d] = ymd.split("-");
      return `${d}-${m}-${y}`;
    }
    return rawDate || "N/A";
  }

  function renderViewSalesUI() {
    const root = document.getElementById("view-sales-root");
    if (!root) return;

    if (selectedSale) {
      renderDetailSubPageUI(selectedSale);
      return;
    }

    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const rawSales = window.DataStore ? window.DataStore.getSales(branch) : [];

    const allSales = [...rawSales].sort((a, b) => {
      const dateA = getNormalizedYMD(a.date);
      const dateB = getNormalizedYMD(b.date);
      const dateDiff = dateB.localeCompare(dateA);
      if (dateDiff !== 0) return dateDiff;

      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    });

    const monthSet = new Set();
    monthSet.add(getCurrentMonthKey());

    allSales.forEach((s) => {
      const ymd = getNormalizedYMD(s.date);
      if (ymd && ymd.length >= 7) {
        monthSet.add(ymd.slice(0, 7));
      }
    });
    const availableMonthKeys = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

    let statsRevenue = 0;
    let statsSalesCount = 0;
    let statsPaidCount = 0;

    allSales.forEach((s) => {
      const ymd = getNormalizedYMD(s.date);
      const sMonthKey = ymd ? ymd.slice(0, 7) : "";
      const isMatchingMonth = selectedStatsMonth === "all" || sMonthKey === selectedStatsMonth;

      if (isMatchingMonth) {
        statsSalesCount++;
        const gTotal = Number(s.grandTotal) || 0;
        if (s.paymentStatus === "paid") {
          statsRevenue += gTotal;
          statsPaidCount++;
        }
      }
    });

    const todayStr = getTodayDateString();

    let todayCount = 0;
    let pillAllCount = 0;
    let pillPaidCount = 0;
    let pillUnpaidCount = 0;

    allSales.forEach((s) => {
      const ymd = getNormalizedYMD(s.date);

      if (ymd === todayStr) {
        todayCount++;
      }

      const matchesPickedDate = !selectedDate || (ymd === selectedDate);

      if (matchesPickedDate) {
        pillAllCount++;
        if (s.paymentStatus === "paid") {
          pillPaidCount++;
        } else if (s.paymentStatus === "not_paid") {
          pillUnpaidCount++;
        }
      }
    });

    const filteredSales = allSales.filter((sale) => {
      const ymd = getNormalizedYMD(sale.date);

      if (selectedDate && ymd !== selectedDate) {
        return false;
      }

      if (statusFilter === "today") {
        if (ymd !== todayStr) return false;
      } else if (statusFilter === "paid") {
        if (sale.paymentStatus !== "paid") return false;
      } else if (statusFilter === "not_paid") {
        if (sale.paymentStatus !== "not_paid") return false;
      }

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

    const activeMonthLabel = formatMonthLabel(selectedStatsMonth);

    // Component Helper Configurations
    const syncBtnHtml = window.renderSyncButtonHtml ? window.renderSyncButtonHtml("btn-sync-sales") : "";

    const statCardsHtml = `
      <div class="sales-stats-row">
        ${
          window.renderStatCardHtml
            ? window.renderStatCardHtml({
                id: "btn-stats-month-1",
                interactive: true,
                cardClass: "stat-card--interactive stat-card--revenue",
                title: "Click to change month period",
                label: `Revenue (${activeMonthLabel})`,
                value: `OMR ${statsRevenue.toFixed(3)}`
              })
            : ""
        }
        ${
          window.renderStatCardHtml
            ? window.renderStatCardHtml({
                id: "btn-stats-month-2",
                interactive: true,
                cardClass: "stat-card--interactive stat-card--count",
                title: "Click to change month period",
                label: `Sales (${activeMonthLabel})`,
                value: `${statsSalesCount} (${statsPaidCount} Paid)`
              })
            : ""
        }
      </div>
    `;

    const dateTriggerExtraHtml = `
      <div class="date-picker-trigger-wrapper">
        <button type="button" class="btn-date-picker ${selectedDate ? "btn-date-picker--active" : ""}" id="btn-trigger-date" title="Filter by Date">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </button>
      </div>
    `;

    const searchBoxHtml = window.renderSearchBoxHtml
      ? window.renderSearchBoxHtml({
          id: "sales-search-input",
          placeholder: "Search customer, phone, or item...",
          value: searchQuery,
          clearBtnId: "btn-clear-sales-search",
          extraRightHtml: dateTriggerExtraHtml
        })
      : "";

    const filterPillsConfig = [
      {
        status: "today",
        label: "Today",
        count: todayCount,
        colorTheme: "today",
        isActive: statusFilter === "today" && !selectedDate,
        disabled: Boolean(selectedDate),
        title: selectedDate ? "Clear date picker filter to enable Today button" : ""
      },
      { status: "all", label: "All", count: pillAllCount, isActive: statusFilter === "all" },
      { status: "paid", label: "Paid", count: pillPaidCount, colorTheme: "paid", isActive: statusFilter === "paid" },
      { status: "not_paid", label: "Unpaid", count: pillUnpaidCount, colorTheme: "unpaid", isActive: statusFilter === "not_paid" }
    ];

    const filterPillsHtml = window.renderFilterPillsHtml ? window.renderFilterPillsHtml(filterPillsConfig) : "";

    root.innerHTML = `
      <div class="view-sales-container">
        <!-- Header & Interactive Month Stat Cards -->
        <div class="sales-page-header">
          <div class="header-titles">
            <h3 class="page-title">Sales History</h3>
            ${syncBtnHtml}
          </div>

          ${statCardsHtml}
        </div>

        <!-- Search, Date Picker & Filter Controls -->
        <div class="sales-controls-bar">
          ${searchBoxHtml}

          ${
            selectedDate
              ? `
            <div class="active-date-pill-row">
              <span class="active-date-pill">Date: ${formatDisplaySaleDate(selectedDate)} <button type="button" id="btn-clear-date">&times;</button></span>
            </div>
          `
              : ""
          }

          ${filterPillsHtml}
        </div>

        <!-- Sales Compact Cards List (Newest Sales Top) -->
        <div class="sales-list-body">
          ${
            filteredSales.length === 0
              ? `
              <div class="empty-state">
                <h4>No Sales Found</h4>
                <p>${
                  statusFilter === "today"
                    ? "No sales recorded yet today."
                    : searchQuery || selectedDate || statusFilter !== "all"
                    ? "No sales match your search filters."
                    : `No sales recorded in the past 6 months.`
                }</p>
              </div>
            `
              : filteredSales
                  .map((sale, idx) => renderCompactSaleTileHtml(sale, idx))
                  .join("")
          }
        </div>

        <!-- Period Selector Modal -->
        ${isMonthPickerOpen ? renderMonthPickerModalHtml(availableMonthKeys) : ""}
      </div>
    `;

    // Attach Event Listeners
    const syncBtn = root.querySelector("#btn-sync-sales");
    if (syncBtn && window.bindSyncButtonEvent) {
      window.bindSyncButtonEvent(syncBtn);
    }

    const card1 = root.querySelector("#btn-stats-month-1");
    const card2 = root.querySelector("#btn-stats-month-2");

    function toggleMonthPicker() {
      isMonthPickerOpen = !isMonthPickerOpen;
      renderViewSalesUI();
    }

    if (card1) card1.addEventListener("click", toggleMonthPicker);
    if (card2) card2.addEventListener("click", toggleMonthPicker);

    // Month Selector Modal Events
    if (isMonthPickerOpen) {
      const modalBackdrop = root.querySelector(".month-modal-backdrop");
      const closeBtn = root.querySelector("#btn-close-month-modal");
      const optBtns = root.querySelectorAll(".month-opt-btn");

      if (modalBackdrop) {
        modalBackdrop.addEventListener("click", (e) => {
          if (e.target === modalBackdrop) {
            isMonthPickerOpen = false;
            renderViewSalesUI();
          }
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          isMonthPickerOpen = false;
          renderViewSalesUI();
        });
      }

      optBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedStatsMonth = btn.dataset.month;
          isMonthPickerOpen = false;
          renderViewSalesUI();
        });
      });
    }

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
    if (triggerDateBtn) {
      triggerDateBtn.addEventListener("click", () => {
        if (window.DatePicker) {
          window.DatePicker.open({
            title: "Filter by Date",
            initialDate: selectedDate || getTodayDateString(),
            onSelect: (chosenYMD) => {
              selectedDate = chosenYMD;
              if (selectedDate) {
                statusFilter = "all";
              }
              renderViewSalesUI();
            },
            onClear: () => {
              selectedDate = "";
              statusFilter = "today";
              renderViewSalesUI();
            }
          });
        }
      });
    }

    const clearDateBtn = root.querySelector("#btn-clear-date");
    if (clearDateBtn) {
      clearDateBtn.addEventListener("click", () => {
        selectedDate = "";
        statusFilter = "today";
        renderViewSalesUI();
      });
    }

    const filterBtns = root.querySelectorAll(".filter-pill:not([disabled])");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        statusFilter = btn.dataset.status;
        renderViewSalesUI();
      });
    });

    const compactTiles = root.querySelectorAll(".compact-sale-tile, .compact-tile");
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

  function renderMonthPickerModalHtml(availableMonthKeys) {
    const currentKey = getCurrentMonthKey();

    return `
      <div class="month-modal-backdrop">
        <div class="month-modal-card">
          <div class="month-modal-header">
            <h4 class="month-modal-title">Select Time Period</h4>
            <button type="button" class="btn-close-month-modal" id="btn-close-month-modal">&times;</button>
          </div>

          <div class="month-modal-body">
            <button type="button" class="month-opt-btn ${selectedStatsMonth === "all" ? "month-opt-btn--selected" : ""}" data-month="all">
              <span class="opt-label">ALL TIME</span>
              <span class="opt-desc">Total Revenue & Sales across all time</span>
              ${selectedStatsMonth === "all" ? `<span class="opt-check">✓</span>` : ""}
            </button>

            <div class="month-opts-divider">MONTHLY PERIODS</div>

            ${availableMonthKeys
              .map((mKey) => {
                const label = formatMonthLabel(mKey);
                const isCurrent = mKey === currentKey;
                const isSelected = selectedStatsMonth === mKey;
                return `
                <button type="button" class="month-opt-btn ${isSelected ? "month-opt-btn--selected" : ""}" data-month="${mKey}">
                  <div class="opt-left">
                    <span class="opt-label">${escapeHtml(label)}</span>
                    ${isCurrent ? `<span class="opt-tag-current">Current Month</span>` : ""}
                  </div>
                  ${isSelected ? `<span class="opt-check">✓</span>` : ""}
                </button>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderCompactSaleTileHtml(sale, index) {
    const isPaid = sale.paymentStatus === "paid";
    const displayDateStr = formatDisplaySaleDate(sale.date);
    const grandTotal = Number(sale.grandTotal) || 0;

    const badgeHtml = `
      <span class="tile-badge ${isPaid ? "tile-badge--paid" : "tile-badge--unpaid"}">
        ${isPaid ? "✓ Paid" : "⏳ Unpaid"}
      </span>
    `;

    if (window.renderCompactTileHtml) {
      return window.renderCompactTileHtml({
        containerClass: `compact-sale-tile ${isPaid ? "compact-sale-tile--paid" : "compact-sale-tile--unpaid"}`,
        index: index,
        title: sale.customerName || "Walk-in Customer",
        subtitle: displayDateStr,
        metric: `OMR ${grandTotal.toFixed(3)}`,
        badgeHtml: badgeHtml
      });
    }

    return `
      <div class="compact-tile compact-sale-tile ${isPaid ? "compact-sale-tile--paid" : "compact-sale-tile--unpaid"}" data-index="${index}">
        <div class="tile-left">
          <span class="tile-title">${escapeHtml(sale.customerName || "Walk-in Customer")}</span>
          <span class="tile-subtitle">${escapeHtml(displayDateStr)}</span>
        </div>
        <div class="tile-right">
          <span class="tile-metric">OMR ${grandTotal.toFixed(3)}</span>
          ${badgeHtml}
        </div>
      </div>
    `;
  }

  function renderDetailSubPageUI(sale) {
    const root = document.getElementById("view-sales-root");
    if (!root) return;

    const isPaid = sale.paymentStatus === "paid";
    const displayDateStr = formatDisplaySaleDate(sale.date);

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

    const badgeHtml = `
      <span class="tile-badge ${isPaid ? "tile-badge--paid" : "tile-badge--unpaid"}">
        ${isPaid ? "✓ Paid" : "⏳ Unpaid"}
      </span>
    `;

    const contentCardsHtml = `
      <!-- Sale Customer Header -->
      <div class="detail-card detail-card--header">
        <div class="detail-header-top">
          <div class="header-main-meta">
            <h3 class="detail-cust-title">${escapeHtml(sale.customerName || "Walk-in Customer")}</h3>
            <span class="detail-timestamp">Sale Date: ${escapeHtml(displayDateStr)}</span>
          </div>
        </div>
      </div>

      <!-- Customer Contact Details -->
      <div class="detail-card">
        <h4 class="card-section-label">Customer Info</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-lbl">Phone Number</span>
            <span class="info-val">${sale.customerNumber ? `<a href="tel:${escapeHtml(sale.customerNumber)}" class="contact-link">${escapeHtml(sale.customerNumber)}</a>` : "N/A"}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">Email Address</span>
            <span class="info-val">${sale.customerEmail ? `<a href="mailto:${escapeHtml(sale.customerEmail)}" class="contact-link">${escapeHtml(sale.customerEmail)}</a>` : "N/A"}</span>
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
    `;

    const subPageHtml = window.renderDetailSubPageWrapperHtml
      ? window.renderDetailSubPageWrapperHtml({
          backBtnId: "btn-back-to-sales",
          backLabel: "Back to Sales",
          badgeHtml: badgeHtml,
          contentCardsHtml: contentCardsHtml
        })
      : "";

    root.innerHTML = `<div class="view-sales-container">${subPageHtml}</div>`;

    const backBtn = root.querySelector("#btn-back-to-sales");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        selectedSale = null;
        renderViewSalesUI();
      });
    }
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
        statusFilter = "today";
        selectedStatsMonth = getCurrentMonthKey();
        renderViewSalesUI();
      });
      window.addEventListener("inventoryDataChanged", () => renderViewSalesUI());
    }
    renderViewSalesUI();
  };
})();
