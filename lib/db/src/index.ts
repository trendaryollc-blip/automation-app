/**
 * Database entry point.
 *
 * Supports two modes:
 *   - "postgres" (default): Uses PostgreSQL via Drizzle ORM
 *   - "firestore": Uses Firestore via Firebase Admin SDK
 *
 * Set DB_MODE=firestore in your environment to use Firestore.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";

const { Pool } = pg;

// Determine which database mode to use
const dbMode = (process.env["DB_MODE"] || "postgres").toLowerCase();
const isVitest = typeof process !== "undefined" && !!process.env.VITEST;

if (dbMode === "firestore") {
  console.info("[DB] Using Firestore database mode");
} else if (!process.env.DATABASE_URL && !isVitest) {
  // PostgreSQL mode (default)
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
} else {
  console.info("[DB] Using PostgreSQL database mode");
}

// PostgreSQL exports (always defined, but pool/db will be null in firestore mode)
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

if (dbMode === "postgres" && (process.env.DATABASE_URL || isVitest)) {
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/dropflow" });
  _db = drizzle(_pool, { schema });
}

export const pool = _pool!;
export const db = _db!;

export * from "./schema/index.ts";

/**
 * Returns the Firestore database instance.
 * Call this only when DB_MODE=firestore is set.
 */
export async function getFirestoreDb() {
  const { getFirestoreDb: getFsDb } = await import("./firestore/index");
  return getFsDb();
}

