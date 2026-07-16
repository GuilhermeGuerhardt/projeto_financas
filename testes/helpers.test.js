import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agruparPorCampo,
  arredondarValor,
  normalizeCor,
  parseDataStr,
  parseMes,
  somarValores,
  validarSenhaForte,
} from "../backend/helpers.js";

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

// ─── arredondarValor ─────────────────────────────────────────────────────────────

test("arredondarValor: arredonda para 2 casas decimais", () => {
  assert.equal(arredondarValor(10.456), 10.46);
  assert.equal(arredondarValor(0.1 + 0.2), 0.3);
});

// ─── somarValores ────────────────────────────────────────────────────────────────

test("somarValores: soma o campo valor e arredonda", () => {
  assert.equal(somarValores([{ valor: 10.5 }, { valor: 4.25 }]), 14.75);
});

test("somarValores: aceita valores em string (NUMERIC do Postgres)", () => {
  assert.equal(somarValores([{ valor: "10.50" }, { valor: "4.25" }]), 14.75);
});

test("somarValores: lista vazia soma zero", () => {
  assert.equal(somarValores([]), 0);
});

// ─── agruparPorCampo ─────────────────────────────────────────────────────────────

test("agruparPorCampo: soma valores agrupando pelo campo indicado", () => {
  const despesas = [
    { tipo: "Mercado", valor: 100 },
    { tipo: "Mercado", valor: 50.5 },
    { tipo: "Transporte", valor: 30 },
  ];
  assert.deepEqual(agruparPorCampo(despesas, "tipo"), { Mercado: 150.5, Transporte: 30 });
});

test("agruparPorCampo: funciona com o campo categoria das receitas", () => {
  const receitas = [
    { categoria: "Salário", valor: 5000 },
    { categoria: "Freelance", valor: 750.25 },
  ];
  assert.deepEqual(agruparPorCampo(receitas, "categoria"), { "Salário": 5000, Freelance: 750.25 });
});

test("agruparPorCampo: lista vazia devolve objeto vazio", () => {
  assert.deepEqual(agruparPorCampo([], "tipo"), {});
});
