import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/**
 * Roda várias queries numa transação: ou todas passam, ou nenhuma persiste.
 * O callback recebe uma função `q` com a mesma assinatura de `query`.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const q = async (sql, params = []) => (await client.query(sql, params)).rows;
    const resultado = await fn(q);
    await client.query("COMMIT");
    return resultado;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

const SCHEMA = `
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
`;

/**
 * Cria o schema se necessário. Tenta algumas vezes porque provedores de
 * Postgres gerenciado (Supabase no plano free) suspendem o banco por
 * inatividade e levam alguns segundos para acordar na primeira conexão.
 */
export async function initDb({ tentativas = 5, esperaMs = 3000 } = {}) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    try {
      await query(SCHEMA);
      console.log("Banco de dados pronto.");
      return;
    } catch (e) {
      if (tentativa === tentativas) throw e;
      console.warn(
        `Banco indisponível (tentativa ${tentativa}/${tentativas}): ${e.message}. Nova tentativa em ${esperaMs / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
}
