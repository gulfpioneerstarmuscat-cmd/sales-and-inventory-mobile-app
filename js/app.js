


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

  // --------------------------------------------------------------------------
  // App Startup Lifecycle & Auth Protection Guard
  // --------------------------------------------------------------------------
  const splashScreen = document.getElementById("app-splash-screen");
  const splashStatusText = document.getElementById("splash-status-text");
  const loggedOutScreen = document.getElementById("logged-out-screen");
  const mainAppContainer = document.querySelector(".bg");
  const loginForm = document.getElementById("logged-out-login-form");
  const authErrorBanner = document.getElementById("auth-error-banner");
  const authBtnSpinner = document.getElementById("auth-btn-spinner");

  function showLoadingScreen(message) {
    if (splashStatusText && message) {
      splashStatusText.textContent = message;
    }
    if (splashScreen) {
      splashScreen.classList.remove("is-hidden");
    }
  }

  function hideSplashScreen() {
    if (splashScreen && !splashScreen.classList.contains("is-hidden")) {
      splashScreen.classList.add("is-hidden");
    }
  }

  function showFullApp() {
    if (mainAppContainer) mainAppContainer.style.display = "block";
    if (loggedOutScreen) loggedOutScreen.classList.add("is-hidden");
    setTimeout(() => {
      hideSplashScreen();
    }, 300);

    // Trigger cloud data sync when entering full app
    const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
    if (window.DataStore && webAppUrl) {
      if (typeof window.DataStore.syncAllBranches === "function") {
        window.DataStore.syncAllBranches(webAppUrl);
      } else {
        window.DataStore.syncFromCloud(webAppUrl);
      }
    }
  }

  function showLoggedOutScreen() {
    if (mainAppContainer) mainAppContainer.style.display = "none";
    if (loggedOutScreen) loggedOutScreen.classList.remove("is-hidden");
    hideSplashScreen();
  }

  // 1. Initial Session Check: Splash Screen -> Session ID Checking Loading Screen
  showLoadingScreen("Checking Session ID...");
  const sessionUser = window.Auth ? window.Auth.validateSession() : null;

  if (sessionUser) {
    const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
    if (window.Auth && typeof window.Auth.verifySessionWithCloud === "function") {
      window.Auth.verifySessionWithCloud(webAppUrl)
        .then((res) => {
          if (res && res.valid) {
            showLoadingScreen("Session Verified! Loading App...");
            showFullApp();
          } else {
            showLoggedOutScreen();
          }
        })
        .catch(() => {
          // If network error/offline, fallback to local session
          showFullApp();
        });
    } else {
      showFullApp();
    }
  } else {
    setTimeout(() => {
      showLoggedOutScreen();
    }, 400);
  }

  // 2. Emergency Access Panel Toggle Handler
  const btnToggleEmergency = document.getElementById("btn-toggle-emergency");
  const emergencyPanel = document.getElementById("emergency-access-panel");

  if (btnToggleEmergency && emergencyPanel) {
    btnToggleEmergency.addEventListener("click", () => {
      const isHidden = emergencyPanel.hidden;
      emergencyPanel.hidden = !isHidden;
      btnToggleEmergency.classList.toggle("is-open", isHidden);
      if (isHidden) {
        const codeInput = document.getElementById("auth-emergency-code-input");
        if (codeInput) codeInput.focus();
      }
    });
  }

  // 3. Handle Emergency Code Login Form Submit
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const codeIn = document.getElementById("auth-emergency-code-input");
      const codeVal = codeIn ? codeIn.value : "";

      if (!codeVal) {
        if (authErrorBanner) {
          authErrorBanner.textContent = "Please enter an Emergency Backup Code.";
          authErrorBanner.hidden = false;
        }
        return;
      }

      if (authErrorBanner) authErrorBanner.hidden = true;
      if (authBtnSpinner) authBtnSpinner.hidden = false;

      // Show Full-Screen Loading State: "Verifying Emergency Backup Code..."
      showLoadingScreen("Verifying Emergency Backup Code...");

      const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
      if (window.Auth && typeof window.Auth.loginWithEmergencyCode === "function") {
        window.Auth.loginWithEmergencyCode(codeVal, webAppUrl).then((res) => {
          if (authBtnSpinner) authBtnSpinner.hidden = true;
          if (res.success) {
            showLoadingScreen("Emergency Code Verified! Loading App...");
            showFullApp();
            if (window.UI) window.UI.toast(`Emergency Access Granted (${res.user.name || "Admin"})`, "success");
            if (codeIn) codeIn.value = "";
          } else {
            showLoggedOutScreen();
            if (authErrorBanner) {
              authErrorBanner.textContent = res.message || "Invalid Emergency Backup Code";
              authErrorBanner.hidden = false;
            }
            if (window.UI) window.UI.toast(res.message || "Emergency Code Verification Failed", "error");
          }
        }).catch(() => {
          if (authBtnSpinner) authBtnSpinner.hidden = true;
          showLoggedOutScreen();
          if (authErrorBanner) {
            authErrorBanner.textContent = "Network error verifying Emergency Code. Please check your connection.";
            authErrorBanner.hidden = false;
          }
        });
      }
    });
  }

  // Handle Google Login Button Click
  const btnGoogleAuth = document.getElementById("btn-auth-google");
  if (btnGoogleAuth) {
    const originalGoogleBtnHtml = btnGoogleAuth.innerHTML;

    function resetGoogleBtnState() {
      if (btnGoogleAuth) {
        btnGoogleAuth.innerHTML = originalGoogleBtnHtml;
        btnGoogleAuth.disabled = false;
        btnGoogleAuth.style.opacity = "1";
      }
    }

    btnGoogleAuth.addEventListener("click", () => {
      if (!window.Auth || typeof window.Auth.initGoogleAuth !== "function") return;

      if (authErrorBanner) authErrorBanner.hidden = true;

      // Immediate UI visual feedback on click
      btnGoogleAuth.disabled = true;
      btnGoogleAuth.style.opacity = "0.75";
      btnGoogleAuth.innerHTML = `<span>Connecting to Google...</span>`;

      window.Auth.initGoogleAuth(
        (googleEmail, tokenData) => {
          showLoadingScreen(`Authenticating Google Account (${googleEmail})...`);
          resetGoogleBtnState();

          const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
          window.Auth.loginWithGoogle(googleEmail, webAppUrl)
            .then((res) => {
              if (res.success) {
                showLoadingScreen("Google Account Validated! Loading App...");
                showFullApp();
                if (window.UI) window.UI.toast(`Welcome back, ${res.user.name || res.user.email}!`, "success");
              } else {
                showLoggedOutScreen();
                if (authErrorBanner) {
                  authErrorBanner.textContent = res.message || `Google account (${googleEmail}) is not authorized.`;
                  authErrorBanner.hidden = false;
                }
                if (window.UI) window.UI.toast(res.message || "Google login failed", "error");
              }
            })
            .catch(() => {
              showLoggedOutScreen();
              if (authErrorBanner) {
                authErrorBanner.textContent = "Network error verifying Google account. Please try again.";
                authErrorBanner.hidden = false;
              }
            });
        },
        (errMessage) => {
          resetGoogleBtnState();
          if (authErrorBanner && errMessage) {
            authErrorBanner.textContent = errMessage;
            authErrorBanner.hidden = false;
          }
          if (window.UI && errMessage) {
            window.UI.toast(errMessage, "warning");
          }
        }
      );
    });
  }

  // Global Auth Event Listeners
  window.addEventListener("userLoggedOut", () => {
    showLoggedOutScreen();
  });

  window.addEventListener("userLoggedIn", () => {
    showFullApp();
  });

  // Initial 60s countdown timer startup
  if (window.SyncCountdownManager) {
    window.SyncCountdownManager.start();
  }

  // Re-sync and reset countdown on branch change
  window.addEventListener("branchChanged", () => {
    const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
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
