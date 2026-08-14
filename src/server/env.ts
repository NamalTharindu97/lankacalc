import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  return serverEnvironmentSchema.parse(process.env);
}
