// ─── Constantes ────────────────────────────────────────────────────────────────

const TOKEN_KEY = "finance-token";
const USER_KEY = "finance-user";

function resolveApiBase() {
  if (typeof window.__FINANCE_API__ === "string" && window.__FINANCE_API__.trim()) {
    return window.__FINANCE_API__.trim().replace(/\/$/, "");
  }
  if (window.location.protocol === "file:") {
    return "http://localhost:3000";
  }
  const { hostname, port } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal && port && port !== "3000") {
    return `${window.location.protocol}//${hostname}:3000`;
  }
  return "";
}

const API_BASE = resolveApiBase();

// ─── Referências do DOM ─────────────────────────────────────────────────────────

const htmlRoot = document.documentElement;
const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const themeToggle = document.getElementById("themeToggle");
const themeIconLight = document.getElementById("themeIconLight");
const themeIconDark = document.getElementById("themeIconDark");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authAlert = document.getElementById("authAlert");
const mainAlert = document.getElementById("mainAlert");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const logoutBtn = document.getElementById("logoutBtn");
const userGreeting = document.getElementById("userGreeting");
const filtroMes = document.getElementById("filtroMes");
const mesDisplayShort = document.getElementById("mesDisplayShort");
const mesDisplayLong = document.getElementById("mesDisplayLong");
const mesPrev = document.getElementById("mesPrev");
const mesNext = document.getElementById("mesNext");
const mesOpenPicker = document.getElementById("mesOpenPicker");
const formLancamento = document.getElementById("formLancamento");
const tabelaDespesas = document.getElementById("tabelaDespesas");
const tabelaReceitas = document.getElementById("tabelaReceitas");
const listaVaziaDesp = document.getElementById("listaVaziaDesp");
const listaVaziaRec = document.getElementById("listaVaziaRec");
const listaMesLabel = document.getElementById("listaMesLabel");
const relTotal = document.getElementById("relTotal");
const relTotalReceita = document.getElementById("relTotalReceita");
const relMesTitulo = document.getElementById("relMesTitulo");
const relMesTituloRec = document.getElementById("relMesTituloRec");
const relPorTipo = document.getElementById("relPorTipo");
const dashAno = document.getElementById("dashAno");
const dashTotalGasto = document.getElementById("dashTotalGasto");
const dashTotalReceita = document.getElementById("dashTotalReceita");
const dashSaldo = document.getElementById("dashSaldo");
const formNovaConta = document.getElementById("formNovaConta");
const formNovaCategoria = document.getElementById("formNovaCategoria");
const listaContas = document.getElementById("listaContas");
const listaCategorias = document.getElementById("listaCategorias");

// ─── Estado ─────────────────────────────────────────────────────────────────────

let chartCategoriasInst = null;
let chartLinhaInst = null;

// ─── Sessão ──────────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Tema ────────────────────────────────────────────────────────────────────────

function setTheme(theme) {
  const isDark = theme === "dark";
  htmlRoot.classList.toggle("dark", isDark);
  htmlRoot.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem("finance-theme", theme);
  updateThemeUi();
}

function updateThemeUi() {
  const isDark = htmlRoot.classList.contains("dark");
  themeIconLight?.classList.toggle("hidden", !isDark);
  themeIconDark?.classList.toggle("hidden", isDark);
  if (themeToggleLabel) {
    themeToggleLabel.textContent = isDark ? "Escuro" : "Claro";
  }
  refreshIcons();
}

function toggleTheme() {
  setTheme(htmlRoot.classList.contains("dark") ? "light" : "dark");
  if (chartCategoriasInst || chartLinhaInst) {
    carregarDashboard();
  }
}

// ─── Utilitários de UI ───────────────────────────────────────────────────────────

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function formatMoney(n) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
}

function showAuthAlert(message, isError) {
  if (!authAlert) return;
  authAlert.textContent = message;
  authAlert.classList.remove(
    "hidden",
    "border-rose-200", "bg-rose-50", "text-rose-800",
    "dark:border-rose-900/50", "dark:bg-rose-950/40", "dark:text-rose-200",
    "border-emerald-200", "bg-emerald-50", "text-emerald-800",
    "dark:border-emerald-900/50", "dark:bg-emerald-950/30", "dark:text-emerald-200",
  );
  if (isError) {
    authAlert.classList.add(
      "border-rose-200", "bg-rose-50", "text-rose-800",
      "dark:border-rose-900/50", "dark:bg-rose-950/40", "dark:text-rose-200",
    );
  } else {
    authAlert.classList.add(
      "border-emerald-200", "bg-emerald-50", "text-emerald-800",
      "dark:border-emerald-900/50", "dark:bg-emerald-950/30", "dark:text-emerald-200",
    );
  }
  authAlert.classList.remove("hidden");
}

