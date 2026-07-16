/** Escapa HTML antes de interpolar dados do usuário em template strings. */
export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const formatadorBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(n) {
  return formatadorBRL.format(Number(n) || 0);
}

export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

export function mesAtualString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function dataHojeString() {
  return new Date().toISOString().slice(0, 10);
}

export function labelMes(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
