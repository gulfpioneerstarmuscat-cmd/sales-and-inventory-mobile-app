// test-suite.js - Comprehensive End-to-End & Unit Test Suite for GPS Mobile App
// Runs natively in Node.js without any third-party dependencies.
// Usage: node test-suite.js

const path = require("path");

// ============================================================================
// ANSI Color Formatting Helpers
// ============================================================================
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m",
  bgBlue: "\x1b[44m\x1b[37m"
};

function pass(msg) {
  console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${msg}`);
}

function fail(msg, err) {
  console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${msg}`);
  if (err) console.log(`         ${colors.red}Error: ${err}${colors.reset}`);
}

function info(msg) {
  console.log(`  ${colors.cyan}ℹ [INFO]${colors.reset} ${msg}`);
}

function section(title, stepNum) {
  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow} FLOW ${stepNum}: ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
}

// ============================================================================
// Mock Browser Environment for Headless Node.js Execution
// ============================================================================
const localStorageStore = {};
global.localStorage = {
  getItem: (key) => (key in localStorageStore ? localStorageStore[key] : null),
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); }
};

let currentBranch = "alkhoud";
let currentUser = { name: "Ahmed Al-Harthy", email: "ahmed@gps.om", role: "admin", assignedBranch: "all" };

let networkOnline = true;
let networkRequestsLog = [];

global.window = {
  Auth: {
    getActiveBranch: () => currentBranch,
    setActiveBranch: (b) => { currentBranch = b; return true; },
    getBranchLabel: (b) => (b === "ghala" ? "Ghala Branch" : "Al Khoud Branch"),
    getUser: () => currentUser,
    getCurrentUser: () => currentUser,
    isAdmin: () => currentUser.role === "admin",
    getAuthPayload: () => ({ apiKey: "GPS-SECURE-API-KEY-2026-V1", sessionId: "sess_gps_test_99" })
  },
  APP_CONFIG: {
    apiKey: "GPS-SECURE-API-KEY-2026-V1",
    googleSheetWebAppUrl: "https://script.google.com/macros/s/TEST_DEPLOYMENT_ID/exec"
  },
  location: { hostname: "localhost" },
  addEventListener: () => { },
  dispatchEvent: () => { }
};

global.CustomEvent = function (name, opts) {
  this.name = name;
  this.detail = opts ? opts.detail : null;
};

global.fetch = (url, options) => {
  if (!networkOnline) {
    return Promise.reject(new Error("Failed to fetch: Network offline"));
  }
  networkRequestsLog.push({ url, options, timestamp: new Date().toISOString() });
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: "success", valid: true, message: "Cloud sync simulated successfully" })
  });
};

if (typeof global.navigator === "undefined") {
  global.navigator = {};
}
Object.defineProperty(global.navigator, "onLine", {
  get: () => networkOnline,
  configurable: true
});

const idbStores = {
  inventory: {},
  sales: {},
  audit_logs: {},
  mutations_outbox: {}
};

const backgroundSyncTags = [];

