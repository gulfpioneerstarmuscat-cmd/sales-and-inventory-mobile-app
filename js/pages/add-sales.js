// js/pages/add-sales.js

// =========================================================================
// FORM DEFAULTS CONFIGURATION
// Centralized location for all default input values & initial form settings.
// Modify any values here to change application defaults in one place.
// =========================================================================
const FORM_DEFAULTS = {
  // Payment Details Defaults
  vatBill: "no",        // "yes" (5% VAT) | "no" (0% VAT)
  paymentStatus: "paid", // "paid" | "not_paid"
  paymentMethod: "cash", // "cash" | "card" | "both"

  // Item Row Defaults
  item: {
    qty: 1,              // Default item quantity
    unitPrice: 0,        // Default unit price (OMR)
    name: ""             // Default item name/SKU
  }
};

function createDefaultItem() {
  return {
    id: Date.now(),
    name: FORM_DEFAULTS.item.name,
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
      <h3 class="section-title">Customer Details</h3>
      <button type="button" class="btn-clear" data-action="clear-section" data-section="1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Clear Section
      </button>
    </div>

    <div class="form-body">
      <div class="form-group">
        <label class="form-label" for="sale-date">Date <span class="required-star">*</span></label>
        <input type="date" id="sale-date" class="form-input" required />
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
      <span class="section-nav-title">Customer Details</span>
      <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next">Next &gt;</button>
    </div>
  </div>

  <!-- Section 2: Item Details -->
  <div class="form-section" data-section="2" hidden>
    <div class="section-header">
      <h3 class="section-title">Item Details</h3>
      <button type="button" class="btn-clear" data-action="clear-section" data-section="2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Clear Section
      </button>
    </div>

    <div class="form-body">
      <div class="items-list" id="items-list"></div>

      <button type="button" class="btn-add-row" id="btn-add-item-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"></path></svg>
        Add New Item
      </button>

      <div class="summary-card">
        <span class="summary-label">Subtotal (View Only):</span>
        <span class="summary-value" id="items-subtotal-display">OMR 0.000</span>
      </div>
    </div>

    <div class="section-nav">
      <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back">&lt; Back</button>
      <span class="section-nav-title">Item Details</span>
      <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next">Next &gt;</button>
    </div>
  </div>

  <!-- Section 3: Payment Details -->
  <div class="form-section" data-section="3" hidden>
    <div class="section-header">
      <h3 class="section-title">Payment Details</h3>
      <button type="button" class="btn-clear" data-action="clear-section" data-section="3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Clear Section
      </button>
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
          <button type="button" class="toggle-btn ${FORM_DEFAULTS.paymentMethod === "both" ? "toggle-btn--active" : ""}" data-value="both">Both</button>
        </div>
      </div>

      <div class="form-group" id="cash-amount-group">
        <label class="form-label" for="cash-amount">Cash Amount <span class="required-star">*</span></label>
        <input type="number" id="cash-amount" class="form-input" min="0" step="0.001" placeholder="0.000" />
      </div>

      <div class="form-group" id="card-amount-group">
        <label class="form-label" for="card-amount">Card Amount <span class="required-star">*</span></label>
        <input type="number" id="card-amount" class="form-input" min="0" step="0.001" placeholder="0.000" disabled />
      </div>

      <div class="summary-card summary-card--grand">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span id="final-subtotal-display">OMR 0.000</span>
        </div>
        <div class="summary-row">
          <span>VAT (5%):</span>
          <span id="final-vat-display">OMR 0.000</span>
        </div>
        <div class="summary-row summary-row--total">
          <span>Total (View Only):</span>
          <span id="final-grand-total-display">OMR 0.000</span>
        </div>
      </div>
    </div>

    <div class="section-nav">
      <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back">&lt; Back</button>
      <span class="section-nav-title">Payment Details</span>
      <button type="button" class="section-nav-btn section-nav-btn--save" data-action="save">Save &gt;</button>
    </div>
  </div>
</div>
`;

  return function initAddSales() {
    if (initialized) return;
    initialized = true;

    const root = document.getElementById("add-sales-root");
    if (!root) return;

    root.innerHTML = htmlTemplate;

    // State Variables
    let currentSection = 1;
    let items = [createDefaultItem()];
    let vatBill = FORM_DEFAULTS.vatBill;
    let paymentStatus = FORM_DEFAULTS.paymentStatus;
    let paymentMethod = FORM_DEFAULTS.paymentMethod;

    // DOM Elements
    const dateInput = document.getElementById("sale-date");
    const nameInput = document.getElementById("customer-name");
    const numberInput = document.getElementById("customer-number");
    const emailInput = document.getElementById("customer-email");

    const itemsListContainer = document.getElementById("items-list");
    const addItemBtn = document.getElementById("btn-add-item-row");
    const itemsSubtotalDisplay = document.getElementById("items-subtotal-display");

    const vatToggle = document.getElementById("vat-bill-toggle");
    const statusToggle = document.getElementById("payment-status-toggle");
    const methodToggle = document.getElementById("payment-method-toggle");
    const methodGroup = document.getElementById("payment-method-group");

    const cashGroup = document.getElementById("cash-amount-group");
    const cardGroup = document.getElementById("card-amount-group");
    const cashInput = document.getElementById("cash-amount");
    const cardInput = document.getElementById("card-amount");

    const finalSubtotalDisplay = document.getElementById("final-subtotal-display");
    const finalVatDisplay = document.getElementById("final-vat-display");
    const finalGrandTotalDisplay = document.getElementById("final-grand-total-display");

    // Initialize Date to Today
    function getTodayString() {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (dateInput) {
      dateInput.value = getTodayString();
    }

    // Currency Formatter Helper
    function formatOMR(amount) {
      const num = Number(amount) || 0;
      return "OMR " + num.toFixed(3);
    }

    // Section Switching Logic
    function showSection(sectionNum) {
      currentSection = sectionNum;
      const sections = root.querySelectorAll(".form-section");
      sections.forEach((sec) => {
        const secIndex = Number(sec.dataset.section);
        const isActive = secIndex === sectionNum;
        sec.hidden = !isActive;
        sec.classList.toggle("form-section--active", isActive);
      });

      // Recalculate totals if moving to section 2 or 3
      calculateTotals();
    }

    // Item List Rendering
    function renderItems() {
      if (!itemsListContainer) return;
      itemsListContainer.innerHTML = "";

      items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "item-row-card";
        row.innerHTML = `
          <div class="item-row-header">
            <span class="item-row-number">Item #${index + 1}</span>
            ${
              items.length > 1
                ? `<button type="button" class="btn-remove-item" data-id="${item.id}" aria-label="Remove Item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                   </button>`
                : ""
            }
          </div>
          <div class="form-group">
            <label class="form-label">Item Name / SKU / Model <span class="required-star">*</span></label>
            <input type="text" class="form-input item-name-input" value="${item.name}" placeholder="e.g. Beninca 600KG / Pupilla" required />
          </div>
          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">Qty <span class="required-star">*</span></label>
              <input type="number" class="form-input item-qty-input" min="1" value="${item.qty}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Unit Price (OMR)</label>
              <input type="number" class="form-input item-price-input" min="0" step="0.001" value="${item.unitPrice}" placeholder="0.000" />
            </div>
          </div>
        `;

        // Event listeners for item inputs
        const nameIn = row.querySelector(".item-name-input");
        const qtyIn = row.querySelector(".item-qty-input");
        const priceIn = row.querySelector(".item-price-input");
        const removeBtn = row.querySelector(".btn-remove-item");

        nameIn.addEventListener("input", (e) => {
          item.name = e.target.value;
        });

        qtyIn.addEventListener("input", (e) => {
          item.qty = Math.max(1, parseInt(e.target.value) || 1);
          calculateTotals();
        });

        priceIn.addEventListener("input", (e) => {
          item.unitPrice = Math.max(0, parseFloat(e.target.value) || 0);
          calculateTotals();
        });

        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            items = items.filter((it) => it.id !== item.id);
            renderItems();
            calculateTotals();
          });
        }

        itemsListContainer.appendChild(row);
      });

      calculateTotals();
    }

    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => {
        items.push(createDefaultItem());
        renderItems();
      });
    }

    // Calculate Subtotal, VAT, Grand Total
    function calculateTotals() {
      let subtotal = 0;
      items.forEach((item) => {
        const qty = Number(item.qty) || 0;
        const price = Number(item.unitPrice) || 0;
        subtotal += qty * price;
      });

      if (itemsSubtotalDisplay) {
        itemsSubtotalDisplay.textContent = formatOMR(subtotal);
      }

      const vatRate = vatBill === "yes" ? 0.05 : 0;
      const vatAmount = subtotal * vatRate;
      const grandTotal = subtotal + vatAmount;

      if (finalSubtotalDisplay) finalSubtotalDisplay.textContent = formatOMR(subtotal);
      if (finalVatDisplay) finalVatDisplay.textContent = formatOMR(vatAmount);
      if (finalGrandTotalDisplay) finalGrandTotalDisplay.textContent = formatOMR(grandTotal);

      // Auto-populate amounts if default/empty
      updatePaymentInputStates(grandTotal);
    }

    // Update Section 3 conditional inputs (Payment Method & Amounts)
    function updatePaymentInputStates(grandTotal) {
      const totalVal = grandTotal !== undefined ? grandTotal : getGrandTotalValue();
      const isPaid = paymentStatus === "paid";

      // Enable/Disable Payment Method toggle
      if (methodGroup) {
        methodGroup.classList.toggle("form-group--disabled", !isPaid);
        const btns = methodToggle ? methodToggle.querySelectorAll(".toggle-btn") : [];
        btns.forEach((btn) => (btn.disabled = !isPaid));
      }

      // Cash / Card Amount input enablement
      const isCashActive = isPaid && (paymentMethod === "cash" || paymentMethod === "both");
      const isCardActive = isPaid && (paymentMethod === "card" || paymentMethod === "both");

      if (cashGroup && cashInput) {
        cashGroup.classList.toggle("form-group--disabled", !isCashActive);
        cashInput.disabled = !isCashActive;
        if (!isCashActive) cashInput.value = "";
        else if (paymentMethod === "cash") {
          cashInput.value = totalVal.toFixed(3);
        }
      }

      if (cardGroup && cardInput) {
        cardGroup.classList.toggle("form-group--disabled", !isCardActive);
        cardInput.disabled = !isCardActive;
        if (!isCardActive) cardInput.value = "";
        else if (paymentMethod === "card") {
          cardInput.value = totalVal.toFixed(3);
        }
      }

      if (isPaid && paymentMethod === "both") {
        if (!cashInput.value && !cardInput.value) {
          const half = (totalVal / 2).toFixed(3);
          cashInput.value = half;
          cardInput.value = (totalVal - parseFloat(half)).toFixed(3);
        }
      }
    }

    // Auto-balance calculation when typing in "both" payment method mode
    if (cashInput && cardInput) {
      cashInput.addEventListener("input", () => {
        if (paymentStatus === "paid" && paymentMethod === "both") {
          const grandTotal = getGrandTotalValue();
          const cashVal = parseFloat(cashInput.value) || 0;
          if (cashVal >= 0 && cashVal <= grandTotal) {
            cardInput.value = (grandTotal - cashVal).toFixed(3);
            UI.clearInlineError(cardInput);
            UI.clearInlineError(cashInput);
          }
        }
      });

      cardInput.addEventListener("input", () => {
        if (paymentStatus === "paid" && paymentMethod === "both") {
          const grandTotal = getGrandTotalValue();
          const cardVal = parseFloat(cardInput.value) || 0;
          if (cardVal >= 0 && cardVal <= grandTotal) {
            cashInput.value = (grandTotal - cardVal).toFixed(3);
            UI.clearInlineError(cardInput);
            UI.clearInlineError(cashInput);
          }
        }
      });
    }

    function getGrandTotalValue() {
      let subtotal = 0;
      items.forEach((item) => {
        subtotal += (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
      });
      const vatRate = vatBill === "yes" ? 0.05 : 0;
      return subtotal + subtotal * vatRate;
    }

    // Toggle Group Event Listeners
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

    // Clear Section Handlers
    root.addEventListener("click", (e) => {
      const clearBtn = e.target.closest('[data-action="clear-section"]');
      if (!clearBtn) return;

      const secNum = Number(clearBtn.dataset.section);
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
    });

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

    // Section Validation using Inline Errors & Modals
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
          UI.modal({
            title: "Missing Items",
            message: "Please add at least one item to proceed.",
            type: "error"
          });
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
            const combinedVal = Math.round((cashVal + cardVal) * 1000) / 1000;
            if (combinedVal < grandTotal - 0.0001) {
              UI.showInlineError(cardInput, `Combined paid (${formatOMR(combinedVal)}) is lower than Total (${formatOMR(grandTotal)}).`);
              cardInput.focus();
              return false;
            }
            if (combinedVal > grandTotal + 0.0001) {
              UI.showInlineError(cardInput, `Combined paid (${formatOMR(combinedVal)}) is higher than Total (${formatOMR(grandTotal)}).`);
              cardInput.focus();
              return false;
            }
          }
        }
        return true;
      }

      return true;
    }

    // Save Sale Action with Confirmation Modal
    function saveSale() {
      const grandTotalVal = getGrandTotalValue();
      const cashVal = parseFloat(cashInput.value) || 0;
      const cardVal = parseFloat(cardInput.value) || 0;

      const saleData = {
        date: dateInput.value,
        customerName: nameInput.value.trim(),
        customerNumber: numberInput.value.trim(),
        customerEmail: emailInput.value.trim(),
        items: items,
        vatBill: vatBill,
        paymentStatus: paymentStatus,
        paymentMethod: paymentStatus === "paid" ? paymentMethod : "n/a",
        cashAmount: cashVal,
        cardAmount: cardVal,
        grandTotal: grandTotalVal,
      };

      let paymentSummaryStr = "";
      if (paymentStatus === "not_paid") {
        paymentSummaryStr = "Payment Status: Not Paid";
      } else if (paymentMethod === "cash") {
        paymentSummaryStr = `Paid: ${formatOMR(cashVal)} (Cash)`;
      } else if (paymentMethod === "card") {
        paymentSummaryStr = `Paid: ${formatOMR(cardVal)} (Card)`;
      } else if (paymentMethod === "both") {
        paymentSummaryStr = `Paid: ${formatOMR(cashVal)} (Cash) + ${formatOMR(cardVal)} (Card)`;
      }

      console.log("Sale Saved Successfully:", saleData);

      UI.modal({
        title: "Sale Recorded Successfully",
        message: `Customer: ${saleData.customerName}\n${paymentSummaryStr}\nGrand Total: ${formatOMR(saleData.grandTotal)}`,
        type: "success",
        confirmText: "Done",
        onConfirm: () => {
          items = [createDefaultItem()];
          if (nameInput) nameInput.value = "";
          if (numberInput) numberInput.value = "";
          if (emailInput) emailInput.value = "";
          if (dateInput) dateInput.value = getTodayString();
          renderItems();
          showSection(1);
          UI.toast("Form reset for next sale", "info");
        }
      });
    }

    // Initial render
    renderItems();
    showSection(1);
  };
})();
