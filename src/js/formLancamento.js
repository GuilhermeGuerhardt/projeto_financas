import { api } from "./api.js";
import { showMainAlert } from "./alerts.js";
import { EVENTOS, emitir } from "./eventos.js";
import { dataHojeString } from "./utils.js";

const form = document.getElementById("formLancamento");
const btnSubmit = document.getElementById("lSubmit");
const inputData = document.getElementById("lData");

function tipoSelecionado() {
  return document.querySelector('input[name="lTipo"]:checked')?.value;
}

/** O rótulo da conta muda conforme o dinheiro entra ou sai. */
export function syncContaLabelLancamento() {
  const el = document.getElementById("lContaLabel");
  if (!el) return;
  const tipo = tipoSelecionado();
  if (tipo === "receita") el.textContent = "Conta creditada";
  else if (tipo === "despesa") el.textContent = "Conta debitada";
  else el.textContent = "Conta";
}

export function preencherDataHoje() {
  if (inputData) inputData.value = dataHojeString();
}

export function bindFormLancamento() {
  document.querySelectorAll('input[name="lTipo"]').forEach((inp) => {
    inp.addEventListener("change", syncContaLabelLancamento);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipoMov = tipoSelecionado();
    if (!tipoMov) {
      showMainAlert("Selecione se o lançamento é receita ou despesa.", true);
      return;
    }

    const ehDespesa = tipoMov === "despesa";
    const endpoint = ehDespesa ? "/api/despesas" : "/api/receitas";
    const campoCategoria = ehDespesa ? "tipo" : "categoria";
    const corpo = {
      data: document.getElementById("lData")?.value,
      valor: Number(document.getElementById("lValor")?.value),
      descricao: document.getElementById("lDesc")?.value?.trim() || "",
      [campoCategoria]: document.getElementById("lCat")?.value,
      conta: document.getElementById("lConta")?.value,
    };

    if (btnSubmit) btnSubmit.disabled = true;
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify(corpo) });
      showMainAlert(ehDespesa ? "Despesa salva." : "Receita salva.", false);
      form.reset();
      preencherDataHoje();
      syncContaLabelLancamento();
      emitir(EVENTOS.DADOS_ALTERADOS);
    } catch (err) {
      showMainAlert(err.message || "Erro ao salvar.", true);
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  });
}
