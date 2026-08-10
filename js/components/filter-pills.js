// js/components/filter-pills.js - Reusable Filter Pills Component

window.renderFilterPillsHtml = function (pillsConfig) {
  if (!Array.isArray(pillsConfig)) return "";

  return `
    <div class="filter-pills-row">
      ${pillsConfig
        .map((pill) => {
          const idAttr = pill.id ? `id="${pill.id}"` : "";
          const activeClass = pill.isActive ? "filter-pill--active" : "";
          const colorClass = pill.colorTheme ? `filter-pill--${pill.colorTheme}` : "";
          const disabledAttr = pill.disabled ? "disabled" : "";
          const disabledClass = pill.disabled ? "filter-pill--disabled" : "";
          const titleAttr = pill.title ? `title="${escapeHtml(pill.title)}"` : "";
          const statusAttr = pill.status ? `data-status="${escapeHtml(pill.status)}"` : "";

          return `
            <button 
              type="button" 
              class="filter-pill ${colorClass} ${activeClass} ${disabledClass}" 
              ${idAttr} 
              ${statusAttr} 
              ${disabledAttr} 
              ${titleAttr}
            >
              ${escapeHtml(pill.label)}${pill.count !== undefined ? ` (${pill.count})` : ""}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
};

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