function hideAuthAlert() {
  authAlert?.classList.add("hidden");
}

function showMainAlert(message, isError) {
  if (!mainAlert) return;
  mainAlert.textContent = message;
  mainAlert.classList.remove(
    "hidden",
    "border-rose-200", "bg-rose-50", "text-rose-800",
    "border-emerald-200", "bg-emerald-50", "text-emerald-800",
  );
  mainAlert.classList.add(
    isError ? "border-rose-200" : "border-emerald-200",
    isError ? "bg-rose-50" : "bg-emerald-50",
    isError ? "text-rose-800" : "text-emerald-800",
    "dark:border-slate-700", "dark:bg-slate-800", "dark:text-slate-100",
  );
  mainAlert.classList.remove("hidden");
  setTimeout(() => mainAlert.classList.add("hidden"), 5000);
}

function setAuthView(view) {
  const isLogin = view === "login";
  loginForm?.classList.toggle("hidden", !isLogin);
  registerForm?.classList.toggle("hidden", isLogin);
  showLogin?.classList.toggle("auth-tab-active", isLogin);
  showRegister?.classList.toggle("auth-tab-active", !isLogin);
  hideAuthAlert();
}

function openTab(tabId) {
  tabContents.forEach((el) => el.classList.toggle("hidden", el.id !== tabId));
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active-tab", btn.dataset.tabTarget === tabId);
  });
  refreshIcons();
  if (tabId === "graficos") carregarDashboard();
  if (tabId === "organizacao") carregarOrganizacao();
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 1024) {
    sidebar?.classList.add("-translate-x-full");
  }
}

// ─── Utilitários de data / mês ───────────────────────────────────────────────────

