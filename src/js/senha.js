const CORES_BARRA = ["", "bg-rose-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500", "bg-emerald-500"];
const LABELS = ["", "Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
const CORES_LABEL = ["", "text-rose-500", "text-orange-400", "text-yellow-500", "text-emerald-500", "text-emerald-600"];
const IDS_BARRAS = ["sfBar1", "sfBar2", "sfBar3", "sfBar4"];
const MAPA_REQUISITOS = {
  sfReq8: "tamanho",
  sfReqMai: "maiuscula",
  sfReqMin: "minuscula",
  sfReqNum: "numero",
  sfReqEsp: "especial",
};

/** Espelha as regras de validarSenhaForte do backend (backend/helpers.js). */
export function avaliarSenha(password) {
  return {
    tamanho: password.length >= 8,
    maiuscula: /[A-Z]/.test(password),
    minuscula: /[a-z]/.test(password),
    numero: /[0-9]/.test(password),
    especial: /[^A-Za-z0-9]/.test(password),
  };
}

export function senhaEhForte(password) {
  return Object.values(avaliarSenha(password)).every(Boolean);
}

function atualizarIndicadorSenha(password) {
  const req = avaliarSenha(password);
  const pontos = Object.values(req).filter(Boolean).length;

  document.getElementById("senhaForca")?.classList.toggle("hidden", password.length === 0);

  IDS_BARRAS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `h-1.5 flex-1 rounded-full transition-colors ${i < pontos ? CORES_BARRA[pontos] : "bg-slate-200 dark:bg-slate-700"}`;
  });

  const sfLabel = document.getElementById("sfLabel");
  if (sfLabel) {
    sfLabel.textContent = password.length > 0 ? LABELS[pontos] : "";
    sfLabel.className = `text-xs font-medium ${CORES_LABEL[pontos]}`;
  }

  for (const [id, chave] of Object.entries(MAPA_REQUISITOS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const ok = req[chave];
    el.classList.toggle("text-emerald-600", ok);
    el.classList.toggle("dark:text-emerald-400", ok);
    el.classList.toggle("text-slate-500", !ok);
    el.classList.toggle("dark:text-slate-400", !ok);
    const dot = el.querySelector(".sf-dot");
    if (dot) dot.textContent = ok ? "✓" : "·";
  }
}

export function bindIndicadorSenha() {
  document.getElementById("regPassword")?.addEventListener("input", (e) => {
    atualizarIndicadorSenha(e.target.value);
  });
}
