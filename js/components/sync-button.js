// js/components/sync-button.js - Reusable Header Cloud Sync Button Component

window.renderSyncButtonHtml = function (id) {
  const btnId = id || "btn-sync-cloud";
  return `
    <button type="button" class="btn-sync-cloud" id="${btnId}" title="Sync Live Data from Google Sheets">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
      <span>Sync</span>
    </button>
  `;
};

window.bindSyncButtonEvent = function (buttonElement) {
  if (!buttonElement) return;
  buttonElement.addEventListener("click", () => {
    buttonElement.classList.add("is-spinning");
    const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
    if (window.DataStore && webAppUrl) {
      window.DataStore.syncFromCloud(webAppUrl).finally(() => {
        setTimeout(() => buttonElement.classList.remove("is-spinning"), 300);
      });
    } else {
      buttonElement.classList.remove("is-spinning");
    }
  });
};
