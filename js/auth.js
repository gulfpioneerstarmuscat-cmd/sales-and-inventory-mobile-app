// js/auth.js - Multi-Branch Authentication & Session Management with Device ID & Cloud Sessions

window.Auth = (function () {
  const STORAGE_KEY_USER = "gps_user_session_v1";
  const STORAGE_KEY_BRANCH = "gps_active_branch_v1";
  const STORAGE_KEY_SESSION = "gps_session_token_v1";
  const STORAGE_KEY_DEVICE = "gps_device_id_v1";

  // Load active user session from localStorage (returns null if not logged in)
  let currentUser = loadUserSession();
  let activeBranch = loadActiveBranch();

  function getDeviceId() {
    let devId = null;
    try {
      devId = localStorage.getItem(STORAGE_KEY_DEVICE);
      if (!devId) {
        devId = "dev_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY_DEVICE, devId);
      }
    } catch (e) {
      devId = "dev_default";
    }
    return devId;
  }

  function getDeviceName() {
    const ua = navigator.userAgent || "";
    let os = "Device";
    if (ua.includes("iPhone")) os = "iPhone";
    else if (ua.includes("iPad")) os = "iPad";
    else if (ua.includes("Android")) os = "Android Phone";
    else if (ua.includes("Windows")) os = "Windows PC";
    else if (ua.includes("Macintosh")) os = "Mac";

    let browser = "Browser";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Firefox")) browser = "Firefox";

    return `${os} (${browser})`;
  }

  function loadUserSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  function loadSessionToken() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  function loadActiveBranch() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BRANCH);
      if (stored && ["alkhoud", "ghala"].includes(stored)) {
        return stored;
      }
    } catch (e) {}
    return (currentUser && currentUser.assignedBranch !== "all")
      ? currentUser.assignedBranch
      : "alkhoud";
  }

  function saveSession(user, branch, sessionData) {
    currentUser = user;
    activeBranch = branch;
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_BRANCH, branch);
      if (sessionData) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionData));
      }
    } catch (e) {}
  }

  return {
    getUser: function () {
      return currentUser ? { ...currentUser } : null;
    },

    getCurrentUser: function () {
      return currentUser ? { ...currentUser } : null;
    },

    getSessionToken: function () {
      return loadSessionToken();
    },

    getDeviceId: getDeviceId,
    getDeviceName: getDeviceName,

    validateSession: function () {
      currentUser = loadUserSession();
      const sess = loadSessionToken();
      if (currentUser && (currentUser.email || currentUser.role)) {
        if (sess && sess.expiresAt) {
          const expTime = new Date(sess.expiresAt).getTime();
          if (!isNaN(expTime) && Date.now() > expTime) {
            this.logout();
            return null;
          }
        }
        return { ...currentUser };
      }
      return null;
    },

    verifySessionWithCloud: function (webAppUrl) {
      const sess = loadSessionToken();
      const devId = getDeviceId();
      const targetUrl = webAppUrl || (window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null);

      if (!sess || !sess.sessionId || !targetUrl || !targetUrl.startsWith("http")) {
        return Promise.resolve({ valid: true });
      }

      return fetch(targetUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "verify_session",
          sessionId: sess.sessionId,
          deviceId: devId
        })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.status === "success" && data.valid) {
            if (data.user) {
              currentUser = data.user;
              try { localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser)); } catch (e) {}
            }
            if (data.session && data.session.expiresAt) {
              sess.expiresAt = data.session.expiresAt;
              try { localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sess)); } catch (e) {}
            }
            return { valid: true, user: currentUser };
          }
          console.warn("Session revoked or expired:", data ? data.message : "Invalid");
          this.logout();
          if (window.UI) {
            window.UI.toast(data.message || "Session revoked by administrator", "warning");
          }
          return { valid: false, message: data ? data.message : "Session invalid" };
        })
        .catch((err) => {
          console.warn("Cloud session check offline, using local session token");
          return { valid: true, offline: true };
        });
    },

    getActiveBranch: function () {
      return activeBranch || "alkhoud";
    },

    getBranchLabel: function (branchKey) {
      const key = branchKey || activeBranch;
      return key === "ghala" ? "Ghala Branch" : "Al Khoud Branch";
    },

    setActiveBranch: function (branchKey) {
      if (!["alkhoud", "ghala"].includes(branchKey)) return false;
      
      // Check permissions
      if (currentUser && currentUser.role !== "admin") {
        if (currentUser.assignedBranch !== branchKey) {
          console.warn("Staff user cannot switch to unauthorized branch");
          return false;
        }
      }

      activeBranch = branchKey;
      try {
        localStorage.setItem(STORAGE_KEY_BRANCH, branchKey);
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent("branchChanged", { detail: { branch: branchKey } })
      );
      return true;
    },

    login: function (emailOrUser, pin, webAppUrl) {
      const inputVal = (emailOrUser || "").trim().toLowerCase();
      const pinVal = String(pin || "").trim();

      if (!inputVal || !pinVal) {
        return Promise.resolve({ success: false, message: "Please enter Username/Email and PIN Code" });
      }

      const targetUrl = webAppUrl || (window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null);

      // Cloud login check against Google Sheets users & sessions sheet
      if (targetUrl && targetUrl.startsWith("http")) {
        return fetch(targetUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "login",
            email: inputVal,
            pin: pinVal,
            deviceId: getDeviceId(),
            deviceName: getDeviceName()
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.status === "success" && data.user) {
              const u = data.user;
              const storedBranch = loadActiveBranch();
              const initBranch = u.assignedBranch === "all"
                ? (["alkhoud", "ghala"].includes(storedBranch) ? storedBranch : "alkhoud")
                : u.assignedBranch;
              saveSession(u, initBranch, data.session);
              window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: u }));
              return { success: true, user: u, session: data.session };
            }
            return { success: false, message: data.message || "Invalid Credentials. Check Username/PIN Code." };
          })
          .catch((err) => {
            return { success: false, message: "Network error checking login credentials" };
          });
      }

      return Promise.resolve({ success: false, message: "Backend Web App URL not configured" });
    },

    loginWithGoogle: function (googleEmail, webAppUrl) {
      const emailVal = (googleEmail || "").trim().toLowerCase();
      if (!emailVal) {
        return Promise.resolve({ success: false, message: "Google Email is required" });
      }

      const targetUrl = webAppUrl || (window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null);

      if (targetUrl && targetUrl.startsWith("http")) {
        return fetch(targetUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "google_login",
            email: emailVal,
            deviceId: getDeviceId(),
            deviceName: getDeviceName()
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.status === "success" && data.user) {
              const u = data.user;
              const storedBranch = loadActiveBranch();
              const initBranch = u.assignedBranch === "all"
                ? (["alkhoud", "ghala"].includes(storedBranch) ? storedBranch : "alkhoud")
                : u.assignedBranch;
              saveSession(u, initBranch, data.session);
              window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: u }));
              return { success: true, user: u, session: data.session };
            }
            return { success: false, message: data.message || "Google email not authorized." };
          })
          .catch((err) => {
            return { success: false, message: "Network error checking Google account" };
          });
      }

      return Promise.resolve({ success: false, message: "Backend Web App URL not configured" });
    },

    loginWithEmergencyCode: function (code, webAppUrl) {
      const codeVal = String(code || "").trim();
      if (!codeVal) {
        return Promise.resolve({ success: false, message: "Please enter Emergency Backup Code" });
      }

      const targetUrl = webAppUrl || (window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null);

      if (targetUrl && targetUrl.startsWith("http")) {
        return fetch(targetUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "emergency_login",
            code: codeVal,
            deviceId: getDeviceId(),
            deviceName: getDeviceName()
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.status === "success" && data.user) {
              const u = data.user;
              const storedBranch = loadActiveBranch();
              const initBranch = u.assignedBranch === "all"
                ? (["alkhoud", "ghala"].includes(storedBranch) ? storedBranch : "alkhoud")
                : u.assignedBranch;
              saveSession(u, initBranch, data.session);
              window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: u }));
              return { success: true, user: u, session: data.session };
            }
            return { success: false, message: data.message || "Invalid Emergency Backup Code." };
          })
          .catch((err) => {
            return { success: false, message: "Network error verifying Emergency Code" };
          });
      }

      return Promise.resolve({ success: false, message: "Backend Web App URL not configured" });
    },

    _googleInitialized: false,
    _googleTokenClient: null,
    _activeGoogleSuccessCallback: null,
    _activeGoogleErrorCallback: null,

    initGoogleAuth: function (onSuccess, onError) {
      const clientId = window.APP_CONFIG ? window.APP_CONFIG.googleClientId : "";
      if (!clientId) {
        if (typeof onError === "function") onError("Google Client ID is not configured in config.js");
        return;
      }
      if (typeof window.google === "undefined" || !window.google.accounts) {
        if (typeof onError === "function") onError("Google Identity library is loading... Please try again in a moment.");
        return;
      }

      this._activeGoogleSuccessCallback = onSuccess;
      this._activeGoogleErrorCallback = onError;

      // 1. Google OAuth2 Token Client (Persistent instance for instant first-press execution)
      if (window.google.accounts.oauth2) {
        try {
          if (!this._googleTokenClient) {
            this._googleTokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: "email profile",
              callback: (tokenResponse) => {
                const currentSuccess = this._activeGoogleSuccessCallback;
                const currentError = this._activeGoogleErrorCallback;

                if (tokenResponse && tokenResponse.access_token) {
                  fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  })
                    .then((res) => res.json())
                    .then((userInfo) => {
                      if (userInfo && userInfo.email) {
                        if (typeof currentSuccess === "function") currentSuccess(userInfo.email, userInfo);
                      } else if (typeof currentError === "function") {
                        currentError("Could not retrieve email from Google Account");
                      }
                    })
                    .catch(() => {
                      if (typeof currentError === "function") currentError("Network error reading Google profile");
                    });
                } else if (tokenResponse && tokenResponse.error) {
                  if (typeof currentError === "function") {
                    currentError("Google Sign-In prompt closed or cancelled");
                  }
                }
              },
              error_callback: (err) => {
                const currentError = this._activeGoogleErrorCallback;
                if (typeof currentError === "function") currentError("Google Sign-In popup error");
              }
            });
          }

          // Request Google account picker popup immediately
          this._googleTokenClient.requestAccessToken({ prompt: "select_account" });
          return;
        } catch (e) {
          console.warn("Token client fallback to ID prompt:", e);
        }
      }

      // 2. Fallback to Google ID Token prompt
      if (window.google.accounts.id) {
        try {
          if (!this._googleInitialized) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response) => {
                const currentSuccess = this._activeGoogleSuccessCallback;
                const currentError = this._activeGoogleErrorCallback;
                if (response && response.credential) {
                  try {
                    const base64Url = response.credential.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
                      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const tokenData = JSON.parse(jsonPayload);
                    if (tokenData.email && typeof currentSuccess === "function") {
                      currentSuccess(tokenData.email, tokenData);
                    }
                  } catch (e) {
                    if (typeof currentError === "function") currentError("Error parsing Google account payload");
                  }
                }
              }
            });
            this._googleInitialized = true;
          }
          window.google.accounts.id.prompt();
        } catch (err) {
          if (typeof onError === "function") onError("Failed to open Google Sign-In prompt");
        }
      }
    },

    logout: function () {
      currentUser = null;
      activeBranch = "alkhoud";
      try {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_BRANCH);
        localStorage.removeItem(STORAGE_KEY_SESSION);
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("userLoggedOut"));
    },

    isAuthenticated: function () {
      return !!currentUser;
    },

    isAdmin: function () {
      return currentUser && currentUser.role === "admin";
    },

    updateUsername: function (newName) {
      const trimmed = String(newName || "").trim();
      if (!trimmed || !currentUser) return false;
      currentUser.name = trimmed;
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } catch (e) {}
      window.dispatchEvent(
        new CustomEvent("userUpdated", { detail: { user: { ...currentUser } } })
      );
      return true;
    }
  };
})();
