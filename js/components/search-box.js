// js/components/search-box.js - Reusable Glass Search Input Box Component

window.renderSearchBoxHtml = function (config) {
  const escape = (window.Utils && window.Utils.escapeHtml) || window.escapeHtml || ((s) => String(s || ""));
  const inputId = config.id || "search-input";
  const placeholder = config.placeholder || "Search...";
  const value = config.value || "";
  const clearBtnId = config.clearBtnId || "btn-clear-search";
  const extraRightHtml = config.extraRightHtml || "";

  return `
    <div class="search-box-wrapper">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" id="${inputId}" class="search-input" placeholder="${escape(placeholder)}" value="${escape(value)}" />
      ${value ? `<button type="button" class="btn-clear-search" id="${clearBtnId}">&times;</button>` : ""}
      ${extraRightHtml}
    </div>
  `;
};
