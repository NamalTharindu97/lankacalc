import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

type PostgresConnection = {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};

export function createPostgresUrl(connection: PostgresConnection): string {
  return `postgresql://${encodeURIComponent(connection.user)}:${encodeURIComponent(connection.password)}@${connection.host}:${connection.port}/${encodeURIComponent(connection.database)}`;
}

export function getServerEnvironment(): ServerEnvironment {
  const databaseUrl = process.env.DATABASE_URL ?? createPostgresUrl({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: process.env.POSTGRES_PORT ?? "5432",
    database: process.env.POSTGRES_DB ?? "lankacalc",
    user: process.env.POSTGRES_USER ?? "lankacalc",
    password: process.env.POSTGRES_PASSWORD ?? "",
  });

  return serverEnvironmentSchema.parse({ DATABASE_URL: databaseUrl });
}
