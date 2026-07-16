/**
 * Funções puras de validação e normalização.
 * Sem dependência de banco ou de Express — por isso são testáveis isoladamente
 * (ver testes/helpers.test.js).
 */

export function normalizeCor(cor, fallback = "#6366f1") {
  if (!cor || typeof cor !== "string") return fallback;
  const c = cor.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(c)) {
    const [, r, g, b] = c;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function parseMes(mes) {
  if (!mes || typeof mes !== "string" || !/^\d{4}-\d{2}$/.test(mes)) return null;
  const m = Number(mes.split("-")[1]);
  return m >= 1 && m <= 12 ? mes : null;
}

export function parseDataStr(data) {
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.trim())) return data.trim();
  const dt = new Date(data);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function validarSenhaForte(password) {
  if (typeof password !== "string" || password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "A senha deve conter ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(password)) return "A senha deve conter ao menos uma letra minúscula.";
  if (!/[0-9]/.test(password)) return "A senha deve conter ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "A senha deve conter ao menos um caractere especial (!@#$%...).";
  return null;
}

export function arredondarValor(n) {
  return Math.round(n * 100) / 100;
}

export function somarValores(itens) {
  return arredondarValor(itens.reduce((s, i) => s + Number(i.valor), 0));
}

export function agruparPorCampo(itens, campo) {
  const acc = {};
  for (const item of itens) {
    acc[item[campo]] = arredondarValor((acc[item[campo]] || 0) + Number(item.valor));
  }
  return acc;
}
