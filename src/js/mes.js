import { labelMes, mesAtualString } from "./utils.js";

const filtroMes = document.getElementById("filtroMes");
const mesDisplayShort = document.getElementById("mesDisplayShort");
const mesDisplayLong = document.getElementById("mesDisplayLong");

export function mesSelecionado() {
  return filtroMes?.value || mesAtualString();
}

export function garantirMesInicial() {
  if (filtroMes && !filtroMes.value) filtroMes.value = mesAtualString();
  syncMesStrip();
}

export function syncMesStrip() {
  const mes = mesSelecionado();
  if (mesDisplayLong) mesDisplayLong.textContent = labelMes(mes);
  if (mesDisplayShort) {
    const [y, m] = mes.split("-");
    mesDisplayShort.textContent = `${m}/${y}`;
  }
}

export function shiftMes(delta) {
  if (!filtroMes) return;
  if (!filtroMes.value) filtroMes.value = mesAtualString();
  const [y, m] = filtroMes.value.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  filtroMes.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  syncMesStrip();
  filtroMes.dispatchEvent(new Event("change"));
}

export function abrirSeletorDeMes() {
  if (filtroMes && typeof filtroMes.showPicker === "function") filtroMes.showPicker();
  else filtroMes?.click();
}

export function aoMudarMes(handler) {
  filtroMes?.addEventListener("change", handler);
}

export function aoDigitarMes(handler) {
  filtroMes?.addEventListener("input", handler);
}