function mesAtualString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function labelMes(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function syncMesStrip() {
  const mes = filtroMes?.value || mesAtualString();
  if (mesDisplayLong) mesDisplayLong.textContent = labelMes(mes);
  if (mesDisplayShort) {
    const [y, m] = mes.split("-");
    mesDisplayShort.textContent = `${m}/${y}`;
  }
}

function shiftMes(delta) {
  if (!filtroMes?.value) filtroMes.value = mesAtualString();
  const [y, m] = filtroMes.value.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  filtroMes.value = `${ny}-${nm}`;
  syncMesStrip();
  filtroMes.dispatchEvent(new Event("change"));
}

// ─── Seletor de cor (roda arco-íris) ────────────────────────────────────────────

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const mval = light - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (hh < 60)       { rp = c; gp = x; }
  else if (hh < 120) { rp = x; gp = c; }
  else if (hh < 180) { gp = c; bp = x; }
  else if (hh < 240) { gp = x; bp = c; }
  else if (hh < 300) { rp = x; bp = c; }
  else               { rp = c; bp = x; }
  const r = Math.round((rp + mval) * 255);
  const g = Math.round((gp + mval) * 255);
  const b = Math.round((bp + mval) * 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function setRainbowWheelColor(wrap, hex) {
  if (!wrap) return;
  const hidden = wrap.querySelector('input[type="hidden"]');
  const core = wrap.querySelector(".rainbow-wheel-core");
  if (hidden) hidden.value = hex;
  if (core) core.style.background = hex;
}

function bindRainbowWheels() {
  document.querySelectorAll("[data-wheel]").forEach((wrap) => {
    const ring = wrap.querySelector(".rainbow-wheel-ring");
    if (!ring || ring.dataset.bound === "1") return;
    ring.dataset.bound = "1";
    ring.addEventListener("click", (e) => {
      const rect = ring.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hue = ((Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI + 360) % 360;
      setRainbowWheelColor(wrap, hslToHex(hue, 82, 52));
    });
  });
}

// ─── API ─────────────────────────────────────────────────────────────────────────

async function api(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { erro: res.ok ? "" : "Resposta inválida do servidor (não é JSON)." };
    }
  }

  if (!res.ok) {
    let fallbackMsg = res.statusText || "Erro na requisição";
    if (res.status === 404) {
      fallbackMsg =
        "API não encontrada. Rode npm start na pasta do projeto e use a mesma porta (ex.: abra http://localhost:3000). Se a porta 3000 estiver com outro app, encerre-o ou defina PORT.";
    }
    let msg = data.erro || fallbackMsg;
    if (res.status === 404 && typeof data.erro === "string" && data.erro.toLowerCase().includes("rota não encontrada")) {
      msg = `${data.erro} Verifique se o servidor deste projeto está ativo e atualizado (reinicie após git pull).`;
    }
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─── Navegação de telas ──────────────────────────────────────────────────────────

function showApp(user) {
  authView?.classList.add("hidden");
  appView?.classList.remove("hidden");
  if (userGreeting && user) userGreeting.textContent = `Olá, ${user.name}`;
  if (filtroMes && !filtroMes.value) filtroMes.value = mesAtualString();
  syncMesStrip();
  popularAnosDashboard();
  refreshIcons();
}

function showAuth() {
  appView?.classList.add("hidden");
  authView?.classList.remove("hidden");
  openTab("lancamentos");
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

function syncContaLabelLancamento() {
  const el = document.getElementById("lContaLabel");
  if (!el) return;
  const tipo = document.querySelector('input[name="lTipo"]:checked')?.value;
  if (tipo === "receita") el.textContent = "Conta creditada";
  else if (tipo === "despesa") el.textContent = "Conta debitada";
  else el.textContent = "Conta";
}

// ─── Carregamento de dados ───────────────────────────────────────────────────────

async function preencherSelectsCatalogo() {
  let contas, categorias;
  try {
    [contas, categorias] = await Promise.all([api("/api/contas"), api("/api/categorias")]);
  } catch (e) {
    if (e.status === 401) return;
    console.error(e);
    return;
  }

  const selCat = document.getElementById("lCat");
  const selConta = document.getElementById("lConta");
  const prevCat = selCat?.value;
  const prevConta = selConta?.value;

  const fill = (sel, items) => {
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione…</option>';
    for (const it of items) {
      const opt = document.createElement("option");
      opt.value = it.nome;
      opt.textContent = it.nome;
      sel.appendChild(opt);
    }
  };

  fill(selCat, categorias);
  fill(selConta, contas);

  if (prevCat && [...(selCat?.options || [])].some((o) => o.value === prevCat)) selCat.value = prevCat;
  if (prevConta && [...(selConta?.options || [])].some((o) => o.value === prevConta)) selConta.value = prevConta;
}

async function carregarMovimentosMes() {
  const mes = filtroMes?.value || mesAtualString();
  if (listaMesLabel) listaMesLabel.textContent = labelMes(mes);
  if (relMesTitulo) relMesTitulo.textContent = labelMes(mes);
  if (relMesTituloRec) relMesTituloRec.textContent = labelMes(mes);

  let despData, recData;
  try {
    [despData, recData] = await Promise.all([
      api(`/api/despesas?mes=${encodeURIComponent(mes)}`),
      api(`/api/receitas?mes=${encodeURIComponent(mes)}`),
    ]);
  } catch (e) {
    if (e.status === 401) {
      clearSession();
      showAuth();
      showAuthAlert("Sessão expirada. Entre novamente.", true);
      return;
    }
    showMainAlert(e.message || "Erro ao carregar dados.", true);
    return;
  }

  const { despesas = [], resumo: resDesp = {} } = despData;
  const { receitas = [], resumo: resRec = {} } = recData;

  renderDespesas(despesas);
  renderReceitas(receitas);

  if (relTotal) relTotal.textContent = formatMoney(resDesp.total || 0);
  if (relTotalReceita) relTotalReceita.textContent = formatMoney(resRec.total || 0);
  renderRelatorioPorTipo(resDesp);
  refreshIcons();
}

function renderDespesas(despesas) {
  if (!tabelaDespesas) return;
  tabelaDespesas.innerHTML = "";
  if (despesas.length === 0) {
    listaVaziaDesp?.classList.remove("hidden");
    return;
  }
  listaVaziaDesp?.classList.add("hidden");
  for (const d of despesas) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50/80 dark:hover:bg-slate-800/40";
    tr.innerHTML = `
      <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-700 dark:text-slate-200">${d.data}</td>
      <td class="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">${d.descricao || "—"}</td>
      <td class="px-4 py-3"><span class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">${d.tipo}</span></td>
      <td class="px-4 py-3 text-slate-600 dark:text-slate-300">${d.conta}</td>
      <td class="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">${formatMoney(d.valor)}</td>
      <td class="px-2 py-3">
        <button type="button" data-del-desp="${d.id}" class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" title="Excluir">
          <i data-lucide="trash-2" class="h-4 w-4"></i>
        </button>
      </td>`;
    tabelaDespesas.appendChild(tr);
  }
  tabelaDespesas.querySelectorAll("[data-del-desp]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir esta despesa?")) return;
      try {
        await api(`/api/despesas/${btn.getAttribute("data-del-desp")}`, { method: "DELETE" });
        await carregarMovimentosMes();
        showMainAlert("Despesa excluída.", false);
        carregarDashboard();
      } catch (err) {
        showMainAlert(err.message, true);
      }
    });
  });
}

