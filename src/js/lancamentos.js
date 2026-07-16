import { api } from "./api.js";
import { showAuthAlert, showMainAlert } from "./alerts.js";
import { EVENTOS, emitir } from "./eventos.js";
import { mesSelecionado } from "./mes.js";
import { esc, formatMoney, labelMes, refreshIcons } from "./utils.js";

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

const CONFIG_DESPESA = {
  tbody: tabelaDespesas,
  vazio: listaVaziaDesp,
  tipo: "despesa",
  campoCategoria: "tipo",
  endpoint: "/api/despesas",
  classesBadge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  classesValor: "text-slate-900 dark:text-white",
  confirmacao: "Excluir esta despesa?",
  sucessoExclusao: "Despesa excluída.",
};

const CONFIG_RECEITA = {
  tbody: tabelaReceitas,
  vazio: listaVaziaRec,
  tipo: "receita",
  campoCategoria: "categoria",
  endpoint: "/api/receitas",
  classesBadge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  classesValor: "text-emerald-700 dark:text-emerald-400",
  confirmacao: "Excluir esta receita?",
  sucessoExclusao: "Receita excluída.",
};

function linhaLancamento(item, cfg) {
  const tr = document.createElement("tr");
  tr.className = "hover:bg-slate-50/80 dark:hover:bg-slate-800/40";
  tr.innerHTML = `
    <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-700 dark:text-slate-200">${esc(item.data)}</td>
    <td class="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">${esc(item.descricao) || "—"}</td>
    <td class="px-4 py-3"><span class="rounded-lg px-2 py-1 text-xs font-medium ${cfg.classesBadge}">${esc(item[cfg.campoCategoria])}</span></td>
    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">${esc(item.conta)}</td>
    <td class="whitespace-nowrap px-4 py-3 text-right font-semibold ${cfg.classesValor}">${formatMoney(item.valor)}</td>
    <td class="px-2 py-3 flex gap-1">
      <button type="button" data-acao="editar" class="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/30" title="Editar">
        <i data-lucide="pencil" class="h-4 w-4"></i>
      </button>
      <button type="button" data-acao="excluir" class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" title="Excluir">
        <i data-lucide="trash-2" class="h-4 w-4"></i>
      </button>
    </td>`;

  tr.querySelector('[data-acao="editar"]').addEventListener("click", () => {
    emitir(EVENTOS.EDITAR_LANCAMENTO, { id: item.id, tipo: cfg.tipo, dados: item });
  });

  tr.querySelector('[data-acao="excluir"]').addEventListener("click", async () => {
    if (!confirm(cfg.confirmacao)) return;
    try {
      await api(`${cfg.endpoint}/${item.id}`, { method: "DELETE" });
      showMainAlert(cfg.sucessoExclusao, false);
      emitir(EVENTOS.DADOS_ALTERADOS);
    } catch (err) {
      showMainAlert(err.message, true);
    }
  });

  return tr;
}

function renderTabela(itens, cfg) {
  if (!cfg.tbody) return;
  cfg.tbody.innerHTML = "";
  cfg.vazio?.classList.toggle("hidden", itens.length > 0);
  for (const item of itens) {
    cfg.tbody.appendChild(linhaLancamento(item, cfg));
  }
}

function renderRelatorioPorTipo(resumo) {
  if (!relPorTipo) return;
  relPorTipo.innerHTML = "";
  const entries = Object.entries(resumo.porTipo || {}).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    relPorTipo.innerHTML = `<li class="text-slate-500 dark:text-slate-400">Sem despesas neste mês.</li>`;
    return;
  }

  const total = resumo.total || 1;
  for (const [tipo, valor] of entries) {
    const pct = Math.round((valor / total) * 100);
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium text-slate-800 dark:text-slate-200">${esc(tipo)}</span>
        <span class="font-semibold text-brand-600 dark:text-brand-400">${formatMoney(valor)}</span>
      </div>
      <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div class="h-full rounded-full bg-brand-500 transition-all" style="width:${pct}%"></div>
      </div>`;
    relPorTipo.appendChild(li);
  }
}

export async function carregarMovimentosMes() {
  const mes = mesSelecionado();
  const rotulo = labelMes(mes);
  if (listaMesLabel) listaMesLabel.textContent = rotulo;
  if (relMesTitulo) relMesTitulo.textContent = rotulo;
  if (relMesTituloRec) relMesTituloRec.textContent = rotulo;

  let despData, recData;
  try {
    [despData, recData] = await Promise.all([
      api(`/api/despesas?mes=${encodeURIComponent(mes)}`),
      api(`/api/receitas?mes=${encodeURIComponent(mes)}`),
    ]);
  } catch (e) {
    if (e.status === 401) {
      emitir(EVENTOS.SESSAO_EXPIRADA);
      showAuthAlert("Sessão expirada. Entre novamente.", true);
      return;
    }
    showMainAlert(e.message || "Erro ao carregar dados.", true);
    return;
  }

  const { despesas = [], resumo: resDesp = {} } = despData;
  const { receitas = [], resumo: resRec = {} } = recData;

  renderTabela(despesas, CONFIG_DESPESA);
  renderTabela(receitas, CONFIG_RECEITA);

  if (relTotal) relTotal.textContent = formatMoney(resDesp.total || 0);
  if (relTotalReceita) relTotalReceita.textContent = formatMoney(resRec.total || 0);
  renderRelatorioPorTipo(resDesp);
  refreshIcons();
}
