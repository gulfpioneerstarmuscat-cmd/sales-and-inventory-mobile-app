// js/notification.js - Push Notification & Scheduled Summary Manager for Sales & Inventory App

window.NotificationManager = (function () {
  const LAST_DAILY_KEY = "gps_last_daily_notif_date";
  const LAST_MONTHLY_KEY = "gps_last_monthly_notif_month";

  function getPermissionState() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }

  async function requestPermission() {
    if (!("Notification" in window)) return "unsupported";
    try {
      const permission = await Notification.requestPermission();
      if (window.DevLogger) window.DevLogger.info("Notification", `Notification permission state: ${permission}`);
      return permission;
    } catch (e) {
      return Notification.permission;
    }
  }

  async function showNotification(title, options = {}) {
    if (!("Notification" in window)) return false;
    if (Notification.permission !== "granted") {
      const perm = await requestPermission();
      if (perm !== "granted") return false;
    }

    const defaultOptions = {
      icon: "./assets/logo/icon-192.png",
      badge: "./assets/logo/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: "./index.html?view=view-sales" },
      ...options
    };

    try {
      // Prefer Service Worker notification for native background handling
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(title, defaultOptions);
          return true;
        }
      }
      // Fallback to standard Notification API
      new Notification(title, defaultOptions);
      return true;
    } catch (err) {
      if (window.DevLogger) window.DevLogger.warn("Notification", "Failed to display notification:", err);
      return false;
    }
  }

  // 1. Staff & Admin Notification: Offline Data Sync Completion
  function notifyOfflineSync(syncedCount, syncedTime) {
    const count = Number(syncedCount) || 1;
    const timeStr = syncedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = "☁️ Offline Sync Completed";
    const body = `${count} offline data ${count === 1 ? 'item was' : 'items were'} synced to cloud at ${timeStr}, verify it.`;

    showNotification(title, {
      body: body,
      tag: "gps-offline-sync",
      data: { url: "./index.html?view=view-sales" }
    });
  }

  // Helper: Format OMR Currency
  function formatOMR(amount) {
    return "OMR " + (Number(amount) || 0).toFixed(3);
  }

  // 2. Admin Daily Sales & Revenue Calculation (Al Khoud & Ghala)
  function getDailySummaryData() {
    if (!window.DataStore || typeof window.DataStore.getSales !== "function") return null;
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const alkhoudSalesRaw = window.DataStore.getSales("alkhoud") || [];
    const ghalaSalesRaw = window.DataStore.getSales("ghala") || [];

    const alkhoudSales = alkhoudSalesRaw.filter((s) => {
      const sDate = String(s.date || s.saleDate || "").trim();
      return sDate === todayStr || sDate.includes(todayStr);
    });

    const ghalaSales = ghalaSalesRaw.filter((s) => {
      const sDate = String(s.date || s.saleDate || "").trim();
      return sDate === todayStr || sDate.includes(todayStr);
    });

    const alkhoudCount = alkhoudSales.length;
    const alkhoudRev = alkhoudSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);

    const ghalaCount = ghalaSales.length;
    const ghalaRev = ghalaSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);

    return {
      dateStr: todayStr,
      alkhoudCount,
      alkhoudRev,
      ghalaCount,
      ghalaRev
    };
  }

  // 3. Admin Monthly Sales & Revenue Calculation (Previous Month)
  function getMonthlySummaryData() {
    if (!window.DataStore || typeof window.DataStore.getSales !== "function") return null;
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetYear = prevMonthDate.getFullYear();
    const targetMonth = prevMonthDate.getMonth(); // 0-indexed

    const filterPrevMonth = (salesList) => {
      return (salesList || []).filter((s) => {
        const rawDate = s.date || s.saleDate || s.timestamp;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
    };

    const alkhoudSalesRaw = window.DataStore.getSales("alkhoud") || [];
    const ghalaSalesRaw = window.DataStore.getSales("ghala") || [];

    const alkhoudSales = filterPrevMonth(alkhoudSalesRaw);
    const ghalaSales = filterPrevMonth(ghalaSalesRaw);

    const alkhoudCount = alkhoudSales.length;
    const alkhoudRev = alkhoudSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);

    const ghalaCount = ghalaSales.length;
    const ghalaRev = ghalaSales.reduce((sum, s) => sum + (Number(s.grandTotal || s.totalAmount) || 0), 0);

    const monthName = prevMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return {
      monthName,
      alkhoudCount,
      alkhoudRev,
      ghalaCount,
      ghalaRev
    };
  }

  // Fire Admin Daily Summary (9:00 PM, Excl. Friday)
  function triggerDailyAdminNotification() {
    const data = getDailySummaryData();
    if (!data) return;

    const title = "📊 Today's Sales & Revenue Summary";
    const body = `Todays sales from Al Khoud ${data.alkhoudCount} with total revenue ${formatOMR(data.alkhoudRev)} and Todays sales from Ghala ${data.ghalaCount} with total revenue ${formatOMR(data.ghalaRev)}.`;

    showNotification(title, {
      body: body,
      tag: "gps-daily-summary",
      data: { url: "./index.html?view=view-sales" }
    });
  }

  // Fire Admin Monthly Summary (1st of Month @ 10:00 AM)
  function triggerMonthlyAdminNotification() {
    const data = getMonthlySummaryData();
    if (!data) return;

    const title = `🗓️ Monthly Summary: ${data.monthName}`;
    const body = `Sales from Al Khoud ${data.alkhoudCount} with total revenue ${formatOMR(data.alkhoudRev)} and Sales from Ghala ${data.ghalaCount} with total revenue ${formatOMR(data.ghalaRev)}.`;

    showNotification(title, {
      body: body,
      tag: "gps-monthly-summary",
      data: { url: "./index.html?view=view-sales" }
    });
  }

  // Scheduled Notification Inspector (Runs periodically)
  function checkScheduledNotifications() {
    const isAdmin = window.Auth ? window.Auth.isAdmin() : false;
    if (!isAdmin) return; // Daily/Monthly sales summaries are strictly for Admins

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
        triggerDailyAdminNotification();
      }
    }

    // 2. Monthly 1st of Month @ 10:00 AM Check (Day 1 of month, Hour >= 10)
    if (now.getDate() === 1 && hour >= 10) {
      const lastMonthly = localStorage.getItem(LAST_MONTHLY_KEY);
      if (lastMonthly !== currentMonthKey) {
        localStorage.setItem(LAST_MONTHLY_KEY, currentMonthKey);
        triggerMonthlyAdminNotification();
      }
    }
  }

  // Developer Test Notification Trigger
  async function sendTestNotification() {
    const perm = await requestPermission();
    if (perm !== "granted") {
      if (window.UI && typeof window.UI.toast === "function") {
        window.UI.toast("Please enable browser notification permissions to receive alerts.", "warning");
      }
      return false;
    }

    const title = "🧪 Developer Push Notification Test";
    const body = "GPS Push Notification system is active and working perfectly!";

    const success = await showNotification(title, {
      body: body,
      tag: "gps-test-notif",
      data: { url: "./index.html?view=view-sales" }
    });

    if (success && window.UI && typeof window.UI.toast === "function") {
      window.UI.toast("Test notification dispatched to OS!", "success");
    }
    return success;
  }

  // Periodic alarm timer starter
  let schedulerInterval = null;
  function init() {
    if (schedulerInterval) clearInterval(schedulerInterval);
    // Check scheduled daily/monthly notifications every 60 seconds
    checkScheduledNotifications();
    schedulerInterval = setInterval(checkScheduledNotifications, 60000);
  }

  return {
    init,
    getPermissionState,
    requestPermission,
    showNotification,
    notifyOfflineSync,
    triggerDailyAdminNotification,
    triggerMonthlyAdminNotification,
    checkScheduledNotifications,
    sendTestNotification,
    getDailySummaryData,
    getMonthlySummaryData
  };
})();
