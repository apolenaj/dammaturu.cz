import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

/**
 * Postgres client — requires `DATABASE_URL`.
 * Not used until Supabase/Postgres is provisioned.
 */
export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL chybí. Nastav Postgres/Supabase connection string.",
    );
  }

  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;
