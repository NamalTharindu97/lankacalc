import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnvironment } from "@/server/env";
import * as schema from "@/server/db/schema";

let database: PostgresJsDatabase<typeof schema> | undefined;
let client: ReturnType<typeof postgres> | undefined;

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  if (!database) {
    const environment = getServerEnvironment();
    client = postgres(environment.DATABASE_URL, { max: 10 });
    database = drizzle(client, { schema });
  }

  return database;
}

export async function checkDatabase(): Promise<void> {
  await getDatabase().execute(sql`select 1`);
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = undefined;
    database = undefined;
  }
}