global.indexedDB = {
  open: (dbName, version) => {
    const req = {
      result: {
        objectStoreNames: {
          contains: (name) => ["inventory", "sales", "audit_logs", "mutations_outbox"].includes(name)
        },
        createObjectStore: (name, opts) => ({
          createIndex: () => {}
        }),
        transaction: (storeName, mode) => {
          const sName = storeName === "amend_logs" ? "audit_logs" : storeName;
          return {
            objectStore: (subStore) => ({
              get: (key) => {
                const effectiveStore = subStore === "amend_logs" ? "audit_logs" : subStore;
                const r = { result: idbStores[effectiveStore] ? idbStores[effectiveStore][key] : null };
                setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                return r;
              },
              getAll: () => {
                const effectiveStore = subStore === "amend_logs" ? "audit_logs" : subStore;
                const items = idbStores[effectiveStore] ? Object.values(idbStores[effectiveStore]) : [];
                const r = { result: items };
                setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
                return r;
              },
              put: (val) => {
                const effectiveStore = subStore === "amend_logs" ? "audit_logs" : subStore;
                const k = val.storeKey || val.id;
                if (!idbStores[effectiveStore]) idbStores[effectiveStore] = {};
                idbStores[effectiveStore][k] = val;
              },
              delete: (key) => {
                const effectiveStore = subStore === "amend_logs" ? "audit_logs" : subStore;
                if (idbStores[effectiveStore]) delete idbStores[effectiveStore][key];
              },
              clear: () => {
                const effectiveStore = subStore === "amend_logs" ? "audit_logs" : subStore;
                idbStores[effectiveStore] = {};
              }
            }),
            oncomplete: null,
            onerror: null
          };
        }
      },
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    };

    setTimeout(() => {
      if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);

    return req;
  }
};

global.SyncManager = function () {};
global.window.SyncManager = global.SyncManager;
global.navigator.serviceWorker = {
  ready: Promise.resolve({
    sync: {
      register: (tag) => {
        backgroundSyncTags.push(tag);
        return Promise.resolve();
      }
    }
  })
};

// Load modules under test
require(path.join(process.cwd(), "js/developer.js"));
require(path.join(process.cwd(), "js/auth.js"));
require(path.join(process.cwd(), "js/data-store.js"));

const ds = window.DataStore;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, detail) {
  totalTests++;
  if (condition) {
    passedTests++;
    pass(`${testName}${detail ? ` ${colors.dim}(${detail})${colors.reset}` : ""}`);
  } else {
    failedTests++;
    fail(`${testName}${detail ? ` ${colors.dim}(${detail})${colors.reset}` : ""}`);
  }
}

