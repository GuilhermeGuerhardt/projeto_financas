/**
 * Modelo de despesa alinhado à API (uso opcional no Node).
 * Campos: data, valor, descricao (opcional), tipo, conta.
 */
export function criarDespesaPayload({ data, valor, descricao, tipo, conta }) {
  return {
    data,
    valor: Number(valor),
    descricao: descricao != null ? String(descricao).trim() : "",
    tipo: String(tipo).trim(),
    conta: String(conta).trim(),
  };
}
