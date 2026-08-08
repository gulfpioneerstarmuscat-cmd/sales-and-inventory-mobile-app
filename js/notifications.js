// js/notifications.js - Reusable Notification System (Toast, Modal, Inline)

window.UI = (function () {
  // Ensure Toast Container exists
  function getToastContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  // Ensure Modal Container exists
  function getModalContainer() {
    let container = document.getElementById("modal-overlay");
    if (!container) {
      container = document.createElement("div");
      container.id = "modal-overlay";
      container.className = "modal-overlay";
      container.hidden = true;
      document.body.appendChild(container);
    }
    return container;
  }

  return {
    // 1. Toast Notification (Auto-dismissing, no user interaction required)
    toast: function (message, type = "info", duration = 3000) {
      const container = getToastContainer();
      const toastEl = document.createElement("div");
      toastEl.className = `toast-item toast-item--${type}`;

      const iconSvg =
        type === "success"
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg>`
          : type === "error"
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

      toastEl.innerHTML = `
        <span class="toast-icon">${iconSvg}</span>
        <span class="toast-message">${message}</span>
      `;

      container.appendChild(toastEl);

      requestAnimationFrame(() => {
        toastEl.classList.add("toast-item--visible");
      });

      setTimeout(() => {
        toastEl.classList.remove("toast-item--visible");
        setTimeout(() => toastEl.remove(), 300);
      }, duration);
    },

    // 2. Modal Dialog Notification (User interaction required to acknowledge)
    modal: function ({ title = "Notification", message, type = "info", confirmText = "OK", onConfirm }) {
      const overlay = getModalContainer();
      const iconSvg =
        type === "success"
          ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M16 10l-5 5-3-3"></path></svg>`
          : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

      overlay.innerHTML = `
        <div class="modal-card modal-card--${type}">
          <div class="modal-header">
            <span class="modal-icon">${iconSvg}</span>
            <h3 class="modal-title">${title}</h3>
          </div>
          <div class="modal-body">
            <p class="modal-message">${message.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="modal-btn modal-btn--confirm">${confirmText}</button>
          </div>
        </div>
      `;

      overlay.style.display = "grid";
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("modal-overlay--visible"));

      const confirmBtn = overlay.querySelector(".modal-btn--confirm");
      confirmBtn.focus();

      confirmBtn.onclick = () => {
        overlay.classList.remove("modal-overlay--visible");
        setTimeout(() => {
          overlay.hidden = true;
          overlay.style.display = "none";
          if (typeof onConfirm === "function") onConfirm();
        }, 200);
      };
    },

    // 3. Inline Error (Field specific errors users might miss)
    showInlineError: function (inputElement, errorMessage) {
      if (!inputElement) return;
      this.clearInlineError(inputElement);

      inputElement.classList.add("form-input--error");

      const errorEl = document.createElement("div");
      errorEl.className = "inline-error";
      errorEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>${errorMessage}</span>
      `;

      const parentGroup = inputElement.closest(".form-group") || inputElement.parentElement;
      parentGroup.appendChild(errorEl);

      const clearHandler = () => {
        this.clearInlineError(inputElement);
        inputElement.removeEventListener("input", clearHandler);
        inputElement.removeEventListener("change", clearHandler);
      };
      inputElement.addEventListener("input", clearHandler);
      inputElement.addEventListener("change", clearHandler);
    },

    clearInlineError: function (inputElement) {
      if (!inputElement) return;
      inputElement.classList.remove("form-input--error");
      const parentGroup = inputElement.closest(".form-group") || inputElement.parentElement;
      const existing = parentGroup.querySelector(".inline-error");
      if (existing) existing.remove();
    },

    clearAllInlineErrors: function (container) {
      if (!container) return;
      container.querySelectorAll(".form-input--error").forEach((input) => {
        input.classList.remove("form-input--error");
      });
      container.querySelectorAll(".inline-error").forEach((el) => el.remove());
    }
  };
})();