function renderReceitas(receitas) {
  if (!tabelaReceitas) return;
  tabelaReceitas.innerHTML = "";
  if (receitas.length === 0) {
    listaVaziaRec?.classList.remove("hidden");
    return;
  }
  listaVaziaRec?.classList.add("hidden");
  for (const r of receitas) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50/80 dark:hover:bg-slate-800/40";
    tr.innerHTML = `
      <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-700 dark:text-slate-200">${r.data}</td>
      <td class="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">${r.descricao || "—"}</td>
      <td class="px-4 py-3"><span class="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">${r.categoria}</span></td>
      <td class="px-4 py-3 text-slate-600 dark:text-slate-300">${r.conta}</td>
      <td class="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">${formatMoney(r.valor)}</td>
      <td class="px-2 py-3">
        <button type="button" data-del-rec="${r.id}" class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" title="Excluir">
          <i data-lucide="trash-2" class="h-4 w-4"></i>
        </button>
      </td>`;
    tabelaReceitas.appendChild(tr);
  }
  tabelaReceitas.querySelectorAll("[data-del-rec]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir esta receita?")) return;
      try {
        await api(`/api/receitas/${btn.getAttribute("data-del-rec")}`, { method: "DELETE" });
        await carregarMovimentosMes();
        showMainAlert("Receita excluída.", false);
        carregarDashboard();
      } catch (err) {
        showMainAlert(err.message, true);
      }
    });
  });
}

