// js/pages/amend-stock.js - Amend Stock Multi-Section Wizard Implementation

window.initAmendStock = (function () {
  let autocompleteInstance = null;
  let selectedOriginalItem = null;
  let initialized = false;

  return function initAmendStock() {
    if (initialized) return;

    const root = document.getElementById("amend-stock-root");
    if (!root) return;

    initialized = true;
    if (window.DevLogger) window.DevLogger.info("AmendStock", "Initialized form wizard.");
    renderForm(root);
  };

  function renderForm(root) {
    root.innerHTML = `
      <div class="amend-stock-container">
        <form id="amend-stock-form" style="height:100%; display:flex; flex-direction:column;" novalidate>
          
          <!-- Section 1: Select Item to Amend -->
          <div class="form-section form-section--active" data-section="1">
            <div class="section-header">
              <h3 class="section-title">Amend Stock</h3>
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
              <!-- Warning Callout Banner -->
              <div class="warning-callout-card">
                <div class="warning-header">
                  <span class="warning-icon">⚠️</span>
                  <strong class="warning-title">STRICT AUDIT NOTICE: Use with Caution</strong>
                </div>
                <p class="warning-text">
                  This page is <strong>strictly reserved for correcting critical data entry mistakes</strong> (e.g. accidentally setting stock to 100 instead of 10).
                </p>
              </div>

              <!-- Item Selection via Autocomplete -->
              <div class="form-group autocomplete-container" id="amend-item-select-group">
                <label class="form-label required-label" for="amend-select-item">Select Item to Amend</label>
                <div class="input-wrapper">
                  <input
                    type="text"
                    id="amend-select-item"
                    class="form-input"
                    placeholder="Search item name to amend..."
                    autocomplete="off"
                    required
                  />
                </div>
                <span class="form-help-text">Select an existing item from the suggestion list.</span>
              </div>
            </div>

            <div class="section-nav">
              <button type="button" class="section-nav-btn section-nav-btn--back" disabled>&lt; Back</button>
              <span class="section-nav-title">1 / 3: Select Item</span>
              <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next" data-section="1">Next &gt;</button>
            </div>
          </div>

          <!-- Section 2: Fields to Amend -->
          <div class="form-section" data-section="2" hidden>
            <div class="section-header">
              <h3 class="section-title">Amend Stock</h3>
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
              <!-- Field 1: Updated Item Name -->
              <div class="form-group">
                <label class="form-label" for="amend-item-name">Updated Item Name</label>
                <input
                  type="text"
                  id="amend-item-name"
                  class="form-input"
                  placeholder="Select an item in Section 1 first..."
                />
              </div>

              <!-- Field 2: Category Name -->
              <div class="form-group">
                <label class="form-label" for="amend-category">Category Name</label>
                <input
                  type="text"
                  id="amend-category"
                  class="form-input"
                  placeholder="Select an item in Section 1 first..."
                />
              </div>

              <!-- Field 3: Current Stock Quantity -->
              <div class="form-group">
                <label class="form-label" for="amend-stock-qty">Corrected Stock Quantity</label>
                <input
                  type="number"
                  id="amend-stock-qty"
                  class="form-input form-input--number"
                  placeholder="Select an item in Section 1 first..."
                  min="0"
                  step="1"
                />
                <span class="form-help-text">Enter the exact corrected total stock count.</span>
              </div>

              <!-- Field 4: Alert Level Threshold -->
              <div class="form-group">
                <label class="form-label" for="amend-alert-level">Low Stock Alert Level</label>
                <input
                  type="number"
                  id="amend-alert-level"
                  class="form-input form-input--number"
                  placeholder="Select an item in Section 1 first..."
                  min="1"
                  step="1"
                />
              </div>

              <!-- Field 5: Item Remark (Optional - saved on Item for Stock View) -->
              <div class="form-group">
                <div class="label-row">
                  <label class="form-label" for="amend-item-remark">Item Remark (Optional)</label>
                  <span class="char-counter" id="amend-item-remark-counter">0 / 200</span>
                </div>
                <textarea
                  id="amend-item-remark"
                  class="form-textarea"
                  placeholder="Select an item in Section 1 first..."
                  maxlength="200"
                  rows="2"
                ></textarea>
                <span class="form-help-text">Saved on the item for display in stock view.</span>
              </div>
            </div>

            <div class="section-nav">
              <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back" data-section="2">&lt; Back</button>
              <span class="section-nav-title">2 / 3: Edit Fields</span>
              <button type="button" class="section-nav-btn section-nav-btn--next" data-action="next" data-section="2">Next &gt;</button>
            </div>
          </div>

          <!-- Section 3: Amendment Reason & Confirmation -->
          <div class="form-section" data-section="3" hidden>
            <div class="section-header">
              <h3 class="section-title">Amend Stock</h3>
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
              <!-- Field 6: Mandatory Amendment Reason (Required for Audit Log) -->
              <div class="form-group">
                <div class="label-row">
                  <label class="form-label required-label" for="amend-reason">Amendment Reason</label>
                  <span class="char-counter" id="amend-reason-counter">0 / 200</span>
                </div>
                <textarea
                  id="amend-reason"
                  class="form-textarea"
                  placeholder="State the mandatory reason for making this amendment (e.g., Typo correction, physical audit count)..."
                  maxlength="200"
                  rows="4"
                  required
                ></textarea>
              </div>
            </div>

            <div class="section-nav">
              <button type="button" class="section-nav-btn section-nav-btn--back" data-action="back" data-section="3">&lt; Back</button>
              <span class="section-nav-title">3 / 3: Reason</span>
              <button type="button" class="section-nav-btn section-nav-btn--danger" id="btn-review-amendment" data-action="review-amendment">Review Amendment</button>
            </div>
          </div>
        </form>
      </div>
    `;

    bindFormEvents(root);
  }

  function bindFormEvents(root) {
    selectedOriginalItem = null;
    let currentSection = 1;

    const selectItemInput = root.querySelector("#amend-select-item");
    const selectItemGroup = root.querySelector("#amend-item-select-group");
    const nameInput = root.querySelector("#amend-item-name");
    const categoryInput = root.querySelector("#amend-category");
    const stockQtyInput = root.querySelector("#amend-stock-qty");
    const alertLevelInput = root.querySelector("#amend-alert-level");
    const itemRemarkInput = root.querySelector("#amend-item-remark");
    const itemRemarkCounter = root.querySelector("#amend-item-remark-counter");
    const amendReasonInput = root.querySelector("#amend-reason");
    const amendReasonCounter = root.querySelector("#amend-reason-counter");

    // Attach Autocomplete
    if (window.ItemAutocomplete && selectItemInput && selectItemGroup) {
      if (autocompleteInstance) {
        autocompleteInstance.destroy();
      }

      autocompleteInstance = window.ItemAutocomplete.attach({
        input: selectItemInput,
        container: selectItemGroup,
        enforceSelection: true,
        onSelect: function (item) {
          if (window.DevLogger) window.DevLogger.log("AmendStock", "Selected item from autocomplete", item);
          loadSelectedItem(item);
        }
      });
    }

    function loadSelectedItem(item) {
      if (!item) return;
      selectedOriginalItem = { ...item };

      // Set values and placeholders
      nameInput.value = "";
      nameInput.placeholder = item.name || "";

      categoryInput.value = "";
      categoryInput.placeholder = item.category || "General";

      stockQtyInput.value = "";
      stockQtyInput.placeholder = String(item.qty ?? 0);

      alertLevelInput.value = "";
      alertLevelInput.placeholder = String(item.alertLevel ?? 5);

      itemRemarkInput.value = "";
      itemRemarkInput.placeholder = item.lastRemark || item.remark || "Enter optional item remark...";
      if (itemRemarkCounter) itemRemarkCounter.textContent = `${itemRemarkInput.value.length} / 200`;

      amendReasonInput.value = "";
      amendReasonInput.placeholder = "Enter mandatory reason for amendment...";
      if (amendReasonCounter) amendReasonCounter.textContent = `${amendReasonInput.value.length} / 200`;
    }

    // Section Switching Logic
    function showSection(secNum) {
      currentSection = secNum;
      const sections = root.querySelectorAll(".form-section");
      sections.forEach((sec) => {
        const isTarget = parseInt(sec.dataset.section, 10) === secNum;
        sec.hidden = !isTarget;
        sec.classList.toggle("form-section--active", isTarget);
      });
    }

    // Event Delegation for Form Clicks
    root.addEventListener("click", (e) => {
      const nextBtn = e.target.closest('[data-action="next"]');
      const backBtn = e.target.closest('[data-action="back"]');
      const clearSectionBtn = e.target.closest('[data-action="clear-section"]');
      const clearFormBtn = e.target.closest('[data-action="clear-form"]');
      const reviewBtn = e.target.closest('#btn-review-amendment, [data-action="review-amendment"]');

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
            message: "Are you sure you want to clear all data entered across all sections of this stock amendment form?",
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

      if (reviewBtn) {
        e.preventDefault();
        handleReviewAmendment();
      }
    });

    function validateSection(secNum) {
      if (secNum === 1) {
        const val = selectItemInput.value.trim();
        if (!val) {
          if (window.UI) window.UI.showInlineError(selectItemInput, "Please select an item from the suggestion list.");
          notifyUser("Please select an item from the suggestion list first.", "error");
          selectItemInput.focus();
          return false;
        }

        const matched = window.DataStore ? window.DataStore.findItemByName(val) : null;
        if (matched) {
          loadSelectedItem(matched);
        } else if (!selectedOriginalItem) {
          if (window.UI) window.UI.showInlineError(selectItemInput, "Please choose a valid item from the suggestion dropdown.");
          notifyUser("Please select a valid item from the suggestion dropdown list.", "error");
          selectItemInput.focus();
          return false;
        }
      }
      return true;
    }

    function notifyUser(message, type = "info") {
      if (window.showNotification) {
        window.showNotification(message, type);
      } else if (window.UI && typeof window.UI.toast === "function") {
        window.UI.toast(message, type);
      } else {
        alert(message);
      }
    }

    function clearSection(secNum) {
      if (window.UI) window.UI.clearAllInlineErrors(root);
      if (secNum === 1) {
        selectItemInput.value = "";
        selectedOriginalItem = null;
      } else if (secNum === 2) {
        nameInput.value = "";
        categoryInput.value = "";
        stockQtyInput.value = "";
        alertLevelInput.value = "";
        itemRemarkInput.value = "";
        if (itemRemarkCounter) itemRemarkCounter.textContent = "0 / 200";
      } else if (secNum === 3) {
        amendReasonInput.value = "";
        if (amendReasonCounter) amendReasonCounter.textContent = "0 / 200";
      }
      notifyUser(`Section ${secNum} cleared.`, "info");
    }

    function clearEntireForm() {
      if (window.UI) window.UI.clearAllInlineErrors(root);
      selectItemInput.value = "";
      nameInput.value = "";
      categoryInput.value = "";
      stockQtyInput.value = "";
      alertLevelInput.value = "";
      itemRemarkInput.value = "";
      amendReasonInput.value = "";
      if (itemRemarkCounter) itemRemarkCounter.textContent = "0 / 200";
      if (amendReasonCounter) amendReasonCounter.textContent = "0 / 200";
      selectedOriginalItem = null;
      showSection(1);
      notifyUser("Entire form cleared.", "info");
    }

    // Input event on selectItem field
    selectItemInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const matched = window.DataStore ? window.DataStore.findItemByName(val) : null;
      if (matched) {
        loadSelectedItem(matched);
      } else {
        selectedOriginalItem = null;
      }
    });

    if (itemRemarkInput && itemRemarkCounter) {
      itemRemarkInput.addEventListener("input", () => {
        itemRemarkCounter.textContent = `${itemRemarkInput.value.length} / 200`;
      });
    }

    if (amendReasonInput && amendReasonCounter) {
      amendReasonInput.addEventListener("input", () => {
        amendReasonCounter.textContent = `${amendReasonInput.value.length} / 200`;
      });
    }

    // Core Handler for Review Amendment
    function handleReviewAmendment() {
      if (window.UI) window.UI.clearAllInlineErrors(root);

      // Check 1: Must have selected an item
      if (!selectedOriginalItem) {
        const val = selectItemInput.value.trim();
        const matched = window.DataStore ? window.DataStore.findItemByName(val) : null;
        if (matched) {
          loadSelectedItem(matched);
        } else {
          if (window.UI) window.UI.showInlineError(selectItemInput, "Please select an item to amend.");
          notifyUser("Please select an item to amend in Section 1 first.", "error");
          showSection(1);
          selectItemInput.focus();
          return;
        }
      }

      // Check 2: Mandatory Amendment Reason
      const amendReasonVal = amendReasonInput.value.trim();
      if (!amendReasonVal) {
        if (window.UI) window.UI.showInlineError(amendReasonInput, "Amendment reason is mandatory.");
        notifyUser("Amendment reason is mandatory. Please enter why you are making this amendment.", "error");
        showSection(3);
        amendReasonInput.focus();
        return;
      }

      // Compute selective updates
      const enteredName = nameInput.value.trim();
      const newName = enteredName !== "" ? enteredName : selectedOriginalItem.name;

      const enteredCategory = categoryInput.value.trim();
      const newCategory = enteredCategory !== "" ? enteredCategory : (selectedOriginalItem.category || "General");

      const newQtyStr = stockQtyInput.value.trim();
      const newQty = newQtyStr !== "" ? parseInt(newQtyStr, 10) : selectedOriginalItem.qty;

      const newAlertLevelStr = alertLevelInput.value.trim();
      const newAlertLevel = newAlertLevelStr !== "" ? parseInt(newAlertLevelStr, 10) : (selectedOriginalItem.alertLevel ?? 5);

      const origRemark = selectedOriginalItem.lastRemark || selectedOriginalItem.remark || "";
      const enteredRemark = itemRemarkInput.value.trim();
      const newItemRemark = enteredRemark !== "" ? enteredRemark : origRemark;

      if (isNaN(newQty) || newQty < 0) {
        if (window.UI) window.UI.showInlineError(stockQtyInput, "Corrected stock quantity must be 0 or greater.");
        notifyUser("Please enter a valid stock quantity (0 or greater).", "error");
        showSection(2);
        stockQtyInput.focus();
        return;
      }

      const diffs = [];

      if (newName !== selectedOriginalItem.name) {
        diffs.push({ field: "Item Name", oldVal: selectedOriginalItem.name, newVal: newName, key: "name" });
      }
      if (newCategory !== (selectedOriginalItem.category || "General")) {
        diffs.push({ field: "Category", oldVal: selectedOriginalItem.category || "General", newVal: newCategory, key: "category" });
      }
      if (newQty !== selectedOriginalItem.qty) {
        const delta = newQty - selectedOriginalItem.qty;
        const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
        diffs.push({
          field: "Stock Quantity",
          oldVal: `${selectedOriginalItem.qty} units`,
          newVal: `${newQty} units (${deltaStr})`,
          key: "qty"
        });
      }
      if (newAlertLevel !== (selectedOriginalItem.alertLevel ?? 5)) {
        diffs.push({
          field: "Alert Level",
          oldVal: `${selectedOriginalItem.alertLevel ?? 5}`,
          newVal: `${newAlertLevel}`,
          key: "alertLevel"
        });
      }
      if (newItemRemark !== origRemark) {
        diffs.push({
          field: "Item Remark",
          oldVal: origRemark || "None",
          newVal: newItemRemark || "Cleared",
          key: "lastRemark"
        });
      }

      if (diffs.length === 0) {
        notifyUser("⚠️ No changes detected! Please modify at least one field in Section 2 (Item Name, Category, Stock Qty, Alert Level, or Remark) before reviewing amendment.", "error");
        showSection(2);
        return;
      }

      const currentPendingChanges = {
        originalItem: selectedOriginalItem,
        diffs: diffs,
        updatedFields: {
          name: newName,
          category: newCategory,
          qty: newQty,
          alertLevel: newAlertLevel,
          lastRemark: newItemRemark,
          remarks: amendReasonVal,
          amendReason: amendReasonVal
        }
      };

      const bodyHtml = `
        <p class="modal-description" style="margin-bottom: 12px; font-size: 14px; color: #475569;">
          Please verify the changes below before saving. Unchanged fields will be left untouched.
        </p>

        <div class="diff-table-container" style="max-height: 240px; overflow-y: auto; margin-bottom: 16px; border: 1px solid rgba(69,103,250,0.18); border-radius: 12px;">
          <table class="diff-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: rgba(69,103,250,0.08); text-align: left;">
                <th style="padding: 10px 12px;">Field</th>
                <th style="padding: 10px 12px;">Original (Before)</th>
                <th style="padding: 10px 12px;">Amended (After)</th>
              </tr>
            </thead>
            <tbody>
              ${diffs
                .map(
                  (d) => `
                <tr style="border-top: 1px solid rgba(226,232,240,0.8);">
                  <td style="padding: 10px 12px;"><strong>${escapeHtml(d.field)}</strong></td>
                  <td style="padding: 10px 12px; color: #dc2626; text-decoration: line-through;">${escapeHtml(String(d.oldVal))}</td>
                  <td style="padding: 10px 12px; color: #16a34a; font-weight: 600;">${escapeHtml(String(d.newVal))}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="audit-remark-preview" style="background: rgba(248,250,252,0.9); padding: 12px; border-radius: 10px; border-left: 3px solid #4567fa;">
          <strong style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Amendment Reason:</strong>
          <p class="remark-quote" style="margin-top: 4px; font-size: 13px; color: #1e293b; font-style: italic;">"${escapeHtml(amendReasonVal)}"</p>
        </div>
      `;

      if (window.UI && typeof window.UI.modal === "function") {
        window.UI.modal({
          title: "Confirm Stock Amendment",
          bodyHtml: bodyHtml,
          confirmText: "Confirm",
          cancelText: "Cancel",
          dangerConfirm: true,
          onConfirm: function () {
            const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";

            if (window.DataStore && typeof window.DataStore.amendStockItem === "function") {
              const res = window.DataStore.amendStockItem(currentPendingChanges, webAppUrl);
              if (res.success) {
                notifyUser("Stock amendment successfully committed & logged!", "success");
                // Reset form & return to Section 1
                clearEntireForm();
              } else {
                notifyUser(res.message || "Failed to commit amendment.", "error");
              }
            }
          }
        });
      } else {
        alert("Confirmation: Modify " + diffs.length + " fields for " + selectedOriginalItem.name + "?");
      }
    }

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
  }
})();
