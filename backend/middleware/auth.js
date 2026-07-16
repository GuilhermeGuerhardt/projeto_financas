import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function assinarToken({ id, email }) {
  return jwt.sign({ sub: id, email }, config.jwtSecret, { expiresIn: config.tokenExpiration });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: "Não autenticado." });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ erro: "Sessão inválida ou expirada." });
  }
}
