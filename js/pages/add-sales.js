// js/pages/add-sales.js - Add Sales Multi-Section Form Component with Dynamic Calculation

const FORM_DEFAULTS = {
  vatBill: "no",
  paymentStatus: "paid",
  paymentMethod: "cash",
  item: { name: "", category: "General", qty: 1, unitPrice: 0 },
  googleSheetWebAppUrl: window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : ""
};

function formatOMR(val) {
  const num = Number(val) || 0;
  return `OMR ${num.toFixed(3)}`;
}

function roundOMR(val) {
  return Math.round((Number(val) || 0) * 1000) / 1000;
}

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function createDefaultItem() {
  return {
    id: Date.now() + Math.random(),
    name: FORM_DEFAULTS.item.name,
    category: FORM_DEFAULTS.item.category,
    qty: FORM_DEFAULTS.item.qty,
    unitPrice: FORM_DEFAULTS.item.unitPrice
  };
}

window.initAddSales = (function () {
  let initialized = false;

  const htmlTemplate = `
<div class="add-sales-container">
  <!-- Section 1: Customer Details -->
  <div class="form-section form-section--active" data-section="1">
    <div class="section-header">
      <h3 class="section-title">Add Sales</h3>
      <div class="header-actions">
        <button type="button" class="btn-clear btn-clear--section" data-action="clear-section" data-section="1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Clear Section
        </button>
        <button type="button" class="btn-clear btn-clear--form" data-action="clear-form">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          Clear Form
        </button>
      </div>
    </div>

    <div class="form-body">
      <div class="form-group">
        <label class="form-label" for="sale-date">Date <span class="required-star">*</span></label>
        <div class="input-with-icon-wrapper">
          <input type="text" id="sale-date" class="form-input form-input--date-custom" readonly placeholder="Select Date" required />
          <span class="input-calendar-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="customer-name">Customer Name <span class="required-star">*</span></label>
        <input type="text" id="customer-name" class="form-input" placeholder="Enter customer name" required />
      </div>

      <div class="form-group">
        <label class="form-label" for="customer-number">Customer Number</label>
        <input type="tel" id="customer-number" class="form-input" placeholder="Enter phone number" />
      </div>

      <div class="form-group">
        <label class="form-label" for="customer-email">Customer Email</label>
        <input type="email" id="customer-email" class="form-input" placeholder="Enter email address" />
      </div>
    </div>

    <div class="section-nav">
      <button type="button" class="section-nav-btn section-nav-btn--back" disabled>&lt; Back</button>
      <span class="section-nav-title">1 / 3: Customer Info</span>
      <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next">Next &gt;</button>
    </div>
  </div>

  <!-- Section 2: Item Details -->
  <div class="form-section" data-section="2" hidden>
    <div class="section-header">
      <h3 class="section-title">Add Sales</h3>
      <div class="header-actions">
        <button type="button" class="btn-clear btn-clear--section" data-action="clear-section" data-section="2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Clear Section
        </button>
        <button type="button" class="btn-clear btn-clear--form" data-action="clear-form">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          Clear Form
        </button>
      </div>
    </div>

    <div class="form-body">
      <div class="items-list" id="items-list"></div>

      <button type="button" class="btn-add-row" id="btn-add-item-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"></path></svg>
        Add New Item
      </button>

      <div class="summary-card">
        <span class="summary-label">Total:</span>
        <span class="summary-value" id="items-subtotal-display">OMR 0.000</span>
      </div>
    </div>

    <div class="section-nav">
      <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back">&lt; Back</button>
      <span class="section-nav-title">2 / 3: Items Info</span>
      <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next">&gt; Next</button>
    </div>
  </div>

  <!-- Section 3: Payment Details -->
  <div class="form-section" data-section="3" hidden>
    <div class="section-header">
      <h3 class="section-title">Add Sales</h3>
      <div class="header-actions">
        <button type="button" class="btn-clear btn-clear--section" data-action="clear-section" data-section="3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Clear Section
        </button>
        <button type="button" class="btn-clear btn-clear--form" data-action="clear-form">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          Clear Form
        </button>
      </div>
    </div>

    <div class="form-body">
      <div class="form-group">
        <label class="form-label">VAT Bill <span class="required-star">*</span></label>
        <div class="toggle-group" id="vat-bill-toggle">
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.vatBill === "no" ? "toggle-btn--active" : ""}" data-value="no">No (0%)</button>
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.vatBill === "yes" ? "toggle-btn--active" : ""}" data-value="yes">Yes (5%)</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Status <span class="required-star">*</span></label>
        <div class="toggle-group" id="payment-status-toggle">
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.paymentStatus === "paid" ? "toggle-btn--active" : ""}" data-value="paid">Paid</button>
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.paymentStatus === "not_paid" ? "toggle-btn--active" : ""}" data-value="not_paid">Not Paid</button>
        </div>
      </div>

      <div class="form-group" id="payment-method-group">
        <label class="form-label">Payment Method <span class="required-star">*</span></label>
        <div class="toggle-group" id="payment-method-toggle">
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.paymentMethod === "cash" ? "toggle-btn--active" : ""}" data-value="cash">Cash</button>
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.paymentMethod === "card" ? "toggle-btn--active" : ""}" data-value="card">Card</button>
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.paymentMethod === "both" ? "toggle-btn--active" : ""}" data-value="both">Both (Split)</button>
        </div>
      </div>

      <div class="form-group" id="cash-amount-group">
        <label class="form-label" for="cash-amount">Cash Amount (OMR) <span class="required-star">*</span></label>
        <input type="number" id="cash-amount" class="form-input" placeholder="0.000" step="0.001" min="0" />
      </div>

      <div class="form-group" id="card-amount-group">
        <label class="form-label" for="card-amount">Card Amount (OMR) <span class="required-star">*</span></label>
        <input type="number" id="card-amount" class="form-input" placeholder="0.000" step="0.001" min="0" />
      </div>

      <div class="summary-card summary-card--final">
        <div class="summary-row">
          <span class="summary-label">Subtotal:</span>
          <span class="summary-value" id="final-subtotal-display">OMR 0.000</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">VAT (5%):</span>
          <span class="summary-value" id="final-vat-display">OMR 0.000</span>
        </div>
        <div class="summary-row summary-row--total">
          <span class="summary-label">Grand Total:</span>
          <span class="summary-value" id="final-grandtotal-display">OMR 0.000</span>
        </div>
      </div>
    </div>

    <div class="section-nav">
      <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back">&lt; Back</button>
      <span class="section-nav-title">3 / 3: Payment Info</span>
      <button type="button" class="section-nav-btn section-nav-btn--save" data-action="save">Save Sale</button>
    </div>
  </div>
</div>
`;

  return function initAddSales(onSaveSuccess) {
    if (initialized) return;

    const root = document.getElementById("add-sales-root");
    if (!root) return;

    initialized = true;
    root.innerHTML = htmlTemplate;

    let items = [createDefaultItem()];
    let vatBill = FORM_DEFAULTS.vatBill;
    let paymentStatus = FORM_DEFAULTS.paymentStatus;
    let paymentMethod = FORM_DEFAULTS.paymentMethod;
    let currentSection = 1;

    // Elements
    const sections = root.querySelectorAll(".form-section");
    const dateInput = root.querySelector("#sale-date");
    const nameInput = root.querySelector("#customer-name");
    const numberInput = root.querySelector("#customer-number");
    const emailInput = root.querySelector("#customer-email");
    const itemsListContainer = root.querySelector("#items-list");
    const addItemBtn = root.querySelector("#btn-add-item-row");
    const vatToggle = root.querySelector("#vat-bill-toggle");
    const statusToggle = root.querySelector("#payment-status-toggle");
    const methodToggle = root.querySelector("#payment-method-toggle");
    const methodGroup = root.querySelector("#payment-method-group");
    const cashInput = root.querySelector("#cash-amount");
    const cashGroup = root.querySelector("#cash-amount-group");
    const cardInput = root.querySelector("#card-amount");
    const cardGroup = root.querySelector("#card-amount-group");

    // Default Date Initialization
    if (dateInput && !dateInput.value) {
      dateInput.value = getTodayString();
    }

    // Section Switching Logic
    function showSection(sectionNum) {
      currentSection = sectionNum;
      sections.forEach((sec) => {
        const isTarget = Number(sec.dataset.section) === sectionNum;
        sec.hidden = !isTarget;
        sec.classList.toggle("form-section--active", isTarget);
      });
      if (sectionNum === 3) {
        updatePaymentInputStates();
        calculateTotals();
      }
    }

    // Dynamic Row Rendering
    function renderItems() {
      if (!itemsListContainer) return;
      itemsListContainer.innerHTML = "";

      items.forEach((item, index) => {
        const rowEl = document.createElement("div");
        rowEl.className = "item-row-card";
        rowEl.dataset.id = item.id;

        const isOnlyOne = items.length === 1;

        rowEl.innerHTML = `
          <div class="item-row-header">
            <span class="item-row-number">Item #${index + 1}</span>
            <button type="button" class="btn-remove-item btn-delete-row" data-index="${index}" ${isOnlyOne ? "disabled style='opacity:0.3; pointer-events:none;'" : ""} title="Remove Item">
              &times;
            </button>
          </div>

          <!-- Line 1: Item Name (Most space) + Qty (Compact 3-digit gap) -->
          <div class="item-row-line1">
            <div class="form-group item-name-group" style="flex: 1;">
              <label class="form-label">Item Name <span class="required-star">*</span></label>
              <input type="text" class="form-input item-name-input" data-index="${index}" placeholder="Search or type item..." value="${item.name}" required />
            </div>
            <div class="form-group item-qty-group" style="width: 76px; flex-shrink: 0;">
              <label class="form-label">Qty <span class="required-star">*</span></label>
              <input type="number" class="form-input item-qty-input" data-index="${index}" min="1" max="999" step="1" value="${item.qty}" required />
            </div>
          </div>

          <!-- Line 2: Unit Price (OMR) + Subtotal (OMR) (Equal 50%/50% Width) -->
          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">Unit Price (OMR) <span class="required-star">*</span></label>
              <input type="number" class="form-input item-price-input" data-index="${index}" min="0" step="0.001" placeholder="0.000" value="${item.unitPrice || ""}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Subtotal (OMR)</label>
              <input type="text" class="form-input form-input--readonly item-total-input" readonly value="${formatOMR(item.qty * item.unitPrice)}" />
            </div>
          </div>
        `;

        itemsListContainer.appendChild(rowEl);

        const nameInputEl = rowEl.querySelector(".item-name-input");
        if (window.ItemAutocomplete && nameInputEl) {
          window.ItemAutocomplete.attach({
            input: nameInputEl,
            container: rowEl.querySelector(".item-name-group"),
            onSelect: (selectedProduct) => {
              items[index].name = selectedProduct.name;
              items[index].category = selectedProduct.category || "General";
              if (selectedProduct.unitPrice || selectedProduct.price) {
                items[index].unitPrice = Number(selectedProduct.unitPrice || selectedProduct.price);
              }
              renderItems();
              calculateTotals();
            }
          });
        }
      });

      bindItemRowEvents();
      calculateTotals();
    }

    function bindItemRowEvents() {
      itemsListContainer.querySelectorAll(".item-name-input").forEach((inp) => {
        ["input", "change", "blur"].forEach((evt) => {
          inp.addEventListener(evt, (e) => {
            const idx = Number(e.target.dataset.index);
            items[idx].name = e.target.value;
          });
        });
      });

      itemsListContainer.querySelectorAll(".item-qty-input").forEach((inp) => {
        ["input", "change", "keyup", "blur"].forEach((evt) => {
          inp.addEventListener(evt, (e) => {
            const idx = Number(e.target.dataset.index);
            const val = parseInt(e.target.value, 10);
            items[idx].qty = isNaN(val) ? 0 : Math.max(0, val);
            calculateTotals();
          });
        });
      });

      itemsListContainer.querySelectorAll(".item-price-input").forEach((inp) => {
        ["input", "change", "keyup", "blur"].forEach((evt) => {
          inp.addEventListener(evt, (e) => {
            const idx = Number(e.target.dataset.index);
            const val = parseFloat(e.target.value);
            items[idx].unitPrice = isNaN(val) ? 0 : Math.max(0, val);
            calculateTotals();
          });
        });
      });

      itemsListContainer.querySelectorAll(".btn-delete-row").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          if (items.length <= 1) return;
          const idx = Number(e.currentTarget.dataset.index);
          items.splice(idx, 1);
          renderItems();
          UI.toast("Item row removed", "info");
        });
      });
    }

    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => {
        items.push(createDefaultItem());
        renderItems();
        UI.toast("Added new item row", "info");
      });
    }

    function calculateTotals() {
      let subtotal = 0;

      // Update each item card's individual Subtotal (OMR) field in DOM
      const rowCards = itemsListContainer ? itemsListContainer.querySelectorAll(".item-row-card") : [];
      items.forEach((item, idx) => {
        const itemSubtotal = roundOMR((Number(item.qty) || 0) * (Number(item.unitPrice) || 0));
        subtotal = roundOMR(subtotal + itemSubtotal);

        if (rowCards[idx]) {
          const totInp = rowCards[idx].querySelector(".item-total-input");
          if (totInp) {
            totInp.value = formatOMR(itemSubtotal);
          }
        }
      });

      const vatRate = vatBill === "yes" ? 0.05 : 0;
      const vatAmount = roundOMR(subtotal * vatRate);
      const grandTotal = roundOMR(subtotal + vatAmount);

      const subtotalDisplay = root.querySelector("#items-subtotal-display");
      if (subtotalDisplay) subtotalDisplay.textContent = formatOMR(subtotal);

      const finalSubtotal = root.querySelector("#final-subtotal-display");
      if (finalSubtotal) finalSubtotal.textContent = formatOMR(subtotal);

      const finalVat = root.querySelector("#final-vat-display");
      if (finalVat) finalVat.textContent = formatOMR(vatAmount);

      const finalGrandTotal = root.querySelector("#final-grandtotal-display");
      if (finalGrandTotal) finalGrandTotal.textContent = formatOMR(grandTotal);

      autoFillPaymentAmounts(grandTotal);
    }

    function autoFillPaymentAmounts(grandTotal) {
      if (paymentStatus !== "paid") return;
      if (paymentMethod === "cash" && cashInput) {
        cashInput.value = grandTotal > 0 ? grandTotal.toFixed(3) : "";
        if (cardInput) cardInput.value = "";
      } else if (paymentMethod === "card" && cardInput) {
        cardInput.value = grandTotal > 0 ? grandTotal.toFixed(3) : "";
        if (cashInput) cashInput.value = "";
      } else if (paymentMethod === "both") {
        if (grandTotal > 0) {
          const cashVal = parseFloat(cashInput ? cashInput.value : "");
          const cardVal = parseFloat(cardInput ? cardInput.value : "");
          if (isNaN(cashVal) && isNaN(cardVal)) {
            const half = roundOMR(grandTotal / 2);
            if (cashInput) cashInput.value = half.toFixed(3);
            if (cardInput) cardInput.value = roundOMR(grandTotal - half).toFixed(3);
          } else if (!isNaN(cashVal)) {
            const newCard = Math.max(0, roundOMR(grandTotal - cashVal));
            if (cardInput) cardInput.value = newCard.toFixed(3);
          } else if (!isNaN(cardVal)) {
            const newCash = Math.max(0, roundOMR(grandTotal - cardVal));
            if (cashInput) cashInput.value = newCash.toFixed(3);
          }
        } else {
          if (cashInput) cashInput.value = "";
          if (cardInput) cardInput.value = "";
        }
      }
    }

    if (cashInput) {
      cashInput.addEventListener("input", () => {
        if (paymentMethod === "both" && paymentStatus === "paid") {
          const grandTotal = getGrandTotalValue();
          const cashVal = parseFloat(cashInput.value) || 0;
          const cardVal = Math.max(0, grandTotal - cashVal);
          if (cardInput) {
            cardInput.value = cardVal.toFixed(3);
          }
        }
      });
    }

    if (cardInput) {
      cardInput.addEventListener("input", () => {
        if (paymentMethod === "both" && paymentStatus === "paid") {
          const grandTotal = getGrandTotalValue();
          const cardVal = parseFloat(cardInput.value) || 0;
          const cashVal = Math.max(0, grandTotal - cardVal);
          if (cashInput) {
            cashInput.value = cashVal.toFixed(3);
          }
        }
      });
    }

    function updatePaymentInputStates() {
      const setGroupState = (groupEl, inputEl, isEnabled) => {
        if (!groupEl) return;
        groupEl.classList.toggle("form-group--disabled", !isEnabled);
        if (inputEl) {
          inputEl.disabled = !isEnabled;
          if (!isEnabled) {
            inputEl.value = "";
          }
        }
      };

      const setToggleState = (groupEl, isEnabled) => {
        if (!groupEl) return;
        groupEl.classList.toggle("form-group--disabled", !isEnabled);
        groupEl.querySelectorAll(".toggle-btn").forEach((btn) => {
          btn.disabled = !isEnabled;
        });
      };

      if (paymentStatus === "not_paid") {
        setToggleState(methodGroup, false);
        setGroupState(cashGroup, cashInput, false);
        setGroupState(cardGroup, cardInput, false);
      } else {
        setToggleState(methodGroup, true);
        if (paymentMethod === "cash") {
          setGroupState(cashGroup, cashInput, true);
          setGroupState(cardGroup, cardInput, false);
        } else if (paymentMethod === "card") {
          setGroupState(cashGroup, cashInput, false);
          setGroupState(cardGroup, cardInput, true);
        } else if (paymentMethod === "both") {
          setGroupState(cashGroup, cashInput, true);
          setGroupState(cardGroup, cardInput, true);
        }
      }
      calculateTotals();
    }

    function getGrandTotalValue() {
      let subtotal = 0;
      items.forEach((item) => {
        subtotal = roundOMR(subtotal + roundOMR((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)));
      });
      const vatRate = vatBill === "yes" ? 0.05 : 0;
      const vatAmount = roundOMR(subtotal * vatRate);
      return roundOMR(subtotal + vatAmount);
    }

    function setupToggleGroup(container, onSelect) {
      if (!container) return;
      const btns = container.querySelectorAll(".toggle-btn");
      btns.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          btns.forEach((b) => b.classList.remove("toggle-btn--active"));
          btn.classList.add("toggle-btn--active");
          onSelect(btn.dataset.value);
        });
      });
    }

    if (dateInput) {
      dateInput.addEventListener("click", (e) => {
        if (window.DatePicker) {
          e.preventDefault();
          window.DatePicker.open({
            title: "Select Sale Date",
            initialDate: dateInput.value || getTodayString(),
            onSelect: (chosenYMD) => {
              dateInput.value = chosenYMD;
              UI.clearAllInlineErrors(root);
            }
          });
        }
      });
    }

    setupToggleGroup(vatToggle, (val) => {
      vatBill = val;
      calculateTotals();
    });

    setupToggleGroup(statusToggle, (val) => {
      paymentStatus = val;
      updatePaymentInputStates();
    });

    setupToggleGroup(methodToggle, (val) => {
      paymentMethod = val;
      if (cashInput) cashInput.value = "";
      if (cardInput) cardInput.value = "";
      updatePaymentInputStates();
    });

    // Clear Handlers: Clear Section & Clear Form
    root.addEventListener("click", (e) => {
      const clearSectionBtn = e.target.closest('[data-action="clear-section"]');
      const clearFormBtn = e.target.closest('[data-action="clear-form"]');

      if (clearSectionBtn) {
        const secNum = Number(clearSectionBtn.dataset.section);
        UI.clearAllInlineErrors(root);

        if (secNum === 1) {
          if (dateInput) dateInput.value = getTodayString();
          if (nameInput) nameInput.value = "";
          if (numberInput) numberInput.value = "";
          if (emailInput) emailInput.value = "";
          UI.toast("Customer details cleared", "info");
        } else if (secNum === 2) {
          items = [createDefaultItem()];
          renderItems();
          UI.toast("Item details cleared", "info");
        } else if (secNum === 3) {
          vatBill = FORM_DEFAULTS.vatBill;
          paymentStatus = FORM_DEFAULTS.paymentStatus;
          paymentMethod = FORM_DEFAULTS.paymentMethod;

          const resetToggle = (container, val) => {
            if (!container) return;
            container.querySelectorAll(".toggle-btn").forEach((btn) => {
              btn.classList.toggle("toggle-btn--active", btn.dataset.value === val);
            });
          };

          resetToggle(vatToggle, FORM_DEFAULTS.vatBill);
          resetToggle(statusToggle, FORM_DEFAULTS.paymentStatus);
          resetToggle(methodToggle, FORM_DEFAULTS.paymentMethod);

          if (cashInput) cashInput.value = "";
          if (cardInput) cardInput.value = "";

          calculateTotals();
          UI.toast("Payment details cleared", "info");
        }
      }

      if (clearFormBtn) {
        if (window.UI && typeof window.UI.modal === "function") {
          window.UI.modal({
            title: "Clear Entire Form?",
            message: "Are you sure you want to clear all data entered across all sections of this sale form?",
            type: "warning",
            confirmText: "Clear Form",
            cancelText: "Cancel",
            dangerConfirm: true,
            onConfirm: () => {
              clearEntireForm();
            }
          });
        } else {
          clearEntireForm();
        }
      }
    });

    function clearEntireForm() {
      UI.clearAllInlineErrors(root);
      if (dateInput) dateInput.value = getTodayString();
      if (nameInput) nameInput.value = "";
      if (numberInput) numberInput.value = "";
      if (emailInput) emailInput.value = "";

      items = [createDefaultItem()];
      renderItems();

      vatBill = FORM_DEFAULTS.vatBill;
      paymentStatus = FORM_DEFAULTS.paymentStatus;
      paymentMethod = FORM_DEFAULTS.paymentMethod;

      const resetToggle = (container, val) => {
        if (!container) return;
        container.querySelectorAll(".toggle-btn").forEach((btn) => {
          btn.classList.toggle("toggle-btn--active", btn.dataset.value === val);
        });
      };

      resetToggle(vatToggle, FORM_DEFAULTS.vatBill);
      resetToggle(statusToggle, FORM_DEFAULTS.paymentStatus);
      resetToggle(methodToggle, FORM_DEFAULTS.paymentMethod);

      if (cashInput) cashInput.value = "";
      if (cardInput) cardInput.value = "";

      clearDraft();
      showSection(1);
      UI.toast("Entire sale form cleared", "info");
    }

    // ------------------------------------------------------------------------
    // Draft Auto-Saving & Recovery System
    // ------------------------------------------------------------------------
    const STORAGE_KEY_DRAFT = "gps_draft_sale_v1";

    function saveDraft() {
      try {
        const hasData = (nameInput && nameInput.value.trim()) ||
          (numberInput && numberInput.value.trim()) ||
          (emailInput && emailInput.value.trim()) ||
          (items && items.some((it) => it.name && it.name.trim()));

        if (!hasData) {
          localStorage.removeItem(STORAGE_KEY_DRAFT);
          return;
        }

        const draft = {
          date: dateInput ? dateInput.value : getTodayString(),
          customerName: nameInput ? nameInput.value : "",
          customerNumber: numberInput ? numberInput.value : "",
          customerEmail: emailInput ? emailInput.value : "",
          vatBill: vatBill,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          cashAmount: cashInput ? cashInput.value : "",
          cardAmount: cardInput ? cardInput.value : "",
          items: items,
          savedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
      } catch (e) {}
    }

    function restoreDraft() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_DRAFT);
        if (!stored) return false;
        const draft = JSON.parse(stored);
        if (!draft) return false;

        if (dateInput && draft.date) dateInput.value = draft.date;
        if (nameInput && draft.customerName) nameInput.value = draft.customerName;
        if (numberInput && draft.customerNumber) numberInput.value = draft.customerNumber;
        if (emailInput && draft.customerEmail) emailInput.value = draft.customerEmail;
        if (draft.vatBill) vatBill = draft.vatBill;
        if (draft.paymentStatus) paymentStatus = draft.paymentStatus;
        if (draft.paymentMethod) paymentMethod = draft.paymentMethod;
        if (cashInput && draft.cashAmount) cashInput.value = draft.cashAmount;
        if (cardInput && draft.cardAmount) cardInput.value = draft.cardAmount;

        if (Array.isArray(draft.items) && draft.items.length > 0) {
          items = draft.items;
        }

        const resetToggle = (container, val) => {
          if (!container) return;
          container.querySelectorAll(".toggle-btn").forEach((btn) => {
            btn.classList.toggle("toggle-btn--active", btn.dataset.value === val);
          });
        };
        resetToggle(vatToggle, vatBill);
        resetToggle(statusToggle, paymentStatus);
        resetToggle(methodToggle, paymentMethod);

        renderItems();
        return true;
      } catch (e) {
        return false;
      }
    }

    function clearDraft() {
      try {
        localStorage.removeItem(STORAGE_KEY_DRAFT);
      } catch (e) {}
    }

    // Auto-save draft on any user input
    root.addEventListener("input", () => saveDraft());
    root.addEventListener("change", () => saveDraft());

    // Navigation (Back, Next, Save) Handlers
    root.addEventListener("click", (e) => {
      const btn = e.target.closest(".section-nav-btn");
      if (!btn || btn.disabled) return;

      const action = btn.dataset.action;
      if (action === "next") {
        if (validateSection(currentSection)) {
          showSection(currentSection + 1);
        }
      } else if (action === "back") {
        showSection(Math.max(1, currentSection - 1));
      } else if (action === "save") {
        if (validateSection(3)) {
          saveSale();
        }
      }
    });

    // Section Validation
    function validateSection(sectionNum) {
      UI.clearAllInlineErrors(root);

      if (sectionNum === 1) {
        if (!dateInput.value) {
          UI.showInlineError(dateInput, "Please select a date.");
          dateInput.focus();
          return false;
        }
        if (!nameInput.value.trim()) {
          UI.showInlineError(nameInput, "Please enter customer name.");
          nameInput.focus();
          return false;
        }
        const emailVal = emailInput ? emailInput.value.trim() : "";
        if (emailVal.length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailVal)) {
            UI.showInlineError(emailInput, "Invalid email format (e.g. name@domain.com)");
            emailInput.focus();
            return false;
          }
        }
        return true;
      }

      if (sectionNum === 2) {
        if (items.length === 0) {
          UI.toast("Please add at least one item to proceed.", "warning");
          return false;
        }
        const nameInputs = root.querySelectorAll(".item-name-input");
        const qtyInputs = root.querySelectorAll(".item-qty-input");

        for (let i = 0; i < items.length; i++) {
          if (!items[i].name.trim()) {
            if (nameInputs[i]) {
              UI.showInlineError(nameInputs[i], "Please enter item name.");
              nameInputs[i].focus();
            }
            return false;
          }
          if (items[i].qty < 1) {
            if (qtyInputs[i]) {
              UI.showInlineError(qtyInputs[i], "Quantity must be at least 1.");
              qtyInputs[i].focus();
            }
            return false;
          }
        }
        return true;
      }

      if (sectionNum === 3) {
        if (paymentStatus === "paid") {
          const grandTotal = Math.round(getGrandTotalValue() * 1000) / 1000;
          const cashVal = Math.round((parseFloat(cashInput.value) || 0) * 1000) / 1000;
          const cardVal = Math.round((parseFloat(cardInput.value) || 0) * 1000) / 1000;

          if (paymentMethod === "cash") {
            if (cashVal <= 0) {
              UI.showInlineError(cashInput, "Please enter a valid cash amount.");
              cashInput.focus();
              return false;
            }
            if (cashVal < grandTotal - 0.0001) {
              UI.showInlineError(cashInput, `Paid amount (${formatOMR(cashVal)}) is lower than Total (${formatOMR(grandTotal)}).`);
              cashInput.focus();
              return false;
            }
            if (cashVal > grandTotal + 0.0001) {
              UI.showInlineError(cashInput, `Paid amount (${formatOMR(cashVal)}) is higher than Total (${formatOMR(grandTotal)}).`);
              cashInput.focus();
              return false;
            }
          }

          if (paymentMethod === "card") {
            if (cardVal <= 0) {
              UI.showInlineError(cardInput, "Please enter a valid card amount.");
              cardInput.focus();
              return false;
            }
            if (cardVal < grandTotal - 0.0001) {
              UI.showInlineError(cardInput, `Paid amount (${formatOMR(cardVal)}) is lower than Total (${formatOMR(grandTotal)}).`);
              cardInput.focus();
              return false;
            }
            if (cardVal > grandTotal + 0.0001) {
              UI.showInlineError(cardInput, `Paid amount (${formatOMR(cardVal)}) is higher than Total (${formatOMR(grandTotal)}).`);
              cardInput.focus();
              return false;
            }
          }

          if (paymentMethod === "both") {
            if (cashVal <= 0) {
              UI.showInlineError(cashInput, "Please enter cash amount.");
              cashInput.focus();
              return false;
            }
            if (cardVal <= 0) {
              UI.showInlineError(cardInput, "Please enter card amount.");
              cardInput.focus();
              return false;
            }
            const splitSum = Math.round((cashVal + cardVal) * 1000) / 1000;
            if (Math.abs(splitSum - grandTotal) > 0.0001) {
              UI.showInlineError(
                cardInput,
                `Split sum (${formatOMR(splitSum)}) does not match Grand Total (${formatOMR(grandTotal)}).`
              );
              cardInput.focus();
              return false;
            }
          }
        }
        return true;
      }

      return true;
    }

    // Save Sale Logic
    function saveSale() {
      const grandTotalVal = getGrandTotalValue();
      const cashVal = parseFloat(cashInput.value) || 0;
      const cardVal = parseFloat(cardInput.value) || 0;

      let itemsDetailStr = "";
      if (Array.isArray(items)) {
        itemsDetailStr = items
          .map((it) => {
            const name = (it.name || "").trim();
            const qty = Number(it.qty) || 1;
            const price = Number(it.unitPrice || 0);
            return `${name} (Qty: ${qty}${price > 0 ? ` @ ${price.toFixed(3)}` : ""})`;
          })
          .filter(Boolean)
          .join("\n");
      }

      const saleData = {
        date: dateInput.value,
        customerName: nameInput.value.trim(),
        customerNumber: numberInput.value.trim(),
        customerEmail: emailInput.value.trim(),
        items: items,
        itemsDetail: itemsDetailStr,
        vatBill: vatBill,
        paymentStatus: paymentStatus,
        paymentMethod: paymentStatus === "paid" ? paymentMethod : "n/a",
        cashAmount: cashVal,
        cardAmount: cardVal,
        grandTotal: grandTotalVal,
      };

      // Fire event & callback
      if (typeof onSaveSuccess === "function") {
        onSaveSuccess(saleData);
      }
      if (window.DataStore) {
        window.DataStore.recordSale(saleData, FORM_DEFAULTS.googleSheetWebAppUrl);
      }

      UI.toast(`Sale recorded successfully! Total: ${formatOMR(saleData.grandTotal)}`, "success");

      // Reset form for next sale & return to Section 1
      clearEntireForm();
    }

    // Re-render & cloud sync on branch change
    window.addEventListener("branchChanged", () => {
      renderItems();
      if (window.DataStore) {
        window.DataStore.syncFromCloud(FORM_DEFAULTS.googleSheetWebAppUrl);
      }
    });

    // Initial render & draft restore
    const draftRestored = restoreDraft();
    if (!draftRestored) {
      renderItems();
    }
    showSection(1);
  };
})();
