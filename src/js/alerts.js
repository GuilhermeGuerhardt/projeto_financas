const AUTO_ESCONDER_MS = 5000;

const CLASSES_ERRO = [
  "border-rose-200", "bg-rose-50", "text-rose-800",
  "dark:border-rose-900/50", "dark:bg-rose-950/40", "dark:text-rose-200",
];

const CLASSES_SUCESSO = [
  "border-emerald-200", "bg-emerald-50", "text-emerald-800",
  "dark:border-emerald-900/50", "dark:bg-emerald-950/30", "dark:text-emerald-200",
];

const authAlert = document.getElementById("authAlert");
const mainAlert = document.getElementById("mainAlert");

let timerMainAlert = null;

function pintar(el, isError) {
  el.classList.remove("hidden", ...CLASSES_ERRO, ...CLASSES_SUCESSO);
  el.classList.add(...(isError ? CLASSES_ERRO : CLASSES_SUCESSO));
}

export function showAuthAlert(message, isError) {
  if (!authAlert) return;
  authAlert.textContent = message;
  pintar(authAlert, isError);
}

export function hideAuthAlert() {
  authAlert?.classList.add("hidden");
}

export function showMainAlert(message, isError) {
  if (!mainAlert) return;
  mainAlert.textContent = message;
  pintar(mainAlert, isError);
  // Sem isso, alertas em sequência herdam o timer do anterior e somem cedo.
  clearTimeout(timerMainAlert);
  timerMainAlert = setTimeout(() => mainAlert.classList.add("hidden"), AUTO_ESCONDER_MS);
}
