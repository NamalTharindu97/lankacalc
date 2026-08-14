import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnvironment } from "@/server/env";
import * as schema from "@/server/db/schema";

let database: PostgresJsDatabase<typeof schema> | undefined;

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  if (!database) {
    const environment = getServerEnvironment();
    const client = postgres(environment.DATABASE_URL, { max: 10 });
    database = drizzle(client, { schema });
  }

  return database;
}

export async function checkDatabase(): Promise<void> {
  await getDatabase().execute(sql`select 1`);
}
