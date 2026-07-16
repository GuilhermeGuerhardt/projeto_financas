export const TOKEN_KEY = "finance-token";
export const USER_KEY = "finance-user";
export const THEME_KEY = "finance-theme";

/**
 * Descobre a base da API. Em produção o front é servido pelo próprio Express,
 * então a base é relativa (""). Os outros casos cobrem abrir o index.html
 * direto do disco ou rodar o front numa porta diferente (ex.: Live Server).
 */
function resolveApiBase() {
  if (typeof window.__FINANCE_API__ === "string" && window.__FINANCE_API__.trim()) {
    return window.__FINANCE_API__.trim().replace(/\/$/, "");
  }
  if (window.location.protocol === "file:") {
    return "http://localhost:3000";
  }
  const { hostname, port } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal && port && port !== "3000") {
    return `${window.location.protocol}//${hostname}:3000`;
  }
  return "";
}

export const API_BASE = resolveApiBase();
