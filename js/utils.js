// js/utils.js - Centralized Shared Utilities for GPS Mobile App
// Standardized XSS-safe escaping, OMR currency formatting, date manipulation, and storage helpers.

window.Utils = (function () {
  /**
   * Escape HTML special characters to prevent XSS injection in dynamic DOM templates.
   * @param {string|number} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Format a numerical value into standardized OMR currency format (3 decimal places).
   * Example: 12.5 -> "OMR 12.500"
   * @param {number|string} amount
   * @returns {string}
   */
  function formatOMR(amount) {
    const num = Number(amount) || 0;
    return `OMR ${num.toFixed(3)}`;
  }

  /**
   * Round a numerical currency amount to 3 decimal places using epsilon to prevent floating-point inaccuracies.
   * @param {number|string} amount
   * @returns {number}
   */
  function roundOMR(amount) {
    const num = Number(amount) || 0;
    return Math.round((num + Number.EPSILON) * 1000) / 1000;
  }

  /**
   * Pad integer with leading zeroes.
   * @param {number|string} num
   * @param {number} [length=2]
   * @returns {string}
   */
  function padZero(num, length = 2) {
    return String(num).padStart(length, "0");
  }

  /**
   * Format year, month (0-indexed), and day into standard YYYY-MM-DD string.
   * @param {number} year
   * @param {number} monthIndex (0 to 11)
   * @param {number} day (1 to 31)
   * @returns {string}
   */
  function formatYMD(year, monthIndex, day) {
    return `${year}-${padZero(monthIndex + 1)}-${padZero(day)}`;
  }

  /**
   * Parse a YYYY-MM-DD string into an object: { year, month (0-indexed), day }
   * @param {string} dateStr
   * @returns {{year: number, month: number, day: number}|null}
   */
  function parseYMD(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const parts = dateStr.trim().split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        return { year: y, month: m, day: d };
      }
    }
    return null;
  }

  /**
   * Get current local date in YYYY-MM-DD format.
   * @returns {string}
   */
  function getTodayYMD() {
    const now = new Date();
    return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Get yesterday's local date in YYYY-MM-DD format.
   * @returns {string}
   */
  function getYesterdayYMD() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Get date range for current calendar month: { start: "YYYY-MM-01", end: "YYYY-MM-DD" }
   * @returns {{start: string, end: string}}
   */
  function getThisMonthRange() {
    const now = new Date();
    const start = formatYMD(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = formatYMD(now.getFullYear(), now.getMonth(), lastDay);
    return { start, end };
  }

  /**
   * Get date range for previous calendar month: { start: "YYYY-MM-01", end: "YYYY-MM-DD" }
   * @returns {{start: string, end: string}}
   */
  function getLastMonthRange() {
    const now = new Date();
    const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const start = formatYMD(prevMonthYear, prevMonthIndex, 1);
    const lastDay = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();
    const end = formatYMD(prevMonthYear, prevMonthIndex, lastDay);
    return { start, end };
  }

  /**
   * Format human-readable byte sizes (e.g. 1024 -> "1.00 KB").
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes === 0 || isNaN(bytes) || bytes === null || bytes === undefined) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Safely parse JSON string with fallback.
   * @param {string} str
   * @param {*} [fallback=null]
   * @returns {*}
   */
  function safeJsonParse(str, fallback = null) {
    if (!str || typeof str !== "string") return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  return {
    escapeHtml,
    formatOMR,
    roundOMR,
    padZero,
    formatYMD,
    parseYMD,
    getTodayYMD,
    getYesterdayYMD,
    getThisMonthRange,
    getLastMonthRange,
    formatBytes,
    safeJsonParse
  };
})();

// Backward compatibility: expose global aliases for existing code
window.escapeHtml = window.Utils.escapeHtml;
window.formatOMR = window.Utils.formatOMR;
window.roundOMR = window.Utils.roundOMR;
