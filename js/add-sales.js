// js/add-sales.js

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
          <button type="button" class="toggle-btn" data-value="no">No (0%)</button>
          <button type="button" class="toggle-btn toggle-btn--active" data-value="yes">Yes (5%)</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Status <span class="required-star">*</span></label>
        <div class="toggle-group" id="payment-status-toggle">
          <button type="button" class="toggle-btn toggle-btn--active" data-value="paid">Paid</button>
          <button type="button" class="toggle-btn" data-value="not_paid">Not Paid</button>
        </div>
      </div>

      <div class="form-group" id="payment-method-group">
        <label class="form-label">Payment Method <span class="required-star">*</span></label>
        <div class="toggle-group" id="payment-method-toggle">
          <button type="button" class="toggle-btn toggle-btn--active" data-value="cash">Cash</button>
          <button type="button" class="toggle-btn" data-value="card">Card</button>
          <button type="button" class="toggle-btn" data-value="both">Both</button>
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
    let items = [{ id: 1, name: "", qty: 1, unitPrice: 0 }];
    let vatBill = "yes";
    let paymentStatus = "paid";
    let paymentMethod = "cash";

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
            <input type="text" class="form-input item-name-input" value="${item.name}" placeholder="e.g. iPhone 15 Pro / SKU-102" required />
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
        items.push({ id: Date.now(), name: "", qty: 1, unitPrice: 0 });
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
        else if (!cashInput.value && paymentMethod === "cash") {
          cashInput.value = totalVal.toFixed(3);
        }
      }

      if (cardGroup && cardInput) {
        cardGroup.classList.toggle("form-group--disabled", !isCardActive);
        cardInput.disabled = !isCardActive;
        if (!isCardActive) cardInput.value = "";
        else if (!cardInput.value && paymentMethod === "card") {
          cardInput.value = totalVal.toFixed(3);
        }
      }
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
      // Reset amount inputs when switching method for crisp experience
      if (cashInput) cashInput.value = "";
      if (cardInput) cardInput.value = "";
      updatePaymentInputStates();
    });

    // Clear Section Handlers
    root.addEventListener("click", (e) => {
      const clearBtn = e.target.closest('[data-action="clear-section"]');
      if (!clearBtn) return;

      const secNum = Number(clearBtn.dataset.section);
      if (secNum === 1) {
        if (dateInput) dateInput.value = getTodayString();
        if (nameInput) nameInput.value = "";
        if (numberInput) numberInput.value = "";
        if (emailInput) emailInput.value = "";
      } else if (secNum === 2) {
        items = [{ id: Date.now(), name: "", qty: 1, unitPrice: 0 }];
        renderItems();
      } else if (secNum === 3) {
        vatBill = "yes";
        paymentStatus = "paid";
        paymentMethod = "cash";

        // Reset toggles visual active state
        const resetToggle = (container, val) => {
          if (!container) return;
          container.querySelectorAll(".toggle-btn").forEach((btn) => {
            btn.classList.toggle("toggle-btn--active", btn.dataset.value === val);
          });
        };

        resetToggle(vatToggle, "yes");
        resetToggle(statusToggle, "paid");
        resetToggle(methodToggle, "cash");

        if (cashInput) cashInput.value = "";
        if (cardInput) cardInput.value = "";

        calculateTotals();
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

    // Section Validation
    function validateSection(sectionNum) {
      if (sectionNum === 1) {
        if (!dateInput.value) {
          alert("Please select a date.");
          dateInput.focus();
          return false;
        }
        if (!nameInput.value.trim()) {
          alert("Please enter the customer name.");
          nameInput.focus();
          return false;
        }
        return true;
      }

      if (sectionNum === 2) {
        if (items.length === 0) {
          alert("Please add at least one item.");
          return false;
        }
        for (let i = 0; i < items.length; i++) {
          if (!items[i].name.trim()) {
            alert(`Please enter the item name for Item #${i + 1}.`);
            const inputs = root.querySelectorAll(".item-name-input");
            if (inputs[i]) inputs[i].focus();
            return false;
          }
          if (items[i].qty < 1) {
            alert(`Quantity for Item #${i + 1} must be at least 1.`);
            return false;
          }
        }
        return true;
      }

      if (sectionNum === 3) {
        if (paymentStatus === "paid") {
          const grandTotal = getGrandTotalValue();
          const cashVal = parseFloat(cashInput.value) || 0;
          const cardVal = parseFloat(cardInput.value) || 0;

          if (paymentMethod === "cash" && cashVal <= 0) {
            alert("Please enter a valid cash amount.");
            cashInput.focus();
            return false;
          }
          if (paymentMethod === "card" && cardVal <= 0) {
            alert("Please enter a valid card amount.");
            cardInput.focus();
            return false;
          }
          if (paymentMethod === "both") {
            if (cashVal <= 0) {
              alert("Please enter cash amount.");
              cashInput.focus();
              return false;
            }
            if (cardVal <= 0) {
              alert("Please enter card amount.");
              cardInput.focus();
              return false;
            }
          }
        }
        return true;
      }

      return true;
    }

    // Save Sale Action
    function saveSale() {
      const saleData = {
        date: dateInput.value,
        customerName: nameInput.value.trim(),
        customerNumber: numberInput.value.trim(),
        customerEmail: emailInput.value.trim(),
        items: items,
        vatBill: vatBill,
        paymentStatus: paymentStatus,
        paymentMethod: paymentStatus === "paid" ? paymentMethod : "n/a",
        cashAmount: parseFloat(cashInput.value) || 0,
        cardAmount: parseFloat(cardInput.value) || 0,
        grandTotal: getGrandTotalValue(),
      };

      console.log("Sale Saved Successfully:", saleData);
      alert(`Sale recorded successfully!\nCustomer: ${saleData.customerName}\nTotal: ${formatOMR(saleData.grandTotal)}`);

      // Reset Form to Section 1
      items = [{ id: Date.now(), name: "", qty: 1, unitPrice: 0 }];
      if (nameInput) nameInput.value = "";
      if (numberInput) numberInput.value = "";
      if (emailInput) emailInput.value = "";
      if (dateInput) dateInput.value = getTodayString();
      renderItems();
      showSection(1);
    }

    // Initial render
    renderItems();
    showSection(1);
  };
})();
