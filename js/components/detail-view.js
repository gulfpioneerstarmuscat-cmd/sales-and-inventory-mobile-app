// js/components/detail-view.js - Reusable Sub-Page Detail Viewer Component

window.renderDetailSubPageWrapperHtml = function (config) {
  const backBtnId = config.backBtnId || "btn-back-to-list";
  const backLabel = config.backLabel || "Back";
  const badgeHtml = config.badgeHtml || "";
  const contentCardsHtml = config.contentCardsHtml || "";

  return `
    <div class="detail-subpage-view">
      <div class="detail-nav-bar">
        <button type="button" class="btn-back-to-list" id="${backBtnId}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span>${escapeHtml(backLabel)}</span>
        </button>

        ${badgeHtml}
      </div>

      <div class="detail-scroll-area">
        ${contentCardsHtml}
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
