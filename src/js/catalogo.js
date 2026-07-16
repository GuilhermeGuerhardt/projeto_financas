import { api } from "./api.js";

/** Busca contas e categorias do usuário em paralelo. */
export async function buscarCatalogo() {
  const [contas, categorias] = await Promise.all([api("/api/contas"), api("/api/categorias")]);
  return { contas, categorias };
}

/** Preenche um <select> com os nomes dos itens, preservando a seleção atual. */
export function preencherSelect(sel, itens, { manterSelecao = false } = {}) {
  if (!sel) return;
  const anterior = manterSelecao ? sel.value : null;
  sel.innerHTML = '<option value="">Selecione…</option>';
  for (const item of itens) {
    const opt = document.createElement("option");
    opt.value = item.nome;
    opt.textContent = item.nome;
    sel.appendChild(opt);
  }
  if (anterior && [...sel.options].some((o) => o.value === anterior)) sel.value = anterior;
}

/** Recarrega os selects do formulário de novo lançamento. */
export async function preencherSelectsCatalogo() {
  let catalogo;
  try {
    catalogo = await buscarCatalogo();
  } catch (e) {
    if (e.status !== 401) console.error(e);
    return;
  }
  preencherSelect(document.getElementById("lCat"), catalogo.categorias, { manterSelecao: true });
  preencherSelect(document.getElementById("lConta"), catalogo.contas, { manterSelecao: true });
}
