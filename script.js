document.addEventListener("DOMContentLoaded", () => {
  const isMobile =
    window.matchMedia("(max-width: 767px)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  const mobileApp = document.getElementById("mobile-app");
  const desktopBlock = document.getElementById("desktop-block");

  if (mobileApp && desktopBlock) {
    mobileApp.hidden = !isMobile;
    desktopBlock.hidden = isMobile;
  }

  const navButtons = document.querySelectorAll(
    ".nav-panel .secondary-button, .nav-panel .primary-button",
  );
  const profileButton = document.querySelector(".profile-button");
  const pages = document.querySelectorAll(".panel-page");

  if (!navButtons.length || !pages.length) return;

  const showPage = (pageKey) => {
    pages.forEach((page) => {
      const isActive = page.dataset.page === String(pageKey);
      page.hidden = !isActive;
      page.classList.toggle("panel-page--active", isActive);
    });
  };

  navButtons.forEach((button, index) => {
    button.addEventListener("click", () => showPage(index + 1));
  });

  if (profileButton) {
    profileButton.addEventListener("click", () => showPage("profile"));
  }

  showPage(1);
});
