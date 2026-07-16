import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

const DEV_JWT_SECRET = "dev-secret-altere-em-producao";

if (isProd && !process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET é obrigatório em produção. Defina a variável de ambiente no painel do Render."
  );
}

if (isProd && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL é obrigatório em produção. Defina a variável de ambiente no painel do Render."
  );
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || true,
  tokenExpiration: "7d",
  bcryptRounds: 10,
};
