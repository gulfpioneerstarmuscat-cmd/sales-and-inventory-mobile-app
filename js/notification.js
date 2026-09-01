// js/notification.js - Backward Compatibility Shim (Redirects to js/push_notifi.js)
window.NotificationManager = window.PushNotification || {
  init: () => window.PushNotification && window.PushNotification.init(),
  getPermissionState: () => window.PushNotification ? window.PushNotification.getPermissionState() : "default",
  requestPermission: () => window.PushNotification ? window.PushNotification.requestPermission() : Promise.resolve("default"),
  showNotification: (t, o) => window.PushNotification ? window.PushNotification.showLocalNotification(t, o) : Promise.resolve(false),
  sendTestNotification: () => window.PushNotification ? window.PushNotification.sendTestNotification() : Promise.resolve(false),
  sendDelayed30sTestNotification: () => window.PushNotification ? window.PushNotification.sendDelayed30sCloudTest() : Promise.resolve(false),
  notifyOfflineSync: (c, t) => window.PushNotification ? window.PushNotification.notifyOfflineSync(c, t) : Promise.resolve(false),
  triggerDailyAdminNotification: () => window.PushNotification ? window.PushNotification.sendDailySummaryNotification() : Promise.resolve(false),
  triggerMonthlyAdminNotification: () => window.PushNotification ? window.PushNotification.sendMonthlySummaryNotification() : Promise.resolve(false)
};
