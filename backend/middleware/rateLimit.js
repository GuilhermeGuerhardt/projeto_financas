const WINDOW_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS = 20;
const LIMPEZA_MS = 30 * 60 * 1000;

const tentativas = new Map();

/**
 * Rate limit em memória para as rotas de autenticação.
 * Por ser em memória, o limite é por instância — se o serviço escalar para
 * mais de um processo, cada um terá sua própria contagem.
 */
export function authLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = tentativas.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }
  entry.count += 1;
  tentativas.set(ip, entry);
  if (entry.count > MAX_TENTATIVAS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ erro: "Muitas tentativas. Tente novamente em 15 minutos." });
  }
  next();
}

// Descarta entradas expiradas para o Map não crescer indefinidamente.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of tentativas) {
    if (now > entry.resetAt) tentativas.delete(ip);
  }
}, LIMPEZA_MS).unref();
