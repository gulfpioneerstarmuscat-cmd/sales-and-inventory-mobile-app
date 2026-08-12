// js/components/sync-button.js - Reusable Header Cloud Sync Button Component with Live Countdown

(function () {
  const SYNC_INTERVAL_SEC = 60;
  let remainingSeconds = SYNC_INTERVAL_SEC;
  let isSyncing = false;
  let timerId = null;

  function getWebAppUrl() {
    return window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
  }

  function updateAllButtonLabels() {
    const buttons = document.querySelectorAll(".btn-sync-cloud");
    buttons.forEach((btn) => {
      const span = btn.querySelector("span");
      if (isSyncing) {
        btn.classList.add("is-spinning");
        if (span) span.textContent = "Syncing...";
      } else {
        btn.classList.remove("is-spinning");
        if (span) span.textContent = `${remainingSeconds}s`;
      }
    });
  }

  function triggerSync(manualButton) {
    if (isSyncing) return Promise.resolve();

    isSyncing = true;
    updateAllButtonLabels();

    const webAppUrl = getWebAppUrl();
    if (window.DataStore && webAppUrl) {
      return window.DataStore.syncFromCloud(webAppUrl)
        .then((res) => {
          if (res && res.success) {
            if (window.UI && manualButton) {
              window.UI.toast("Live Google Sheets cloud data synced successfully!", "success");
            }
          } else {
            if (window.UI && manualButton) {
              window.UI.toast("Cloud sync updated using cached local data.", "warning");
            }
          }
        })
        .catch(() => {
          if (window.UI && manualButton) {
            window.UI.toast("Cloud sync failed. Operating in offline mode.", "error");
          }
        })
        .finally(() => {
          isSyncing = false;
          remainingSeconds = SYNC_INTERVAL_SEC;
          updateAllButtonLabels();
        });
    } else {
      if (window.UI && manualButton) {
        window.UI.toast("Offline mode: Configured local storage data.", "warning");
      }
      isSyncing = false;
      remainingSeconds = SYNC_INTERVAL_SEC;
      updateAllButtonLabels();
      return Promise.resolve();
    }
  }

  function startCountdownTimer() {
    if (timerId) return;
    timerId = setInterval(() => {
      if (isSyncing) return;
      if (document.visibilityState !== "visible") return;

      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = SYNC_INTERVAL_SEC;
        triggerSync(false);
      } else {
        updateAllButtonLabels();
      }
    }, 1000);
  }

  window.renderSyncButtonHtml = function (id) {
    const btnId = id || "btn-sync-cloud";
    const textLabel = isSyncing ? "Syncing..." : `${remainingSeconds}s`;
    const spinClass = isSyncing ? "is-spinning" : "";
    return `
      <button type="button" class="btn-sync-cloud ${spinClass}" id="${btnId}" title="Sync Live Data from Google Sheets">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
        <span>${textLabel}</span>
      </button>
    `;
  };

  window.bindSyncButtonEvent = function (buttonElement) {
    if (!buttonElement) return;

    const span = buttonElement.querySelector("span");
    if (span) {
      span.textContent = isSyncing ? "Syncing..." : `${remainingSeconds}s`;
    }
    if (isSyncing) {
      buttonElement.classList.add("is-spinning");
    } else {
      buttonElement.classList.remove("is-spinning");
    }

    buttonElement.addEventListener("click", () => {
      if (isSyncing) return;
      if (window.UI) window.UI.toast("Syncing live data with Google Sheets...", "info");
      remainingSeconds = SYNC_INTERVAL_SEC;
      triggerSync(true);
    });

    startCountdownTimer();
  };

  window.SyncCountdownManager = {
    start: startCountdownTimer,
    triggerSync: triggerSync,
    reset: function () {
      remainingSeconds = SYNC_INTERVAL_SEC;
      updateAllButtonLabels();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCountdownTimer);
  } else {
    startCountdownTimer();
  }
})();