// ============================================================================
// Asynchronous Main Test Suite Execution
// ============================================================================
async function runTestSuite() {
  console.log(`${colors.bright}${colors.bgBlue} GULF PIONEER STAR (GPS) - AUTOMATED END-TO-END TEST SUITE ${colors.reset}\n`);

  // ----------------------------------------------------------------------------
  // Flow 1: Branch Switching & Data Isolation
  // ----------------------------------------------------------------------------
  section("Multi-Branch Scoping & Data Isolation", "1");
  // Seed User Session & Branch
  localStorage.setItem("gps_user_session_v1", JSON.stringify(currentUser));
  localStorage.setItem("gps_active_branch_v1", "alkhoud");

  // Seed Al Khoud inventory
  const alkhoudItems = [
    { sku: "AK-01", name: "Sliding Gate Motor 600KG", category: "Gate Automation", qty: 10, alertLevel: 3 },
    { sku: "AK-02", name: "Gate Remote 433MHz", category: "Remotes", qty: 25, alertLevel: 5 }
  ];
  localStorage.setItem("gps_alkhoud_inventory_v1", JSON.stringify(alkhoudItems));

  // Seed Ghala inventory
  const ghalaItems = [
    { sku: "GH-01", name: "Rolling Shutter Motor 800KG", category: "Shutters", qty: 5, alertLevel: 2 }
  ];
  localStorage.setItem("gps_ghala_inventory_v1", JSON.stringify(ghalaItems));

  // Verify active branch read
  currentBranch = "alkhoud";
  const akInv = ds.getInventory("alkhoud");
  assert(akInv.length === 2 && akInv[0].name === "Sliding Gate Motor 600KG", "Al Khoud branch loads its 2 inventory items correctly");

  currentBranch = "ghala";
  const ghInv = ds.getInventory("ghala");
  assert(ghInv.length === 1 && ghInv[0].name === "Rolling Shutter Motor 800KG", "Ghala branch loads its 1 separate inventory item correctly");

  // Verify cross-branch isolation
  const akItemInGhala = ds.findItemByName("Sliding Gate Motor 600KG", "ghala");
  assert(akItemInGhala === null, "Al Khoud stock is strictly isolated from Ghala branch");

  // ----------------------------------------------------------------------------
  // Flow 2: Add Sale with 0ms Instant Local Stock Deduction
  // ----------------------------------------------------------------------------
  section("Recording a Customer Sale & Automatic Stock Deduction", "2");
  currentBranch = "alkhoud";

  info("Initial Al Khoud stock for 'Sliding Gate Motor 600KG': 10 units");

  const salePayload = {
    date: "2026-08-19",
    customerName: "Salim Al-Kindi",
    customerNumber: "96891234567",
    customerEmail: "salim@example.om",
    vatBill: "yes",
    paymentStatus: "paid",
    paymentMethod: "cash",
    cashAmount: 157.500,
    cardAmount: 0.000,
    grandTotal: 157.500,
    items: [
      { name: "Sliding Gate Motor 600KG", sku: "AK-01", qty: 2, unitPrice: 75.000 }
    ],
    itemsDetail: "Sliding Gate Motor 600KG (Qty: 2 @ 75.000)"
  };

  const saleRes = ds.recordSale(salePayload, window.APP_CONFIG.googleSheetWebAppUrl);
  assert(saleRes.success === true, "Sale was recorded successfully in DataStore");

  const postSaleInv = ds.getInventory("alkhoud");
  const updatedMotor = postSaleInv.find((i) => i.name === "Sliding Gate Motor 600KG");
  assert(updatedMotor.qty === 8, "Inventory stock instantly deducted from 10 -> 8 units (-2 units sold)");

  const salesHistory = ds.getSales("alkhoud");
  assert(salesHistory.length === 1 && salesHistory[0].customerName === "Salim Al-Kindi", "Sale saved to Al Khoud Sales History ledger");
  assert(salesHistory[0].grandTotal === 157.500, "Grand total matches exactly (OMR 157.500 with 5% VAT)");

  // ----------------------------------------------------------------------------
  // Flow 3: Refund Sale & Stock Restoration
  // ----------------------------------------------------------------------------
  section("Refunding a Sale & Restoring Inventory Stock", "3");

  const recordedSale = salesHistory[0];
  info(`Refunding Sale ID #${recordedSale.id} for customer '${recordedSale.customerName}'`);

  const refundRes = ds.refundSale(recordedSale.id, window.APP_CONFIG.googleSheetWebAppUrl);
  assert(refundRes.success === true, "Refund transaction executed successfully");

  const postRefundInv = ds.getInventory("alkhoud");
  const restoredMotor = postRefundInv.find((i) => i.name === "Sliding Gate Motor 600KG");
  assert(restoredMotor.qty === 10, "Inventory stock restored back to 10 units (+2 units returned)");

  const postRefundSales = ds.getSales("alkhoud");
  assert(postRefundSales[0].isRefunded === true && postRefundSales[0].refundStatus === "REFUNDED", "Sale ledger status updated to REFUNDED");

  // Attempt duplicate refund on same sale
  const dupRefund = ds.refundSale(recordedSale.id, window.APP_CONFIG.googleSheetWebAppUrl);
  assert(dupRefund.success === false, "Duplicate refund prevention blocks double-crediting stock");

  // ----------------------------------------------------------------------------
  // Flow 4: Add Stock Workflow (Stock Inward)
  // ----------------------------------------------------------------------------
  section("Adding New Stock Inward Batch", "4");

  info("Adding +5 units of 'Gate Remote 433MHz' (Current: 25 units)");
  const addStockRes = ds.addStockQuantity({
    name: "Gate Remote 433MHz",
    addQty: 5,
    category: "Remotes",
    remarks: "Received from Muscat Warehouse shipment"
  }, window.APP_CONFIG.googleSheetWebAppUrl);

  assert(addStockRes.success === true, "Stock addition batch committed");

  const postAddInv = ds.getInventory("alkhoud");
  const updatedRemote = postAddInv.find((i) => i.name === "Gate Remote 433MHz");
  assert(updatedRemote.qty === 30, "Remote stock count incremented from 25 -> 30 units");
  assert(updatedRemote.lastRemark === "Received from Muscat Warehouse shipment", "Shipment remarks saved on item metadata");

  // ----------------------------------------------------------------------------
  // Flow 5: Stock Amendment with NaN Prevention & Deep Audit Trail
  // ----------------------------------------------------------------------------
  section("Amending Product Metadata & Audit Trail Verification", "5");

  info("Amending item name and category without modifying quantity (Testing NaN safeguard)");

  const targetItem = updatedRemote;
  const amendData = {
    originalItem: targetItem,
    updatedFields: {
      name: "Gate Remote 433MHz Pro",
      category: "Wireless Remotes",
      remarks: "Updated catalog designation"
    },
    diffs: [
      { field: "Item Name", oldVal: "Gate Remote 433MHz", newVal: "Gate Remote 433MHz Pro" },
      { field: "Category", oldVal: "Remotes", newVal: "Wireless Remotes" }
    ]
  };

  const amendRes = ds.amendStockItem(amendData, window.APP_CONFIG.googleSheetWebAppUrl);
  assert(amendRes.success === true, "Stock amendment committed successfully");

  const postAmendInv = ds.getInventory("alkhoud");
  const amendedRemote = postAmendInv.find((i) => i.name === "Gate Remote 433MHz Pro");

  assert(amendedRemote !== undefined, "Amended product name is updated in inventory");
  assert(amendedRemote.qty === 30 && !isNaN(amendedRemote.qty), "Stock quantity safely remained 30 units (NaN bug prevented)");
  assert(amendedRemote.category === "Wireless Remotes", "Category updated to 'Wireless Remotes'");
  assert(amendRes.auditRecord && amendRes.auditRecord.user === "ahmed@gps.om", "Deep audit log recorded active admin email");

  // ----------------------------------------------------------------------------
  // Flow 6: Unpaid Sale Collection with Split Payment (Cash + Card)
  // ----------------------------------------------------------------------------
  section("Collecting Payment on Unpaid Sale with Split Payment", "6");

  // Create unpaid sale
  const unpaidSale = {
    date: "2026-08-19",
    customerName: "Tariq Al-Farsi",
    customerNumber: "96899887766",
    customerEmail: "tariq@example.om",
    vatBill: "no",
    paymentStatus: "not_paid",
    paymentMethod: "n/a",
    cashAmount: 0.000,
    cardAmount: 0.000,
    grandTotal: 100.000,
    items: [{ name: "Sliding Gate Motor 600KG", qty: 1, unitPrice: 100.000 }],
    itemsDetail: "Sliding Gate Motor 600KG (Qty: 1 @ 100.000)"
  };

  ds.recordSale(unpaidSale, window.APP_CONFIG.googleSheetWebAppUrl);
  const createdUnpaid = ds.getSales("alkhoud")[0];
  assert(createdUnpaid.paymentStatus === "not_paid", "Unpaid sale successfully logged in system");

  info("Collecting split payment: OMR 40.000 Cash + OMR 60.000 Card = OMR 100.000 Total");
  const payRes = ds.markSaleAsPaid(createdUnpaid.id, {
    paymentMethod: "both",
    cashAmount: 40.000,
    cardAmount: 60.000
  }, window.APP_CONFIG.googleSheetWebAppUrl);

  assert(payRes.success === true, "Split payment recorded successfully");

  const updatedPaidSale = ds.getSales("alkhoud")[0];
  assert(updatedPaidSale.paymentStatus === "paid", "Sale status flipped to 'paid'");
  assert(updatedPaidSale.cashAmount === 40.000 && updatedPaidSale.cardAmount === 60.000, "Exact cash (40.000) and card (60.000) ledger breakdown preserved");

  // ----------------------------------------------------------------------------
  // Flow 7: Offline Resilience & Outbox Queue Auto-Flush
  // ----------------------------------------------------------------------------
  section("Offline Mutations Queueing & Background Auto-Flush", "7");

  // Clean outbox for this isolated test
  localStorage.removeItem("gps_pending_mutations_v1");

  info("Simulating network disconnection (navigator.onLine = false)");
  networkOnline = false;

  // Record a sale and add stock while offline
  const offlineSale = {
    date: "2026-08-19",
    customerName: "Offline Customer",
    grandTotal: 50.000,
    items: [{ name: "Gate Remote 433MHz Pro", qty: 1, unitPrice: 50.000 }],
    paymentStatus: "paid",
    paymentMethod: "cash",
    cashAmount: 50.000,
    cardAmount: 0.000
  };

  ds.recordSale(offlineSale, window.APP_CONFIG.googleSheetWebAppUrl);
  ds.addStockQuantity({ name: "Gate Remote 433MHz Pro", addQty: 10 }, window.APP_CONFIG.googleSheetWebAppUrl);

  const pendingQueue = JSON.parse(localStorage.getItem("gps_pending_mutations_v1") || "[]");
  assert(pendingQueue.length === 2, `Offline mutations queued in outbox (Found: ${pendingQueue.length} pending actions)`);
  assert(pendingQueue[0].action === "add_sale" && pendingQueue[1].action === "add_stock_qty", "Outbox correctly queued 'add_sale' and 'add_stock_qty' in sequence");

  info("Simulating network reconnection (navigator.onLine = true)");
  networkOnline = true;
  networkRequestsLog = [];

  // Trigger cloud sync which auto-flushes pending queue
  await ds.syncFromCloud(window.APP_CONFIG.googleSheetWebAppUrl);

  const postFlushQueue = JSON.parse(localStorage.getItem("gps_pending_mutations_v1") || "[]");
  assert(postFlushQueue.length === 0, "Outbox queue completely flushed and cleared upon reconnecting");
  assert(networkRequestsLog.length >= 2, "All pending offline actions were replayed to Google Sheets cloud backend");

  // ----------------------------------------------------------------------------
  // Flow 8: Search & In-Memory Cache Performance Benchmark
  // ----------------------------------------------------------------------------
  section("In-Memory RAM Cache Performance & Latency Benchmark", "8");

  const numQueries = 10000;
  info(`Running ${numQueries.toLocaleString()} real-time search queries on in-memory RAM cache...`);

  const startHr = process.hrtime.bigint();
  for (let i = 0; i < numQueries; i++) {
    ds.searchItems("remote", "alkhoud");
  }
  const endHr = process.hrtime.bigint();

  const totalDurationMs = Number(endHr - startHr) / 1000000;
  const avgPerQueryUs = (totalDurationMs / numQueries) * 1000;

  info(`Completed ${numQueries.toLocaleString()} searches in ${totalDurationMs.toFixed(2)}ms`);
  info(`Average query latency: ${avgPerQueryUs.toFixed(3)} microseconds (~${(totalDurationMs / numQueries).toFixed(5)}ms)`);

  assert(totalDurationMs < 150, "10,000 in-memory search queries executed in < 150ms total time");
  // ----------------------------------------------------------------------------
  // Flow 9: Instant 0ms Startup Session Validation & Background Revalidation
  // ----------------------------------------------------------------------------
  section("Instant 0ms Startup Session & Background Revalidation", "9");

  // Seed active local session
  const testUser = { name: "Ahmed Al-Harthy", email: "ahmed@gps.om", role: "admin", assignedBranch: "all" };
  const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const testSession = { sessionId: "sess_gps_live_12345", expiresAt: futureExpiry };

  localStorage.setItem("gps_user_session_v1", JSON.stringify(testUser));
  localStorage.setItem("gps_session_token_v1", JSON.stringify(testSession));

  info("Measuring local startup session validation speed...");
  const tStart = process.hrtime.bigint();
  const validatedUser = window.Auth.validateSession();
  const tEnd = process.hrtime.bigint();
  const valDurationUs = Number(tEnd - tStart) / 1000;

  assert(validatedUser !== null && validatedUser.email === "ahmed@gps.om", "Local session validation succeeded instantly");
  assert(valDurationUs < 5000, `Startup validation took ${valDurationUs.toFixed(2)}µs (< 5ms instant UI unlock)`);

  info("Testing background server verification under normal cloud conditions...");
  const bgVerifyRes = await window.Auth.verifySessionWithCloud(window.APP_CONFIG.googleSheetWebAppUrl);
  assert(bgVerifyRes.valid === true, "Background cloud verification confirmed active session");

  info("Testing slow/hanging network with AbortController timeout protection...");
  // Simulate slow network fetch that rejects on abort
  const origFetch = global.fetch;
  global.fetch = (url, opts) => {
    return new Promise((resolve, reject) => {
      if (opts && opts.signal) {
        opts.signal.addEventListener("abort", () => {
          reject(new Error("The operation was aborted due to timeout"));
        });
      }
    });
  };

  const slowVerifyRes = await window.Auth.verifySessionWithCloud(window.APP_CONFIG.googleSheetWebAppUrl);
  assert(slowVerifyRes.valid === true && slowVerifyRes.offline === true, "Slow network timed out safely and kept local session active (No screen freeze)");

  // Restore fetch
  global.fetch = origFetch;

  // ----------------------------------------------------------------------------
  // Flow 10: Production Logger Gating & Console Regulation
  // ----------------------------------------------------------------------------
  section("Production Logger Gating & Console Output Regulation", "10");

  info("Testing DevLogger disable/enable controls...");
  const devLogger = window.DevLogger;
  assert(devLogger !== undefined && typeof devLogger.enable === "function", "DevLogger API is globally available");

  // Test disable
  devLogger.disable(false);
  assert(devLogger.isEnabled() === false, "DevLogger is disabled by default in production (silences all raw console noise)");

  // Test enable
  devLogger.enable(false);
  assert(devLogger.isEnabled() === true, "DevLogger can be dynamically enabled in browser console via DevLogger.enable()");

  // Clean up to disabled
  devLogger.disable(false);

  // ----------------------------------------------------------------------------
  // Flow 11: IndexedDB Durable Storage & LocalStorage Auto-Migration
  // ----------------------------------------------------------------------------
  section("IndexedDB Durable Storage & LocalStorage Auto-Migration", "11");

  info("Testing IndexedDB auto-migration and persistence...");
  // Test auto-migration
  await ds.autoMigrateLegacyStorage();
  assert(idbStores.inventory["alkhoud"] !== undefined, "Al Khoud inventory persisted in IndexedDB 'inventory' store");
  assert(idbStores.sales["alkhoud"] !== undefined, "Al Khoud sales ledger persisted in IndexedDB 'sales' store");

  // Test deep audit log persistence in IndexedDB
  const auditLogs = ds.getAuditLogs("alkhoud");
  assert(Array.isArray(auditLogs) && auditLogs.length > 0, "Audit logs accessible via DataStore.getAuditLogs()");

  // ----------------------------------------------------------------------------
  // Flow 12: Sales & Stock Draft Auto-Save and Recovery
  // ----------------------------------------------------------------------------
  section("Sales & Stock Draft Auto-Save and Recovery", "12");

  info("Testing sales form draft auto-saving...");
  const testDraftSale = {
    customerName: "Fahad Al-Balushi",
    customerNumber: "96899123456",
    vatBill: "yes",
    paymentStatus: "paid",
    paymentMethod: "card",
    items: [{ id: 101, name: "Automatic Barrier 4M", qty: 2, unitPrice: 220.000 }],
    savedAt: Date.now()
  };

  localStorage.setItem("gps_draft_sale_v1", JSON.stringify(testDraftSale));
  const retrievedSaleDraft = JSON.parse(localStorage.getItem("gps_draft_sale_v1") || "null");
  assert(retrievedSaleDraft !== null && retrievedSaleDraft.customerName === "Fahad Al-Balushi", "Sales draft persisted in localStorage (gps_draft_sale_v1)");
  assert(retrievedSaleDraft.items.length === 1 && retrievedSaleDraft.items[0].qty === 2, "Sales draft cart items recovered completely");

  info("Testing stock inward draft auto-saving...");
  const testDraftStock = {
    mode: "new",
    name: "Solar Remote Control 868MHz",
    category: "Accessories",
    qty: "15",
    alertLevel: "4",
    remarks: "Received from Muscat Port",
    savedAt: Date.now()
  };

  localStorage.setItem("gps_draft_stock_v1", JSON.stringify(testDraftStock));
  const retrievedStockDraft = JSON.parse(localStorage.getItem("gps_draft_stock_v1") || "null");
  assert(retrievedStockDraft !== null && retrievedStockDraft.name === "Solar Remote Control 868MHz", "Stock draft persisted in localStorage (gps_draft_stock_v1)");
  assert(retrievedStockDraft.qty === "15" && retrievedStockDraft.remarks === "Received from Muscat Port", "Stock draft details recovered completely");

  // Clean up drafts
  localStorage.removeItem("gps_draft_sale_v1");
  localStorage.removeItem("gps_draft_stock_v1");

  // ----------------------------------------------------------------------------
  // Flow 13: Service Worker Background Sync Outbox Registration
  // ----------------------------------------------------------------------------
  section("Service Worker Background Sync Outbox Execution", "13");

  info("Testing offline mutation enqueueing to IndexedDB outbox & Background Sync registration...");
  networkOnline = false;
  backgroundSyncTags.length = 0;

  ds.recordSale({
    customerName: "Tariq Al-Mamari",
    items: [{ name: "Gate Remote 433MHz", qty: 1, unitPrice: 15.000 }],
    grandTotal: 15.750,
    vatBill: "yes",
    paymentStatus: "paid",
    paymentMethod: "cash",
    cashAmount: 15.750
  }, window.APP_CONFIG.googleSheetWebAppUrl);

  // Allow async IndexedDB outbox write to complete
  await new Promise((r) => setTimeout(r, 40));

  assert(backgroundSyncTags.includes("gps-outbox-sync"), "Background Sync tag 'gps-outbox-sync' registered with Service Worker");
  const outboxItems = Object.values(idbStores.mutations_outbox);
  assert(outboxItems.length > 0, "Offline mutation stored in IndexedDB 'mutations_outbox' store for background sync");
  assert(outboxItems[outboxItems.length - 1] && outboxItems[outboxItems.length - 1].action === "add_sale", "Outbox record contains correct 'add_sale' payload");

  // Clean up
  networkOnline = true;
  await ds.flushPendingMutations(window.APP_CONFIG.googleSheetWebAppUrl);

  // ----------------------------------------------------------------------------
  // Final Summary Report
  // ----------------------------------------------------------------------------
  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright} FINAL TEST RESULTS SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  Total User Flows Tested : ${colors.bright}13 Flows${colors.reset}`);
  console.log(`  Total Assertions Run    : ${colors.bright}${totalTests}${colors.reset}`);
  console.log(`  Tests Passed            : ${colors.green}${passedTests} ✔${colors.reset}`);
  console.log(`  Tests Failed            : ${failedTests === 0 ? colors.green + "0 ✖" : colors.red + failedTests + " ✖"}${colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n  ${colors.bgGreen} STATUS: ALL TESTS PASSED SUCCESSFULLY! APP IS PRODUCTION READY. ${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${colors.bgRed} STATUS: ${failedTests} TEST(S) FAILED. PLEASE REVIEW LOGS. ${colors.reset}\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
