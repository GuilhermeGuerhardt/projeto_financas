import { randomUUID } from "crypto";
import { query, queryOne } from "../db.js";
import { HttpError } from "../middleware/errors.js";

const CONTA_PADRAO = { nome: "Conta principal", cor: "#6366f1" };
const CATEGORIA_PADRAO = { nome: "Geral", cor: "#a855f7" };

/** Garante que o usuário tenha ao menos uma conta e uma categoria. */
export async function ensureUserCatalog(userId) {
  const temConta = await queryOne(`SELECT 1 FROM contas WHERE "userId" = $1 LIMIT 1`, [userId]);
  if (!temConta) {
    await query(
      `INSERT INTO contas (id, "userId", nome, cor, "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), userId, CONTA_PADRAO.nome, CONTA_PADRAO.cor, new Date().toISOString()]
    );
  }
  const temCat = await queryOne(`SELECT 1 FROM categorias WHERE "userId" = $1 LIMIT 1`, [userId]);
  if (!temCat) {
    await query(
      `INSERT INTO categorias (id, "userId", nome, cor, "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), userId, CATEGORIA_PADRAO.nome, CATEGORIA_PADRAO.cor, new Date().toISOString()]
    );
  }
}

/** Confere que categoria e conta informadas existem e pertencem ao usuário. */
export async function validarCatalogoDoUsuario(userId, { categoria, conta }) {
  const catValida = await queryOne(
    `SELECT 1 FROM categorias WHERE "userId" = $1 AND nome = $2`,
    [userId, categoria]
  );
  if (!catValida) throw new HttpError(400, "Categoria inválida. Cadastre-a em Organização.");

  const contaValida = await queryOne(
    `SELECT 1 FROM contas WHERE "userId" = $1 AND nome = $2`,
    [userId, conta]
  );
  if (!contaValida) throw new HttpError(400, "Conta inválida. Cadastre-a em Organização.");
}
