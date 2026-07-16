import { api } from "./api.js";
import { showMainAlert } from "./alerts.js";
import { isDarkMode } from "./theme.js";
import { formatMoney } from "./utils.js";

const PALETA = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#059669", "#0891b2", "#4f46e5"];

const dashAno = document.getElementById("dashAno");
const dashTotalGasto = document.getElementById("dashTotalGasto");
const dashTotalReceita = document.getElementById("dashTotalReceita");
const dashSaldo = document.getElementById("dashSaldo");

let chartCategoriasInst = null;
let chartLinhaInst = null;

const corTexto = () => (isDarkMode() ? "#e2e8f0" : "#475569");
const corGrade = () => (isDarkMode() ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.35)");

export function temGraficosRenderizados() {
  return Boolean(chartCategoriasInst || chartLinhaInst);
}

export function destroyCharts() {
  chartCategoriasInst?.destroy();
  chartLinhaInst?.destroy();
  chartCategoriasInst = null;
  chartLinhaInst = null;
}

function renderKpis(data) {
  if (dashTotalGasto) dashTotalGasto.textContent = formatMoney(data.totalGasto);
  if (dashTotalReceita) dashTotalReceita.textContent = formatMoney(data.totalReceita);
  if (!dashSaldo) return;
  const positivo = data.saldo >= 0;
  dashSaldo.textContent = formatMoney(data.saldo);
  dashSaldo.classList.toggle("text-emerald-600", positivo);
  dashSaldo.classList.toggle("text-rose-600", !positivo);
  dashSaldo.classList.toggle("dark:text-emerald-400", positivo);
  dashSaldo.classList.toggle("dark:text-rose-400", !positivo);
}

function renderChartCategorias(data) {
  const ctx = document.getElementById("chartCategorias");
  if (!ctx) return;

  const entries = Object.entries(data.gastosPorCategoria || {});
  if (entries.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  chartCategoriasInst = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => PALETA[i % PALETA.length]),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: corTexto(), padding: 12, font: { size: 11 } } },
      },
    },
  });
}

function renderChartLinha(data) {
  const ctx = document.getElementById("chartLinha");
  if (!ctx) return;

  const labels = (data.gastosPorMes || []).map((x) => {
    const [y, m] = x.mes.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
  });

  chartLinhaInst = new Chart(ctx, {
    type: "line",
    data: {
      labels,
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
        x: { grid: { color: corGrade() }, ticks: { color: corTexto(), font: { size: 11 } } },
        y: {
          grid: { color: corGrade() },
          ticks: {
            color: corTexto(),
            callback: (v) => new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(v),
          },
        },
      },
      plugins: { legend: { labels: { color: corTexto(), padding: 16 } } },
    },
  });
}

export async function carregarDashboard() {
  if (typeof Chart === "undefined") return;

  const ano = Number(dashAno?.value) || new Date().getFullYear();
  let data;
  try {
    data = await api(`/api/dashboard/resumo?ano=${ano}`);
  } catch (e) {
    if (e.status !== 401) showMainAlert(e.message || "Erro ao carregar gráficos.", true);
    return;
  }

  renderKpis(data);
  destroyCharts();
  renderChartCategorias(data);
  renderChartLinha(data);
}

export function aoMudarAnoDashboard(handler) {
  dashAno?.addEventListener("change", handler);
}
