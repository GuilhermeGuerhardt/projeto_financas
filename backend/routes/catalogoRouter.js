import { Router } from "express";
import { randomUUID } from "crypto";
import { query, queryOne } from "../db.js";
import { normalizeCor } from "../helpers.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { ensureUserCatalog } from "../services/catalogo.js";

const CODIGO_UNIQUE_VIOLATION = "23505";

/**
 * Contas e categorias têm exatamente o mesmo CRUD — só mudam a tabela, a cor
 * padrão e o texto das mensagens. Este factory gera o router das duas.
 *
 * `tabela` é sempre uma constante definida neste módulo, nunca entrada do
 * usuário, por isso pode ser interpolada no SQL.
 */
export function criarCatalogoRouter({ tabela, corPadrao, rotulo, rotuloArtigo }) {
  const router = Router();
  router.use(authMiddleware);

  const erroDuplicado = `Já existe ${rotuloArtigo} com esse nome.`;
  const erroNaoEncontrado = `${rotulo[0].toUpperCase()}${rotulo.slice(1)} não encontrada.`;
  const erroNomeVazio = `Informe o nome d${rotulo === "conta" ? "a conta" : "a categoria"}.`;

  const lerCorpo = (req) => {
    const nome = String(req.body?.nome || "").trim();
    if (!nome) throw new HttpError(400, erroNomeVazio);
    return { nome, cor: normalizeCor(req.body?.cor, corPadrao) };
  };

  const pertenceAoUsuario = async (id, userId) => {
    const item = await queryOne(`SELECT 1 FROM ${tabela} WHERE id = $1 AND "userId" = $2`, [id, userId]);
    if (!item) throw new HttpError(404, erroNaoEncontrado);
  };

  const traduzirDuplicado = (e) => {
    if (e.code === CODIGO_UNIQUE_VIOLATION) return new HttpError(409, erroDuplicado);
    return e;
  };

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      await ensureUserCatalog(req.user.id);
      const itens = await query(
        `SELECT * FROM ${tabela} WHERE "userId" = $1 ORDER BY lower(nome)`,
        [req.user.id]
      );
      res.json(itens.map((i) => ({ ...i, cor: normalizeCor(i.cor, corPadrao) })));
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { nome, cor } = lerCorpo(req);
      const id = randomUUID();
      try {
        await query(
          `INSERT INTO ${tabela} (id, "userId", nome, cor, "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
          [id, req.user.id, nome, cor, new Date().toISOString()]
        );
      } catch (e) {
        throw traduzirDuplicado(e);
      }
      res.status(201).json({ id, userId: req.user.id, nome, cor });
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      await pertenceAoUsuario(req.params.id, req.user.id);
      const { nome, cor } = lerCorpo(req);
      try {
        await query(`UPDATE ${tabela} SET nome = $1, cor = $2 WHERE id = $3`, [nome, cor, req.params.id]);
      } catch (e) {
        throw traduzirDuplicado(e);
      }
      res.json({ id: req.params.id, nome, cor });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      await pertenceAoUsuario(req.params.id, req.user.id);
      const { n } = await queryOne(`SELECT COUNT(*) as n FROM ${tabela} WHERE "userId" = $1`, [req.user.id]);
      if (Number(n) <= 1) throw new HttpError(400, `Mantenha ao menos ${rotuloArtigo} cadastrada.`);
      await query(`DELETE FROM ${tabela} WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    })
  );

  return router;
}

export const contasRoutes = criarCatalogoRouter({
  tabela: "contas",
  corPadrao: "#6366f1",
  rotulo: "conta",
  rotuloArtigo: "uma conta",
});

export const categoriasRoutes = criarCatalogoRouter({
  tabela: "categorias",
  corPadrao: "#a855f7",
  rotulo: "categoria",
  rotuloArtigo: "uma categoria",
});
