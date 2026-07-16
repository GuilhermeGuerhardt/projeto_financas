import { Router } from "express";
import { query } from "../db.js";
import { agruparPorCampo, arredondarValor, somarValores } from "../helpers.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";

const ANO_MIN = 2000;
const ANO_MAX = 2100;

export const dashboardRoutes = Router();

function totalPorMes(itens, meses) {
  return meses.map((mes) => ({
    mes,
    total: somarValores(itens.filter((i) => i.data.slice(0, 7) === mes)),
  }));
}

dashboardRoutes.get(
  "/resumo",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const ano = Number(req.query.ano);
    const y = Number.isFinite(ano) && ano >= ANO_MIN && ano <= ANO_MAX ? ano : new Date().getFullYear();

    const [despesas, receitas] = await Promise.all([
      query(`SELECT * FROM despesas WHERE "userId" = $1 AND data LIKE $2`, [req.user.id, `${y}-%`]),
      query(`SELECT * FROM receitas WHERE "userId" = $1 AND data LIKE $2`, [req.user.id, `${y}-%`]),
    ]);

    const meses = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
    const totalGasto = somarValores(despesas);
    const totalReceita = somarValores(receitas);

    res.json({
      ano: y,
      totalGasto,
      totalReceita,
      saldo: arredondarValor(totalReceita - totalGasto),
      gastosPorMes: totalPorMes(despesas, meses),
      receitasPorMes: totalPorMes(receitas, meses),
      gastosPorCategoria: agruparPorCampo(despesas, "tipo"),
    });
  })
);
