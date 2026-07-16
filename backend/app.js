import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { errorHandler, notFoundApi } from "./middleware/errors.js";
import { authRoutes } from "./routes/auth.js";
import { contasRoutes, categoriasRoutes } from "./routes/catalogoRouter.js";
import { despesasRoutes, receitasRoutes } from "./routes/lancamentosRouter.js";
import { dashboardRoutes } from "./routes/dashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_FRONT = path.join(__dirname, "..", "src");

export function criarApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  // Usado pelo healthCheckPath do Render — não exige autenticação.
  app.get("/api/health", (_, res) => res.json({ ok: true, api: "financas", versao: 4 }));

  app.use("/api/auth", authRoutes);
  app.use("/api/contas", contasRoutes);
  app.use("/api/categorias", categoriasRoutes);
  app.use("/api/despesas", despesasRoutes);
  app.use("/api/receitas", receitasRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use(express.static(PASTA_FRONT));
  app.use(notFoundApi);
  app.use(errorHandler);

  return app;
}
