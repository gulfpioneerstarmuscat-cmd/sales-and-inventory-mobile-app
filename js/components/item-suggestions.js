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
      const parentCard = container.closest(".item-row-card, .form-group");
      if (parentCard) parentCard.style.zIndex = "";
    }

    function renderSuggestions(matches) {
      currentMatches = matches;
      selectedIndex = -1;

      if (!matches || matches.length === 0) {
        closeDropdown();
        dropdown.innerHTML = "";
        return;
      }

      dropdown.innerHTML = matches
        .map(
          (m, idx) => `
        <div class="autocomplete-item ${idx === selectedIndex ? "autocomplete-item--active" : ""}" data-index="${idx}">
          <div class="autocomplete-name">${escapeHtml(m.name)}</div>
          <div class="autocomplete-meta">
            <span class="autocomplete-cat">${escapeHtml(m.category || "General")}</span>
            <span class="autocomplete-stock">Stock: <strong>${m.qty ?? 0}</strong></span>
          </div>
        </div>`
        )
        .join("");

      dropdown.hidden = false;

      // Elevate z-index so dropdown floats above all subsequent cards & total summary
      container.style.position = "relative";
      container.style.zIndex = "99999";
      const parentCard = container.closest(".item-row-card, .form-group");
      if (parentCard) parentCard.style.zIndex = "99998";
    }

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function showSuggestions(val) {
      if (!window.DataStore) return;
      const matches = window.DataStore.searchItems(val || "");
      renderSuggestions(matches);
    }

    function selectItem(item) {
      input.value = item.name;
      closeDropdown();
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
