import { Router } from "express";
import { randomUUID } from "crypto";
import { query, queryOne } from "../db.js";
import { agruparPorCampo, arredondarValor, parseDataStr, parseMes, somarValores } from "../helpers.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { validarCatalogoDoUsuario } from "../services/catalogo.js";

/**
 * Despesas e receitas compartilham o mesmo CRUD. As diferenças são só de nome:
 * a tabela, a coluna que guarda a categoria (`tipo` em despesas, `categoria`
 * em receitas) e as chaves da resposta JSON — que o front já consome assim.
 *
 * `tabela` e `campoCategoria` são constantes deste módulo, nunca entrada do
 * usuário, por isso podem ser interpoladas no SQL.
 */
export function criarLancamentosRouter({ tabela, campoCategoria, chaveLista, chaveResumo, rotulo }) {
  const router = Router();
  router.use(authMiddleware);

  const erroNaoEncontrado = `${rotulo} não encontrada.`;

  /** Valida o corpo de um POST/PUT e devolve os campos já normalizados. */
  const lerLancamento = async (req) => {
    const { data, valor, descricao, conta } = req.body || {};
    const categoria = req.body?.[campoCategoria];

    if (!data || valor == null || !categoria || !conta) {
      throw new HttpError(400, `Campos obrigatórios: data, valor, ${campoCategoria}, conta.`);
    }

    const dataStr = parseDataStr(data);
    if (!dataStr) throw new HttpError(400, "Data inválida.");

    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) throw new HttpError(400, "Valor deve ser maior que zero.");

    const categoriaStr = String(categoria).trim();
    const contaStr = String(conta).trim();
    await validarCatalogoDoUsuario(req.user.id, { categoria: categoriaStr, conta: contaStr });

    return {
      data: dataStr,
      valor: arredondarValor(v),
      descricao: descricao?.trim() || "",
      categoria: categoriaStr,
      conta: contaStr,
    };
  };

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const mes = parseMes(req.query.mes);
      if (!mes) throw new HttpError(400, "Informe o parâmetro mes no formato YYYY-MM.");

      const itens = await query(
        `SELECT * FROM ${tabela} WHERE "userId" = $1 AND substr(data,1,7) = $2 ORDER BY data DESC`,
        [req.user.id, mes]
      );

      res.json({
        mes,
        [chaveLista]: itens,
        resumo: {
          total: somarValores(itens),
          [chaveResumo]: agruparPorCampo(itens, campoCategoria),
        },
      });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const l = await lerLancamento(req);
      const id = randomUUID();
      const criadoEm = new Date().toISOString();

      await query(
        `INSERT INTO ${tabela} (id, "userId", data, valor, descricao, ${campoCategoria}, conta, "criadoEm")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, req.user.id, l.data, l.valor, l.descricao, l.categoria, l.conta, criadoEm]
      );

      res.status(201).json({
        id,
        userId: req.user.id,
        data: l.data,
        valor: l.valor,
        descricao: l.descricao,
        [campoCategoria]: l.categoria,
        conta: l.conta,
        criadoEm,
      });
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const existe = await queryOne(
        `SELECT 1 FROM ${tabela} WHERE id = $1 AND "userId" = $2`,
        [req.params.id, req.user.id]
      );
      if (!existe) throw new HttpError(404, erroNaoEncontrado);

      const l = await lerLancamento(req);
      await query(
        `UPDATE ${tabela} SET data = $1, valor = $2, descricao = $3, ${campoCategoria} = $4, conta = $5
         WHERE id = $6`,
        [l.data, l.valor, l.descricao, l.categoria, l.conta, req.params.id]
      );
      res.json({ ok: true });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const removidos = await query(
        `DELETE FROM ${tabela} WHERE id = $1 AND "userId" = $2 RETURNING id`,
        [req.params.id, req.user.id]
      );
      if (!removidos.length) throw new HttpError(404, erroNaoEncontrado);
      res.json({ ok: true });
    })
  );

  return router;
}

export const despesasRoutes = criarLancamentosRouter({
  tabela: "despesas",
  campoCategoria: "tipo",
  chaveLista: "despesas",
  chaveResumo: "porTipo",
  rotulo: "Despesa",
});

export const receitasRoutes = criarLancamentosRouter({
  tabela: "receitas",
  campoCategoria: "categoria",
  chaveLista: "receitas",
  chaveResumo: "porCategoria",
  rotulo: "Receita",
});
