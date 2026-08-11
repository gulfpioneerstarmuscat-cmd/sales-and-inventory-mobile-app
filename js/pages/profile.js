// js/pages/profile.js - Profile Management & Multi-Branch Access Controller

window.initProfilePage = (function () {
  let initialized = false;

  function renderProfileUI() {
    const container = document.getElementById("profile-page-root");
    if (!container) return;

    const user = window.Auth ? window.Auth.getUser() : null;
    const activeBranch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const isAdmin = window.Auth ? window.Auth.isAdmin() : false;

    if (!user) {
      container.innerHTML = `
        <div class="profile-card">
          <h3 class="profile-title">Not Logged In</h3>
          <p class="profile-subtitle">Please log in to access your sales & inventory system.</p>
          <button type="button" class="btn-primary" id="btn-open-login">Log In</button>
        </div>
      `;
      const loginBtn = document.getElementById("btn-open-login");
      if (loginBtn) loginBtn.onclick = showLoginModal;
      return;
    }

    container.innerHTML = `
      <div class="profile-container">
        <!-- User Profile Card -->
        <div class="profile-header-card">
          <div class="profile-avatar">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="profile-info">
            <h3 class="user-name">${user.name || "User"}</h3>
            <span class="user-email">${user.email || ""}</span>
            <div class="role-badge role-badge--${user.role}">${user.role === "admin" ? "👑 Boss / Admin" : "👤 Staff"}</div>
          </div>
        </div>

        <!-- Branch Selection / Access Section -->
        <div class="branch-access-card">
          <h4 class="card-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            Branch Location Access
          </h4>
          <p class="card-subtitle">
            ${isAdmin ? "Select active branch to view & manage inventory/sales:" : "Your assigned branch account:"}
          </p>

          <div class="branch-selector-group">
            <button type="button" class="branch-btn ${activeBranch === "alkhoud" ? "branch-btn--active" : ""}" data-branch="alkhoud" ${!isAdmin && user.assignedBranch !== "alkhoud" ? "disabled" : ""}>
              <span class="branch-icon">🏬</span>
              <span class="branch-name">Al Khoud Branch</span>
              ${activeBranch === "alkhoud" ? '<span class="active-dot">● Active</span>' : ""}
            </button>

            <button type="button" class="branch-btn ${activeBranch === "ghala" ? "branch-btn--active" : ""}" data-branch="ghala" ${!isAdmin && user.assignedBranch !== "ghala" ? "disabled" : ""}>
              <span class="branch-icon">🏬</span>
              <span class="branch-name">Ghala Branch</span>
              ${activeBranch === "ghala" ? '<span class="active-dot">● Active</span>' : ""}
            </button>
          </div>
        </div>

        <!-- Quick Demo Account Switcher (For Testing & Review) -->
        <div class="demo-accounts-card">
          <h4 class="card-section-title">⚡ Quick Account Switcher (Testing)</h4>
          <div class="demo-buttons-grid">
            <button type="button" class="demo-login-btn" data-user="admin@gps.om" data-pin="1234">
              👑 Switch to Admin (Both Branches)
            </button>
            <button type="button" class="demo-login-btn" data-user="alkhoud@gps.om" data-pin="1111">
              📍 Switch to Al Khoud Staff
            </button>
            <button type="button" class="demo-login-btn" data-user="ghala@gps.om" data-pin="2222">
              📍 Switch to Ghala Staff
            </button>
          </div>
        </div>

        <!-- Logout Action -->
        <button type="button" class="btn-logout" id="btn-logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Log Out Account
        </button>
      </div>
    `;

    // Branch Selector click handlers
    const branchBtns = container.querySelectorAll(".branch-btn");
    branchBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const selectedBranch = btn.dataset.branch;
        if (window.Auth && window.Auth.setActiveBranch(selectedBranch)) {
          renderProfileUI();
          updateHeaderBranchPill();
          if (window.UI) window.UI.toast(`Switched active branch to ${window.Auth.getBranchLabel(selectedBranch)}`, "success");
        }
      });
    });

    // Demo Switcher handlers
    const demoBtns = container.querySelectorAll(".demo-login-btn");
    demoBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = btn.dataset.user;
        const p = btn.dataset.pin;
        if (window.Auth) {
          window.Auth.login(u, p).then(() => {
            renderProfileUI();
            updateHeaderBranchPill();
            if (window.UI) window.UI.toast(`Switched account to ${u}`, "info");
          });
        }
      });
    });

    // Logout handler (Use Case 1: Modal Dialog Box for Confirm Logout)
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (window.UI && typeof window.UI.modal === "function") {
          window.UI.modal({
            title: "Confirm Logout",
            message: "Are you sure you want to log out of your active user account?",
            type: "warning",
            confirmText: "Log Out",
            cancelText: "Cancel",
            dangerConfirm: true,
            onConfirm: () => {
              if (window.Auth) window.Auth.logout();
              renderProfileUI();
              updateHeaderBranchPill();
              if (window.UI) window.UI.toast("Logged out successfully", "info");
            }
          });
        } else {
          if (window.Auth) window.Auth.logout();
          renderProfileUI();
          updateHeaderBranchPill();
        }
      });
    }
  }

  function updateHeaderBranchPill() {
    let pill = document.getElementById("header-branch-pill");
    if (!pill) {
      const topPanel = document.querySelector(".top-panel");
      if (topPanel) {
        pill = document.createElement("div");
        pill.id = "header-branch-pill";
        pill.className = "header-branch-pill";
        topPanel.insertBefore(pill, topPanel.querySelector(".profile-button"));
      }
    }

    if (pill && window.Auth) {
      const branchLabel = window.Auth.getBranchLabel();
      pill.innerHTML = `<span>📍</span><span>${branchLabel}</span>`;
    }
  }

  function showLoginModal() {
    if (!window.UI) return;
    // Standard login modal overlay setup
    window.UI.modal({
      title: "Staff & Admin Login",
      message: `
        <div class="login-form-group">
          <label style="display:block; text-align:left; font-size:12px; margin-bottom:4px;">Email or Username:</label>
          <input type="text" id="login-user-input" class="form-input" placeholder="admin@gps.om / alkhoud@gps.om" style="margin-bottom:10px; width:100%;" />
          <label style="display:block; text-align:left; font-size:12px; margin-bottom:4px;">PIN Code:</label>
          <input type="password" id="login-pin-input" class="form-input" placeholder="Enter PIN code (e.g. 1234)" style="width:100%;" />
        </div>
      `,
      confirmText: "Login Now",
      onConfirm: () => {
        const uIn = document.getElementById("login-user-input");
        const pIn = document.getElementById("login-pin-input");
        const uVal = uIn ? uIn.value : "";
        const pVal = pIn ? pIn.value : "";

        if (window.Auth) {
          window.Auth.login(uVal, pVal).then((res) => {
            if (res.success) {
              renderProfileUI();
              updateHeaderBranchPill();
              if (window.UI) window.UI.toast("Welcome back!", "success");
            } else {
              if (window.UI) window.UI.toast(res.message || "Login failed", "error");
            }
          });
        }
      }
    });
  }

  return function initProfilePage() {
    if (!initialized) {
      initialized = true;
      updateHeaderBranchPill();
      window.addEventListener("branchChanged", () => {
        renderProfileUI();
        updateHeaderBranchPill();
      });
      window.addEventListener("userLoggedIn", () => {
        renderProfileUI();
        updateHeaderBranchPill();
      });
      window.addEventListener("userLoggedOut", () => {
        renderProfileUI();
        updateHeaderBranchPill();
      });
    }
    renderProfileUI();
  };
})();
