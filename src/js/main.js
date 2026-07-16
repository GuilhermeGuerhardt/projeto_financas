import { api } from "./api.js";
import { bindAuth } from "./auth.js";
import { preencherSelectsCatalogo } from "./catalogo.js";
import { bindRainbowWheels } from "./corWheel.js";
import { aoMudarAnoDashboard, carregarDashboard, destroyCharts, temGraficosRenderizados } from "./dashboard.js";
import { bindEdicaoModal, iniciarEdicao } from "./edicaoModal.js";
import { EVENTOS, ao } from "./eventos.js";
import { bindFormLancamento, preencherDataHoje, syncContaLabelLancamento } from "./formLancamento.js";
import { carregarMovimentosMes } from "./lancamentos.js";
import { abrirSeletorDeMes, aoDigitarMes, aoMudarMes, garantirMesInicial, shiftMes, syncMesStrip } from "./mes.js";
import {
  ajustarSidebarNoResize,
  aoTrocarAba,
  closeSidebarOnMobile,
  esconderSidebarNoMobileInicial,
  openTab,
  registrarAba,
  setAuthView,
  showApp,
  showAuth,
  toggleSidebar,
} from "./navegacao.js";
import { bindFormsOrganizacao, carregarOrganizacao } from "./organizacao.js";
import { bindIndicadorSenha } from "./senha.js";
import { clearSession, getToken, setSession } from "./session.js";
import { aplicarTemaSalvo, toggleTheme, updateThemeUi } from "./theme.js";

// ─── Ligações entre módulos ──────────────────────────────────────────────────────

async function carregarDadosDoUsuario() {
  await preencherSelectsCatalogo();
  await carregarMovimentosMes();
}

async function entrarNaApp(user) {
  showApp(user);
  await carregarDadosDoUsuario();
}

function sairDaApp() {
  destroyCharts();
  showAuth();
  setAuthView("login");
}

ao(EVENTOS.DADOS_ALTERADOS, async () => {
  await carregarMovimentosMes();
  await preencherSelectsCatalogo();
  carregarDashboard();
});

ao(EVENTOS.EDITAR_LANCAMENTO, (detalhe) => iniciarEdicao(detalhe));

ao(EVENTOS.SESSAO_EXPIRADA, () => {
  clearSession();
  sairDaApp();
});

registrarAba("graficos", carregarDashboard);
registrarAba("organizacao", carregarOrganizacao);

// ─── Listeners ───────────────────────────────────────────────────────────────────

document.getElementById("themeToggle")?.addEventListener("click", () => {
  toggleTheme();
  // Os gráficos têm as cores de texto e grade fixadas no momento em que são
  // criados, então precisam ser redesenhados ao trocar de tema.
  if (temGraficosRenderizados()) carregarDashboard();
});

document.getElementById("showLogin")?.addEventListener("click", () => setAuthView("login"));
document.getElementById("showRegister")?.addEventListener("click", () => setAuthView("register"));
document.getElementById("menuButton")?.addEventListener("click", toggleSidebar);

aoTrocarAba(closeSidebarOnMobile);
window.addEventListener("resize", ajustarSidebarNoResize);

aoMudarMes(() => {
  syncMesStrip();
  carregarMovimentosMes();
});
aoDigitarMes(syncMesStrip);
document.getElementById("mesPrev")?.addEventListener("click", () => shiftMes(-1));
document.getElementById("mesNext")?.addEventListener("click", () => shiftMes(1));
document.getElementById("mesOpenPicker")?.addEventListener("click", abrirSeletorDeMes);

aoMudarAnoDashboard(carregarDashboard);

bindAuth({ aoEntrar: entrarNaApp, aoSair: sairDaApp });
bindFormLancamento();
bindFormsOrganizacao();
bindEdicaoModal();
bindIndicadorSenha();

// ─── Inicialização ───────────────────────────────────────────────────────────────

aplicarTemaSalvo();
setAuthView("login");
esconderSidebarNoMobileInicial();
preencherDataHoje();
bindRainbowWheels();
syncContaLabelLancamento();
openTab("lancamentos");

(async function init() {
  const token = getToken();
  if (!token) return;
  try {
    const me = await api("/api/auth/me");
    setSession(token, me);
    showApp(me);
    garantirMesInicial();
    await carregarDadosDoUsuario();
  } catch {
    clearSession();
  }
  updateThemeUi();
})();
