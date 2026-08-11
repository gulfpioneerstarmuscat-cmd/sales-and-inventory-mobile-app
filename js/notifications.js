// js/notifications.js - Reusable Notification System (1. Toast, 2. Modal Dialog, 3. Inline Error)

window.UI = (function () {
  let activeToastTimer = null;
  let activeDismissTimer = null;

  // Ensure Toast Container exists on document.body
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

  // Ensure Modal Container exists on document.body
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
    // 1. Toast Notification (4 Types: message/info (blue), success (green), warning (yellow), error (red))
    // Strictly for notifications that DO NOT require user input/confirmation (e.g. clear section, save success, sync, filter, post fail).
    // Single Active Toast System: Replaces any previous active toast instantly instead of stacking multiple toasts.
    toast: function (message, type = "info", duration = 3000) {
      const normalizedType = type === "message" ? "info" : type;
      if (window.DevLogger) window.DevLogger.notification(normalizedType, `Toast: ${message}`);

      const container = getToastContainer();

      // Clear pending timers for previous toast
      if (activeToastTimer) {
        clearTimeout(activeToastTimer);
        activeToastTimer = null;
      }
      if (activeDismissTimer) {
        clearTimeout(activeDismissTimer);
        activeDismissTimer = null;
      }

      // Remove any existing active toast element instantly so only 1 toast is visible
      const oldToasts = container.querySelectorAll(".toast-item");
      oldToasts.forEach((oldEl) => oldEl.remove());

      const toastEl = document.createElement("div");
      toastEl.className = `toast-item toast-item--${normalizedType}`;

      let iconSvg = "";
      if (normalizedType === "success") {
        // Green Checkmark SVG
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg>`;
      } else if (normalizedType === "warning") {
        // Yellow Triangle Alert SVG
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      } else if (normalizedType === "error") {
        // Red Octagon Error SVG
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
      } else {
        // Blue Info Circle SVG (Default Message)
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }

      toastEl.innerHTML = `
        <span class="toast-icon">${iconSvg}</span>
        <span class="toast-message">${message}</span>
      `;

      container.appendChild(toastEl);

      requestAnimationFrame(() => {
        toastEl.classList.add("toast-item--visible");
      });

      activeToastTimer = setTimeout(() => {
        toastEl.classList.remove("toast-item--visible");
        activeDismissTimer = setTimeout(() => {
          if (toastEl.parentNode) toastEl.remove();
        }, 300);
      }, duration);
    },

    // 2. Modal Dialog Box (Strictly for 2 Use Cases: 1. Logout Confirmation, 2. Amend Review Confirmation)
    modal: function ({
      title = "Notification",
      message = "",
      bodyHtml = "",
      type = "info",
      confirmText = "OK",
      cancelText = "",
      dangerConfirm = false,
      onConfirm,
      onCancel
    }) {
      if (window.DevLogger) window.DevLogger.notification(type, `Modal Dialog Box: ${title}`);

      const overlay = getModalContainer();
      const contentHtml = bodyHtml || `<p class="modal-message">${(message || "").replace(/\n/g, "<br>")}</p>`;

      const confirmBtnClass = dangerConfirm
        ? "modal-btn modal-btn--danger"
        : (type === "error" || type === "danger")
        ? "modal-btn modal-btn--danger"
        : "modal-btn modal-btn--confirm";

      overlay.innerHTML = `
        <div class="modal-card modal-card--${type}">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button type="button" class="modal-close-btn" id="btn-modal-dialog-close">&times;</button>
          </div>
          <div class="modal-body">
            ${contentHtml}
          </div>
          <div class="modal-footer">
            ${cancelText ? `<button type="button" class="modal-btn modal-btn--secondary secondary-button" id="btn-modal-dialog-cancel">${cancelText}</button>` : ""}
            <button type="button" class="${confirmBtnClass}" id="btn-modal-dialog-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      overlay.style.display = "grid";
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("modal-overlay--visible"));

      const closeBtn = overlay.querySelector("#btn-modal-dialog-close");
      const cancelBtn = overlay.querySelector("#btn-modal-dialog-cancel");
      const confirmBtn = overlay.querySelector("#btn-modal-dialog-confirm");

      if (confirmBtn) confirmBtn.focus();

      const dismiss = (callback) => {
        overlay.classList.remove("modal-overlay--visible");
        setTimeout(() => {
          overlay.hidden = true;
          overlay.style.display = "none";
          if (typeof callback === "function") callback();
        }, 200);
      };

      if (closeBtn) closeBtn.onclick = () => dismiss(onCancel);
      if (cancelBtn) cancelBtn.onclick = () => dismiss(onCancel);
      if (confirmBtn) confirmBtn.onclick = () => dismiss(onConfirm);
    },

    closeModal: function () {
      const overlay = getModalContainer();
      overlay.classList.remove("modal-overlay--visible");
      setTimeout(() => {
        overlay.hidden = true;
        overlay.style.display = "none";
      }, 200);
    },

    // 3. Inline Error (Always RED - Triggered on input fields for invalid format, missing mandatory value, etc.)
    showInlineError: function (inputElement, errorMessage) {
      if (!inputElement) return;
      if (window.DevLogger) window.DevLogger.warn("InlineError", `${errorMessage}`);
      this.clearInlineError(inputElement);

      inputElement.classList.add("form-input--error");

      const errorEl = document.createElement("div");
      errorEl.className = "inline-error";
      errorEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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

// Global convenience wrapper for toast notifications
window.showNotification = function (message, type = "info") {
  if (window.UI && typeof window.UI.toast === "function") {
    window.UI.toast(message, type);
  }
};
