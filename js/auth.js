// js/auth.js - Multi-Branch Authentication & Session Management

window.Auth = (function () {
  const STORAGE_KEY_USER = "gps_user_session_v1";
  const STORAGE_KEY_BRANCH = "gps_active_branch_v1";

  // Pre-configured test accounts for instant offline/local testing
  const DEMO_USERS = [
    {
      email: "admin@gps.om",
      name: "Boss / Admin",
      role: "admin",
      assignedBranch: "all",
      pin: "1234",
      allowedBranches: ["alkhoud", "ghala"]
    },
    {
      email: "alkhoud@gps.om",
      name: "Al Khoud Staff",
      role: "staff",
      assignedBranch: "alkhoud",
      pin: "1111",
      allowedBranches: ["alkhoud"]
    },
    {
      email: "ghala@gps.om",
      name: "Ghala Staff",
      role: "staff",
      assignedBranch: "ghala",
      pin: "2222",
      allowedBranches: ["ghala"]
    }
  ];

  // Load active user session from localStorage (default to admin demo account if not set)
  let currentUser = loadUserSession();
  let activeBranch = loadActiveBranch();

  function loadUserSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      return stored ? JSON.parse(stored) : DEMO_USERS[0];
    } catch (e) {
      return DEMO_USERS[0];
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

  function saveSession(user, branch) {
    currentUser = user;
    activeBranch = branch;
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_BRANCH, branch);
    } catch (e) {}
  }

  return {
    getUser: function () {
      return currentUser ? { ...currentUser } : null;
    },

    getCurrentUser: function () {
      return currentUser ? { ...currentUser } : null;
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

      // 1. Check local demo accounts first (for instant 0ms offline login)
      const demoMatch = DEMO_USERS.find(
        (u) =>
          (u.email.toLowerCase() === inputVal || u.email.split("@")[0] === inputVal) &&
          u.pin === pinVal
      );

      if (demoMatch) {
        const userObj = {
          email: demoMatch.email,
          name: demoMatch.name,
          role: demoMatch.role,
          assignedBranch: demoMatch.assignedBranch,
          allowedBranches: demoMatch.allowedBranches
        };
        const initBranch = demoMatch.assignedBranch === "all" ? "alkhoud" : demoMatch.assignedBranch;
        saveSession(userObj, initBranch);
        window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userObj }));
        return Promise.resolve({ success: true, user: userObj });
      }

      // 2. Cloud login check if Web App URL is provided
      if (webAppUrl && webAppUrl.startsWith("http")) {
        return fetch(webAppUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "login", email: inputVal, pin: pinVal })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.status === "success" && data.user) {
              const u = data.user;
              const initBranch = u.assignedBranch === "all" ? "alkhoud" : u.assignedBranch;
              saveSession(u, initBranch);
              window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: u }));
              return { success: true, user: u };
            }
            return { success: false, message: data.message || "Invalid Credentials" };
          })
          .catch((err) => {
            return { success: false, message: "Network error during login check" };
          });
      }

      return Promise.resolve({ success: false, message: "Invalid Email or PIN Code" });
    },

    logout: function () {
      currentUser = null;
      activeBranch = "alkhoud";
      try {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_BRANCH);
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("userLoggedOut"));
    },

    isAuthenticated: function () {
      return !!currentUser;
    },

    isAdmin: function () {
      return currentUser && currentUser.role === "admin";
    },

    getDemoAccounts: function () {
      return [...DEMO_USERS];
    }
  };
})();
