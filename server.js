import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-altere-em-producao";

// ─── Banco de dados ──────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      email        TEXT UNIQUE NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "criadoEm"   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contas (
      id         TEXT PRIMARY KEY,
      "userId"   TEXT NOT NULL REFERENCES users(id),
      nome       TEXT NOT NULL,
      cor        TEXT NOT NULL DEFAULT '#6366f1',
      "criadoEm" TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_userid_nome
      ON contas ("userId", lower(nome));

    CREATE TABLE IF NOT EXISTS categorias (
      id         TEXT PRIMARY KEY,
      "userId"   TEXT NOT NULL REFERENCES users(id),
      nome       TEXT NOT NULL,
      cor        TEXT NOT NULL DEFAULT '#a855f7',
      "criadoEm" TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_userid_nome
      ON categorias ("userId", lower(nome));

    CREATE TABLE IF NOT EXISTS despesas (
      id          TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL REFERENCES users(id),
      data        TEXT NOT NULL,
      valor       NUMERIC(12,2) NOT NULL,
      descricao   TEXT NOT NULL DEFAULT '',
      tipo        TEXT NOT NULL,
      conta       TEXT NOT NULL,
      "criadoEm"  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_despesas_user_data ON despesas("userId", data);

    CREATE TABLE IF NOT EXISTS receitas (
      id          TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL REFERENCES users(id),
      data        TEXT NOT NULL,
      valor       NUMERIC(12,2) NOT NULL,
      descricao   TEXT NOT NULL DEFAULT '',
      categoria   TEXT NOT NULL,
      conta       TEXT NOT NULL,
      "criadoEm"  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_receitas_user_data ON receitas("userId", data);
  `);
  console.log("Banco de dados pronto.");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

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

async function ensureUserCatalog(userId) {
  const temConta = await queryOne(`SELECT 1 FROM contas WHERE "userId" = $1 LIMIT 1`, [userId]);
  if (!temConta) {
    await query(
      `INSERT INTO contas (id, "userId", nome, cor, "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), userId, "Conta principal", "#6366f1", new Date().toISOString()]
    );
  }
  const temCat = await queryOne(`SELECT 1 FROM categorias WHERE "userId" = $1 LIMIT 1`, [userId]);
  if (!temCat) {
    await query(
      `INSERT INTO categorias (id, "userId", nome, cor, "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), userId, "Geral", "#a855f7", new Date().toISOString()]
    );
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────────

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Rate limiting simples em memória (janela deslizante de 15 min, máx 20 req por IP)
const authAttempts = new Map();
function authLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 20;
  const entry = authAttempts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count += 1;
  authAttempts.set(ip, entry);
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ erro: "Muitas tentativas. Tente novamente em 15 minutos." });
  }
  next();
}
// Limpa entradas expiradas a cada 30 minutos para não vazar memória
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authAttempts) {
    if (now > entry.resetAt) authAttempts.delete(ip);
  }
}, 30 * 60 * 1000).unref();

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: "Não autenticado." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ erro: "Sessão inválida ou expirada." });
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────────

app.get("/api/health", (_, res) => res.json({ ok: true, api: "financas", versao: 4 }));

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ erro: "Nome, e-mail e senha são obrigatórios." });

    const senhaErro = validarSenhaForte(password);
    if (senhaErro) return res.status(400).json({ erro: senhaErro });

    const emailNorm = String(email).trim().toLowerCase();
    const existe = await queryOne("SELECT 1 FROM users WHERE email = $1", [emailNorm]);
    if (existe) return res.status(409).json({ erro: "E-mail já cadastrado." });

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO users (id, name, email, "passwordHash", "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [id, String(name).trim(), emailNorm, passwordHash, new Date().toISOString()]
    );
    await ensureUserCatalog(id);

    const token = jwt.sign({ sub: id, email: emailNorm }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id, name: String(name).trim(), email: emailNorm } });
  } catch (e) {
    console.error("register", e);
    res.status(500).json({ erro: "Não foi possível concluir o cadastro." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });

    const emailNorm = String(email).trim().toLowerCase();
    const user = await queryOne("SELECT * FROM users WHERE email = $1", [emailNorm]);
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });

    await ensureUserCatalog(user.id);
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error("login", e);
    res.status(500).json({ erro: "Não foi possível concluir o login." });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await queryOne("SELECT id, name, email FROM users WHERE id = $1", [req.user.id]);
  if (!user) return res.status(401).json({ erro: "Usuário não encontrado." });
  await ensureUserCatalog(user.id);
  res.json(user);
});

app.delete("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await query(`DELETE FROM despesas   WHERE "userId" = $1`, [userId]);
    await query(`DELETE FROM receitas   WHERE "userId" = $1`, [userId]);
    await query(`DELETE FROM contas     WHERE "userId" = $1`, [userId]);
    await query(`DELETE FROM categorias WHERE "userId" = $1`, [userId]);
    await query(`DELETE FROM users      WHERE id = $1`,       [userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error("delete /auth/me", e);
    res.status(500).json({ erro: "Não foi possível excluir a conta." });
  }
});

app.put("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body || {};
    const user = await queryOne("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (!user) return res.status(404).json({ erro: "Usuário não encontrado." });

    const sets = [];
    const vals = [];

    if (name) {
      sets.push(`name = $${sets.length + 1}`);
      vals.push(String(name).trim());
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ erro: "Informe a senha atual." });
      if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
        return res.status(401).json({ erro: "Senha atual incorreta." });
      const senhaErro = validarSenhaForte(newPassword);
      if (senhaErro) return res.status(400).json({ erro: senhaErro });
      sets.push(`"passwordHash" = $${sets.length + 1}`);
      vals.push(await bcrypt.hash(newPassword, 10));
    }

    if (sets.length === 0) return res.status(400).json({ erro: "Nada para atualizar." });

    vals.push(req.user.id);
    await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  } catch (e) {
    console.error("put /auth/me", e);
    res.status(500).json({ erro: "Não foi possível atualizar o perfil." });
  }
});

// ─── Contas ───────────────────────────────────────────────────────────────────────

app.get("/api/contas", authMiddleware, async (req, res) => {
  await ensureUserCatalog(req.user.id);
  const contas = await query(
    `SELECT * FROM contas WHERE "userId" = $1 ORDER BY lower(nome)`, [req.user.id]
  );
  res.json(contas.map((c) => ({ ...c, cor: normalizeCor(c.cor, "#6366f1") })));
});

app.post("/api/contas", authMiddleware, async (req, res) => {
  const nome = String(req.body?.nome || "").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome da conta." });
  const cor = normalizeCor(req.body?.cor, "#6366f1");
  try {
    const id = randomUUID();
    await query(
      `INSERT INTO contas (id, "userId", nome, cor, "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, nome, cor, new Date().toISOString()]
    );
    res.status(201).json({ id, userId: req.user.id, nome, cor });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ erro: "Já existe uma conta com esse nome." });
    throw e;
  }
});

