import { api } from "./api.js";
import { showMainAlert } from "./alerts.js";
import { buscarCatalogo, preencherSelect } from "./catalogo.js";
import { EVENTOS, emitir } from "./eventos.js";
import { refreshIcons } from "./utils.js";

const modal = document.getElementById("editModal");
const modalTitle = document.getElementById("editModalTitle");
const catLabel = document.getElementById("eLCatLabel");
const form = document.getElementById("editForm");
const inputData = document.getElementById("eLData");
const inputValor = document.getElementById("eLValor");
const inputDesc = document.getElementById("eLDesc");
const selCat = document.getElementById("eLCat");
const selConta = document.getElementById("eLConta");
const btnSubmit = document.getElementById("eLSubmit");

let editingId = null;
let editingTipo = null;

export async function iniciarEdicao({ id, tipo, dados }) {
  editingId = id;
  editingTipo = tipo;

  if (modalTitle) modalTitle.textContent = tipo === "despesa" ? "Editar despesa" : "Editar receita";
  if (catLabel) catLabel.textContent = "Categoria";
  if (inputData) inputData.value = dados.data;
  if (inputValor) inputValor.value = dados.valor;
  if (inputDesc) inputDesc.value = dados.descricao || "";

  let catalogo = { contas: [], categorias: [] };
  try {
    catalogo = await buscarCatalogo();
  } catch {
    // Sem catálogo os selects ficam vazios, mas o modal ainda abre e o usuário
    // vê o erro ao tentar salvar.
  }

  preencherSelect(selCat, catalogo.categorias);
  preencherSelect(selConta, catalogo.contas);
  if (selCat) selCat.value = tipo === "despesa" ? dados.tipo : dados.categoria;
  if (selConta) selConta.value = dados.conta;

  modal?.classList.remove("hidden");
  modal?.classList.add("flex");
  refreshIcons();
}

export function fecharEditModal() {
  editingId = null;
  editingTipo = null;
  modal?.classList.replace("flex", "hidden");
}

export function bindEdicaoModal() {
  document.getElementById("editModalClose")?.addEventListener("click", fecharEditModal);
  document.getElementById("editModalBackdrop")?.addEventListener("click", fecharEditModal);

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnSubmit) btnSubmit.disabled = true;

    const ehDespesa = editingTipo === "despesa";
    const endpoint = ehDespesa ? "/api/despesas" : "/api/receitas";
    const campoCategoria = ehDespesa ? "tipo" : "categoria";
    const corpo = {
      data: inputData?.value,
      valor: Number(inputValor?.value),
      descricao: inputDesc?.value?.trim() || "",
      [campoCategoria]: selCat?.value,
      conta: selConta?.value,
    };

    try {
      await api(`${endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(corpo) });
      showMainAlert(ehDespesa ? "Despesa atualizada." : "Receita atualizada.", false);
      fecharEditModal();
      emitir(EVENTOS.DADOS_ALTERADOS);
    } catch (err) {
      showMainAlert(err.message || "Erro ao salvar.", true);
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  });
}
