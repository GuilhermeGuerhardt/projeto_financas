import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Funções copiadas do server.js para teste isolado ───────────────────────────

function normalizeCor(cor, fallback = "#6366f1") {
  if (!cor || typeof cor !== "string") return fallback;
  const c = cor.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(c)) {
    const [, r, g, b] = c;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function parseMes(mes) {
  if (!mes || typeof mes !== "string" || !/^\d{4}-\d{2}$/.test(mes)) return null;
  const m = Number(mes.split("-")[1]);
  return m >= 1 && m <= 12 ? mes : null;
}

function parseDataStr(data) {
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.trim())) return data.trim();
  const dt = new Date(data);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function validarSenhaForte(password) {
  if (typeof password !== "string" || password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "A senha deve conter ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(password)) return "A senha deve conter ao menos uma letra minúscula.";
  if (!/[0-9]/.test(password)) return "A senha deve conter ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "A senha deve conter ao menos um caractere especial (!@#$%...).";
  return null;
}

// ─── normalizeCor ────────────────────────────────────────────────────────────────

test("normalizeCor: aceita hex de 6 dígitos", () => {
  assert.equal(normalizeCor("#FF5733"), "#ff5733");
});

test("normalizeCor: expande hex de 3 dígitos", () => {
  assert.equal(normalizeCor("#F53"), "#ff5533");
});

test("normalizeCor: retorna fallback para valor inválido", () => {
  assert.equal(normalizeCor("vermelho"), "#6366f1");
  assert.equal(normalizeCor(null), "#6366f1");
  assert.equal(normalizeCor(""), "#6366f1");
});

test("normalizeCor: usa fallback personalizado", () => {
  assert.equal(normalizeCor(null, "#a855f7"), "#a855f7");
});

// ─── parseMes ────────────────────────────────────────────────────────────────────

test("parseMes: aceita formato YYYY-MM válido", () => {
  assert.equal(parseMes("2025-06"), "2025-06");
  assert.equal(parseMes("2024-12"), "2024-12");
});

test("parseMes: rejeita mês 0 ou 13", () => {
  assert.equal(parseMes("2025-00"), null);
  assert.equal(parseMes("2025-13"), null);
});

test("parseMes: rejeita formatos inválidos", () => {
  assert.equal(parseMes("06-2025"), null);
  assert.equal(parseMes("2025/06"), null);
  assert.equal(parseMes(null), null);
  assert.equal(parseMes(""), null);
});

// ─── parseDataStr ────────────────────────────────────────────────────────────────

test("parseDataStr: aceita formato YYYY-MM-DD", () => {
  assert.equal(parseDataStr("2025-06-15"), "2025-06-15");
});

test("parseDataStr: rejeita data inválida", () => {
  assert.equal(parseDataStr("nao-e-uma-data"), null);
  assert.equal(parseDataStr(""), null);
});

// ─── validarSenhaForte ───────────────────────────────────────────────────────────

test("validarSenhaForte: aceita senha válida", () => {
  assert.equal(validarSenhaForte("Senha@123"), null);
  assert.equal(validarSenhaForte("Abc!defg9"), null);
});

test("validarSenhaForte: rejeita senha curta", () => {
  assert.ok(validarSenhaForte("Ab1!").includes("8 caracteres"));
});

test("validarSenhaForte: rejeita sem maiúscula", () => {
  assert.ok(validarSenhaForte("abc!defg9").includes("maiúscula"));
});

test("validarSenhaForte: rejeita sem minúscula", () => {
  assert.ok(validarSenhaForte("ABC!DEFG9").includes("minúscula"));
});

test("validarSenhaForte: rejeita sem número", () => {
  assert.ok(validarSenhaForte("Abc!defgh").includes("número"));
});

test("validarSenhaForte: rejeita sem caractere especial", () => {
  assert.ok(validarSenhaForte("Abc1defgh").includes("especial"));
});
