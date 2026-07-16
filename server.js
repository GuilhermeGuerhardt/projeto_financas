import { criarApp } from "./backend/app.js";
import { config } from "./backend/config.js";
import { initDb } from "./backend/db.js";

const app = criarApp();

// Sobe o servidor antes de tocar no banco: assim o health check do Render
// responde na hora e o deploy não falha se o Postgres estiver acordando.
app.listen(config.port, () => {
  console.log(`Servidor em http://localhost:${config.port}`);
});

initDb().catch((e) => {
  console.error("Erro ao preparar o banco de dados:", e.message);
  console.error("O servidor segue no ar, mas as rotas que usam banco vão falhar até a conexão voltar.");
});
