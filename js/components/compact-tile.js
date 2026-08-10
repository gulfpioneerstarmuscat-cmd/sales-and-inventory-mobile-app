// js/components/compact-tile.js - Reusable Compact List Item Tile Component

window.renderCompactTileHtml = function (config) {
  const containerClass = config.containerClass || "";
  const index = config.index !== undefined ? config.index : 0;
  const title = config.title || "";
  const subtitle = config.subtitle || "";
  const metric = config.metric || "";
  const badgeHtml = config.badgeHtml || "";

  return `
    <div class="compact-tile ${containerClass}" data-index="${index}">
      <div class="tile-left">
        <span class="tile-title">${escapeHtml(title)}</span>
        <span class="tile-subtitle">${escapeHtml(subtitle)}</span>
      </div>
      <div class="tile-right">
        <span class="tile-metric">${escapeHtml(metric)}</span>
        ${badgeHtml}
      </div>
    </div>
  `;
};

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