app.put("/api/contas/:id", authMiddleware, async (req, res) => {
  const conta = await queryOne(`SELECT 1 FROM contas WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });
  const nome = String(req.body?.nome || "").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome da conta." });
  const cor = normalizeCor(req.body?.cor, "#6366f1");
  try {
    await query(`UPDATE contas SET nome = $1, cor = $2 WHERE id = $3`, [nome, cor, req.params.id]);
    res.json({ id: req.params.id, nome, cor });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ erro: "Já existe uma conta com esse nome." });
    throw e;
  }
});

app.delete("/api/contas/:id", authMiddleware, async (req, res) => {
  const conta = await queryOne(`SELECT 1 FROM contas WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });
  const { n } = await queryOne(`SELECT COUNT(*) as n FROM contas WHERE "userId" = $1`, [req.user.id]);
  if (Number(n) <= 1) return res.status(400).json({ erro: "Mantenha ao menos uma conta cadastrada." });
  await query("DELETE FROM contas WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── Categorias ───────────────────────────────────────────────────────────────────

app.get("/api/categorias", authMiddleware, async (req, res) => {
  await ensureUserCatalog(req.user.id);
  const cats = await query(
    `SELECT * FROM categorias WHERE "userId" = $1 ORDER BY lower(nome)`, [req.user.id]
  );
  res.json(cats.map((c) => ({ ...c, cor: normalizeCor(c.cor, "#a855f7") })));
});

app.post("/api/categorias", authMiddleware, async (req, res) => {
  const nome = String(req.body?.nome || "").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome da categoria." });
  const cor = normalizeCor(req.body?.cor, "#a855f7");
  try {
    const id = randomUUID();
    await query(
      `INSERT INTO categorias (id, "userId", nome, cor, "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, nome, cor, new Date().toISOString()]
    );
    res.status(201).json({ id, userId: req.user.id, nome, cor });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ erro: "Já existe uma categoria com esse nome." });
    throw e;
  }
});

app.put("/api/categorias/:id", authMiddleware, async (req, res) => {
  const cat = await queryOne(`SELECT 1 FROM categorias WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  if (!cat) return res.status(404).json({ erro: "Categoria não encontrada." });
  const nome = String(req.body?.nome || "").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome da categoria." });
  const cor = normalizeCor(req.body?.cor, "#a855f7");
  try {
    await query(`UPDATE categorias SET nome = $1, cor = $2 WHERE id = $3`, [nome, cor, req.params.id]);
    res.json({ id: req.params.id, nome, cor });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ erro: "Já existe uma categoria com esse nome." });
    throw e;
  }
});

app.delete("/api/categorias/:id", authMiddleware, async (req, res) => {
  const cat = await queryOne(`SELECT 1 FROM categorias WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  if (!cat) return res.status(404).json({ erro: "Categoria não encontrada." });
  const { n } = await queryOne(`SELECT COUNT(*) as n FROM categorias WHERE "userId" = $1`, [req.user.id]);
  if (Number(n) <= 1) return res.status(400).json({ erro: "Mantenha ao menos uma categoria cadastrada." });
  await query("DELETE FROM categorias WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── Despesas ─────────────────────────────────────────────────────────────────────

app.get("/api/despesas", authMiddleware, async (req, res) => {
  const mes = parseMes(req.query.mes);
  if (!mes) return res.status(400).json({ erro: "Informe o parâmetro mes no formato YYYY-MM." });

  const despesas = await query(
    `SELECT * FROM despesas WHERE "userId" = $1 AND substr(data,1,7) = $2 ORDER BY data DESC`,
    [req.user.id, mes]
  );
  const total = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const porTipo = {};
  for (const d of despesas) porTipo[d.tipo] = (porTipo[d.tipo] || 0) + Number(d.valor);
  res.json({ mes, despesas, resumo: { total: Math.round(total * 100) / 100, porTipo } });
});

app.post("/api/despesas", authMiddleware, async (req, res) => {
  const { data, valor, descricao, tipo, conta } = req.body || {};
  if (!data || valor == null || !tipo || !conta)
    return res.status(400).json({ erro: "Campos obrigatórios: data, valor, tipo, conta." });

  const dataStr = parseDataStr(data);
  if (!dataStr) return res.status(400).json({ erro: "Data inválida." });
  const v = Number(valor);
  if (Number.isNaN(v) || v <= 0) return res.status(400).json({ erro: "Valor deve ser maior que zero." });

  const tipoStr = String(tipo).trim();
  const contaStr = String(conta).trim();
  const catValida = await queryOne(`SELECT 1 FROM categorias WHERE "userId" = $1 AND nome = $2`, [req.user.id, tipoStr]);
  if (!catValida) return res.status(400).json({ erro: "Categoria inválida. Cadastre-a em Organização." });
  const contaValida = await queryOne(`SELECT 1 FROM contas WHERE "userId" = $1 AND nome = $2`, [req.user.id, contaStr]);
  if (!contaValida) return res.status(400).json({ erro: "Conta inválida. Cadastre-a em Organização." });

  const id = randomUUID();
  const criadoEm = new Date().toISOString();
  await query(
    `INSERT INTO despesas (id, "userId", data, valor, descricao, tipo, conta, "criadoEm") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.id, dataStr, Math.round(v * 100) / 100, descricao?.trim() || "", tipoStr, contaStr, criadoEm]
  );
  res.status(201).json({ id, userId: req.user.id, data: dataStr, valor: Math.round(v * 100) / 100, descricao: descricao?.trim() || "", tipo: tipoStr, conta: contaStr, criadoEm });
});

app.put("/api/despesas/:id", authMiddleware, async (req, res) => {
  const exists = await queryOne(`SELECT 1 FROM despesas WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  if (!exists) return res.status(404).json({ erro: "Despesa não encontrada." });

  const { data, valor, descricao, tipo, conta } = req.body || {};
  if (!data || valor == null || !tipo || !conta)
    return res.status(400).json({ erro: "Campos obrigatórios: data, valor, tipo, conta." });

  const dataStr = parseDataStr(data);
  if (!dataStr) return res.status(400).json({ erro: "Data inválida." });
  const v = Number(valor);
  if (Number.isNaN(v) || v <= 0) return res.status(400).json({ erro: "Valor deve ser maior que zero." });

  const tipoStr = String(tipo).trim();
  const contaStr = String(conta).trim();
  const catValida = await queryOne(`SELECT 1 FROM categorias WHERE "userId" = $1 AND nome = $2`, [req.user.id, tipoStr]);
  if (!catValida) return res.status(400).json({ erro: "Categoria inválida. Cadastre-a em Organização." });
  const contaValida = await queryOne(`SELECT 1 FROM contas WHERE "userId" = $1 AND nome = $2`, [req.user.id, contaStr]);
  if (!contaValida) return res.status(400).json({ erro: "Conta inválida. Cadastre-a em Organização." });

  await query(
    `UPDATE despesas SET data = $1, valor = $2, descricao = $3, tipo = $4, conta = $5 WHERE id = $6`,
    [dataStr, Math.round(v * 100) / 100, descricao?.trim() || "", tipoStr, contaStr, req.params.id]
  );
  res.json({ ok: true });
});

app.delete("/api/despesas/:id", authMiddleware, async (req, res) => {
  const r = await query(`DELETE FROM despesas WHERE id = $1 AND "userId" = $2 RETURNING id`, [req.params.id, req.user.id]);
  if (!r.length) return res.status(404).json({ erro: "Despesa não encontrada." });
  res.json({ ok: true });
});

// ─── Receitas ─────────────────────────────────────────────────────────────────────

app.get("/api/receitas", authMiddleware, async (req, res) => {
  const mes = parseMes(req.query.mes);
  if (!mes) return res.status(400).json({ erro: "Informe o parâmetro mes no formato YYYY-MM." });

  const receitas = await query(
    `SELECT * FROM receitas WHERE "userId" = $1 AND substr(data,1,7) = $2 ORDER BY data DESC`,
    [req.user.id, mes]
  );
  const total = receitas.reduce((s, r) => s + Number(r.valor), 0);
  const porCategoria = {};
  for (const r of receitas) porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + Number(r.valor);
  res.json({ mes, receitas, resumo: { total: Math.round(total * 100) / 100, porCategoria } });
});

app.post("/api/receitas", authMiddleware, async (req, res) => {
  const { data, valor, descricao, categoria, conta } = req.body || {};
  if (!data || valor == null || !categoria || !conta)
    return res.status(400).json({ erro: "Campos obrigatórios: data, valor, categoria, conta." });

  const dataStr = parseDataStr(data);
  if (!dataStr) return res.status(400).json({ erro: "Data inválida." });
  const v = Number(valor);
  if (Number.isNaN(v) || v <= 0) return res.status(400).json({ erro: "Valor deve ser maior que zero." });

  const catStr = String(categoria).trim();
  const contaStr = String(conta).trim();
  const catValida = await queryOne(`SELECT 1 FROM categorias WHERE "userId" = $1 AND nome = $2`, [req.user.id, catStr]);
  if (!catValida) return res.status(400).json({ erro: "Categoria inválida. Cadastre-a em Organização." });
  const contaValida = await queryOne(`SELECT 1 FROM contas WHERE "userId" = $1 AND nome = $2`, [req.user.id, contaStr]);
  if (!contaValida) return res.status(400).json({ erro: "Conta inválida. Cadastre-a em Organização." });

  const id = randomUUID();
  const criadoEm = new Date().toISOString();
  await query(
    `INSERT INTO receitas (id, "userId", data, valor, descricao, categoria, conta, "criadoEm") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.id, dataStr, Math.round(v * 100) / 100, descricao?.trim() || "", catStr, contaStr, criadoEm]
  );
  res.status(201).json({ id, userId: req.user.id, data: dataStr, valor: Math.round(v * 100) / 100, descricao: descricao?.trim() || "", categoria: catStr, conta: contaStr, criadoEm });
});

