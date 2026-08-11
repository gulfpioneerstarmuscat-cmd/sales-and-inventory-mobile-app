// js/pages/add-stock.js - Add Stock Multi-Section Wizard Implementation

window.initAddStock = (function () {
  let autocompleteInstance = null;
  let initialized = false;

  return function initAddStock() {
    if (initialized) return;
    const root = document.getElementById("add-stock-root");
    if (!root) return;

    initialized = true;
    renderForm(root);
  };

  function renderForm(root) {
    root.innerHTML = `
      <div class="add-stock-container">
        <form id="add-stock-form" style="height:100%; display:flex; flex-direction:column;" novalidate>
          
          <!-- Section 1: Item Identification -->
          <div class="form-section form-section--active" data-section="1">
            <div class="section-header">
              <h3 class="section-title">Add Stock</h3>
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
              <!-- Item Type Selector Mode -->
              <div class="form-group">
                <label class="form-label">Item Selection Mode</label>
                <div class="segmented-control" id="stock-mode-selector">
                  <button type="button" class="segmented-btn segmented-btn--active" data-mode="existing">
                    Existing Item
                  </button>
                  <button type="button" class="segmented-btn" data-mode="new">
                    New Item
                  </button>
                </div>
              </div>

              <!-- Item Name Input with Auto-suggestion -->
              <div class="form-group autocomplete-container" id="add-item-name-group">
                <label class="form-label required-label" for="add-stock-name">Item Name</label>
                <div class="input-wrapper">
                  <input
                    type="text"
                    id="add-stock-name"
                    class="form-input"
                    placeholder="Search or select existing item..."
                    autocomplete="off"
                    required
                  />
                </div>
                <span class="form-help-text" id="add-stock-name-help">Must select an existing item from list.</span>
              </div>

              <!-- Category Field (Autofilled placeholder) -->
              <div class="form-group">
                <label class="form-label" for="add-stock-category">Category</label>
                <input
                  type="text"
                  id="add-stock-category"
                  class="form-input"
                  placeholder="Category (e.g. Gate Automation, Remotes)"
                />
              </div>
            </div>

            <div class="section-nav">
              <button type="button" class="section-nav-btn section-nav-btn--back" disabled>&lt; Back</button>
              <span class="section-nav-title">1 / 3: Item Info</span>
              <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next" data-section="1">Next &gt;</button>
            </div>
          </div>

          <!-- Section 2: Quantities & Thresholds -->
          <div class="form-section" data-section="2" hidden>
            <div class="section-header">
              <h3 class="section-title">Add Stock</h3>
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
              <!-- Current Stock (View Only Read-only Field) -->
              <div class="form-group">
                <label class="form-label">Current Stock (View Only)</label>
                <div class="readonly-badge-box" id="add-stock-current-preview">
                  <span class="readonly-badge-value">0 units</span>
                  <span class="readonly-badge-tag">Current Inventory</span>
                </div>
              </div>

              <!-- Add New Stock Input -->
              <div class="form-group">
                <label class="form-label required-label" for="add-stock-qty">Add New Stock (+ Qty)</label>
                <input
                  type="number"
                  id="add-stock-qty"
                  class="form-input form-input--number"
                  placeholder="e.g. 10"
                  min="1"
                  step="1"
                  required
                />
                <span class="form-help-text">Enter quantity to add to current stock.</span>
              </div>

              <!-- Low Stock Alert Level Input -->
              <div class="form-group">
                <label class="form-label" for="add-stock-alert-level">Low Stock Alert Level</label>
                <input
                  type="number"
                  id="add-stock-alert-level"
                  class="form-input form-input--number"
                  placeholder="5"
                  min="1"
                  step="1"
                />
                <span class="form-help-text">Alert triggers when stock drops to or below this level.</span>
              </div>
            </div>

            <div class="section-nav">
              <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back" data-section="2">&lt; Back</button>
              <span class="section-nav-title">2 / 3: Quantities</span>
              <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next" data-section="2">Next &gt;</button>
            </div>
          </div>

          <!-- Section 3: Remarks & Confirmation -->
          <div class="form-section" data-section="3" hidden>
            <div class="section-header">
              <h3 class="section-title">Add Stock</h3>
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
              <!-- Remarks Textarea with 200 Letter Counter -->
              <div class="form-group">
                <div class="label-row">
                  <label class="form-label" for="add-stock-remarks">Remarks (Optional)</label>
                  <span class="char-counter" id="add-stock-remarks-counter">0 / 200</span>
                </div>
                <textarea
                  id="add-stock-remarks"
                  class="form-textarea"
                  placeholder="Enter optional notes about this stock batch..."
                  maxlength="200"
                  rows="3"
                ></textarea>
                <span class="form-help-text">Saved on the item for stock view display.</span>
              </div>
            </div>

            <div class="section-nav">
              <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back" data-section="3">&lt; Back</button>
              <span class="section-nav-title">3 / 3: Remarks</span>
              <button type="submit" class="section-nav-btn section-nav-btn--save" data-action="save">Add Stock</button>
            </div>
          </div>
        </form>
      </div>
    `;

    bindFormEvents(root);
  }

  function bindFormEvents(root) {
    let mode = "existing"; // "existing" or "new"
    let selectedExistingItem = null;
    let currentSection = 1;

    const form = root.querySelector("#add-stock-form");
    const modeSelector = root.querySelector("#stock-mode-selector");
    const nameInput = root.querySelector("#add-stock-name");
    const nameGroup = root.querySelector("#add-item-name-group");
    const nameHelp = root.querySelector("#add-stock-name-help");
    const categoryInput = root.querySelector("#add-stock-category");
    const qtyInput = root.querySelector("#add-stock-qty");
    const alertLevelInput = root.querySelector("#add-stock-alert-level");
    const currentStockPreview = root.querySelector("#add-stock-current-preview");
    const remarksInput = root.querySelector("#add-stock-remarks");
    const remarksCounter = root.querySelector("#add-stock-remarks-counter");

    // Initialize Autocomplete for Existing Items
    if (window.ItemAutocomplete && nameInput && nameGroup) {
      autocompleteInstance = window.ItemAutocomplete.attach({
        input: nameInput,
        container: nameGroup,
        enforceSelection: mode === "existing",
        onSelect: function (item) {
          selectedExistingItem = item;
          nameInput.value = item.name;
          categoryInput.value = "";
          categoryInput.placeholder = item.category || "General";
          alertLevelInput.placeholder = String(item.alertLevel ?? 5);
          updateCurrentStockPreview(item.qty);
        }
      });
    }

    function updateCurrentStockPreview(qty) {
      if (!currentStockPreview) return;
      const valEl = currentStockPreview.querySelector(".readonly-badge-value");
      if (valEl) valEl.textContent = `${qty} units`;
    }

    // Navigation & Section Visibility Handler
    function showSection(secNum) {
      currentSection = secNum;
      const sections = root.querySelectorAll(".form-section");
      sections.forEach((sec) => {
        const isTarget = parseInt(sec.dataset.section, 10) === secNum;
        sec.hidden = !isTarget;
        sec.classList.toggle("form-section--active", isTarget);
      });
    }

    // Event Delegation for Navigation & Clear Buttons
    root.addEventListener("click", (e) => {
      const nextBtn = e.target.closest('[data-action="next"]');
      const backBtn = e.target.closest('[data-action="back"]');
      const clearSectionBtn = e.target.closest('[data-action="clear-section"]');
      const clearFormBtn = e.target.closest('[data-action="clear-form"]');

      if (nextBtn) {
        e.preventDefault();
        const sec = parseInt(nextBtn.dataset.section, 10);
        if (validateSection(sec)) {
          showSection(sec + 1);
        }
      }

      if (backBtn) {
        e.preventDefault();
        const sec = parseInt(backBtn.dataset.section, 10);
        showSection(sec - 1);
      }

      if (clearSectionBtn) {
        e.preventDefault();
        const sec = parseInt(clearSectionBtn.dataset.section, 10);
        clearSection(sec);
      }

      if (clearFormBtn) {
        e.preventDefault();
        if (window.UI && typeof window.UI.modal === "function") {
          window.UI.modal({
            title: "Clear Entire Form?",
            message: "Are you sure you want to clear all data entered across all sections of this add stock form?",
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

    function validateSection(secNum) {
      if (window.UI) window.UI.clearAllInlineErrors(root);

      if (secNum === 1) {
        const nameVal = nameInput.value.trim();
        if (!nameVal) {
          if (window.UI) window.UI.showInlineError(nameInput, "Please enter or select an item name.");
          if (window.showNotification) window.showNotification("Please enter or select an item name.", "error");
          nameInput.focus();
          return false;
        }

        if (mode === "existing") {
          const matched = window.DataStore ? window.DataStore.findItemByName(nameVal) : null;
          if (!matched) {
            if (window.UI) window.UI.showInlineError(nameInput, "For existing items, choose from the suggestion list.");
            if (window.showNotification) {
              window.showNotification("For existing items, you must choose an item from the suggestion list.", "error");
            }
            nameInput.focus();
            return false;
          }
          selectedExistingItem = matched;
        }
      } else if (secNum === 2) {
        const addQtyVal = parseInt(qtyInput.value, 10);
        if (isNaN(addQtyVal) || addQtyVal <= 0) {
          if (window.UI) window.UI.showInlineError(qtyInput, "Add stock quantity must be at least 1.");
          if (window.showNotification) window.showNotification("Please enter a valid stock quantity to add (minimum 1).", "error");
          qtyInput.focus();
          return false;
        }
      }
      return true;
    }

    function clearSection(secNum) {
      if (window.UI) window.UI.clearAllInlineErrors(root);
      if (secNum === 1) {
        nameInput.value = "";
        categoryInput.value = "";
        selectedExistingItem = null;
        updateCurrentStockPreview(0);
      } else if (secNum === 2) {
        qtyInput.value = "";
        alertLevelInput.value = "";
      } else if (secNum === 3) {
        remarksInput.value = "";
        if (remarksCounter) remarksCounter.textContent = "0 / 200";
      }
      if (window.showNotification) window.showNotification(`Section ${secNum} cleared.`, "info");
    }

    function clearEntireForm() {
      if (window.UI) window.UI.clearAllInlineErrors(root);
      nameInput.value = "";
      categoryInput.value = "";
      qtyInput.value = "";
      alertLevelInput.value = "";
      remarksInput.value = "";
      if (remarksCounter) remarksCounter.textContent = "0 / 200";
      selectedExistingItem = null;
      updateCurrentStockPreview(0);
      showSection(1);
      if (window.showNotification) window.showNotification("Entire form cleared.", "info");
    }

    // Segmented Mode Switcher
    if (modeSelector) {
      modeSelector.addEventListener("click", (e) => {
        const btn = e.target.closest(".segmented-btn");
        if (!btn || btn.disabled) return;

        modeSelector.querySelectorAll(".segmented-btn").forEach((b) => b.classList.remove("segmented-btn--active"));
        btn.classList.add("segmented-btn--active");

        mode = btn.dataset.mode;
        selectedExistingItem = null;

        nameInput.value = "";
        categoryInput.value = "";
        updateCurrentStockPreview(0);

        if (mode === "existing") {
          nameInput.placeholder = "Search or select existing item...";
          if (nameHelp) nameHelp.textContent = "Must select an existing item from list.";
          categoryInput.readOnly = true;
          categoryInput.classList.add("form-input--readonly");
        } else {
          nameInput.placeholder = "Enter new product item name...";
          if (nameHelp) nameHelp.textContent = "Creating a brand new item entry.";
          categoryInput.readOnly = false;
          categoryInput.classList.remove("form-input--readonly");
        }

        if (window.UI) window.UI.toast(`Switched to ${mode === "existing" ? "Existing Item" : "New Item"} mode`, "info");
      });
    }

    // Remarks counter
    if (remarksInput && remarksCounter) {
      remarksInput.addEventListener("input", () => {
        const len = remarksInput.value.length;
        remarksCounter.textContent = `${len} / 200`;
      });
    }

    nameInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (mode === "existing") {
        const matched = window.DataStore ? window.DataStore.findItemByName(val) : null;
        if (matched) {
          selectedExistingItem = matched;
          categoryInput.placeholder = matched.category || "General";
          alertLevelInput.placeholder = String(matched.alertLevel ?? 5);
          updateCurrentStockPreview(matched.qty);
        } else {
          selectedExistingItem = null;
          updateCurrentStockPreview(0);
        }
      }
    });

    // Form Submit Handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!validateSection(1) || !validateSection(2)) {
        return;
      }

      const nameVal = nameInput.value.trim();
      const addQtyVal = parseInt(qtyInput.value, 10);
      const categoryVal = categoryInput.value.trim() || categoryInput.placeholder || "General";
      const alertLevelVal = parseInt(alertLevelInput.value, 10) || parseInt(alertLevelInput.placeholder, 10) || 5;
      const remarksVal = remarksInput.value.trim();

      const payload = {
        name: selectedExistingItem ? selectedExistingItem.name : nameVal,
        sku: selectedExistingItem ? selectedExistingItem.sku : null,
        category: categoryVal,
        addQty: addQtyVal,
        alertLevel: alertLevelVal,
        remarks: remarksVal,
        timestamp: new Date().toISOString()
      };

      const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";

      if (window.DataStore && typeof window.DataStore.addStockQuantity === "function") {
        const res = window.DataStore.addStockQuantity(payload, webAppUrl);
        if (res.success) {
          if (window.showNotification) {
            window.showNotification(`Successfully added +${addQtyVal} units to ${payload.name}!`, "success");
          }
          // Reset form & go back to Section 1
          clearEntireForm();
        } else {
          if (window.showNotification) {
            window.showNotification(res.message || "Failed to add stock.", "error");
          }
        }
      }
    });
  }
})();
