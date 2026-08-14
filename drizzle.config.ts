import "dotenv/config";
import { defineConfig } from "drizzle-kit";

import { createPostgresUrl } from "./src/server/env";

const databaseUrl = process.env.DATABASE_URL ?? createPostgresUrl({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: process.env.POSTGRES_PORT ?? "5432",
  database: process.env.POSTGRES_DB ?? "lankacalc",
  user: process.env.POSTGRES_USER ?? "lankacalc",
  password: process.env.POSTGRES_PASSWORD ?? "lankacalc",
});

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
