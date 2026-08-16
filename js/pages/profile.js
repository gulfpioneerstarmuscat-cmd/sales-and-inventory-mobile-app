// js/pages/profile.js - Profile Management, Dynamic Branch Indicator & Admin Developer Testing Suite

(function () {
  let activeModalBackdrop = null;

  function getBranchInitials(branchKey) {
    const key = branchKey || (window.Auth ? window.Auth.getActiveBranch() : "alkhoud");
    return key === "ghala" ? "G" : "AK";
  }

  function updateTopProfileBadge() {
    const badge = document.getElementById("top-profile-badge");
    if (badge && window.Auth) {
      const initials = getBranchInitials();
      badge.textContent = initials;
    }
    // Remove old header branch pill if present
    const oldPill = document.getElementById("header-branch-pill");
    if (oldPill) oldPill.remove();
  }

  function openProfileModal() {
    if (activeModalBackdrop) {
      activeModalBackdrop.remove();
      activeModalBackdrop = null;
    }

    const profileBtn = document.getElementById("btn-top-profile") || document.querySelector(".profile-button");
    if (profileBtn) profileBtn.classList.add("is-active");

    const backdrop = document.createElement("div");
    backdrop.className = "dp-modal-backdrop profile-modal-backdrop";
    
    backdrop.innerHTML = `
      <div class="dp-modal-card profile-modal-card">
        <div class="profile-modal-header">
          <h3 class="profile-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            User Profile & Branch
          </h3>
          <button type="button" class="modal-close-btn" id="btn-close-profile-modal">&times;</button>
        </div>
        <div class="profile-modal-body" id="profile-modal-body-content">
          <!-- Dynamic Profile Content -->
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    activeModalBackdrop = backdrop;

    requestAnimationFrame(() => backdrop.classList.add("dp-modal-backdrop--visible"));

    const closeBtn = backdrop.querySelector("#btn-close-profile-modal");
    if (closeBtn) {
      closeBtn.onclick = closeProfileModal;
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeProfileModal();
    });

    renderProfileContent(backdrop.querySelector("#profile-modal-body-content"));
  }

  function closeProfileModal() {
    if (activeModalBackdrop) {
      activeModalBackdrop.classList.remove("dp-modal-backdrop--visible");
      setTimeout(() => {
        if (activeModalBackdrop) {
          activeModalBackdrop.remove();
          activeModalBackdrop = null;
        }
      }, 200);
    }
    const profileBtn = document.getElementById("btn-top-profile") || document.querySelector(".profile-button");
    if (profileBtn) profileBtn.classList.remove("is-active");
  }

  function renderProfileContent(container) {
    if (!container) return;
    const user = window.Auth ? window.Auth.getUser() : null;
    const activeBranch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const isAdmin = window.Auth ? window.Auth.isAdmin() : false;
    const isStaff = user && user.role === "staff";
    const initials = getBranchInitials(activeBranch);

    if (!user) {
      container.innerHTML = `
        <div class="not-logged-in-card">
          <div class="not-logged-in-avatar">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h3 class="not-logged-in-title">Not Logged In</h3>
          <p class="not-logged-in-subtitle">Please sign in with your staff or admin account to access multi-branch sales & inventory management.</p>
          <button type="button" class="btn-login-trigger" id="btn-open-login-modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            Log In to Your Account
          </button>
          <button type="button" class="btn-google-login" id="btn-google-login">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.37 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      `;
      const loginBtn = container.querySelector("#btn-open-login-modal");
      if (loginBtn) loginBtn.onclick = showLoginModal;

      const googleBtn = container.querySelector("#btn-google-login");
      if (googleBtn) {
        googleBtn.onclick = () => {
          if (window.UI) window.UI.toast("Google Auth initialized (Ready for connection)", "info");
        };
      }
      return;
    }

    // Simplified Display Name: "Boss" for Boss/Admin, "Staff" for Staff, or custom edited name
    let displayName = user.name || "";
    if (!displayName || displayName === "User") {
      displayName = isAdmin ? "Boss" : "Staff";
    }

    container.innerHTML = `
      <div class="profile-container">
        <!-- User Profile Card -->
        <div class="profile-header-card">
          <div class="profile-avatar profile-avatar--branch">
            <span class="avatar-initials">${initials}</span>
          </div>
          <div class="profile-info">
            <div class="user-name-wrapper">
              <h3 class="user-name" id="display-user-name">${displayName}</h3>
              <button type="button" class="btn-edit-name" id="btn-edit-username" title="Edit Username">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
            <span class="user-email">${user.email || ""}</span>
          </div>
        </div>

        <!-- Branch Location Selection Section -->
        <div class="branch-access-card">
          <h4 class="card-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            Select Branch Location ${isStaff ? '<span class="not-available-tag">(not available)</span>' : ''}
          </h4>

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

        ${isAdmin ? `
        <!-- Developer Test (Admin Only) Section -->
        <div class="dev-test-card">
          <h4 class="card-section-title dev-test-title">
            <span>⚡ Developer Test (Admin Only)</span>
          </h4>
          
          <!-- Sub-section: Account Switcher -->
          <div class="dev-test-group">
            <div class="dev-group-label">Quick Account Switcher</div>
            <div class="demo-buttons-grid">
              <button type="button" class="demo-login-btn" data-user="admin@gps.om" data-pin="1234">
                👑 Boss / Admin
              </button>
              <button type="button" class="demo-login-btn" data-user="alkhoud@gps.om" data-pin="1111">
                📍 Al Khoud Staff
              </button>
              <button type="button" class="demo-login-btn" data-user="ghala@gps.om" data-pin="2222">
                📍 Ghala Staff
              </button>
            </div>
          </div>

          <!-- Sub-section: Notification Testing -->
          <div class="dev-test-group">
            <div class="dev-group-label">Test Notifications</div>
            <div class="dev-btns-grid">
              <button type="button" class="dev-action-btn dev-btn--success" id="btn-test-notif-success">
                ✅ Success
              </button>
              <button type="button" class="dev-action-btn dev-btn--warning" id="btn-test-notif-warning">
                ⚠️ Warning
              </button>
              <button type="button" class="dev-action-btn dev-btn--error" id="btn-test-notif-error">
                ❌ Error
              </button>
              <button type="button" class="dev-action-btn dev-btn--lowstock" id="btn-test-notif-lowstock">
                🔔 Low Stock Alert
              </button>
            </div>
          </div>

          <!-- Sub-section: Speed & Performance Tests -->
          <div class="dev-test-group">
            <div class="dev-group-label">Cloud Speed & Sync Tests</div>
            <div class="dev-btns-grid">
              <button type="button" class="dev-action-btn" id="btn-test-speed">
                ⚡ Benchmark Read & Write
              </button>
              <button type="button" class="dev-action-btn" id="btn-test-sync">
                🔄 Check Sync Timings
              </button>
            </div>
          </div>

          <!-- Sub-section: Dummy Data Generators -->
          <div class="dev-test-group">
            <div class="dev-group-label">Dummy Data Generators</div>
            <div class="dev-btns-grid">
              <button type="button" class="dev-action-btn dev-btn--dummy" id="btn-dummy-add-sale">
                🛒 Add Dummy Sale
              </button>
              <button type="button" class="dev-action-btn dev-btn--dummy" id="btn-dummy-new-stock">
                📦 Add Dummy Stock (New)
              </button>
              <button type="button" class="dev-action-btn dev-btn--dummy" id="btn-dummy-exist-stock">
                ➕ Add Dummy Stock (+5 Existing)
              </button>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Logout Action -->
        <button type="button" class="btn-logout" id="btn-logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Log Out Account
        </button>
      </div>
    `;

    // Bind Edit Username click handler
    const editNameBtn = container.querySelector("#btn-edit-username");
    if (editNameBtn) {
      editNameBtn.addEventListener("click", () => {
        showEditUsernameModal(user);
      });
    }

    // Branch Selector click handlers
    const branchBtns = container.querySelectorAll(".branch-btn");
    branchBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const selectedBranch = btn.dataset.branch;
        if (window.Auth && window.Auth.setActiveBranch(selectedBranch)) {
          updateTopProfileBadge();
          renderProfileContent(container);
          if (window.UI) window.UI.toast(`Switched active branch to ${window.Auth.getBranchLabel(selectedBranch)}`, "success");
        }
      });
    });

    // Account Switcher click handlers
    const demoBtns = container.querySelectorAll(".demo-login-btn");
    demoBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = btn.dataset.user;
        const p = btn.dataset.pin;
        if (window.Auth) {
          const webUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null;
          window.Auth.login(u, p, webUrl).then(() => {
            updateTopProfileBadge();
            renderProfileContent(container);
            if (window.UI) window.UI.toast(`Switched account to ${u}`, "info");
          });
        }
      });
    });

    // Test Notifications Click Handlers
    const btnSuccess = container.querySelector("#btn-test-notif-success");
    if (btnSuccess) btnSuccess.onclick = () => window.UI && window.UI.toast("✅ Test Success Notification!", "success");

    const btnWarning = container.querySelector("#btn-test-notif-warning");
    if (btnWarning) btnWarning.onclick = () => window.UI && window.UI.toast("⚠️ Test Warning Notification!", "warning");

    const btnError = container.querySelector("#btn-test-notif-error");
    if (btnError) btnError.onclick = () => window.UI && window.UI.toast("❌ Test Error Notification!", "error");

    const btnLowStock = container.querySelector("#btn-test-notif-lowstock");
    if (btnLowStock) btnLowStock.onclick = () => window.UI && window.UI.toast("⚠️ Low Stock Alert: Beninca 600KG (Only 2 remaining!)", "warning");

    // Speed Benchmark Handler
    const btnSpeed = container.querySelector("#btn-test-speed");
    if (btnSpeed) {
      btnSpeed.onclick = () => runSpeedBenchmark();
    }

    // Sync Timings Handler
    const btnSync = container.querySelector("#btn-test-sync");
    if (btnSync) {
      btnSync.onclick = () => {
        const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
        const lastSync = (window.DataStore && typeof window.DataStore.getLastSyncedTime === "function") 
          ? (window.DataStore.getLastSyncedTime(branch) || "Just now") 
          : "Just now";
        if (window.UI) window.UI.toast(`🔄 Sync Status: Active (${branch}) | Interval: 60s | Last Sync: ${lastSync}`, "info");
      };
    }

    // Dummy Data Generator Handlers
    const btnDummySale = container.querySelector("#btn-dummy-add-sale");
    if (btnDummySale) btnDummySale.onclick = () => runDummyAddSale();

    const btnDummyNewStock = container.querySelector("#btn-dummy-new-stock");
    if (btnDummyNewStock) btnDummyNewStock.onclick = () => runDummyAddNewStock();

    const btnDummyExistStock = container.querySelector("#btn-dummy-exist-stock");
    if (btnDummyExistStock) btnDummyExistStock.onclick = () => runDummyAddExistingStock();

    // Logout handler
    const logoutBtn = container.querySelector("#btn-logout");
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
              updateTopProfileBadge();
              closeProfileModal();
              if (window.UI) window.UI.toast("Logged out successfully", "info");
            }
          });
        } else {
          if (window.Auth) window.Auth.logout();
          updateTopProfileBadge();
          closeProfileModal();
        }
      });
    }
  }

  function showEditUsernameModal(user) {
    if (!window.UI) return;
    const currentName = user ? (user.name || "") : "";
    window.UI.modal({
      title: "✏️ Edit Account Username",
      bodyHtml: `
        <div class="login-modal-content">
          <div class="login-field-group">
            <label class="login-field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Account Email (Read-only)
            </label>
            <input type="text" value="${user ? user.email : ''}" disabled class="form-input login-input" style="opacity: 0.75; background:#f1f5f9; cursor:not-allowed;" />
          </div>
          <div class="login-field-group">
            <label for="edit-username-input" class="login-field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              New Username
            </label>
            <input type="text" id="edit-username-input" class="form-input login-input" value="${currentName}" placeholder="Enter name e.g. Boss / Staff" />
          </div>
        </div>
      `,
      cancelText: "Cancel",
      confirmText: "Save Username",
      onConfirm: () => {
        const input = document.getElementById("edit-username-input");
        const val = input ? input.value.trim() : "";
        if (val && window.Auth && window.Auth.updateUsername(val)) {
          if (activeModalBackdrop) {
            renderProfileContent(activeModalBackdrop.querySelector("#profile-modal-body-content"));
          }
          if (window.UI) window.UI.toast("Username updated to " + val, "success");
        }
      }
    });
  }

  function runSpeedBenchmark() {
    if (!window.UI) return;
    window.UI.toast("⏱️ Benchmarking Cloud Read & Write speed...", "info");
    const startTime = performance.now();
    const url = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null;

    if (!url) {
      window.UI.toast("Cloud URL not configured. Local latency: < 1ms", "warning");
      return;
    }

    // Benchmark Read (GET)
    fetch(url + "?branch=" + (window.Auth ? window.Auth.getActiveBranch() : "alkhoud"), { method: "GET" })
      .then((res) => {
        const readTime = (performance.now() - startTime).toFixed(0);
        // Benchmark Write (POST)
        const writeStart = performance.now();
        return fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "ping", branch: window.Auth ? window.Auth.getActiveBranch() : "alkhoud" })
        }).then(() => {
          const writeTime = (performance.now() - writeStart).toFixed(0);
          window.UI.toast(`⚡ Latency Result: Cloud Read: ${readTime}ms | Cloud Write: ${writeTime}ms`, "success");
        });
      })
      .catch((err) => {
        window.UI.toast("Latency test notice: " + (err.message || "Failed"), "warning");
      });
  }

  function runDummyAddSale() {
    if (!window.DataStore) return;
    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const inventory = typeof window.DataStore.getInventory === "function" 
      ? window.DataStore.getInventory(branch) 
      : [];
    const item = (inventory && inventory.length > 0) ? inventory[0] : { name: "Beninca 600KG", qty: 10 };
    
    const dummySale = {
      date: new Date().toISOString().split("T")[0],
      customerName: "Test Customer " + Math.floor(Math.random() * 90 + 10),
      customerNumber: "9" + Math.floor(Math.random() * 8999999 + 1000000),
      customerEmail: "testcustomer@gps.om",
      vatBill: "yes",
      paymentStatus: "paid",
      paymentMethod: "cash",
      cashAmount: 45.500,
      cardAmount: 0.000,
      grandTotal: 45.500,
      items: [
        { name: item.name, qty: 1, unitPrice: 45.500 }
      ]
    };

    const webUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null;
    const res = typeof window.DataStore.recordSale === "function"
      ? window.DataStore.recordSale(dummySale, webUrl)
      : { success: false };

    if (res && res.success && window.UI) {
      window.UI.toast(`🛒 Dummy Sale recorded for ${dummySale.customerName} (45.500 OMR)`, "success");
    }
  }

  function runDummyAddNewStock() {
    if (!window.DataStore) return;
    const randomId = Math.floor(Math.random() * 900 + 100);
    const newItem = {
      name: "Auto Gate Motor X-" + randomId,
      category: "Automation",
      addQty: 15,
      alertLevel: 5,
      sku: "SKU-" + randomId + "X",
      remarks: "Dummy New Stock"
    };

    const webUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null;
    const res = typeof window.DataStore.addStockQuantity === "function"
      ? window.DataStore.addStockQuantity(newItem, webUrl)
      : { success: false };

    if (res && res.success && window.UI) {
      window.UI.toast(`📦 Added New Item: ${newItem.name} (Qty: 15)`, "success");
    }
  }

  function runDummyAddExistingStock() {
    if (!window.DataStore) return;
    const branch = window.Auth ? window.Auth.getActiveBranch() : "alkhoud";
    const inventory = typeof window.DataStore.getInventory === "function"
      ? window.DataStore.getInventory(branch)
      : [];
    if (!inventory || inventory.length === 0) {
      if (window.UI) window.UI.toast("No existing inventory items found in active branch", "warning");
      return;
    }
    const item = inventory[0];
    const webUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null;
    
    const res = typeof window.DataStore.addStockQuantity === "function"
      ? window.DataStore.addStockQuantity({
          name: item.name,
          addQty: 5,
          category: item.category,
          alertLevel: item.alertLevel,
          remarks: "Dummy Test Increment +5"
        }, webUrl)
      : { success: false };

    if (res && res.success && window.UI) {
      window.UI.toast(`➕ Added +5 stock to existing item '${item.name}'`, "success");
    }
  }

  function showLoginModal() {
    if (!window.UI) return;
    window.UI.modal({
      title: "🔐 Staff & Admin Login",
      bodyHtml: `
        <div class="login-modal-content">
          <div class="login-modal-banner">
            <div class="login-banner-icon">🔐</div>
            <div class="login-banner-text">
              <h4>System Authentication</h4>
              <p>Sign in with your Email/Username and PIN to access branch inventory & sales data.</p>
            </div>
          </div>

          <div class="login-form-fields">
            <div class="login-field-group">
              <label for="login-user-input" class="login-field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Email or Username
              </label>
              <input type="text" id="login-user-input" class="form-input login-input" placeholder="Enter Email or Username" autocomplete="username" />
            </div>

            <div class="login-field-group">
              <label for="login-pin-input" class="login-field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                PIN Code
              </label>
              <input type="password" id="login-pin-input" class="form-input login-input" placeholder="Enter PIN Code" maxlength="8" autocomplete="current-password" />
            </div>
          </div>

          <div class="login-quick-fill-section">
            <span class="quick-fill-label">⚡ Instant Test Fill:</span>
            <div class="quick-fill-chips">
              <button type="button" class="quick-fill-chip" data-user="admin@gps.om" data-pin="1234">👑 Boss (1234)</button>
              <button type="button" class="quick-fill-chip" data-user="alkhoud@gps.om" data-pin="1111">📍 Al Khoud (1111)</button>
              <button type="button" class="quick-fill-chip" data-user="ghala@gps.om" data-pin="2222">📍 Ghala (2222)</button>
            </div>
          </div>
        </div>
      `,
      cancelText: "Cancel",
      confirmText: "Log In Now",
      onConfirm: () => {
        const uIn = document.getElementById("login-user-input");
        const pIn = document.getElementById("login-pin-input");
        const uVal = uIn ? uIn.value : "";
        const pVal = pIn ? pIn.value : "";

        if (window.Auth) {
          const webUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : null;
          window.Auth.login(uVal, pVal, webUrl).then((res) => {
            if (res.success) {
              updateTopProfileBadge();
              if (activeModalBackdrop) {
                renderProfileContent(activeModalBackdrop.querySelector("#profile-modal-body-content"));
              }
              if (window.UI) window.UI.toast("Welcome back!", "success");
            } else {
              if (window.UI) window.UI.toast(res.message || "Login failed", "error");
            }
          });
        }
      }
    });

    // Attach quick fill chips event handlers
    setTimeout(() => {
      const chips = document.querySelectorAll(".quick-fill-chip");
      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          const uIn = document.getElementById("login-user-input");
          const pIn = document.getElementById("login-pin-input");
          if (uIn) uIn.value = chip.dataset.user || "";
          if (pIn) pIn.value = chip.dataset.pin || "";
        });
      });
    }, 50);
  }

  // Expose methods globally
  window.openProfileModal = openProfileModal;
  window.closeProfileModal = closeProfileModal;

  window.initProfilePage = function initProfilePage() {
    updateTopProfileBadge();
    window.addEventListener("branchChanged", () => {
      updateTopProfileBadge();
      if (activeModalBackdrop) {
        renderProfileContent(activeModalBackdrop.querySelector("#profile-modal-body-content"));
      }
    });
    window.addEventListener("userLoggedIn", () => {
      updateTopProfileBadge();
      if (activeModalBackdrop) {
        renderProfileContent(activeModalBackdrop.querySelector("#profile-modal-body-content"));
      }
    });
    window.addEventListener("userLoggedOut", () => {
      updateTopProfileBadge();
      if (activeModalBackdrop) {
        renderProfileContent(activeModalBackdrop.querySelector("#profile-modal-body-content"));
      }
    });
    window.addEventListener("userUpdated", () => {
      if (activeModalBackdrop) {
        renderProfileContent(activeModalBackdrop.querySelector("#profile-modal-body-content"));
      }
    });

    // Also handle inline render if container exists
    const root = document.getElementById("profile-page-root");
    if (root) {
      renderProfileContent(root);
    }
  };

  // Run initial badge update on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateTopProfileBadge);
  } else {
    updateTopProfileBadge();
  }
})();
