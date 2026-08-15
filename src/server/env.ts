import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(32).optional(),
);

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  ADMIN_API_TOKEN: optionalSecret,
  ADMIN_ACTOR: z.string().min(1).default("initial-admin"),
  REVIEWER_API_TOKEN: optionalSecret,
  REVIEWER_ACTOR: z.string().min(1).default("initial-reviewer"),
  WORKER_API_TOKEN: optionalSecret,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default("LankaCalc <noreply@lankacalc.local>"),
}).superRefine((environment, context) => {
  if (environment.ADMIN_API_TOKEN && environment.ADMIN_API_TOKEN === environment.REVIEWER_API_TOKEN) {
    context.addIssue({ code: "custom", message: "Admin and reviewer tokens must be different." });
  }
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

  return serverEnvironmentSchema.parse({
    DATABASE_URL: databaseUrl,
    ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN,
    ADMIN_ACTOR: process.env.ADMIN_ACTOR,
    REVIEWER_API_TOKEN: process.env.REVIEWER_API_TOKEN,
    REVIEWER_ACTOR: process.env.REVIEWER_ACTOR,
    WORKER_API_TOKEN: process.env.WORKER_API_TOKEN,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });
}
