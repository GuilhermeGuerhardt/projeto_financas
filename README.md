# Finanças

Controle financeiro pessoal: lançamentos de receitas e despesas, organizados por
conta e categoria, com relatório mensal e gráficos anuais.

API REST em Node/Express com PostgreSQL, autenticação via JWT e front em
JavaScript puro (módulos ES nativos, sem bundler) estilizado com Tailwind.

## Stack

| Camada | Tecnologia |
|---|---|
| Servidor | Node 20+, Express 4 |
| Banco | PostgreSQL (Supabase), driver `pg` |
| Auth | JWT (`jsonwebtoken`) + hash de senha com `bcryptjs` |
| Front | JavaScript ES modules, Tailwind CSS 3, Chart.js, Lucide |
| Testes | `node:test` (runner nativo) |

## Rodando localmente

Requer Node 20 ou superior.

```bash
npm install
cp .env.example .env    # preencha DATABASE_URL e JWT_SECRET
npm run dev
```

Abra <http://localhost:3000>.

O `npm run dev` compila o CSS e sobe o servidor com `--watch`. Se estiver mexendo
em classes do Tailwind, rode `npm run watch:css` num segundo terminal para
recompilar a cada alteração.

### Variáveis de ambiente

Veja `.env.example` — ele explica cada variável. O ponto mais importante:
**use a string do Session pooler do Supabase (porta 5432)**, não a conexão
direta, que é IPv6-only e não funciona no Render.

## Scripts

| Script | O que faz |
|---|---|
| `npm start` | Sobe o servidor (usado em produção) |
| `npm run dev` | Compila o CSS e sobe o servidor com reload |
| `npm run build` | Compila o CSS para produção (roda no deploy) |
| `npm run build:css` | Gera `src/assets/app.css` a partir de `styles/input.css` |
| `npm run watch:css` | Recompila o CSS a cada alteração |
| `npm test` | Roda os testes |

## Estrutura

```
server.js              Ponto de entrada: sobe o Express e inicializa o banco
backend/
  config.js            Variáveis de ambiente validadas
  db.js                Pool do Postgres, helpers de query, criação do schema
  helpers.js           Funções puras (validação, normalização) — o que os testes cobrem
  middleware/          auth (JWT), rateLimit, errors (asyncHandler + handler global)
  routes/              Uma rota por recurso; catálogo e lançamentos usam factories
  services/            Regras de negócio compartilhadas entre rotas
src/                   Front (servido estaticamente pelo Express)
  index.html
  js/                  Módulos ES — main.js liga todos os outros
  assets/app.css       CSS compilado (gerado, fora do git)
styles/input.css       Fonte do CSS: diretivas do Tailwind + estilos próprios
testes/                Testes do runner nativo do Node
```

### Decisões de arquitetura

**Contas/categorias e despesas/receitas são gerados por factory.** Cada par tinha
um CRUD praticamente idêntico — a diferença real era o nome da tabela, o campo de
categoria (`tipo` em despesas, `categoria` em receitas) e o texto das mensagens.
`routes/catalogoRouter.js` e `routes/lancamentosRouter.js` recebem essa
configuração e devolvem o router pronto.

**O front usa um barramento de eventos** (`src/js/eventos.js`). A tabela de
lançamentos precisa abrir o modal de edição, e o modal precisa mandar a tabela
recarregar. Em vez de um importar o outro (dependência circular), os dois falam
com o barramento e o `main.js` liga as pontas.

**O servidor sobe antes de conectar no banco.** O plano free do Supabase pausa o
projeto após ~7 dias de inatividade. Se o boot dependesse do banco, o serviço
inteiro morreria — em vez disso o `initDb()` tenta reconectar algumas vezes e, se
falhar, o site continua no ar servindo o front e o health check.

**O backend fica fora de `src/`** porque `src/` é servido estaticamente pelo
Express: código de servidor ali dentro ficaria acessível pelo navegador.

## Deploy (Render)

O `render.yaml` na raiz descreve o serviço. No painel do Render:
**New → Blueprint** e aponte para o repositório.

O Render pede a `DATABASE_URL` (cole a do Session pooler) e gera o `JWT_SECRET`
sozinho. O build roda `npm install && npm run build` — o `build` é obrigatório,
porque o CSS compilado não vai para o git.

Notas do plano free:

- O serviço hiberna após 15 min sem acesso; a primeira requisição depois disso
  demora ~50s para responder.
- O projeto no Supabase pausa após ~7 dias sem uso e precisa ser despausado no
  painel. O site continua no ar, mas as telas com dados falham até lá.

## Testes

```bash
npm test
```

Cobrem as funções puras de `backend/helpers.js`: validação de senha, parsing de
data e mês, normalização de cor e as agregações usadas no relatório e no
dashboard.
