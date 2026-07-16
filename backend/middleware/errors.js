/**
 * O Express 4 não captura rejeições de handlers async — sem este wrapper,
 * um `throw` dentro de uma rota async deixa a requisição pendurada até o
 * timeout do cliente, em vez de responder 500.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Erro com status HTTP definido pela aplicação (em vez de 500 genérico). */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFoundApi(req, res, next) {
  if (req.path.startsWith("/api")) return res.status(404).json({ erro: "Rota não encontrada." });
  next();
}

// eslint-disable-next-line no-unused-vars -- o Express identifica o error handler pela aridade de 4
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(`${req.method} ${req.path}`, err);
  res.status(status).json({
    erro: status >= 500 ? "Erro interno no servidor." : err.message,
  });
}
