// js/components/item-suggestions.js - Reusable Item Auto-suggestion Component

window.ItemAutocomplete = (function () {
  /**
   * Binds an auto-suggestion dropdown to a text input field.
   * @param {Object} options
   * @param {HTMLInputElement} options.input - The input element to attach suggestions to.
   * @param {HTMLElement} options.container - The parent element containing the input & dropdown.
   * @param {Function} options.onSelect - Callback fired when an item is selected: function(item)
   * @param {Boolean} [options.enforceSelection=false] - Whether selecting from the list is mandatory.
   * @param {Function} [options.onInvalidSelection] - Callback if enforceSelection is true and user types an unlisted item.
   */
  function attach(options) {
    const { input, container, onSelect, enforceSelection = false, onInvalidSelection } = options;
    if (!input || !container) return null;

    let dropdown = container.querySelector(".item-autocomplete-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "autocomplete-dropdown item-autocomplete-dropdown";
      dropdown.hidden = true;
      container.appendChild(dropdown);
    }

    let currentMatches = [];
    let selectedIndex = -1;

    function closeDropdown() {
      dropdown.hidden = true;
      container.style.zIndex = "";
      const parentCard = container.closest(".item-row-card, .transfer-item-card, .form-group");
      if (parentCard) {
        parentCard.style.zIndex = "";
        parentCard.style.position = "";
      }
    }

    function renderSuggestions(matches, queryTokens = []) {
      currentMatches = matches;
      selectedIndex = -1;

      if (!matches || matches.length === 0) {
        closeDropdown();
        dropdown.innerHTML = "";
        return;
      }

      dropdown.innerHTML = matches
        .map((m, idx) => {
          const rawQty = m.qty;
          const stockNum = rawQty === "" || rawQty === null || rawQty === undefined ? 0 : Number(rawQty) || 0;
          const alertLvl = Number(m.alertLevel) || 5;

          let stockBadgeHtml = "";
          if (stockNum <= 0) {
            stockBadgeHtml = `<span class="autocomplete-stock autocomplete-stock--out" style="color:#ef4444; font-weight:700; background:rgba(239,68,68,0.1); padding:2px 6px; border-radius:4px;">Out of Stock (0)</span>`;
          } else if (stockNum <= alertLvl) {
            stockBadgeHtml = `<span class="autocomplete-stock autocomplete-stock--low" style="color:#d97706; font-weight:600;">Stock: <strong>${stockNum}</strong> (Low)</span>`;
          } else {
            stockBadgeHtml = `<span class="autocomplete-stock">Stock: <strong>${stockNum}</strong></span>`;
          }

          return `
        <div class="autocomplete-item ${idx === selectedIndex ? "autocomplete-item--active" : ""} ${stockNum <= 0 ? "autocomplete-item--out" : ""}" data-index="${idx}">
          <div class="autocomplete-name">${highlightMatches(m.name, queryTokens)}</div>
          <div class="autocomplete-meta">
            <span class="autocomplete-cat">${escapeHtml(m.category || "General")}</span>
            ${stockBadgeHtml}
          </div>
        </div>`;
        })
        .join("");

      dropdown.hidden = false;

      // Elevate z-index so dropdown floats above all cards, buttons, & modal elements
      container.style.position = "relative";
      container.style.zIndex = "999999";
      const parentCard = container.closest(".item-row-card, .transfer-item-card, .form-group");
      if (parentCard) {
        parentCard.style.position = "relative";
        parentCard.style.zIndex = "999998";
      }
    }

    const escapeHtml = (window.Utils && window.Utils.escapeHtml) || window.escapeHtml || ((s) => String(s || ""));

    function highlightMatches(text, queryTokens) {
      const safeText = escapeHtml(text || "");
      if (!queryTokens || !queryTokens.length) return safeText;

      const escapedTokens = queryTokens
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .filter(Boolean);
      if (escapedTokens.length === 0) return safeText;

      const pattern = new RegExp(`(${escapedTokens.join("|")})`, "gi");
      return safeText.replace(pattern, "<mark class='search-highlight'>$1</mark>");
    }

    function showSuggestions(val) {
      if (!window.DataStore) return;
      const q = (val || "").trim().toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      const matches = window.DataStore.searchItems(val || "");
      renderSuggestions(matches, tokens);
    }

    function selectItem(item) {
      input.value = item.name;
      closeDropdown();
      const rawQty = item.qty;
      const stockNum = rawQty === "" || rawQty === null || rawQty === undefined ? 0 : Number(rawQty) || 0;
      if (stockNum <= 0 && window.UI && typeof window.UI.toast === "function") {
        window.UI.toast(`⚠️ Notice: "${item.name}" is currently out of stock (0 available).`, "warning");
      }
      if (typeof onSelect === "function") {
        onSelect(item);
      }
    }

    // Input Events
    const handleInput = (e) => {
      showSuggestions(e.target.value);
    };

    const handleFocus = (e) => {
      showSuggestions(e.target.value || "");
    };

    const handleKeyDown = (e) => {
      if (dropdown.hidden || !currentMatches.length) return;

      const items = dropdown.querySelectorAll(".autocomplete-item");

      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % currentMatches.length;
        updateActiveItem(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + currentMatches.length) % currentMatches.length;
        updateActiveItem(items);
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < currentMatches.length) {
          e.preventDefault();
          selectItem(currentMatches[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        closeDropdown();
      }
    };

    function updateActiveItem(items) {
      items.forEach((it, idx) => {
        if (idx === selectedIndex) {
          it.classList.add("autocomplete-item--active");
          it.scrollIntoView({ block: "nearest" });
        } else {
          it.classList.remove("autocomplete-item--active");
        }
      });
    }

    // Click item in dropdown
    const handleDropdownClick = (e) => {
      const clicked = e.target.closest(".autocomplete-item");
      if (!clicked) return;
      const index = parseInt(clicked.dataset.index, 10);
      if (!isNaN(index) && currentMatches[index]) {
        selectItem(currentMatches[index]);
      }
    };

    // Close on outside click
    const handleDocumentClick = (e) => {
      if (!container.contains(e.target)) {
        closeDropdown();
        if (enforceSelection && input.value.trim()) {
          const matched = window.DataStore ? window.DataStore.findItemByName(input.value.trim()) : null;
          if (!matched && typeof onInvalidSelection === "function") {
            onInvalidSelection(input.value.trim());
          }
        }
      }
    };

    input.addEventListener("input", handleInput);
    input.addEventListener("focus", handleFocus);
    input.addEventListener("keydown", handleKeyDown);
    dropdown.addEventListener("click", handleDropdownClick);
    document.addEventListener("click", handleDocumentClick);

    return {
      destroy: function () {
        input.removeEventListener("input", handleInput);
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("keydown", handleKeyDown);
        dropdown.removeEventListener("click", handleDropdownClick);
        document.removeEventListener("click", handleDocumentClick);
        dropdown.remove();
      },
      close: function () {
        dropdown.hidden = true;
      },
      show: function () {
        showSuggestions(input.value || "");
      }
    };
  }

  return { attach };
})();
