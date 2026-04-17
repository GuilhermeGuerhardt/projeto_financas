const htmlRoot = document.documentElement;
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const themeToggle = document.getElementById("themeToggle");
const themeSwitchInline = document.getElementById("themeSwitchInline");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function setTheme(theme) {
  const isDark = theme === "dark";
  htmlRoot.classList.toggle("dark", isDark);
  localStorage.setItem("finance-theme", theme);
}

function toggleTheme() {
  const currentIsDark = htmlRoot.classList.contains("dark");
  setTheme(currentIsDark ? "light" : "dark");
}

function openTab(tabId) {
  tabContents.forEach((content) => {
    content.classList.toggle("hidden", content.id !== tabId);
  });

  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === tabId;
    button.classList.toggle("active-tab", isActive);
  });
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 1024) {
    sidebar.classList.add("-translate-x-full");
  }
}

function setAuthView(view) {
  const isLogin = view === "login";
  loginForm?.classList.toggle("hidden", !isLogin);
  registerForm?.classList.toggle("hidden", isLogin);

  showLogin?.classList.toggle("bg-white", isLogin);
  showLogin?.classList.toggle("dark:bg-slate-700", isLogin);
  showLogin?.classList.toggle("text-slate-900", isLogin);
  showLogin?.classList.toggle("dark:text-white", isLogin);
  showLogin?.classList.toggle("shadow-sm", isLogin);
  showLogin?.classList.toggle("text-slate-600", !isLogin);
  showLogin?.classList.toggle("dark:text-slate-300", !isLogin);

  showRegister?.classList.toggle("bg-white", !isLogin);
  showRegister?.classList.toggle("dark:bg-slate-700", !isLogin);
  showRegister?.classList.toggle("text-slate-900", !isLogin);
  showRegister?.classList.toggle("dark:text-white", !isLogin);
  showRegister?.classList.toggle("shadow-sm", !isLogin);
  showRegister?.classList.toggle("text-slate-600", isLogin);
  showRegister?.classList.toggle("dark:text-slate-300", isLogin);
}

menuButton?.addEventListener("click", () => {
  sidebar.classList.toggle("-translate-x-full");
});

themeToggle?.addEventListener("click", toggleTheme);
themeSwitchInline?.addEventListener("click", toggleTheme);
showLogin?.addEventListener("click", () => setAuthView("login"));
showRegister?.addEventListener("click", () => setAuthView("register"));

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openTab(button.dataset.tabTarget);
    closeSidebarOnMobile();
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) {
    sidebar.classList.remove("-translate-x-full");
  }
});

const savedTheme = localStorage.getItem("finance-theme");
if (savedTheme) {
  setTheme(savedTheme);
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(prefersDark ? "dark" : "light");
}

openTab("login");
setAuthView("login");

if (window.innerWidth < 1024) {
  sidebar.classList.add("-translate-x-full");
}

if (window.lucide) {
  window.lucide.createIcons();
}
