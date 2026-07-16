import { garantirMesInicial } from "./mes.js";
import { refreshIcons } from "./utils.js";

const LARGURA_DESKTOP = 1024;

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const sidebar = document.getElementById("sidebar");
const userGreeting = document.getElementById("userGreeting");
const dashAno = document.getElementById("dashAno");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");

/** Callbacks disparados ao abrir cada aba — registrados pelo main.js. */
const aoAbrirAba = new Map();

export function registrarAba(tabId, handler) {
  aoAbrirAba.set(tabId, handler);
}

export function openTab(tabId) {
  tabContents.forEach((el) => el.classList.toggle("hidden", el.id !== tabId));
  tabButtons.forEach((btn) => btn.classList.toggle("active-tab", btn.dataset.tabTarget === tabId));
  refreshIcons();
  aoAbrirAba.get(tabId)?.();
}

export function aoTrocarAba(handler) {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      openTab(btn.dataset.tabTarget);
      handler?.();
    });
  });
}

export function setAuthView(view) {
  const isLogin = view === "login";
  loginForm?.classList.toggle("hidden", !isLogin);
  registerForm?.classList.toggle("hidden", isLogin);
  showLogin?.classList.toggle("auth-tab-active", isLogin);
  showRegister?.classList.toggle("auth-tab-active", !isLogin);
}

export function toggleSidebar() {
  sidebar?.classList.toggle("-translate-x-full");
}

export function closeSidebarOnMobile() {
  if (window.innerWidth < LARGURA_DESKTOP) sidebar?.classList.add("-translate-x-full");
}

export function ajustarSidebarNoResize() {
  if (window.innerWidth >= LARGURA_DESKTOP) sidebar?.classList.remove("-translate-x-full");
}

export function esconderSidebarNoMobileInicial() {
  if (window.innerWidth < LARGURA_DESKTOP) sidebar?.classList.add("-translate-x-full");
}

function popularAnosDashboard() {
  if (!dashAno) return;
  const atual = new Date().getFullYear();
  dashAno.innerHTML = "";
  for (let a = atual - 2; a <= atual + 1; a += 1) {
    const o = document.createElement("option");
    o.value = String(a);
    o.textContent = String(a);
    if (a === atual) o.selected = true;
    dashAno.appendChild(o);
  }
}

export function showApp(user) {
  authView?.classList.add("hidden");
  appView?.classList.remove("hidden");
  if (userGreeting && user) userGreeting.textContent = `Olá, ${user.name}`;
  garantirMesInicial();
  popularAnosDashboard();
  refreshIcons();
}

export function showAuth() {
  appView?.classList.add("hidden");
  authView?.classList.remove("hidden");
  openTab("lancamentos");
}
