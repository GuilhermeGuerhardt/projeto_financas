import { api } from "./api.js";
import { showMainAlert } from "./alerts.js";
import { buscarCatalogo, preencherSelectsCatalogo } from "./catalogo.js";
import { setRainbowWheelColor } from "./corWheel.js";
import { esc, refreshIcons } from "./utils.js";

const COR_FALLBACK = "#94a3b8";

const listaContas = document.getElementById("listaContas");
const listaCategorias = document.getElementById("listaCategorias");
const formNovaConta = document.getElementById("formNovaConta");
const formNovaCategoria = document.getElementById("formNovaCategoria");

const CONFIG_CONTA = {
  lista: listaContas,
  endpoint: "/api/contas",
  form: formNovaConta,
  inputNome: "novaContaNome",
  inputCor: "novaContaCor",
  corPadrao: "#3b82f6",
  confirmacao: "Remover esta conta?",
  promptRenomear: "Novo nome para a conta:",
  sucessoRemocao: "Conta removida.",
  sucessoRenomeacao: "Conta renomeada.",
  sucessoCriacao: "Conta adicionada.",
};

const CONFIG_CATEGORIA = {
  lista: listaCategorias,
  endpoint: "/api/categorias",
  form: formNovaCategoria,
  inputNome: "novaCatNome",
  inputCor: "novaCatCor",
  corPadrao: "#a855f7",
  confirmacao: "Remover esta categoria?",
  promptRenomear: "Novo nome para a categoria:",
  sucessoRemocao: "Categoria removida.",
  sucessoRenomeacao: "Categoria renomeada.",
  sucessoCriacao: "Categoria adicionada.",
};

async function recarregar() {
  await carregarOrganizacao();
  await preencherSelectsCatalogo();
}

function itemLista(item, cfg) {
  const li = document.createElement("li");
  li.className = "flex items-center justify-between gap-2 py-3 text-sm";
  const corSegura = /^#[0-9a-fA-F]{3,6}$/.test(item.cor) ? item.cor : COR_FALLBACK;

  li.innerHTML = `
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <span class="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-slate-300 dark:ring-slate-600" style="background-color:${corSegura}"></span>
      <span class="truncate font-medium text-slate-800 dark:text-slate-200">${esc(item.nome)}</span>
    </div>
    <div class="flex shrink-0 gap-1">
      <button type="button" data-acao="renomear" class="rounded-lg px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30">Renomear</button>
      <button type="button" data-acao="remover" class="rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30">Remover</button>
    </div>`;

  li.querySelector('[data-acao="remover"]').addEventListener("click", async () => {
    if (!confirm(cfg.confirmacao)) return;
    try {
      await api(`${cfg.endpoint}/${item.id}`, { method: "DELETE" });
      await recarregar();
      showMainAlert(cfg.sucessoRemocao, false);
    } catch (err) {
      showMainAlert(err.message, true);
    }
  });

  li.querySelector('[data-acao="renomear"]').addEventListener("click", async () => {
    const novoNome = prompt(cfg.promptRenomear, item.nome);
    if (!novoNome || novoNome.trim() === item.nome) return;
    try {
      await api(`${cfg.endpoint}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ nome: novoNome.trim(), cor: item.cor }),
      });
      await recarregar();
      showMainAlert(cfg.sucessoRenomeacao, false);
    } catch (err) {
      showMainAlert(err.message, true);
    }
  });

  return li;
}

function renderLista(itens, cfg) {
  if (!cfg.lista) return;
  cfg.lista.innerHTML = "";
  for (const item of itens) cfg.lista.appendChild(itemLista(item, cfg));
}

export async function carregarOrganizacao() {
  let catalogo;
  try {
    catalogo = await buscarCatalogo();
  } catch (e) {
    showMainAlert(e.message || "Erro ao carregar listas.", true);
    return;
  }
  renderLista(catalogo.contas, CONFIG_CONTA);
  renderLista(catalogo.categorias, CONFIG_CATEGORIA);
  refreshIcons();
}

function bindFormCriacao(cfg) {
  cfg.form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputNome = document.getElementById(cfg.inputNome);
    const nome = inputNome?.value?.trim();
    if (!nome) return;
    const cor = document.getElementById(cfg.inputCor)?.value?.trim() || cfg.corPadrao;
    try {
      await api(cfg.endpoint, { method: "POST", body: JSON.stringify({ nome, cor }) });
      if (inputNome) inputNome.value = "";
      setRainbowWheelColor(cfg.form.querySelector("[data-wheel]"), cfg.corPadrao);
      await recarregar();
      showMainAlert(cfg.sucessoCriacao, false);
    } catch (err) {
      showMainAlert(err.message, true);
    }
  });
}

export function bindFormsOrganizacao() {
  bindFormCriacao(CONFIG_CONTA);
  bindFormCriacao(CONFIG_CATEGORIA);
}