app.put("/api/receitas/:id", authMiddleware, async (req, res) => {
  const exists = await queryOne(`SELECT 1 FROM receitas WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  if (!exists) return res.status(404).json({ erro: "Receita não encontrada." });

  const { data, valor, descricao, categoria, conta } = req.body || {};
  if (!data || valor == null || !categoria || !conta)
    return res.status(400).json({ erro: "Campos obrigatórios: data, valor, categoria, conta." });

  const dataStr = parseDataStr(data);
  if (!dataStr) return res.status(400).json({ erro: "Data inválida." });
  const v = Number(valor);
  if (Number.isNaN(v) || v <= 0) return res.status(400).json({ erro: "Valor deve ser maior que zero." });

  const catStr = String(categoria).trim();
  const contaStr = String(conta).trim();
  const catValida = await queryOne(`SELECT 1 FROM categorias WHERE "userId" = $1 AND nome = $2`, [req.user.id, catStr]);
  if (!catValida) return res.status(400).json({ erro: "Categoria inválida. Cadastre-a em Organização." });
  const contaValida = await queryOne(`SELECT 1 FROM contas WHERE "userId" = $1 AND nome = $2`, [req.user.id, contaStr]);
  if (!contaValida) return res.status(400).json({ erro: "Conta inválida. Cadastre-a em Organização." });

  await query(
    `UPDATE receitas SET data = $1, valor = $2, descricao = $3, categoria = $4, conta = $5 WHERE id = $6`,
    [dataStr, Math.round(v * 100) / 100, descricao?.trim() || "", catStr, contaStr, req.params.id]
  );
  res.json({ ok: true });
});

app.delete("/api/receitas/:id", authMiddleware, async (req, res) => {
  const r = await query(`DELETE FROM receitas WHERE id = $1 AND "userId" = $2 RETURNING id`, [req.params.id, req.user.id]);
  if (!r.length) return res.status(404).json({ erro: "Receita não encontrada." });
  res.json({ ok: true });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────────

app.get("/api/dashboard/resumo", authMiddleware, async (req, res) => {
  const ano = Number(req.query.ano);
  const y = Number.isFinite(ano) && ano >= 2000 && ano <= 2100 ? ano : new Date().getFullYear();

  const [despesas, receitas] = await Promise.all([
    query(`SELECT * FROM despesas WHERE "userId" = $1 AND data LIKE $2`, [req.user.id, `${y}-%`]),
    query(`SELECT * FROM receitas WHERE "userId" = $1 AND data LIKE $2`, [req.user.id, `${y}-%`]),
  ]);

  const meses = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);

  const gastosPorMes = meses.map((mes) => ({
    mes,
    total: Math.round(despesas.filter((d) => d.data.slice(0, 7) === mes).reduce((s, d) => s + Number(d.valor), 0) * 100) / 100,
  }));
  const receitasPorMes = meses.map((mes) => ({
    mes,
    total: Math.round(receitas.filter((r) => r.data.slice(0, 7) === mes).reduce((s, r) => s + Number(r.valor), 0) * 100) / 100,
  }));

  const gastosPorCategoria = {};
  for (const d of despesas) {
    gastosPorCategoria[d.tipo] = Math.round(((gastosPorCategoria[d.tipo] || 0) + Number(d.valor)) * 100) / 100;
  }

  const totalGasto = Math.round(despesas.reduce((s, d) => s + Number(d.valor), 0) * 100) / 100;
  const totalReceita = Math.round(receitas.reduce((s, r) => s + Number(r.valor), 0) * 100) / 100;

  res.json({ ano: y, totalGasto, totalReceita, saldo: Math.round((totalReceita - totalGasto) * 100) / 100, gastosPorMes, receitasPorMes, gastosPorCategoria });
});

// ─── Estáticos ────────────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "src")));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ erro: "Rota não encontrada." });
  next();
});

// ─── Start ────────────────────────────────────────────────────────────────────────

initDb()
  .then(() => app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`)))
  .catch((e) => { console.error("Erro ao conectar ao banco:", e.message); process.exit(1); });
