/**
 * Barramento de eventos entre os módulos do front.
 *
 * Existe para quebrar dependência circular: a tabela de lançamentos precisa
 * abrir o modal de edição, e o modal precisa mandar a tabela recarregar. Em vez
 * de um importar o outro nos dois sentidos, os dois falam com este barramento e
 * o main.js liga as pontas.
 */
const bus = new EventTarget();

export const EVENTOS = {
  DADOS_ALTERADOS: "dados-alterados",
  EDITAR_LANCAMENTO: "editar-lancamento",
  SESSAO_EXPIRADA: "sessao-expirada",
};

export function emitir(nome, detalhe) {
  bus.dispatchEvent(new CustomEvent(nome, { detail: detalhe }));
}

export function ao(nome, handler) {
  bus.addEventListener(nome, (e) => handler(e.detail));
}
