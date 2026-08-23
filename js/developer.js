// js/developer.js - Centralized Priority-Coded Telemetry Logger
// Provides explicit Local/Cloud Read & Write telemetry, exact payload byte sizes, P0-P10 priority ratings,
// and standardized color coding: Blue (Message/Info P0), Green (Success/Write P0), Yellow (Warning P1-P5), Red (Error P6-P10).

window.DevLogger = (function () {
  let isEnabled = false;
  try {
    isEnabled = localStorage.getItem("gps_debug_mode") === "true";
  } catch (e) {
    isEnabled = false;
  }
  let isInternalLogging = false;

  // Format Bytes helper
  function formatBytes(bytes) {
    if (bytes === 0 || isNaN(bytes) || bytes === null || bytes === undefined) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Calculate string payload byte size
  function getPayloadSize(data) {
    if (data === null || data === undefined) return 0;
    try {
      const str = typeof data === "string" ? data : JSON.stringify(data);
      return new TextEncoder().encode(str).length;
    } catch (e) {
      return 0;
    }
  }

  // Helper for CSS Console Styles
  function getLogStyle(type) {
    switch (type) {
      case "blue":
      case "info":
      case "read":
        return "color: #0284c7; font-weight: 700; background: rgba(2, 132, 199, 0.08); padding: 2px 6px; border-radius: 4px;";
      case "green":
      case "success":
      case "write":
        return "color: #16a34a; font-weight: 700; background: rgba(22, 163, 74, 0.08); padding: 2px 6px; border-radius: 4px;";
      case "yellow":
      case "warning":
        return "color: #d97706; font-weight: 700; background: rgba(217, 119, 6, 0.12); padding: 2px 6px; border-radius: 4px;";
      case "red":
      case "error":
      case "failure":
        return "color: #dc2626; font-weight: 700; background: rgba(220, 38, 38, 0.12); padding: 2px 6px; border-radius: 4px;";
      default:
        return "color: #475569; font-weight: 700;";
    }
  }

  // Format Priority Tag string e.g. [P0], [P2], [P8]
  function formatPriorityTag(level) {
    const lvl = Math.max(0, Math.min(10, Number(level) || 0));
    return `[P${lvl}]`;
  }

  // Auto-Instrumentation: Intercept window.localStorage for LOCAL READ & LOCAL WRITE telemetry
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;

  Storage.prototype.getItem = function (key) {
    const value = originalGetItem.apply(this, arguments);
    if (isEnabled && !isInternalLogging && typeof key === "string" && key.startsWith("gps_")) {
      isInternalLogging = true;
      try {
        const bytes = getPayloadSize(value);
        console.log(
          `%c[P0] [LOCAL READ 💾] Key: "${key}" | Size: ${formatBytes(bytes)}`,
          getLogStyle("blue"),
          {
            priority: "[P0]",
            priorityScore: 0,
            category: "LOCAL READ",
            storageKey: key,
            payloadSize: formatBytes(bytes),
            byteCount: bytes,
            timestamp: new Date().toISOString(),
            dataPreview: value ? (value.length > 120 ? value.slice(0, 120) + "..." : value) : null
          }
        );
      } catch (e) {}
      isInternalLogging = false;
    }
    return value;
  };

  Storage.prototype.setItem = function (key, value) {
    originalSetItem.apply(this, arguments);
    if (isEnabled && !isInternalLogging && typeof key === "string" && key.startsWith("gps_")) {
      isInternalLogging = true;
      try {
        const bytes = getPayloadSize(value);
        console.log(
          `%c[P0] [LOCAL WRITE 💾] Key: "${key}" | Size: ${formatBytes(bytes)}`,
          getLogStyle("green"),
          {
            priority: "[P0]",
            priorityScore: 0,
            category: "LOCAL WRITE",
            storageKey: key,
            payloadSize: formatBytes(bytes),
            byteCount: bytes,
            timestamp: new Date().toISOString()
          }
        );
      } catch (e) {}
      isInternalLogging = false;
    }
  };

  // Auto-Instrumentation: Intercept window.fetch for CLOUD READ & CLOUD WRITE telemetry
  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = async function (...args) {
      if (!isEnabled) return originalFetch.apply(this, args);

      const startTime = performance.now();
      const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "Unknown URL";
      const options = args[1] || {};
      const method = (options.method || "GET").toUpperCase();
      const isRead = method === "GET";
      const reqBodySize = options.body ? getPayloadSize(options.body) : 0;

      let actionName = isRead ? "Fetch Data" : "Save Data";
      if (options.body && typeof options.body === "string") {
        try {
          const parsed = JSON.parse(options.body);
          if (parsed.action) actionName = parsed.action;
        } catch (e) {}
      }

      const categoryTag = isRead ? "[CLOUD READ ☁️]" : "[CLOUD WRITE ☁️]";
      const initStyle = isRead ? getLogStyle("blue") : getLogStyle("green");

      isInternalLogging = true;
      console.log(
        `%c[P0] ${categoryTag} ${method} (${actionName}) | Sent: ${formatBytes(reqBodySize)}`,
        initStyle,
        {
          priority: "[P0]",
          priorityScore: 0,
          category: isRead ? "CLOUD READ" : "CLOUD WRITE",
          method: method,
          action: actionName,
          url: url,
          sentPayloadSize: formatBytes(reqBodySize),
          sentBytes: reqBodySize,
          timestamp: new Date().toISOString()
        }
      );
      isInternalLogging = false;

      try {
        const response = await originalFetch.apply(this, args);
        const duration = (performance.now() - startTime).toFixed(1);
        const clone = response.clone();

        let resBodySize = 0;
        try {
          const resText = await clone.text();
          resBodySize = getPayloadSize(resText);
        } catch (e) {}

        const isNoCorsSuccess = (options && options.mode === "no-cors") && (response.type === "opaque" || response.status === 0);
        const isOk = response.ok || isNoCorsSuccess;
        const priorityCode = isOk ? 0 : 8;
        const pTag = formatPriorityTag(priorityCode);
        const resStyle = isOk ? (isRead ? getLogStyle("blue") : getLogStyle("green")) : getLogStyle("red");
        const statusDisplay = isNoCorsSuccess ? "200 (No-CORS OK)" : `${response.status} ${response.statusText}`.trim();

        isInternalLogging = true;
        console.log(
          `%c${pTag} ${categoryTag} ${statusDisplay} (${actionName}) - ${duration} ms | Sent: ${formatBytes(reqBodySize)} | Recv: ${formatBytes(resBodySize)}`,
          resStyle,
          {
            priority: pTag,
            priorityScore: priorityCode,
            category: isRead ? "CLOUD READ" : "CLOUD WRITE",
            status: isNoCorsSuccess ? 200 : response.status,
            statusText: isNoCorsSuccess ? "No-CORS OK" : response.statusText,
            action: actionName,
            durationMs: Number(duration),
            sentPayloadSize: formatBytes(reqBodySize),
            sentBytes: reqBodySize,
            receivedPayloadSize: formatBytes(resBodySize),
            receivedBytes: resBodySize,
            url: url,
            timestamp: new Date().toISOString()
          }
        );
        isInternalLogging = false;

        return response;
      } catch (err) {
        const duration = (performance.now() - startTime).toFixed(1);
        const pTag = "[P7]";
        isInternalLogging = true;
        console.log(
          `%c${pTag} [CLOUD FAIL ❌] ${method} (${actionName}) - ${duration} ms | Sent: ${formatBytes(reqBodySize)}`,
          getLogStyle("red"),
          {
            priority: pTag,
            priorityScore: 7,
            category: "CLOUD ERROR",
            action: actionName,
            method: method,
            durationMs: Number(duration),
            sentPayloadSize: formatBytes(reqBodySize),
            error: err.message || String(err),
            url: url,
            timestamp: new Date().toISOString()
          }
        );
        isInternalLogging = false;
        throw err;
      }
    };
  }

  // Auto-Instrumentation: Global Click Event Telemetry
  document.addEventListener("click", (e) => {
    if (!isEnabled) return;
    const target = e.target.closest("button, a, input[type='button'], input[type='submit'], .nav-button, .btn-clear, .toggle-btn, .segmented-btn");
    if (!target) return;

    const name = target.id || target.getAttribute("aria-label") || target.innerText.trim().replace(/\n/g, " ") || target.tagName;
    const section = target.closest("[data-section]")?.dataset?.section || "Global";

    isInternalLogging = true;
    console.log(
      `%c[P0] [USER CLICK 🖱️] "${name}" (Section: ${section})`,
      getLogStyle("blue"),
      {
        priority: "[P0]",
        priorityScore: 0,
        category: "USER ACTION",
        action: "click",
        elementName: name,
        section: section,
        element: target,
        timestamp: new Date().toISOString()
      }
    );
    isInternalLogging = false;
  }, true);

  // Auto-Instrumentation: Global Input Telemetry
  document.addEventListener("change", (e) => {
    if (!isEnabled) return;
    const target = e.target;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      const field = target.id || target.name || "Input Field";
      isInternalLogging = true;
      console.log(
        `%c[P0] [USER INPUT 📝] Field: "${field}" | Length: ${target.value.length}`,
        getLogStyle("blue"),
        {
          priority: "[P0]",
          priorityScore: 0,
          category: "USER ACTION",
          action: "input_change",
          fieldId: target.id,
          length: target.value.length,
          timestamp: new Date().toISOString()
        }
      );
      isInternalLogging = false;
    }
  }, true);

  return {
    enable: function () {
      isEnabled = true;
      console.log("%c[P0] [DEV LOGGER] Telemetry Logger Enabled.", getLogStyle("green"));
    },
    disable: function () {
      isEnabled = false;
      console.log("%c[P0] [DEV LOGGER] Telemetry Logger Disabled.", getLogStyle("red"));
    },
    // Priority P0 Info / Message Logger (Blue)
    info: function (component, message, data, priorityLevel) {
      if (!isEnabled) return;
      const pLvl = priorityLevel !== undefined ? Math.max(0, Math.min(10, Number(priorityLevel))) : 0;
      const pTag = formatPriorityTag(pLvl);
      isInternalLogging = true;
      console.log(
        `%c${pTag} [INFO ℹ️] [${component}] ${message}`,
        getLogStyle("blue"),
        {
          priority: pTag,
          priorityScore: pLvl,
          category: "INFO",
          component: component,
          message: message,
          data: data !== undefined ? data : null,
          timestamp: new Date().toISOString()
        }
      );
      isInternalLogging = false;
    },
    log: function (component, message, data, priorityLevel) {
      this.info(component, message, data, priorityLevel);
    },
    // Priority P0 Success Logger (Green)
    success: function (component, message, data) {
      if (!isEnabled) return;
      isInternalLogging = true;
      console.log(
        `%c[P0] [SUCCESS ✅] [${component}] ${message}`,
        getLogStyle("green"),
        {
          priority: "[P0]",
          priorityScore: 0,
          category: "SUCCESS",
          component: component,
          message: message,
          data: data !== undefined ? data : null,
          timestamp: new Date().toISOString()
        }
      );
      isInternalLogging = false;
    },
    // Priority P1 to P5 Warning Logger (Yellow) - Non-priority items to check later
    warn: function (component, message, data, priorityLevel) {
      if (!isEnabled) return;
      const pLvl = priorityLevel !== undefined ? Math.max(1, Math.min(5, Number(priorityLevel))) : 2;
      const pTag = formatPriorityTag(pLvl);
      isInternalLogging = true;
      console.log(
        `%c${pTag} [WARNING ⚠️] [${component}] ${message}`,
        getLogStyle("yellow"),
        {
          priority: pTag,
          priorityScore: pLvl,
          category: "WARNING",
          notice: "Does not affect day-to-day function, to be checked/fixed later",
          component: component,
          message: message,
          data: data !== undefined ? data : null,
          timestamp: new Date().toISOString()
        }
      );
      isInternalLogging = false;
    },
    // Priority P6 to P10 Error / Failure Logger (Red) - Critical issues
    error: function (component, message, data, priorityLevel) {
      if (!isEnabled) return;
      const pLvl = priorityLevel !== undefined ? Math.max(6, Math.min(10, Number(priorityLevel))) : 8;
      const pTag = formatPriorityTag(pLvl);
      isInternalLogging = true;
      console.log(
        `%c${pTag} [FAILURE ❌] [${component}] ${message}`,
        getLogStyle("red"),
        {
          priority: pTag,
          priorityScore: pLvl,
          category: "FAILURE",
          component: component,
          message: message,
          error: data !== undefined ? data : null,
          timestamp: new Date().toISOString()
        }
      );
      isInternalLogging = false;
    },
    // UI Notification Logger
    notification: function (type, titleOrMsg, details) {
      if (!isEnabled) return;
      let styleKey = "blue";
      let pLvl = 0;
      if (type === "success") { styleKey = "green"; pLvl = 0; }
      else if (type === "warning") { styleKey = "yellow"; pLvl = 2; }
      else if (type === "error") { styleKey = "red"; pLvl = 7; }

      const pTag = formatPriorityTag(pLvl);
      isInternalLogging = true;
      console.log(
        `%c${pTag} [NOTIFICATION 🔔] [${type.toUpperCase()}] ${titleOrMsg}`,
        getLogStyle(styleKey),
        {
          priority: pTag,
          priorityScore: pLvl,
          category: "NOTIFICATION",
          type: type,
          message: titleOrMsg,
          details: details !== undefined ? details : null,
          timestamp: new Date().toISOString()
        }
      );
      isInternalLogging = false;
    },
    enable: function () {
      isEnabled = true;
      try { localStorage.setItem("gps_debug_mode", "true"); } catch (e) {}
      console.log("%c[P0] [DEV LOGGER 🟢] Telemetry Logging ENABLED. Overhead active.", getLogStyle("green"));
      return true;
    },
    disable: function () {
      isEnabled = false;
      try { localStorage.removeItem("gps_debug_mode"); } catch (e) {}
      console.log("%c[P0] [DEV LOGGER 🔴] Telemetry Logging DISABLED. 0ms Staff Mode active.", getLogStyle("red"));
      return false;
    },
    toggle: function () {
      return isEnabled ? this.disable() : this.enable();
    },
    isEnabled: function () {
      return isEnabled;
    }
  };
})();
