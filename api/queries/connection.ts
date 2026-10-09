import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";
import { mockDbInstance } from "./mockDb";

const fullSchema = { ...schema, ...relations };

let instance: any;
let pool: Pool | null = null;
let useMock = false;

// Detect unresolvable container hostnames like "db:5432"
if (!env.databaseUrl || env.databaseUrl.includes("@db:") || env.databaseUrl.includes("@db/")) {
  useMock = true;
}

export function getDb(): any {
  if (useMock) {
    return mockDbInstance;
  }

  if (!instance) {
    try {
      pool = new Pool({
        connectionString: env.databaseUrl,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 10000,
        max: 10,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      pool.on("error", (err) => {
        // Idle clients in the pool can be closed by the database server (e.g. Neon idle timeout).
        // node-postgres automatically removes the closed client from the pool.
        // We log at info level and do NOT disable the live database or switch to mock.
        console.info("[FreshFlow] DB pool idle client disconnected:", err.message);
      });

      const realDb = drizzle(pool, {
        schema: fullSchema,
      });

      instance = realDb;
    } catch (e: any) {
      console.warn("[FreshFlow] DB initialization failed, using mock mode:", e?.message);
      useMock = true;
      return mockDbInstance;
    }
  }

  return instance;
}

export { mockDbInstance };
