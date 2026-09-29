// js/components/branch-transfer-modal.js - Multi-Item Inter-Branch Stock Transfer Component
// Allows Staff & Admin to safely transfer multiple products between Al Khoud & Ghala with full validation

window.BranchTransferModal = (function () {
  let modalContainer = null;
  let activeCallback = null;

  let transferItems = [];
  let currentFromBranch = "alkhoud";
  let currentToBranch = "ghala";

  function createDefaultTransferItem(initialName = "", initialCategory = "", initialQty = 1) {
    return {
      id: Date.now() + Math.random(),
      name: initialName,
      category: initialCategory || "General",
      qty: initialQty
    };
  }

  function ensureModalContainer() {
    if (modalContainer && document.body.contains(modalContainer)) return modalContainer;

    modalContainer = document.createElement("div");
    modalContainer.id = "branch-transfer-modal-container";
    modalContainer.className = "transfer-modal-overlay";
    modalContainer.hidden = true;

    modalContainer.innerHTML = `
      <div class="transfer-modal-dialog transfer-modal-dialog--multi">
        <div class="transfer-modal-header">
          <div class="transfer-modal-title-box">
            <div class="transfer-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/></svg>
            </div>
            <div>
              <h3 class="transfer-modal-title">Transfer Stock</h3>
              <p class="transfer-modal-subtitle">Move verified inventory between branches</p>
            </div>
          </div>
          <button type="button" class="transfer-modal-close" id="btn-close-transfer-modal" aria-label="Close modal">&times;</button>
        </div>

        <form id="branch-transfer-form" class="transfer-modal-body" novalidate>
          <!-- Branch Direction Selector -->
          <div class="transfer-direction-card">
            <div class="branch-pill-box branch-pill-box--from">
              <span class="branch-pill-label">SENDING FROM</span>
              <span class="branch-pill-name" id="transfer-from-branch-label">Al Khoud Branch</span>
            </div>
            <div class="transfer-arrow-divider">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div class="branch-pill-box branch-pill-box--to">
              <span class="branch-pill-label">DESTINATION</span>
              <span class="branch-pill-name" id="transfer-to-branch-label">Ghala Branch</span>
            </div>
          </div>

          <!-- Dynamic Items List -->
          <div class="transfer-items-list" id="transfer-items-list"></div>

          <!-- Add New Item Button -->
          <button type="button" class="btn-add-row btn-add-transfer-item" id="btn-add-transfer-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"></path></svg>
            <span>Add New Item</span>
          </button>

          <div class="transfer-error-banner" id="transfer-error-banner" hidden></div>

          <!-- Action Buttons -->
          <div class="transfer-modal-actions">
            <button type="button" class="transfer-btn-cancel" id="btn-cancel-transfer">Cancel</button>
            <button type="submit" class="transfer-btn-submit" id="btn-submit-transfer">
              <span class="btn-text">Confirm & Transfer</span>
              <span class="btn-spinner" id="transfer-btn-spinner" hidden></span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modalContainer);
    bindModalEvents();
    return modalContainer;
  }

  function renderTransferItems() {
    const root = modalContainer;
    if (!root) return;
    const itemsListContainer = root.querySelector("#transfer-items-list");
    if (!itemsListContainer) return;

    itemsListContainer.innerHTML = "";
    const senderInventory = window.DataStore ? window.DataStore.getInventory(currentFromBranch) : [];

    transferItems.forEach((item, index) => {
      const rowEl = document.createElement("div");
      rowEl.className = "transfer-item-card";
      rowEl.dataset.id = item.id;

      const isOnlyOne = transferItems.length === 1;

      // Look up current stock in sender branch
      const match = senderInventory.find(
        (inv) => (inv.name || "").trim().toLowerCase() === (item.name || "").trim().toLowerCase()
      );
      const rawStock = match ? match.qty : null;
      const stockNum = rawStock === "" || rawStock === null || rawStock === undefined ? 0 : Number(rawStock) || 0;

      let stockBadgeHtml = "";
      if (item.name) {
        if (!match) {
          stockBadgeHtml = `<span class="transfer-stock-hint transfer-stock-hint--error">Not in sender inventory</span>`;
        } else if (stockNum <= 0) {
          stockBadgeHtml = `<span class="transfer-stock-hint transfer-stock-hint--error">Out of stock (0 available in sender)</span>`;
        } else {
          stockBadgeHtml = `<span class="transfer-stock-hint transfer-stock-hint--ok">Available in sender: <strong>${stockNum}</strong> units</span>`;
        }
      }

      rowEl.innerHTML = `
        <div class="transfer-card-header">
          <span class="transfer-card-number">ITEM #${index + 1}</span>
          <button type="button" class="transfer-btn-delete-row" data-index="${index}" ${isOnlyOne ? "disabled style='opacity:0.25; pointer-events:none;'" : ""} title="Remove Item">
            &times;
          </button>
        </div>

        <div class="transfer-card-row">
          <div class="form-group transfer-item-name-group" style="flex: 1;">
            <label class="form-label">Item Name <span class="required-star">*</span></label>
            <input type="text" class="form-input transfer-name-input" data-index="${index}" placeholder="Search or type item..." value="${escapeHtml(item.name)}" required />
          </div>
          <div class="form-group transfer-item-qty-group" style="width: 76px; flex-shrink: 0;">
            <label class="form-label">Qty <span class="required-star">*</span></label>
            <input type="number" class="form-input transfer-qty-input" data-index="${index}" min="1" max="999" step="1" value="${item.qty}" required />
          </div>
        </div>

        ${stockBadgeHtml ? `<div class="transfer-stock-status-row">${stockBadgeHtml}</div>` : ""}
      `;

      itemsListContainer.appendChild(rowEl);

      // Attach autocomplete to this item input
      const nameInputEl = rowEl.querySelector(".transfer-name-input");
      if (window.ItemAutocomplete && nameInputEl) {
        window.ItemAutocomplete.attach({
          input: nameInputEl,
          container: rowEl.querySelector(".transfer-item-name-group"),
          onSelect: (selectedProduct) => {
            transferItems[index].name = selectedProduct.name;
            transferItems[index].category = selectedProduct.category || "General";
            renderTransferItems();
          }
        });
      }
    });

    bindItemRowEvents();
  }

  function bindItemRowEvents() {
    const root = modalContainer;
    if (!root) return;

    root.querySelectorAll(".transfer-name-input").forEach((inp) => {
      ["input", "change", "blur"].forEach((evt) => {
        inp.addEventListener(evt, (e) => {
          const idx = Number(e.target.dataset.index);
          if (transferItems[idx]) {
            transferItems[idx].name = e.target.value;
          }
        });
      });
    });

    root.querySelectorAll(".transfer-qty-input").forEach((inp) => {
      ["input", "change", "blur"].forEach((evt) => {
        inp.addEventListener(evt, (e) => {
          const idx = Number(e.target.dataset.index);
          const val = parseInt(e.target.value, 10);
          if (transferItems[idx]) {
            transferItems[idx].qty = isNaN(val) || val < 1 ? 1 : val;
          }
        });
      });
    });

    root.querySelectorAll(".transfer-btn-delete-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (transferItems.length <= 1) return;
        const idx = Number(e.currentTarget.dataset.index);
        transferItems.splice(idx, 1);
        renderTransferItems();
      });
    });
  }

  function bindModalEvents() {
    const root = modalContainer;
    const form = root.querySelector("#branch-transfer-form");
    const closeBtn = root.querySelector("#btn-close-transfer-modal");
    const cancelBtn = root.querySelector("#btn-cancel-transfer");
    const addRowBtn = root.querySelector("#btn-add-transfer-row");

    const closeModal = () => {
      root.hidden = true;
      root.classList.remove("transfer-modal-overlay--visible");
    };

    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    root.addEventListener("click", (e) => {
      if (e.target === root) closeModal();
    });

    addRowBtn?.addEventListener("click", () => {
      transferItems.push(createDefaultTransferItem());
      renderTransferItems();
      // Focus newly added input
      setTimeout(() => {
        const inputs = root.querySelectorAll(".transfer-name-input");
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
      }, 50);
    });

    // Form Submit Handler
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        showError("⚠️ You are offline. Please reconnect to the internet to transfer stock.");
        return;
      }

      const errBanner = root.querySelector("#transfer-error-banner");
      const submitBtn = root.querySelector("#btn-submit-transfer");
      const spinner = root.querySelector("#transfer-btn-spinner");
      const btnText = submitBtn.querySelector(".btn-text");

      if (submitBtn.disabled) return;

      if (errBanner) errBanner.hidden = true;

      const fromLabel = currentFromBranch.toLowerCase() === "ghala" ? "Ghala" : "Al Khoud";
      const toLabel = currentToBranch.toLowerCase() === "ghala" ? "Ghala" : "Al Khoud";

      if (transferItems.length === 0) {
        showError("Please add at least one product to transfer.");
        return;
      }

      const senderInventory = window.DataStore ? window.DataStore.getInventory(currentFromBranch) : [];
      const receiverInventory = window.DataStore ? window.DataStore.getInventory(currentToBranch) : [];

      const nameInputs = root.querySelectorAll(".transfer-name-input");
      const qtyInputs = root.querySelectorAll(".transfer-qty-input");

      // 1. Validate each row's name and positive integer quantity
      for (let i = 0; i < transferItems.length; i++) {
        const rawName = (transferItems[i].name || "").trim();
        if (!rawName) {
          showError("Please enter product name for all items.");
          if (nameInputs[i]) nameInputs[i].focus();
          return;
        }

        const qtyVal = parseInt(transferItems[i].qty, 10);
        if (isNaN(qtyVal) || qtyVal < 1) {
          showError("Quantity must be at least 1.");
          if (qtyInputs[i]) qtyInputs[i].focus();
          return;
        }

        // Verify exists in sender branch
        const matchFrom = senderInventory.find(
          (inv) => (inv.name || "").trim().toLowerCase() === rawName.toLowerCase()
        );

        if (!matchFrom) {
          showError(`Product '${rawName}' does not exist in ${fromLabel} inventory.`);
          if (nameInputs[i]) nameInputs[i].focus();
          return;
        }

        transferItems[i].category = matchFrom.category || "General";
        transferItems[i].sku = matchFrom.sku || "";

        // Verify receiver catalog has matching Name AND Category
        const matchTo = receiverInventory.find(
          (inv) => (inv.name || "").trim().toLowerCase() === rawName.toLowerCase() &&
                   (inv.category || "General").trim().toLowerCase() === (matchFrom.category || "General").trim().toLowerCase()
        );

        if (!matchTo) {
          showError(`⚠️ Transfer blocked: "${matchFrom.name}" (Category: "${matchFrom.category || "General"}") does not exist in ${toLabel} catalog! Both Product Name and Category must match in destination catalog.`);
          if (nameInputs[i]) nameInputs[i].focus();
          return;
        }
      }

      // 2. Multi-row cumulative quantity check against sender stock
      const aggregatedQty = {};
      transferItems.forEach((it) => {
        const key = (it.name || "").trim().toLowerCase();
        aggregatedQty[key] = (aggregatedQty[key] || 0) + (parseInt(it.qty, 10) || 1);
      });

      for (let i = 0; i < transferItems.length; i++) {
        const rawName = (transferItems[i].name || "").trim();
        const key = rawName.toLowerCase();
        const totalReq = aggregatedQty[key] || 0;

        const matchFrom = senderInventory.find(
          (inv) => (inv.name || "").trim().toLowerCase() === key
        );

        const rawStock = matchFrom ? matchFrom.qty : null;
        const availableStock = rawStock === "" || rawStock === null || rawStock === undefined ? 0 : Number(rawStock) || 0;

        if (availableStock <= 0) {
          showError(`Product '${matchFrom.name}' is out of stock (0 available) in ${fromLabel}. Cannot transfer.`);
          if (nameInputs[i]) nameInputs[i].focus();
          return;
        }

        if (totalReq > availableStock) {
          showError(`Total requested for '${matchFrom.name}' (${totalReq}) exceeds available stock (${availableStock}) in ${fromLabel}.`);
          if (qtyInputs[i]) qtyInputs[i].focus();
          return;
        }
      }

      // 3. Execute Transfer
      submitBtn.disabled = true;
      if (spinner) spinner.hidden = true;
      if (btnText) btnText.innerHTML = '<svg class="btn-loading-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>';

      const targetUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
      const currentUser = window.Auth ? window.Auth.getUser() : null;
      const transferredBy = currentUser ? (currentUser.name || currentUser.email) : "Staff";
      const transferCustomerName = `${fromLabel} to ${toLabel}`;

      const payload = {
        fromBranch: currentFromBranch,
        toBranch: currentToBranch,
        customerName: transferCustomerName,
        items: transferItems.map((it) => ({
          name: it.name.trim(),
          category: it.category || "General",
          sku: it.sku || "",
          qty: parseInt(it.qty, 10) || 1,
          unitPrice: 0
        })),
        transferredBy: transferredBy
      };

      if (!window.DataStore || typeof window.DataStore.transferStock !== "function") {
        submitBtn.disabled = false;
        if (spinner) spinner.hidden = true;
        if (btnText) btnText.textContent = "Confirm & Transfer";
        showError("DataStore service unavailable.");
        return;
      }

      Promise.resolve(window.DataStore.transferStock(payload, targetUrl))
        .then((result) => {
          closeModal();
          const totalUnits = transferItems.reduce((acc, it) => acc + (parseInt(it.qty, 10) || 1), 0);

          if (window.UI && typeof window.UI.toast === "function") {
            window.UI.toast(`✅ Successfully transferred ${transferItems.length} product(s) (${totalUnits} units) from ${fromLabel} to ${toLabel}!`, "success");
          }

          if (typeof activeCallback === "function") {
            activeCallback(result);
          }
        })
        .catch((err) => {
          showError(err.message || "Failed to record stock transfer");
        })
        .finally(() => {
          submitBtn.disabled = false;
          if (spinner) spinner.hidden = true;
          if (btnText) btnText.textContent = "Confirm & Transfer";
        });
    });

    function showError(msg) {
      const errBanner = root.querySelector("#transfer-error-banner");
      if (errBanner) {
        errBanner.textContent = msg;
        errBanner.hidden = false;
      } else if (window.UI && typeof window.UI.toast === "function") {
        window.UI.toast(msg, "error");
      }
    }
  }

  const escapeHtml = (window.Utils && window.Utils.escapeHtml) || window.escapeHtml || ((s) => String(s || ""));

  return {
    open: function (options = {}) {
      const modal = ensureModalContainer();
      activeCallback = options.onComplete || null;

      const activeBranch = (options.fromBranch || (window.Auth ? window.Auth.getActiveBranch() : "alkhoud")).toLowerCase();
      currentFromBranch = activeBranch;
      currentToBranch = options.toBranch || (activeBranch === "alkhoud" ? "ghala" : "alkhoud");

      const fromLabel = currentFromBranch === "ghala" ? "Ghala Branch" : "Al Khoud Branch";
      const toLabel = currentToBranch === "ghala" ? "Ghala Branch" : "Al Khoud Branch";

      const fromEl = modal.querySelector("#transfer-from-branch-label");
      const toEl = modal.querySelector("#transfer-to-branch-label");
      if (fromEl) fromEl.textContent = fromLabel;
      if (toEl) toEl.textContent = toLabel;

      const errBanner = modal.querySelector("#transfer-error-banner");
      if (errBanner) errBanner.hidden = true;

      if (options.initialItem) {
        transferItems = [
          createDefaultTransferItem(options.initialItem.name || "", options.initialItem.category || "General", 1)
        ];
      } else {
        transferItems = [createDefaultTransferItem()];
      }

      renderTransferItems();

      modal.hidden = false;
      modal.classList.add("transfer-modal-overlay--visible");
      setTimeout(() => {
        const firstInp = modal.querySelector(".transfer-name-input");
        if (firstInp && !options.initialItem) firstInp.focus();
      }, 100);
    },

    close: function () {
      if (modalContainer) {
        modalContainer.hidden = true;
        modalContainer.classList.remove("transfer-modal-overlay--visible");
      }
    }
  };
})();
