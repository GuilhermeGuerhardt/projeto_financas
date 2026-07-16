import { THEME_KEY } from "./config.js";
import { refreshIcons } from "./utils.js";

const htmlRoot = document.documentElement;
const themeIconLight = document.getElementById("themeIconLight");
const themeIconDark = document.getElementById("themeIconDark");
const themeToggleLabel = document.getElementById("themeToggleLabel");

export function isDarkMode() {
  return htmlRoot.classList.contains("dark");
}

export function updateThemeUi() {
  const isDark = isDarkMode();
  themeIconLight?.classList.toggle("hidden", !isDark);
  themeIconDark?.classList.toggle("hidden", isDark);
  if (themeToggleLabel) themeToggleLabel.textContent = isDark ? "Escuro" : "Claro";
  refreshIcons();
}

export function setTheme(theme) {
  const isDark = theme === "dark";
  htmlRoot.classList.toggle("dark", isDark);
  htmlRoot.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem(THEME_KEY, theme);
  updateThemeUi();
}

export function aplicarTemaSalvo() {
  const salvo = localStorage.getItem(THEME_KEY);
  if (salvo === "dark" || salvo === "light") return setTheme(salvo);
  setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

export function toggleTheme() {
  setTheme(isDarkMode() ? "light" : "dark");
}
