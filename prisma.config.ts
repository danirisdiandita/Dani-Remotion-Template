// Environment variables are injected via Docker Compose / .env at runtime
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // In Prisma 7, CLI operations (migrations) use the 'url' provided here.
    // We point this to the Direct (unpooled) connection URL.
    url: env("DATABASE_URL"),
  },
});