function renderRelatorioPorTipo(resDesp) {
  if (!relPorTipo) return;
  relPorTipo.innerHTML = "";
  const porTipo = resDesp.porTipo || {};
  const entries = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    relPorTipo.innerHTML = `<li class="text-slate-500 dark:text-slate-400">Sem despesas neste mês.</li>`;
    return;
  }
  const total = resDesp.total || 1;
  for (const [tipo, valor] of entries) {
    const pct = Math.round((valor / total) * 100);
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium text-slate-800 dark:text-slate-200">${tipo}</span>
        <span class="font-semibold text-brand-600 dark:text-brand-400">${formatMoney(valor)}</span>
      </div>
      <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div class="h-full rounded-full bg-brand-500 transition-all" style="width:${pct}%"></div>
      </div>`;
    relPorTipo.appendChild(li);
  }
}

// ─── Dashboard / Gráficos ────────────────────────────────────────────────────────

function chartTextColor() {
  return htmlRoot.classList.contains("dark") ? "#e2e8f0" : "#475569";
}

function chartGridColor() {
  return htmlRoot.classList.contains("dark") ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.35)";
}

function destroyCharts() {
  if (chartCategoriasInst) { chartCategoriasInst.destroy(); chartCategoriasInst = null; }
  if (chartLinhaInst)      { chartLinhaInst.destroy();      chartLinhaInst = null;      }
}

async function carregarDashboard() {
  if (typeof Chart === "undefined") return;
  const ano = Number(dashAno?.value) || new Date().getFullYear();
  let data;
  try {
    data = await api(`/api/dashboard/resumo?ano=${ano}`);
  } catch (e) {
    if (e.status !== 401) showMainAlert(e.message || "Erro ao carregar gráficos.", true);
    return;
  }

  if (dashTotalGasto) dashTotalGasto.textContent = formatMoney(data.totalGasto);
  if (dashTotalReceita) dashTotalReceita.textContent = formatMoney(data.totalReceita);
  if (dashSaldo) {
    dashSaldo.textContent = formatMoney(data.saldo);
    dashSaldo.classList.toggle("text-emerald-600", data.saldo >= 0);
    dashSaldo.classList.toggle("text-rose-600", data.saldo < 0);
    dashSaldo.classList.toggle("dark:text-emerald-400", data.saldo >= 0);
    dashSaldo.classList.toggle("dark:text-rose-400", data.saldo < 0);
  }

  destroyCharts();

  const catEntries = Object.entries(data.gastosPorCategoria || {});
  const labelsCat = catEntries.map(([k]) => k);
  const valsCat = catEntries.map(([, v]) => v);
  const palette = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#059669", "#0891b2", "#4f46e5"];

  const ctxCat = document.getElementById("chartCategorias");
  if (ctxCat && labelsCat.length > 0) {
    chartCategoriasInst = new Chart(ctxCat, {
      type: "doughnut",
      data: {
        labels: labelsCat,
        datasets: [{
          data: valsCat,
          backgroundColor: labelsCat.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: chartTextColor(), padding: 12, font: { size: 11 } } },
        },
      },
    });
  } else if (ctxCat) {
    ctxCat.getContext("2d").clearRect(0, 0, ctxCat.width, ctxCat.height);
  }

  const ctxLinha = document.getElementById("chartLinha");
  if (ctxLinha) {
    const mesLabels = (data.gastosPorMes || []).map((x) => {
      const [y, m] = x.mes.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
    });

    chartLinhaInst = new Chart(ctxLinha, {
      type: "line",
      data: {
        labels: mesLabels,
        datasets: [
          {
            label: "Gastos",
            data: (data.gastosPorMes || []).map((x) => x.total),
            borderColor: "#f43f5e",
            backgroundColor: "rgba(244,63,94,0.12)",
            fill: true, tension: 0.35, pointRadius: 4, pointHoverRadius: 6,
          },
          {
            label: "Receitas",
            data: (data.receitasPorMes || []).map((x) => x.total),
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.1)",
            fill: true, tension: 0.35, pointRadius: 4, pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { color: chartGridColor() }, ticks: { color: chartTextColor(), font: { size: 11 } } },
          y: {
            grid: { color: chartGridColor() },
            ticks: {
              color: chartTextColor(),
              callback: (v) => new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(v),
            },
          },
        },
        plugins: { legend: { labels: { color: chartTextColor(), padding: 16 } } },
      },
    });
  }
}

// ─── Organização (contas e categorias) ──────────────────────────────────────────

async function carregarOrganizacao() {
  let contas, categorias;
  try {
    [contas, categorias] = await Promise.all([api("/api/contas"), api("/api/categorias")]);
  } catch (e) {
    showMainAlert(e.message || "Erro ao carregar listas.", true);
    return;
  }

  renderListaContas(contas);
  renderListaCategorias(categorias);
  refreshIcons();
}

function renderListaItem({ id, nome, cor }, delAttr, onDelete) {
  const li = document.createElement("li");
  li.className = "flex items-center justify-between gap-2 py-3 text-sm";
  li.innerHTML = `
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <span class="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-slate-300 dark:ring-slate-600" style="background-color:${cor || "#94a3b8"}"></span>
      <span class="truncate font-medium text-slate-800 dark:text-slate-200">${nome}</span>
    </div>
    <button type="button" ${delAttr}="${id}" class="shrink-0 rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30">Remover</button>`;
  li.querySelector(`[${delAttr}]`).addEventListener("click", onDelete);
  return li;
}

function renderListaContas(contas) {
  if (!listaContas) return;
  listaContas.innerHTML = "";
  for (const c of contas) {
    listaContas.appendChild(renderListaItem(c, "data-del-conta", async () => {
      if (!confirm("Remover esta conta?")) return;
      try {
        await api(`/api/contas/${c.id}`, { method: "DELETE" });
        await carregarOrganizacao();
        await preencherSelectsCatalogo();
        showMainAlert("Conta removida.", false);
      } catch (err) {
        showMainAlert(err.message, true);
      }
    }));
  }
}

function renderListaCategorias(categorias) {
  if (!listaCategorias) return;
  listaCategorias.innerHTML = "";
  for (const c of categorias) {
    listaCategorias.appendChild(renderListaItem(c, "data-del-cat", async () => {
      if (!confirm("Remover esta categoria?")) return;
      try {
        await api(`/api/categorias/${c.id}`, { method: "DELETE" });
        await carregarOrganizacao();
        await preencherSelectsCatalogo();
        showMainAlert("Categoria removida.", false);
      } catch (err) {
        showMainAlert(err.message, true);
      }
    }));
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────────

themeToggle?.addEventListener("click", toggleTheme);
showLogin?.addEventListener("click", () => setAuthView("login"));
showRegister?.addEventListener("click", () => setAuthView("register"));

menuButton?.addEventListener("click", () => {
  sidebar?.classList.toggle("-translate-x-full");
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openTab(button.dataset.tabTarget);
    closeSidebarOnMobile();
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) sidebar?.classList.remove("-translate-x-full");
});

filtroMes?.addEventListener("change", () => { syncMesStrip(); carregarMovimentosMes(); });
filtroMes?.addEventListener("input", syncMesStrip);
mesPrev?.addEventListener("click", () => shiftMes(-1));
mesNext?.addEventListener("click", () => shiftMes(1));
mesOpenPicker?.addEventListener("click", () => {
  if (filtroMes && typeof filtroMes.showPicker === "function") filtroMes.showPicker();
  else filtroMes?.click();
});

dashAno?.addEventListener("change", () => carregarDashboard());

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthAlert();
  const email = document.getElementById("loginEmail")?.value?.trim();
  const password = document.getElementById("loginPassword")?.value;
  const btn = document.getElementById("loginSubmit");
  btn.disabled = true;
  try {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(data.token, data.user);
    showApp(data.user);
    await preencherSelectsCatalogo();
    await carregarMovimentosMes();
  } catch (err) {
    showAuthAlert(err.message || "Falha no login.", true);
  } finally {
    btn.disabled = false;
  }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthAlert();
  const name = document.getElementById("regName")?.value?.trim();
  const email = document.getElementById("regEmail")?.value?.trim();
  const password = document.getElementById("regPassword")?.value;
  const req = avaliarSenha(password);
  if (!Object.values(req).every(Boolean)) {
    showAuthAlert("A senha não atende aos requisitos de segurança.", true);
    return;
  }
  const btn = document.getElementById("registerSubmit");
  btn.disabled = true;
  try {
    const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
    setSession(data.token, data.user);
    showApp(data.user);
    await preencherSelectsCatalogo();
    await carregarMovimentosMes();
  } catch (err) {
    showAuthAlert(err.message || "Não foi possível cadastrar.", true);
  } finally {
    btn.disabled = false;
  }
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  destroyCharts();
  showAuth();
  setAuthView("login");
});

formLancamento?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipoMov = document.querySelector('input[name="lTipo"]:checked')?.value;
  if (!tipoMov) {
    showMainAlert("Selecione se o lançamento é receita ou despesa.", true);
    return;
  }
  const data = document.getElementById("lData")?.value;
  const valor = document.getElementById("lValor")?.value;
  const descricao = document.getElementById("lDesc")?.value?.trim() || "";
  const cat = document.getElementById("lCat")?.value;
  const conta = document.getElementById("lConta")?.value;
  const btn = document.getElementById("lSubmit");
  btn.disabled = true;
  try {
    if (tipoMov === "despesa") {
      await api("/api/despesas", { method: "POST", body: JSON.stringify({ data, valor: Number(valor), descricao, tipo: cat, conta }) });
      showMainAlert("Despesa salva.", false);
    } else {
      await api("/api/receitas", { method: "POST", body: JSON.stringify({ data, valor: Number(valor), descricao, categoria: cat, conta }) });
      showMainAlert("Receita salva.", false);
    }
    formLancamento.reset();
    const ld = document.getElementById("lData");
    if (ld) ld.value = new Date().toISOString().slice(0, 10);
    syncContaLabelLancamento();
    await carregarMovimentosMes();
    await preencherSelectsCatalogo();
    carregarDashboard();
  } catch (err) {
    showMainAlert(err.message || "Erro ao salvar.", true);
  } finally {
    btn.disabled = false;
  }
});

formNovaConta?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("novaContaNome")?.value?.trim();
  if (!nome) return;
  const cor = document.getElementById("novaContaCor")?.value?.trim() || "#3b82f6";
  try {
    await api("/api/contas", { method: "POST", body: JSON.stringify({ nome, cor }) });
    document.getElementById("novaContaNome").value = "";
    setRainbowWheelColor(formNovaConta?.querySelector("[data-wheel]"), "#3b82f6");
    await carregarOrganizacao();
    await preencherSelectsCatalogo();
    showMainAlert("Conta adicionada.", false);
  } catch (err) {
    showMainAlert(err.message, true);
  }
});

formNovaCategoria?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("novaCatNome")?.value?.trim();
  if (!nome) return;
  const cor = document.getElementById("novaCatCor")?.value?.trim() || "#a855f7";
  try {
    await api("/api/categorias", { method: "POST", body: JSON.stringify({ nome, cor }) });
    document.getElementById("novaCatNome").value = "";
    setRainbowWheelColor(formNovaCategoria?.querySelector("[data-wheel]"), "#a855f7");
    await carregarOrganizacao();
    await preencherSelectsCatalogo();
    showMainAlert("Categoria adicionada.", false);
  } catch (err) {
    showMainAlert(err.message, true);
  }
});

document.querySelectorAll('input[name="lTipo"]').forEach((inp) => {
  inp.addEventListener("change", syncContaLabelLancamento);
});

// ─── Validação de senha forte ────────────────────────────────────────────────────

function avaliarSenha(password) {
  return {
    tamanho: password.length >= 8,
    maiuscula: /[A-Z]/.test(password),
    minuscula: /[a-z]/.test(password),
    numero: /[0-9]/.test(password),
    especial: /[^A-Za-z0-9]/.test(password),
  };
}

function atualizarIndicadorSenha(password) {
  const req = avaliarSenha(password);
  const pontos = Object.values(req).filter(Boolean).length;

  const senhaForca = document.getElementById("senhaForca");
  if (senhaForca) senhaForca.classList.toggle("hidden", password.length === 0);

  const cores = ["", "bg-rose-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500", "bg-emerald-500"];
  const labels = ["", "Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  const labelCores = ["", "text-rose-500", "text-orange-400", "text-yellow-500", "text-emerald-500", "text-emerald-600"];

  const bars = ["sfBar1", "sfBar2", "sfBar3", "sfBar4"];
  bars.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `h-1.5 flex-1 rounded-full transition-colors ${i < pontos ? cores[pontos] : "bg-slate-200 dark:bg-slate-700"}`;
  });

  const sfLabel = document.getElementById("sfLabel");
  if (sfLabel) {
    sfLabel.textContent = password.length > 0 ? labels[pontos] : "";
    sfLabel.className = `text-xs font-medium ${labelCores[pontos]}`;
  }

  const map = { sfReq8: "tamanho", sfReqMai: "maiuscula", sfReqMin: "minuscula", sfReqNum: "numero", sfReqEsp: "especial" };
  for (const [id, key] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const ok = req[key];
    el.classList.toggle("text-emerald-600", ok);
    el.classList.toggle("dark:text-emerald-400", ok);
    el.classList.toggle("text-slate-500", !ok);
    el.classList.toggle("dark:text-slate-400", !ok);
    el.querySelector(".sf-dot").textContent = ok ? "✓" : "·";
  }
}

document.getElementById("regPassword")?.addEventListener("input", (e) => {
  atualizarIndicadorSenha(e.target.value);
});

// ─── Inicialização ───────────────────────────────────────────────────────────────

const savedTheme = localStorage.getItem("finance-theme");
setTheme(
  savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
);

setAuthView("login");
if (window.innerWidth < 1024) sidebar?.classList.add("-translate-x-full");

const elLData = document.getElementById("lData");
if (elLData) elLData.value = new Date().toISOString().slice(0, 10);

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
    if (filtroMes && !filtroMes.value) filtroMes.value = mesAtualString();
    syncMesStrip();
    await preencherSelectsCatalogo();
    await carregarMovimentosMes();
  } catch {
    clearSession();
  }
  updateThemeUi();
})();
