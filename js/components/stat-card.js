// js/components/stat-card.js - Reusable Header Stat Card Component

window.renderStatCardHtml = function (config) {
  const idAttr = config.id ? `id="${config.id}"` : "";
  const titleAttr = config.title ? `title="${escapeHtml(config.title)}"` : "";
  const isButton = Boolean(config.id || config.interactive);
  const cardClass = config.cardClass || "";
  const label = config.label || "";
  const value = config.value || "";
  const showChevron = config.showChevron !== false && isButton;

  const tag = isButton ? "button" : "div";
  const typeAttr = isButton ? 'type="button"' : "";

  return `
    <${tag} ${typeAttr} class="stat-card ${cardClass}" ${idAttr} ${titleAttr}>
      <div class="stat-card-header">
        <span class="stat-label">${escapeHtml(label)}</span>
        ${showChevron ? `<span class="stat-chevron">▾</span>` : ""}
      </div>
      <span class="stat-value">${escapeHtml(value)}</span>
    </${tag}>
  `;
};

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
