// js/push_notifi.js - Unified Push Notification & Cloud Sync Manager for GPS (Gulf Pioneer Star)
// Supports all 6 core business notifications:
// 1. Daily 9:00 PM Admin Sales Summary
// 2. Monthly 1st Performance Report
// 3. Real-Time Low Stock Alert
// 4. Offline Sync Confirmation
// 5. Refund & Stock Amendment Audit Alert
// 6. Developer System & Cloud-Delayed Tests

window.PushNotification = (function () {
  const LAST_DAILY_KEY = "gps_last_daily_notif_date";
  const LAST_MONTHLY_KEY = "gps_last_monthly_notif_month";
  const PUSH_SUB_KEY = "gps_device_push_subscription";

  // 1. Query normalized permission state ('granted', 'denied', 'default', 'unsupported')
  function getPermissionState() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }

  // 2. Request user gesture permission safely
  async function requestPermission() {
    if (!("Notification" in window)) {
      if (window.DevLogger) window.DevLogger.warn("PushNotification", "Notification API unsupported in this browser/context.");
      return "unsupported";
    }
    try {
      const permission = await Notification.requestPermission();
      if (window.DevLogger) window.DevLogger.info("PushNotification", `Notification permission state: ${permission}`);
      if (permission === "granted") {
        await registerDeviceSubscription();
      }
      return permission;
    } catch (e) {
      return Notification.permission;
    }
  }

  // 3. Universal Display Notification (Always awaits serviceWorker.ready to eliminate Android mobile Illegal constructor crash)
  async function showLocalNotification(title, options = {}) {
    if (!("Notification" in window)) return false;

    if (Notification.permission !== "granted") {
      const perm = await requestPermission();
      if (perm !== "granted") return false;
    }

    const defaultOptions = {
      icon: "./assets/logo/icon-192.png",
      badge: "./assets/logo/icon-192.png",
      vibrate: [200, 100, 200],
      tag: "gps-alert",
      data: { url: "./index.html?view=view-sales" },
      ...options
    };

    try {
      // 1. Primary path: Service Worker Registration (Rock-solid on Android, Desktop, iOS 16.4+ PWA)
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(title, defaultOptions);
          return true;
        }
      }

      // 2. Secondary fallback for desktop browsers without active service workers
      if (typeof Notification === "function") {
        new Notification(title, defaultOptions);
        return true;
      }
      return false;
    } catch (err) {
      if (window.DevLogger) window.DevLogger.warn("PushNotification", "Failed to display notification:", err);
      return false;
    }
  }

  // 4. Helper: Call Google Apps Script Backend Endpoint
  async function callBackendNotification(action, payload = {}) {
    const webAppUrl = window.APP_CONFIG ? window.APP_CONFIG.googleSheetWebAppUrl : "";
    let authPayload = {};
    if (window.Auth && typeof window.Auth.getAuthPayload === "function") {
      authPayload = window.Auth.getAuthPayload();
    }

    try {
      if (webAppUrl) {
        const response = await fetch(webAppUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: action,
            apiKey: authPayload.apiKey || (window.APP_CONFIG ? window.APP_CONFIG.apiKey : ""),
            sessionId: authPayload.sessionId || "",
            deviceId: authPayload.deviceId || "",
            userEmail: (window.Auth && window.Auth.getCurrentUser() ? window.Auth.getCurrentUser().email : ""),
            userRole: (window.Auth && window.Auth.getCurrentUser() ? window.Auth.getCurrentUser().role : "staff"),
            branch: (window.Auth && typeof window.Auth.getActiveBranch === "function" ? window.Auth.getActiveBranch() : (window.Auth && window.Auth.getCurrentUser() ? (window.Auth.getCurrentUser().assignedBranch || "") : "")),
            ...payload
          })
        });

        const resData = await response.json();
        return resData;
      }
    } catch (err) {
      if (window.DevLogger) window.DevLogger.warn("PushNotification", `Backend notification call [${action}] failed:`, err);
    }
    return null;
  }

  // 5. Device Push Subscription Registration (Saves token / endpoint in Google Sheets)
  async function registerDeviceSubscription() {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = null;
      if (reg.pushManager) {
        subscription = await reg.pushManager.getSubscription();
      }

      const user = window.Auth ? window.Auth.getCurrentUser() : null;
      const deviceId = (window.Auth && typeof window.Auth.getDeviceId === "function") 
        ? window.Auth.getDeviceId() 
        : (localStorage.getItem("gps_device_id") || "dev_" + Math.random().toString(36).substr(2, 9));

      const subData = {
        deviceId: deviceId,
        userEmail: user ? user.email : "anonymous",
        userName: user ? user.name : "Mobile Device",
        userRole: user ? user.role : "staff",
        branch: user ? (user.assignedBranch || "") : "",
        endpoint: subscription ? JSON.stringify(subscription) : `local_pwa_${deviceId}`,
        subscribedAt: new Date().toISOString()
      };

      // Save locally
      localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(subData));

      // Save to Google Sheets backend
      callBackendNotification("save_push_subscription", { subscription: subData }).catch(() => {});
      return subData;
    } catch (e) {
      if (window.DevLogger) window.DevLogger.warn("PushNotification", "Device subscription registration notice:", e);
      return null;
    }
  }

  // Helper: Format OMR Currency
  function formatOMR(amount) {
    return "OMR " + (Number(amount) || 0).toFixed(3);
  }

  // ============================================================================
  // THE 6 CORE BUSINESS PUSH NOTIFICATIONS
  // ============================================================================

  // 1. 📊 Daily 9:00 PM Admin Sales Summary
  async function sendDailySummaryNotification(customData = null) {
    // 1. Attempt Cloud Trigger (Google Apps Script)
    const backendRes = await callBackendNotification("trigger_daily_summary_notification");
    if (backendRes && backendRes.status === "success" && backendRes.title) {
      return showLocalNotification(backendRes.title, {
        body: backendRes.body,
        tag: "gps-daily-summary",
        data: { url: "./index.html?view=view-sales" }
      });
    }

    // 2. Fallback calculation using local DataStore if backend is unreachable
    const data = customData || getDailySummaryCalculation();
    if (!data) return false;

    const title = "📊 Today's Sales & Revenue Summary";
    const body = `Al Khoud: ${data.alkhoudCount} Sales (${formatOMR(data.alkhoudRev)}) | Ghala: ${data.ghalaCount} Sales (${formatOMR(data.ghalaRev)}) • Total: ${formatOMR(data.alkhoudRev + data.ghalaRev)}`;

    return showLocalNotification(title, {
      body: body,
      tag: "gps-daily-summary",
      data: { url: "./index.html?view=view-sales" }
    });
  }

  function getDailySummaryCalculation() {
    if (!window.DataStore || typeof window.DataStore.getSales !== "function") return null;
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const alkhoudSales = (window.DataStore.getSales("alkhoud") || []).filter((s) => {
      const isRefunded = String(s.refundStatus || "").trim().toUpperCase() === "REFUNDED" || s.paymentStatus === "refunded";
      const sDate = String(s.date || s.saleDate || "").trim();
      return !isRefunded && (sDate === todayStr || sDate.includes(todayStr));
    });

    const ghalaSales = (window.DataStore.getSales("ghala") || []).filter((s) => {
      const isRefunded = String(s.refundStatus || "").trim().toUpperCase() === "REFUNDED" || s.paymentStatus === "refunded";
      const sDate = String(s.date || s.saleDate || "").trim();
      return !isRefunded && (sDate === todayStr || sDate.includes(todayStr));
    });

    const alkhoudCount = alkhoudSales.length;
    const alkhoudRev = alkhoudSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);

    const ghalaCount = ghalaSales.length;
    const ghalaRev = ghalaSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);

    return { alkhoudCount, alkhoudRev, ghalaCount, ghalaRev };
  }

  // 2. 🗓️ Monthly 1st Performance Summary (1st of month @ 10:00 AM)
  async function sendMonthlySummaryNotification(customData = null) {
    const backendRes = await callBackendNotification("trigger_monthly_summary_notification");
    if (backendRes && backendRes.status === "success" && backendRes.title) {
      return showLocalNotification(backendRes.title, {
        body: backendRes.body,
        tag: "gps-monthly-summary",
        data: { url: "./index.html?view=view-sales" }
      });
    }

    const data = customData || getMonthlySummaryCalculation();
    if (!data) return false;

    const title = `🗓️ Monthly Report: ${data.monthName}`;
    const body = `Al Khoud: ${data.alkhoudCount} Sales (${formatOMR(data.alkhoudRev)}) | Ghala: ${data.ghalaCount} Sales (${formatOMR(data.ghalaRev)}) • Total: ${formatOMR(data.alkhoudRev + data.ghalaRev)}`;

    return showLocalNotification(title, {
      body: body,
      tag: "gps-monthly-summary",
      data: { url: "./index.html?view=view-sales" }
    });
  }

  function getMonthlySummaryCalculation() {
    if (!window.DataStore || typeof window.DataStore.getSales !== "function") return null;
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetYear = prevMonthDate.getFullYear();
    const targetMonth = prevMonthDate.getMonth();

    const filterMonth = (salesList) => {
      return (salesList || []).filter((s) => {
        const isRefunded = String(s.refundStatus || "").trim().toUpperCase() === "REFUNDED" || s.paymentStatus === "refunded";
        const rawDate = s.date || s.saleDate || s.timestamp;
        if (!rawDate || isRefunded) return false;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
    };

    const alkhoudSales = filterMonth(window.DataStore.getSales("alkhoud"));
    const ghalaSales = filterMonth(window.DataStore.getSales("ghala"));

    const alkhoudCount = alkhoudSales.length;
    const alkhoudRev = alkhoudSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);

    const ghalaCount = ghalaSales.length;
    const ghalaRev = ghalaSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);
    const monthName = prevMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return { monthName, alkhoudCount, alkhoudRev, ghalaCount, ghalaRev };
  }

  // 3. ⚠️ Real-Time Low Stock Alert
  async function sendLowStockAlert(itemName, branch = null, remainingQty = 0, alertLevel = 5) {
    const activeBranch = branch || (window.Auth && typeof window.Auth.getActiveBranch === "function" ? window.Auth.getActiveBranch() : null);
    if (!activeBranch) return false;

    const branchLabel = activeBranch.toLowerCase() === "ghala" ? "Ghala Branch" : "Al Khoud Branch";
    const title = `⚠️ Low Stock Alert (${branchLabel})`;
    const body = `'${itemName}' is running low: Only ${remainingQty} unit${remainingQty === 1 ? '' : 's'} left (Alert level: ${alertLevel})!`;

    // Notify backend
    callBackendNotification("notify_low_stock", {
      itemName: itemName,
      branch: activeBranch,
      remainingQty: remainingQty,
      alertLevel: alertLevel
    }).catch(() => {});

    // Show native system banner
    return showLocalNotification(title, {
      body: body,
      tag: `gps-lowstock-${itemName.replace(/\s+/g, '-').toLowerCase()}`,
      data: { url: "./index.html?view=view-inventory" }
    });
  }

  // 4. ☁️ Offline Data Sync Confirmation
  async function notifyOfflineSync(syncedCount, syncedTime) {
    const count = Number(syncedCount) || 1;
    const timeStr = syncedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = "☁️ Offline Sync Completed";
    const body = `${count} offline data item${count === 1 ? ' was' : 's were'} successfully synced to Google Sheets at ${timeStr}.`;

    // Inform backend for log audit
    callBackendNotification("notify_offline_sync", { count: count, syncTime: timeStr }).catch(() => {});

    return showLocalNotification(title, {
      body: body,
      tag: "gps-offline-sync",
      data: { url: "./index.html?view=view-sales" }
    });
  }

  // 5. 🔄 Refund & Stock Amendment Audit Alert
  async function sendRefundAuditAlert(branch = null, amount = 0, customerName = "", refundedBy = "") {
    const activeBranch = branch || (window.Auth && typeof window.Auth.getActiveBranch === "function" ? window.Auth.getActiveBranch() : null);
    if (!activeBranch) return false;

    const branchLabel = activeBranch.toLowerCase() === "ghala" ? "Ghala Branch" : "Al Khoud Branch";
    const title = `🔄 Sale Refunded (${branchLabel})`;
    const body = `Sale of ${formatOMR(amount)} for customer '${customerName || "Customer"}' was REFUNDED. Stock restored.`;

    callBackendNotification("notify_refund_audit", {
      branch: activeBranch,
      amount: amount,
      customerName: customerName,
      refundedBy: refundedBy
    }).catch(() => {});

    return showLocalNotification(title, {
      body: body,
      tag: "gps-refund-audit",
      data: { url: "./index.html?view=view-sales" }
    });
  }

  // 6. 🧪 Developer Tests (Instant & 30-Second Cloud-Delayed)
  async function sendTestNotification() {
    const perm = await requestPermission();
    if (perm !== "granted") {
      if (window.UI && typeof window.UI.toast === "function") {
        window.UI.toast("Please enable browser notification permissions in your browser or site settings.", "warning", 4500);
      }
      return false;
    }

    const title = "🧪 GPS Push Notification Active";
    const body = "Your device is connected and push notifications are working perfectly!";
    const success = await showLocalNotification(title, {
      body: body,
      tag: "gps-test-push",
      data: { url: "./index.html?view=view-sales" }
    });

    if (success) {
      if (window.UI && typeof window.UI.toast === "function") {
        window.UI.toast("✅ Test notification dispatched to system tray!", "success");
      }
    } else {
      if (window.UI && typeof window.UI.toast === "function") {
        window.UI.toast("Failed to display notification banner. Check OS Do-Not-Disturb settings.", "error");
      }
    }
    return success;
  }

  // Cloud-Delayed 30-Second Test (Runs countdown on Google Cloud Server, not on phone RAM)
  async function sendDelayed30sCloudTest() {
    const perm = await requestPermission();
    if (perm !== "granted") {
      if (window.UI && typeof window.UI.toast === "function") {
        window.UI.toast("Please enable browser notification permissions to receive alerts.", "warning");
      }
      return false;
    }

    if (window.UI && typeof window.UI.toast === "function") {
      window.UI.toast("⏱️ 30s Cloud timer started! You can safely swipe away/close the app now.", "info", 6500);
    }

    // 1. Dispatch request to Google Cloud backend to hold timer and broadcast
    const backendPromise = callBackendNotification("trigger_delayed_test_notification", { delaySecs: 30 });

    backendPromise.then((res) => {
      if (res && res.title) {
        showLocalNotification(res.title, {
          body: res.body,
          tag: "gps-delayed-30s-push",
          data: { url: "./index.html?view=view-sales" }
        });
      }
    }).catch(() => {});

    return true;
  }

  // Scheduled Foreground Inspector (Runs as a secondary fallback when app is open)
  function checkScheduledForegroundNotifications() {
    const isAdmin = window.Auth ? window.Auth.isAdmin() : false;
    if (!isAdmin) return;

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const hour = now.getHours();
    const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 1. Daily 9:00 PM Check (Hour 21, Skip Friday = Day 5)
    if (hour >= 21 && dayOfWeek !== 5) {
      const lastDaily = localStorage.getItem(LAST_DAILY_KEY);
      if (lastDaily !== todayDateStr) {
        localStorage.setItem(LAST_DAILY_KEY, todayDateStr);
        sendDailySummaryNotification();
      }
    }

    // 2. Monthly 1st of Month @ 10:00 AM Check
    if (now.getDate() === 1 && hour >= 10) {
      const lastMonthly = localStorage.getItem(LAST_MONTHLY_KEY);
      if (lastMonthly !== currentMonthKey) {
        localStorage.setItem(LAST_MONTHLY_KEY, currentMonthKey);
        sendMonthlySummaryNotification();
      }
    }
  }

  // Periodic Foreground Timer
  let schedulerInterval = null;
  function init() {
    if (schedulerInterval) clearInterval(schedulerInterval);
    checkScheduledForegroundNotifications();
    schedulerInterval = setInterval(checkScheduledForegroundNotifications, 60000);

    // Auto-check and register device push subscription if permission already granted
    if (getPermissionState() === "granted") {
      registerDeviceSubscription();
    }
  }

  return {
    init,
    getPermissionState,
    requestPermission,
    showLocalNotification,
    registerDeviceSubscription,
    // The 6 Business Push Notifications
    sendDailySummaryNotification,
    sendMonthlySummaryNotification,
    sendLowStockAlert,
    notifyOfflineSync,
    sendRefundAuditAlert,
    sendTestNotification,
    sendDelayed30sCloudTest,
    // Utilities
    getDailySummaryCalculation,
    getMonthlySummaryCalculation
  };
})();

// Backward compatibility: alias legacy NotificationManager to PushNotification
window.NotificationManager = window.PushNotification;

