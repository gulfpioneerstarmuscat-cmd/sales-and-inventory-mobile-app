


document.addEventListener("DOMContentLoaded", () => {
  const isMobile =
    window.matchMedia("(max-width: 767px)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  const mobileApp = document.getElementById("mobile-app");
  const desktopBlock = document.getElementById("desktop-block");

  if (mobileApp && desktopBlock) {
    mobileApp.hidden = !isMobile;
    desktopBlock.hidden = isMobile;
  }

  const navButtons = document.querySelectorAll(
    ".nav-panel .nav-button, .nav-panel .primary-button",
  );
  const profileButton = document.querySelector(".profile-button");
  const pages = document.querySelectorAll(".panel-page");

  if (!navButtons.length || !pages.length) return;

  const showPage = (pageKey) => {
    pages.forEach((page) => {
      const isActive = page.dataset.page === String(pageKey);
      page.hidden = !isActive;
      page.classList.toggle("panel-page--active", isActive);
    });

    navButtons.forEach((button) => button.classList.remove("is-active"));
    if (profileButton) profileButton.classList.remove("is-active");

    if (pageKey === "profile") {
      profileButton?.classList.add("is-active");
    } else {
      const activeIndex = Number(pageKey) - 1;
      navButtons[activeIndex]?.classList.add("is-active");
    }

    // Page-specific initialization
    if (String(pageKey) === "1" && typeof window.initViewSales === "function") {
      window.initViewSales();
    }
    if (String(pageKey) === "2" && typeof window.initViewInventory === "function") {
      window.initViewInventory();
    }
    if (String(pageKey) === "3" && typeof window.initAddSales === "function") {
      window.initAddSales();
    }
    if (String(pageKey) === "4" && typeof window.initAddStock === "function") {
      window.initAddStock();
    }
    if (String(pageKey) === "5" && typeof window.initAmendStock === "function") {
      window.initAmendStock();
    }
    if (String(pageKey) === "profile" && typeof window.initProfilePage === "function") {
      window.initProfilePage();
    }
  };

  navButtons.forEach((button, index) => {
    button.addEventListener("click", () => showPage(index + 1));
  });

  if (profileButton) {
    profileButton.addEventListener("click", () => {
      if (typeof window.openProfileModal === "function") {
        window.openProfileModal();
      } else {
        showPage("profile");
      }
    });
  }

  // Auto-select entire input content on click/focus for fast overwriting
  let lastFocusedInput = null;

  function selectTargetInput(target) {
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
      !target.readOnly &&
      !target.disabled
    ) {
      const type = target.type;
      if (!type || ["text", "number", "tel", "email", "search", "url", "password"].includes(type)) {
        setTimeout(() => {
          try {
            if (typeof target.select === "function") {
              target.select();
            }
          } catch (err) {
            // Ignore browsers restricting select on certain input types
          }
        }, 0);
      }
    }
  }

  document.addEventListener("focusin", (e) => {
    lastFocusedInput = e.target;
    selectTargetInput(e.target);
  });

  document.addEventListener("mouseup", (e) => {
    if (lastFocusedInput && lastFocusedInput === e.target) {
      const target = lastFocusedInput;
      lastFocusedInput = null;
      selectTargetInput(target);
    } else {
      lastFocusedInput = null;
    }
  });

  // Pre-initialize initial page components
  if (typeof window.initViewSales === "function") window.initViewSales();
  if (typeof window.initViewInventory === "function") window.initViewInventory();

  showPage(1);

  // Cold Start Loading Screen Overlay Management
  const coldStartOverlay = document.getElementById("cold-start-overlay");

  function hideColdStartOverlay() {
    if (coldStartOverlay && !coldStartOverlay.classList.contains("is-hidden")) {
      coldStartOverlay.classList.add("is-hidden");
      setTimeout(() => {
        coldStartOverlay.style.display = "none";
      }, 600);
    }
  }

  // Safety fallback: Hide overlay after max 35s even if offline
  const maxOverlayTimeout = setTimeout(hideColdStartOverlay, 35000);

  // Trigger immediate initial cloud sync for all authorized branches on app startup
  const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
  if (window.DataStore && webAppUrl) {
    const syncPromise = typeof window.DataStore.syncAllBranches === "function"
      ? window.DataStore.syncAllBranches(webAppUrl)
      : window.DataStore.syncFromCloud(webAppUrl);

    syncPromise.finally(() => {
      clearTimeout(maxOverlayTimeout);
      hideColdStartOverlay();
    });
  } else {
    clearTimeout(maxOverlayTimeout);
    hideColdStartOverlay();
  }

  // Initial 60s countdown timer startup
  if (window.SyncCountdownManager) {
    window.SyncCountdownManager.start();
  }

  // Re-sync and reset countdown on branch change
  window.addEventListener("branchChanged", () => {
    if (window.SyncCountdownManager) {
      window.SyncCountdownManager.reset();
      window.SyncCountdownManager.triggerSync(false);
    } else if (window.DataStore && webAppUrl) {
      window.DataStore.syncFromCloud(webAppUrl);
    }
  });
});

// Register Service Worker for PWA / Standalone installability with auto-update checking
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        // Check for service worker updates on page load
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("New version available! Refreshing automatically...");
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });
}
