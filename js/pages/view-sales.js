// js/pages/view-sales.js - View Sales History Component with Smooth Target List Search & Modal Detail View

window.initViewSales = (function () {
  let initialized = false;
  let searchQuery = "";
  let statusFilter = "today"; // Default filter pill: "today"
  let selectedDate = "";

  // Month Stats Filter State (Default: Current Month YYYY-MM)
  let selectedStatsMonth = getCurrentMonthKey();

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

  function normalizeSearchText(val) {
    if (val === null || val === undefined) return "";
    return String(val).toLowerCase().trim().replace(/\s+/g, " ");
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

  function getFilteredSalesData() {
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

    const todayStr = getTodayDateString();

    return allSales.filter((sale) => {
      const ymd = getNormalizedYMD(sale.date);

      if (selectedDate && ymd !== selectedDate) {
        return false;
      }

      const isRefunded = sale.refundStatus === "REFUNDED" || sale.paymentStatus === "refunded" || Boolean(sale.isRefunded);

      if (statusFilter === "today") {
        if (ymd !== todayStr) return false;
      } else if (statusFilter === "paid") {
        if (sale.paymentStatus !== "paid" || isRefunded) return false;
      } else if (statusFilter === "not_paid") {
        if (sale.paymentStatus !== "not_paid" || isRefunded) return false;
      }

      if (searchQuery) {
        const q = normalizeSearchText(searchQuery);
        const tokens = q.split(/\s+/).filter(Boolean);

        if (tokens.length > 0) {
          const custName = normalizeSearchText(sale.customerName);
          const custPhone = normalizeSearchText(sale.customerNumber || sale.customerPhone);
          const custEmail = normalizeSearchText(sale.customerEmail);
          const itemsText = normalizeSearchText(sale.itemsDetail);

          let itemArrayText = "";
          if (Array.isArray(sale.items)) {
            itemArrayText = sale.items
              .map((it) => `${it.name || ""} ${it.sku || ""} ${it.category || ""}`)
              .join(" ");
            itemArrayText = normalizeSearchText(itemArrayText);
          }

          const combinedSaleText = `${custName} ${custPhone} ${custEmail} ${itemsText} ${itemArrayText}`;

          const matchesAllTokens = tokens.every((token) => combinedSaleText.includes(token));
          if (!matchesAllTokens) return false;
        }
      }

      return true;
    });
  }

  function renderViewSalesUI() {
    const root = document.getElementById("view-sales-root");
    if (!root) return;

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

    const todayStr = getTodayDateString();
    let statsRevenue = 0;
    let statsSalesCount = 0;
    let statsPaidCount = 0;
    let todayCount = 0;
    let pillAllCount = 0;
    let pillPaidCount = 0;
    let pillUnpaidCount = 0;

    allSales.forEach((s) => {
      const ymd = getNormalizedYMD(s.date);
      if (ymd && ymd.length >= 7) {
        monthSet.add(ymd.slice(0, 7));
      }
      const isRefunded = s.refundStatus === "REFUNDED" || s.paymentStatus === "refunded" || Boolean(s.isRefunded);
      const isPaid = s.paymentStatus === "paid";
      const isUnpaid = s.paymentStatus === "not_paid";

      // Monthly stats calculation
      const sMonthKey = ymd ? ymd.slice(0, 7) : "";
      const isMatchingMonth = selectedStatsMonth === "all" || sMonthKey === selectedStatsMonth;
      if (isMatchingMonth && !isRefunded) {
        statsSalesCount++;
        if (isPaid) {
          statsRevenue += Number(s.grandTotal) || 0;
          statsPaidCount++;
        }
      }

      // Filter pill counts
      if (ymd === todayStr && !isRefunded) {
        todayCount++;
      }
      const matchesPickedDate = !selectedDate || (ymd === selectedDate);
      if (matchesPickedDate && !isRefunded) {
        pillAllCount++;
        if (isPaid) pillPaidCount++;
        else if (isUnpaid) pillUnpaidCount++;
      }
    });

    const availableMonthKeys = Array.from(monthSet).sort((a, b) => b.localeCompare(a));


    const filteredSales = getFilteredSalesData();
    const activeMonthLabel = formatMonthLabel(selectedStatsMonth);

    // Component Helper Configurations
    const syncBtnHtml = window.renderSyncButtonHtml ? window.renderSyncButtonHtml("btn-sync-sales") : "";
    const isAdmin = window.Auth ? window.Auth.isAdmin() : false;

    const statCardsHtml = isAdmin
      ? `
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
    `
      : "";

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
          placeholder: "Search customer, item/SKU, phone, or email...",
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
          ${renderSalesListItemsHtml(filteredSales)}
        </div>
      </div>
    `;

    bindSalesEvents(root, availableMonthKeys);
  }

  function renderSalesListItemsHtml(filteredSales) {
    if (filteredSales.length === 0) {
      return `
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
      `;
    }

    return filteredSales.map((sale, idx) => renderCompactSaleTileHtml(sale, idx)).join("");
  }

  function bindSalesEvents(root, availableMonthKeys) {
    const syncBtn = root.querySelector("#btn-sync-sales");
    if (syncBtn && window.bindSyncButtonEvent) {
      window.bindSyncButtonEvent(syncBtn);
    }

    const card1 = root.querySelector("#btn-stats-month-1");
    const card2 = root.querySelector("#btn-stats-month-2");

    function handleStatsMonthClick() {
      openMonthPickerModal(availableMonthKeys, selectedStatsMonth, (chosenMonth) => {
        selectedStatsMonth = chosenMonth;
        if (window.UI) window.UI.toast(`Stats period updated to "${formatMonthLabel(chosenMonth)}"`, "info");
        renderViewSalesUI();
      });
    }

    if (card1) card1.addEventListener("click", handleStatsMonthClick);
    if (card2) card2.addEventListener("click", handleStatsMonthClick);

    // TARGETED SEARCH: Updates ONLY list body so input focus is NEVER destroyed!
    const searchIn = root.querySelector("#sales-search-input");
    if (searchIn) {
      searchIn.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        updateSalesListBodyOnly(root);
      });
    }

    const clearSearchBtn = root.querySelector("#btn-clear-sales-search");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        searchQuery = "";
        if (searchIn) searchIn.value = "";
        updateSalesListBodyOnly(root);
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
        filterBtns.forEach((b) => b.classList.toggle("filter-pill--active", b === btn));
        updateSalesListBodyOnly(root);
      });
    });

    bindTileClickEvents(root);
  }

  function updateSalesListBodyOnly(root) {
    const listBody = root.querySelector(".sales-list-body");
    if (!listBody) {
      renderViewSalesUI();
      return;
    }

    const filteredSales = getFilteredSalesData();
    listBody.innerHTML = renderSalesListItemsHtml(filteredSales);
    bindTileClickEvents(root, filteredSales);
  }

  function bindTileClickEvents(root, customFilteredSales) {
    const filteredSales = customFilteredSales || getFilteredSalesData();
    const compactTiles = root.querySelectorAll(".compact-sale-tile, .compact-tile");
    compactTiles.forEach((tile) => {
      tile.addEventListener("click", () => {
        const idx = Number(tile.dataset.index);
        const targetSale = filteredSales[idx];
        if (targetSale) {
          openSaleDetailModal(targetSale);
        }
      });
    });
  }

  // Top-Level Viewport Month Picker Modal Overlay
  function openMonthPickerModal(availableMonthKeys, selectedMonth, onSelect) {
    const existing = document.querySelector(".dp-modal-backdrop");
    if (existing) existing.remove();

    let tempSelected = selectedMonth;
    const currentKey = getCurrentMonthKey();

    const backdrop = document.createElement("div");
    backdrop.className = "dp-modal-backdrop";

    function renderModalContent() {
      backdrop.innerHTML = `
        <div class="dp-modal-card" style="max-width: 360px;">
          <!-- Header Bar -->
          <div class="dp-header">
            <div class="dp-title-bar">
              <span class="dp-title-text">SELECT TIME PERIOD</span>
              <button type="button" class="dp-btn-close" id="dp-btn-close">&times;</button>
            </div>
          </div>

          <!-- Body Container -->
          <div class="dp-body" style="min-height: 200px; max-height: 320px; overflow-y: auto; padding: 12px 14px;">
            <div class="dp-months-grid" style="grid-template-columns: 1fr; gap: 8px;">
              <button type="button" class="dp-month-option ${tempSelected === "all" ? "dp-month-option--selected" : ""}" data-month="all" style="text-align: left; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <strong style="display: block; font-size: 13px;">ALL TIME</strong>
                  <span style="font-size: 11px; opacity: 0.8; font-weight: 500;">Total Revenue & Sales across all time</span>
                </div>
                ${tempSelected === "all" ? `<span style="font-weight: 800; font-size: 14px;">✓</span>` : ""}
              </button>

              ${availableMonthKeys
                .map((mKey) => {
                  const label = formatMonthLabel(mKey);
                  const isCurrent = mKey === currentKey;
                  const isSelected = tempSelected === mKey;
                  return `
                    <button type="button" class="dp-month-option ${isSelected ? "dp-month-option--selected" : ""}" data-month="${mKey}" style="text-align: left; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <strong style="display: block; font-size: 13px;">${escapeHtml(label)} ${isCurrent ? `<span style="font-size: 10px; background: rgba(69, 103, 250, 0.15); color: #4567fa; padding: 2px 6px; border-radius: 6px; margin-left: 6px;">Current</span>` : ""}</strong>
                        <span style="font-size: 11px; opacity: 0.8; font-weight: 500;">Filter stats for ${escapeHtml(label)}</span>
                      </div>
                      ${isSelected ? `<span style="font-weight: 800; font-size: 14px;">✓</span>` : ""}
                    </button>
                  `;
                })
                .join("")}
            </div>
          </div>

          <!-- Footer Bar -->
          <div class="dp-footer" style="justify-content: flex-end;">
            <button type="button" class="dp-btn-cancel" id="dp-btn-cancel">Cancel</button>
            <button type="button" class="dp-btn-confirm" id="dp-btn-confirm">Set</button>
          </div>
        </div>
      `;

      // Events
      const closeBtn = backdrop.querySelector("#dp-btn-close");
      const cancelBtn = backdrop.querySelector("#dp-btn-cancel");
      const confirmBtn = backdrop.querySelector("#dp-btn-confirm");

      if (closeBtn) closeBtn.addEventListener("click", () => backdrop.remove());
      if (cancelBtn) cancelBtn.addEventListener("click", () => backdrop.remove());

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.remove();
      });

      backdrop.querySelectorAll(".dp-month-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          tempSelected = btn.dataset.month;
          renderModalContent();
        });
      });

      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          if (typeof onSelect === "function") {
            onSelect(tempSelected);
          }
          backdrop.remove();
        });
      }
    }

    renderModalContent();
    document.body.appendChild(backdrop);
  }

  // Top-Level Viewport Sale Detailed View Modal Overlay
  function openSaleDetailModal(sale) {
    const existing = document.querySelector(".sale-detail-modal-backdrop");
    if (existing) existing.remove();

    const isRefunded = sale.refundStatus === "REFUNDED" || sale.paymentStatus === "refunded" || Boolean(sale.isRefunded);
    const isPaid = sale.paymentStatus === "paid";
    const displayDateStr = formatDisplaySaleDate(sale.date);

    const grandTotal = Number(sale.grandTotal) || 0;
    const cashAmt = Number(sale.cashAmount) || 0;
    const cardAmt = Number(sale.cardAmount) || 0;
    const isVat = sale.vatBill === "yes";

    let pMethodLabel = "Cash";
    if (sale.paymentMethod === "card") pMethodLabel = "Card";
    else if (sale.paymentMethod === "both") pMethodLabel = "Both (Cash + Card)";

    let itemsFormatted = [];
    if (Array.isArray(sale.items) && sale.items.length > 0) {
      itemsFormatted = sale.items
        .map((it) => {
          const name = (it.name || "").trim();
          if (!name) return null;
          const qty = Number(it.qty) || 1;
          const price = Number(it.unitPrice || it.price || 0);
          return `${name} (Qty: ${qty}${price > 0 ? ` @ ${price.toFixed(3)}` : ""})`;
        })
        .filter(Boolean);
    }
    if (itemsFormatted.length === 0 && typeof sale.itemsDetail === "string" && sale.itemsDetail.trim()) {
      itemsFormatted = sale.itemsDetail
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }

    const backdrop = document.createElement("div");
    backdrop.className = "dp-modal-backdrop sale-detail-modal-backdrop";

    const badgeClass = isRefunded ? "tile-badge--refunded" : isPaid ? "tile-badge--paid" : "tile-badge--unpaid";
    const badgeText = isRefunded ? "↩ Refunded" : isPaid ? "✓ Paid" : "⏳ Unpaid";

    backdrop.innerHTML = `
      <div class="dp-modal-card" style="max-width: 440px; width: 92vw;">
        <!-- Header Bar -->
        <div class="dp-header">
          <div class="dp-title-bar">
            <span class="dp-title-text">SALE DETAILS</span>
            <button type="button" class="dp-btn-close" id="btn-close-sale-detail">&times;</button>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">${escapeHtml(sale.customerName || "Walk-in Customer")}</h3>
            <span class="tile-badge ${badgeClass}">
              ${badgeText}
            </span>
          </div>
          <span style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">Sale Date: ${escapeHtml(displayDateStr)}</span>
        </div>

        <!-- Body Container -->
        <div class="dp-body" style="max-height: 380px; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px;">
          <!-- Customer Info Card -->
          <div class="detail-card">
            <h4 class="card-section-label">Customer Info</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-lbl">Phone Number</span>
                <span class="info-val">${sale.customerNumber ? `<a href="tel:${escapeHtml(sale.customerNumber)}" class="contact-link">${escapeHtml(sale.customerNumber)}</a>` : "N/A"}</span>
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
                ? `<div class="pay-row"><span class="pay-lbl">Cash Paid</span><span class="pay-val">OMR ${cashAmt.toFixed(3)}</span></div>`
                : ""
            }
            ${
              sale.paymentMethod === "both" || cardAmt > 0
                ? `<div class="pay-row"><span class="pay-lbl">Card Paid</span><span class="pay-val">OMR ${cardAmt.toFixed(3)}</span></div>`
                : ""
            }
            <div class="pay-row pay-row--total">
              <span class="pay-lbl bold">Grand Total</span>
              <span class="pay-val total-amount-big" style="${isRefunded ? "color: #dc2626; text-decoration: line-through;" : ""}">OMR ${grandTotal.toFixed(3)}</span>
            </div>
          </div>
        </div>

        <!-- Footer Actions: Refund Sale (Red), Mark as Paid (Green if unpaid & not refunded), Close (Right) -->
        <div class="dp-footer dp-footer-actions-row">
          <div class="dp-footer-btn-group">
            ${
              isRefunded
                ? `<span class="tile-badge tile-badge--refunded" style="font-size: 11px; padding: 5px 10px; border-radius: 8px;">↩ Sale Refunded</span>`
                : `<button type="button" class="btn-refund-sale" id="btn-refund-sale">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    Refund Sale
                   </button>`
            }
            ${
              !isPaid && !isRefunded
                ? `<button type="button" class="btn-mark-paid" id="btn-mark-paid-sale">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Mark as Paid
                   </button>`
                : ""
            }
          </div>
          <button type="button" class="dp-btn-confirm" id="btn-close-sale-modal">Close</button>
        </div>
      </div>
    `;

    backdrop.querySelector("#btn-close-sale-detail").addEventListener("click", () => backdrop.remove());
    backdrop.querySelector("#btn-close-sale-modal").addEventListener("click", () => backdrop.remove());

    const refundBtn = backdrop.querySelector("#btn-refund-sale");
    if (refundBtn) {
      refundBtn.addEventListener("click", () => {
        const formattedTotal = grandTotal.toFixed(3);
        const confirmMsg = `Are you sure you want to refund this sale of OMR ${formattedTotal}?\n\nThis will return all purchased items back to inventory stock and revert monthly revenue and sales metrics.`;

        const doRefund = () => {
          const webAppUrl = window.APP_CONFIG ? (window.APP_CONFIG.googleSheetWebAppUrl || window.APP_CONFIG.webAppUrl || "") : "";
          const res = window.DataStore ? window.DataStore.refundSale(sale.id || sale, webAppUrl) : { success: false };
          if (res.success) {
            if (window.UI && typeof window.UI.toast === "function") {
              window.UI.toast("Sale refunded & stock returned to inventory!", "success");
            }
            backdrop.remove();
            renderViewSalesUI();
          } else {
            if (window.UI && typeof window.UI.toast === "function") {
              window.UI.toast(res.message || "Failed to refund sale", "error");
            }
          }
        };

        if (window.UI && typeof window.UI.modal === "function") {
          window.UI.modal({
            title: "Confirm Full Refund",
            message: confirmMsg,
            type: "danger",
            dangerConfirm: true,
            confirmText: "Yes, Refund Sale",
            cancelText: "Cancel",
            onConfirm: doRefund
          });
        } else if (window.confirm(confirmMsg)) {
          doRefund();
        }
      });
    }

    const markPaidBtn = backdrop.querySelector("#btn-mark-paid-sale");
    if (markPaidBtn) {
      markPaidBtn.addEventListener("click", () => {
        openPaymentCollectionModal(sale, () => {
          backdrop.remove();
          renderViewSalesUI();
        });
      });
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    document.body.appendChild(backdrop);
  }

  // Payment Collection Modal Overlay for Unpaid Sales
  function openPaymentCollectionModal(sale, onComplete) {
    const existing = document.querySelector(".pay-modal-backdrop");
    if (existing) existing.remove();

    const grandTotal = Number(sale.grandTotal) || 0;
    let selectedMethod = "cash";

    const backdrop = document.createElement("div");
    backdrop.className = "dp-modal-backdrop pay-modal-backdrop";

    backdrop.innerHTML = `
      <div class="dp-modal-card" style="max-width: 380px; width: 92vw;">
        <!-- Header Bar -->
        <div class="dp-header">
          <div class="dp-title-bar">
            <span class="dp-title-text">COLLECT PAYMENT</span>
            <button type="button" class="dp-btn-close" id="btn-close-pay-modal">&times;</button>
          </div>
          <div style="margin-top: 4px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0;">${escapeHtml(sale.customerName || "Walk-in Customer")}</h3>
            <span style="font-size: 11px; color: #64748b; font-weight: 600;">Total Due: <strong style="color: #16a34a; font-size: 14px;">OMR ${grandTotal.toFixed(3)}</strong></span>
          </div>
        </div>

        <!-- Body Container -->
        <div class="dp-body" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
          <!-- Payment Method Pills -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Payment Method</label>
            <div class="pay-method-toggle-row" style="display: flex; gap: 6px;">
              <button type="button" class="pay-method-pill pay-method-pill--active" data-method="cash" style="flex: 1; padding: 8px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1px solid #cbd5e1; background: #16a34a; color: #ffffff; cursor: pointer;">Cash</button>
              <button type="button" class="pay-method-pill" data-method="card" style="flex: 1; padding: 8px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; cursor: pointer;">Card</button>
              <button type="button" class="pay-method-pill" data-method="both" style="flex: 1; padding: 8px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; cursor: pointer;">Both</button>
            </div>
          </div>

          <!-- Cash Amount Field -->
          <div id="pay-cash-group" style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: #64748b;">Cash Amount (OMR)</label>
            <input type="number" id="pay-cash-input" step="0.001" value="${grandTotal.toFixed(3)}" style="width: 100%; padding: 8px 12px; font-size: 13px; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 8px; outline: none;" />
          </div>

          <!-- Card Amount Field -->
          <div id="pay-card-group" style="display: flex; flex-direction: column; gap: 4px; display: none;">
            <label style="font-size: 11px; font-weight: 700; color: #64748b;">Card Amount (OMR)</label>
            <input type="number" id="pay-card-input" step="0.001" value="0.000" disabled style="width: 100%; padding: 8px 12px; font-size: 13px; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; background: #f1f5f9;" />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="dp-footer" style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
          <button type="button" class="dp-btn-cancel" id="btn-cancel-pay-modal" style="height: 38px; padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid #cbd5e1; background: #ffffff; color: #475569;">Cancel</button>
          <button type="button" class="btn-mark-paid" id="btn-confirm-pay" style="height: 38px; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 700;">Confirm & Record Payment</button>
        </div>
      </div>
    `;

    // Internal Events & State Updates
    const methodPills = backdrop.querySelectorAll(".pay-method-pill");
    const cashGroup = backdrop.querySelector("#pay-cash-group");
    const cashIn = backdrop.querySelector("#pay-cash-input");
    const cardGroup = backdrop.querySelector("#pay-card-group");
    const cardIn = backdrop.querySelector("#pay-card-input");

    function updateFieldsForMethod(method) {
      selectedMethod = method;
      methodPills.forEach((p) => {
        const isSel = p.dataset.method === method;
        p.style.background = isSel ? "#16a34a" : "#f8fafc";
        p.style.color = isSel ? "#ffffff" : "#475569";
        p.style.borderColor = isSel ? "#16a34a" : "#cbd5e1";
      });

      if (method === "cash") {
        cashGroup.style.display = "flex";
        cardGroup.style.display = "none";
        cashIn.disabled = false;
        cashIn.value = grandTotal.toFixed(3);
        cardIn.disabled = true;
        cardIn.value = "0.000";
      } else if (method === "card") {
        cashGroup.style.display = "none";
        cardGroup.style.display = "flex";
        cashIn.disabled = true;
        cashIn.value = "0.000";
        cardIn.disabled = false;
        cardIn.value = grandTotal.toFixed(3);
      } else if (method === "both") {
        cashGroup.style.display = "flex";
        cardGroup.style.display = "flex";
        cashIn.disabled = false;
        cardIn.disabled = false;
        const half = Math.round((grandTotal / 2) * 1000) / 1000;
        cashIn.value = half.toFixed(3);
        cardIn.value = (grandTotal - half).toFixed(3);
      }
    }

    methodPills.forEach((p) => {
      p.addEventListener("click", () => updateFieldsForMethod(p.dataset.method));
    });

    if (cashIn) {
      cashIn.addEventListener("input", () => {
        if (selectedMethod === "both") {
          const cVal = parseFloat(cashIn.value) || 0;
          const remaining = Math.max(0, grandTotal - cVal);
          cardIn.value = remaining.toFixed(3);
        }
      });
    }

    if (cardIn) {
      cardIn.addEventListener("input", () => {
        if (selectedMethod === "both") {
          const cdVal = parseFloat(cardIn.value) || 0;
          const remaining = Math.max(0, grandTotal - cdVal);
          cashIn.value = remaining.toFixed(3);
        }
      });
    }

    const closeBtn = backdrop.querySelector("#btn-close-pay-modal");
    const cancelBtn = backdrop.querySelector("#btn-cancel-pay-modal");
    const confirmBtn = backdrop.querySelector("#btn-confirm-pay");

    if (closeBtn) closeBtn.addEventListener("click", () => backdrop.remove());
    if (cancelBtn) cancelBtn.addEventListener("click", () => backdrop.remove());

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        const cashVal = parseFloat(cashIn.value) || 0;
        const cardVal = parseFloat(cardIn.value) || 0;
        const enteredTotal = Math.round((cashVal + cardVal) * 1000) / 1000;

        if (Math.abs(enteredTotal - grandTotal) > 0.0001) {
          if (window.UI) {
            window.UI.toast(`Payment total (${enteredTotal.toFixed(3)}) does not match Grand Total (${grandTotal.toFixed(3)}).`, "warning");
          }
          return;
        }

        const webAppUrl = window.APP_CONFIG ? (window.APP_CONFIG.googleSheetWebAppUrl || window.APP_CONFIG.webAppUrl || "") : "";
        const res = window.DataStore ? window.DataStore.markSaleAsPaid(sale.id || sale, {
          paymentMethod: selectedMethod,
          cashAmount: cashVal,
          cardAmount: cardVal
        }, webAppUrl) : { success: false };

        if (res.success) {
          if (window.UI) {
            window.UI.toast(`Payment of OMR ${grandTotal.toFixed(3)} recorded! Sale marked as Paid.`, "success");
          }
          backdrop.remove();
          if (typeof onComplete === "function") onComplete();
        } else {
          if (window.UI) {
            window.UI.toast(res.message || "Failed to record payment", "error");
          }
        }
      });
    }

    document.body.appendChild(backdrop);
  }

  function renderCompactSaleTileHtml(sale, index) {
    const isRefunded = sale.refundStatus === "REFUNDED" || sale.paymentStatus === "refunded" || Boolean(sale.isRefunded);
    const isPaid = sale.paymentStatus === "paid";
    const displayDateStr = formatDisplaySaleDate(sale.date);
    const grandTotal = Number(sale.grandTotal) || 0;

    const badgeClass = isRefunded ? "tile-badge--refunded" : isPaid ? "tile-badge--paid" : "tile-badge--unpaid";
    const badgeText = isRefunded ? "↩ Refunded" : isPaid ? "✓ Paid" : "⏳ Unpaid";

    const badgeHtml = `
      <span class="tile-badge ${badgeClass}">
        ${badgeText}
      </span>
    `;

    const containerClass = `compact-sale-tile ${
      isRefunded
        ? "compact-sale-tile--refunded"
        : isPaid
        ? "compact-sale-tile--paid"
        : "compact-sale-tile--unpaid"
    }`;

    if (window.renderCompactTileHtml) {
      return window.renderCompactTileHtml({
        containerClass: containerClass,
        index: index,
        title: sale.customerName || "Walk-in Customer",
        subtitle: displayDateStr,
        metric: `OMR ${grandTotal.toFixed(3)}`,
        badgeHtml: badgeHtml
      });
    }

    return `
      <div class="compact-tile ${containerClass}" data-index="${index}">
        <div class="tile-left">
          <span class="tile-title">${escapeHtml(sale.customerName || "Walk-in Customer")}</span>
          <span class="tile-subtitle">${escapeHtml(displayDateStr)}</span>
        </div>
        <div class="tile-right">
          <span class="tile-metric" style="${isRefunded ? "text-decoration: line-through; opacity: 0.7;" : ""} ">OMR ${grandTotal.toFixed(3)}</span>
          ${badgeHtml}
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
      window.addEventListener("branchChanged", () => {
        statusFilter = "today";
        selectedStatsMonth = getCurrentMonthKey();
        renderViewSalesUI();
      });
      window.addEventListener("inventoryDataChanged", () => renderViewSalesUI());
    }
    renderViewSalesUI();
  };
})();
