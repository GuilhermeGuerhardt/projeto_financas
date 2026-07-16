import { Router } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { query, queryOne, withTransaction } from "../db.js";
import { validarSenhaForte } from "../helpers.js";
import { assinarToken, authMiddleware } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { ensureUserCatalog } from "../services/catalogo.js";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      throw new HttpError(400, "Nome, e-mail e senha são obrigatórios.");
    }

    const senhaErro = validarSenhaForte(password);
    if (senhaErro) throw new HttpError(400, senhaErro);

    const emailNorm = String(email).trim().toLowerCase();
    const existe = await queryOne("SELECT 1 FROM users WHERE email = $1", [emailNorm]);
    if (existe) throw new HttpError(409, "E-mail já cadastrado.");

    const id = randomUUID();
    const nomeNorm = String(name).trim();
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    await query(
      `INSERT INTO users (id, name, email, "passwordHash", "criadoEm") VALUES ($1, $2, $3, $4, $5)`,
      [id, nomeNorm, emailNorm, passwordHash, new Date().toISOString()]
    );
    await ensureUserCatalog(id);

    res.status(201).json({
      token: assinarToken({ id, email: emailNorm }),
      user: { id, name: nomeNorm, email: emailNorm },
    });
  })
);

authRoutes.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, "E-mail e senha são obrigatórios.");

    const emailNorm = String(email).trim().toLowerCase();
    const user = await queryOne("SELECT * FROM users WHERE email = $1", [emailNorm]);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "E-mail ou senha incorretos.");
    }

    await ensureUserCatalog(user.id);
    res.json({
      token: assinarToken({ id: user.id, email: user.email }),
      user: { id: user.id, name: user.name, email: user.email },
    });
  })
);

authRoutes.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await queryOne("SELECT id, name, email FROM users WHERE id = $1", [req.user.id]);
    if (!user) throw new HttpError(401, "Usuário não encontrado.");
    await ensureUserCatalog(user.id);
    res.json(user);
  })
);

authRoutes.put(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, currentPassword, newPassword } = req.body || {};
    const user = await queryOne("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (!user) throw new HttpError(404, "Usuário não encontrado.");

    const sets = [];
    const vals = [];

    if (name) {
      sets.push(`name = $${sets.length + 1}`);
      vals.push(String(name).trim());
    }

    if (newPassword) {
      if (!currentPassword) throw new HttpError(400, "Informe a senha atual.");
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new HttpError(401, "Senha atual incorreta.");
      }
      const senhaErro = validarSenhaForte(newPassword);
      if (senhaErro) throw new HttpError(400, senhaErro);
      sets.push(`"passwordHash" = $${sets.length + 1}`);
      vals.push(await bcrypt.hash(newPassword, config.bcryptRounds));
    }

    if (sets.length === 0) throw new HttpError(400, "Nada para atualizar.");

    vals.push(req.user.id);
    await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  })
);

authRoutes.delete(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    // Numa transação: uma falha no meio deixaria o usuário sem lançamentos
    // mas ainda logável, ou órfãos apontando para um usuário inexistente.
    await withTransaction(async (q) => {
      await q(`DELETE FROM despesas   WHERE "userId" = $1`, [userId]);
      await q(`DELETE FROM receitas   WHERE "userId" = $1`, [userId]);
      await q(`DELETE FROM contas     WHERE "userId" = $1`, [userId]);
      await q(`DELETE FROM categorias WHERE "userId" = $1`, [userId]);
      await q(`DELETE FROM users      WHERE id = $1`, [userId]);
    });
    res.json({ ok: true });
  })
);
