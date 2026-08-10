// js/components/date-picker.js - Custom Reusable Date Picker Component

window.DatePicker = (function () {
  let activeModalEl = null;

  const MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  function padZero(num) {
    return String(num).padStart(2, "0");
  }

  function formatYMD(year, monthIndex, day) {
    return `${year}-${padZero(monthIndex + 1)}-${padZero(day)}`;
  }

  function parseYMD(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const parts = dateStr.trim().split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11) {
        return { year: y, month: m, day: d };
      }
    }
    return null;
  }

  function getTodayYMD() {
    const now = new Date();
    return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function openDatePicker(options = {}) {
    closeDatePicker(); // Close any active instance

    const title = options.title || "Select Date";
    const initialDateStr = options.initialDate || getTodayYMD();
    const todayStr = getTodayYMD();

    let selectedYMD = initialDateStr;
    const parsedInit = parseYMD(initialDateStr) || parseYMD(todayStr);

    let viewYear = parsedInit.year;
    let viewMonth = parsedInit.month;
    let currentMode = "calendar"; // "calendar" | "months" | "years"

    // Create Modal Element
    const backdrop = document.createElement("div");
    backdrop.className = "dp-modal-backdrop";
    activeModalEl = backdrop;

    function renderModalContent() {
      const monthLabel = MONTHS_FULL[viewMonth] || "";

      backdrop.innerHTML = `
        <div class="dp-modal-card">
          <!-- Header Bar -->
          <div class="dp-header">
            <div class="dp-title-bar">
              <span class="dp-title-text">${escapeHtml(title)}</span>
              <button type="button" class="dp-btn-close" id="dp-btn-close">&times;</button>
            </div>

            <!-- Top 2 Selectors Row: [ Month ▾ ] [ Year ▾ ] -->
            <div class="dp-selectors-row">
              <button type="button" class="dp-selector-btn ${currentMode === "months" ? "dp-selector-btn--active" : ""}" id="dp-btn-select-month">
                <span>${monthLabel}</span>
                <span class="dp-selector-chevron">▾</span>
              </button>
              <button type="button" class="dp-selector-btn ${currentMode === "years" ? "dp-selector-btn--active" : ""}" id="dp-btn-select-year">
                <span>${viewYear}</span>
                <span class="dp-selector-chevron">▾</span>
              </button>
            </div>
          </div>

          <!-- Body Container -->
          <div class="dp-body" id="dp-body-container">
            ${renderBodyViewHtml()}
          </div>

          <!-- Footer Actions: Today | Cancel | Set -->
          <div class="dp-footer">
            <button type="button" class="dp-btn-today" id="dp-btn-today" title="Reset date filter to Today">Today</button>
            <div class="dp-footer-right">
              <button type="button" class="dp-btn-cancel" id="dp-btn-cancel">Cancel</button>
              <button type="button" class="dp-btn-confirm" id="dp-btn-confirm">Set</button>
            </div>
          </div>
        </div>
      `;

      attachEvents();
    }

    function renderBodyViewHtml() {
      const nowObj = new Date();
      const todayYear = nowObj.getFullYear();
      const todayMonth = nowObj.getMonth();

      if (currentMode === "months") {
        return `
          <div class="dp-months-grid">
            ${MONTHS_SHORT.map((mShort, idx) => {
              const isFutureMonth = (viewYear > todayYear) || (viewYear === todayYear && idx > todayMonth);
              const isSelected = (idx === viewMonth);
              return `
                <button type="button" class="dp-month-option ${isSelected ? "dp-month-option--selected" : ""} ${isFutureMonth ? "dp-option--disabled" : ""}" data-month="${idx}" ${isFutureMonth ? "disabled title='Future months cannot be selected'" : ""}>
                  ${mShort}
                </button>
              `;
            }).join("")}
          </div>
        `;
      }

      if (currentMode === "years") {
        const startYear = Math.max(2020, viewYear - 5);
        const endYear = startYear + 11;
        let yearHtml = `<div class="dp-years-grid">`;
        for (let y = startYear; y <= endYear; y++) {
          const isFutureYear = (y > todayYear);
          yearHtml += `
            <button type="button" class="dp-year-option ${y === viewYear ? "dp-year-option--selected" : ""} ${isFutureYear ? "dp-option--disabled" : ""}" data-year="${y}" ${isFutureYear ? "disabled title='Future years cannot be selected'" : ""}>
              ${y}
            </button>
          `;
        }
        yearHtml += `</div>`;
        return yearHtml;
      }

      // Default: Calendar View with Square Box Date Cells
      const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      let gridHtml = `
        <div class="dp-weekdays-row">
          <span class="dp-weekday-cell">Sun</span>
          <span class="dp-weekday-cell">Mon</span>
          <span class="dp-weekday-cell">Tue</span>
          <span class="dp-weekday-cell">Wed</span>
          <span class="dp-weekday-cell">Thu</span>
          <span class="dp-weekday-cell">Fri</span>
          <span class="dp-weekday-cell">Sat</span>
        </div>
        <div class="dp-days-grid">
      `;

      // Faded Padding Days for Start of Month
      for (let i = 0; i < firstDayOfMonth; i++) {
        gridHtml += `<div class="dp-day-cell dp-day-cell--other"></div>`;
      }

      // Square Box Date Cells
      for (let day = 1; day <= daysInMonth; day++) {
        const cellYMD = formatYMD(viewYear, viewMonth, day);
        const isToday = cellYMD === todayStr;
        const isSelected = cellYMD === selectedYMD;
        const isFuture = cellYMD > todayStr;

        let classes = "dp-day-cell";
        if (isToday) classes += " dp-day-cell--today";
        if (isSelected) classes += " dp-day-cell--selected";
        if (isFuture) classes += " dp-day-cell--future";

        gridHtml += `<button type="button" class="${classes}" data-ymd="${cellYMD}" ${isFuture ? "disabled title='Future dates cannot be selected'" : ""}>${day}</button>`;
      }

      gridHtml += `</div>`;
      return gridHtml;
    }

    function attachEvents() {
      // Backdrop & Close Events
      backdrop.querySelector("#dp-btn-close").addEventListener("click", closeDatePicker);
      backdrop.querySelector("#dp-btn-cancel").addEventListener("click", () => {
        if (typeof options.onClose === "function") options.onClose();
        closeDatePicker();
      });

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeDatePicker();
      });

      // Top Selector Toggles
      backdrop.querySelector("#dp-btn-select-month").addEventListener("click", () => {
        currentMode = (currentMode === "months") ? "calendar" : "months";
        renderModalContent();
      });

      backdrop.querySelector("#dp-btn-select-year").addEventListener("click", () => {
        currentMode = (currentMode === "years") ? "calendar" : "years";
        renderModalContent();
      });

      // Month Selection
      if (currentMode === "months") {
        backdrop.querySelectorAll(".dp-month-option").forEach((btn) => {
          btn.addEventListener("click", () => {
            viewMonth = parseInt(btn.dataset.month, 10);
            currentMode = "calendar";
            renderModalContent();
          });
        });
      }

      // Year Selection
      if (currentMode === "years") {
        backdrop.querySelectorAll(".dp-year-option").forEach((btn) => {
          btn.addEventListener("click", () => {
            viewYear = parseInt(btn.dataset.year, 10);
            currentMode = "calendar";
            renderModalContent();
          });
        });
      }

      // Square Box Day Cell Selection
      if (currentMode === "calendar") {
        backdrop.querySelectorAll(".dp-day-cell[data-ymd]").forEach((btn) => {
          btn.addEventListener("click", () => {
            selectedYMD = btn.dataset.ymd;
            renderModalContent();
          });
        });
      }

      // Today Button Action
      backdrop.querySelector("#dp-btn-today").addEventListener("click", () => {
        if (typeof options.onClear === "function") {
          options.onClear();
        } else {
          selectedYMD = todayStr;
          const today = getTodayYMD().split("-");
          viewYear = parseInt(today[0], 10);
          viewMonth = parseInt(today[1], 10) - 1;
          if (typeof options.onSelect === "function") {
            options.onSelect(selectedYMD);
          }
        }
        closeDatePicker();
      });

      // Set/Confirm Button
      backdrop.querySelector("#dp-btn-confirm").addEventListener("click", () => {
        if (typeof options.onSelect === "function") {
          options.onSelect(selectedYMD);
        }
        closeDatePicker();
      });
    }

    renderModalContent();
    document.body.appendChild(backdrop);
  }

  function closeDatePicker() {
    if (activeModalEl && activeModalEl.parentNode) {
      activeModalEl.parentNode.removeChild(activeModalEl);
    }
    activeModalEl = null;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return {
    open: openDatePicker,
    close: closeDatePicker
  };
})();
