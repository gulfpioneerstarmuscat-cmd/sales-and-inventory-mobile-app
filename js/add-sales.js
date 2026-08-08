// js/add-sales.js

window.initAddSales = (function () {
  let initialized = false;

  return function initAddSales() {
    if (initialized) return;
    initialized = true;

    const root = document.getElementById("add-sales-root");
    if (!root) return;

    // Temporary content for testing; will be replaced in later patches
    root.innerHTML = `
      <div class="add-sales-placeholder">
        <h2>Add Sales</h2>
        <p>Form sections will be loaded here.</p>
      </div>
    `;
  };
})();
