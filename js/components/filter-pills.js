// js/components/filter-pills.js - Reusable Filter Pills Component

window.renderFilterPillsHtml = function (pillsConfig) {
  if (!Array.isArray(pillsConfig)) return "";
  const escape = (window.Utils && window.Utils.escapeHtml) || window.escapeHtml || ((s) => String(s || ""));

  return `
    <div class="filter-pills-row">
      ${pillsConfig
        .map((pill) => {
          const idAttr = pill.id ? `id="${pill.id}"` : "";
          const activeClass = pill.isActive ? "filter-pill--active" : "";
          const colorClass = pill.colorTheme ? `filter-pill--${pill.colorTheme}` : "";
          const disabledAttr = pill.disabled ? "disabled" : "";
          const disabledClass = pill.disabled ? "filter-pill--disabled" : "";
          const titleAttr = pill.title ? `title="${escape(pill.title)}"` : "";
          const statusAttr = pill.status ? `data-status="${escape(pill.status)}"` : "";

          return `
            <button 
              type="button" 
              class="filter-pill ${colorClass} ${activeClass} ${disabledClass}" 
              ${idAttr} 
              ${statusAttr} 
              ${disabledAttr} 
              ${titleAttr}
            >
              ${escape(pill.label)}${pill.count !== undefined ? ` (${pill.count})` : ""}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
};
