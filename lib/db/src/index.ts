/**
 * Database entry point.
 *
 * Supports two modes:
 *   - "postgres" (default): Uses PostgreSQL via Drizzle ORM
 *   - "firestore": Uses Firestore via Firebase Admin SDK
 *
 * Set DB_MODE=firestore in your environment to use Firestore.
 *
 * Exports `db` and `pool` typed as the non-nullable drizzle/Pool
 * instances. In Firestore mode, `db` and `pool` are proxies that throw
 * a clear error if anyone tries to use the postgres client. Routes
 * that need a real database handle should branch on `dbMode` and use
 * `getFirestoreDb()` for Firestore.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

export type DbHandle = ReturnType<typeof drizzle<typeof schema>>;
export type PoolHandle = pg.Pool;

// Determine which database mode to use
const dbMode = (process.env["DB_MODE"] || "postgres").toLowerCase();
const isVitest =
  typeof process !== "undefined" && !!process.env["VITEST"];
const isProduction = process.env["NODE_ENV"] === "production";

if (dbMode === "firestore") {
  // eslint-disable-next-line no-console
  console.info("[DB] Using Firestore database mode");
} else if (!process.env["DATABASE_URL"] && !isVitest) {
  // PostgreSQL mode (default) requires DATABASE_URL outside of tests.
  if (isProduction) {
    throw new Error(
      "DATABASE_URL must be set in production. Did you forget to provision a database?",
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    "[DB] DATABASE_URL is not set. Database access will fail until you configure it.",
  );
} else {
  // eslint-disable-next-line no-console
  console.info("[DB] Using PostgreSQL database mode");
}

// ---------------------------------------------------------------------------
// Internal handles.  We DO NOT export them as `!` (non-null assertion)
// because in Firestore mode they are intentionally null, and a previous
// version of this file exported a `null` value typed as non-null which
// crashed downstream code with a confusing NPE. Instead we expose a
// proxy that throws a clear error when used in the wrong mode.
// ---------------------------------------------------------------------------
let _pool: PoolHandle | null = null;
let _db: DbHandle | null = null;

if (dbMode === "postgres" && (process.env["DATABASE_URL"] || isVitest)) {
  _pool = new Pool({
    connectionString:
      process.env["DATABASE_URL"] || "postgresql://localhost:5432/dropflow",
  });
  _db = drizzle(_pool, { schema });
}

function postgresNotAvailable(): never {
  throw new Error(
    "PostgreSQL client is not available. " +
      `Current DB_MODE is "${dbMode}". ` +
      "Use getFirestoreDb() for Firestore or set DB_MODE=postgres and provide DATABASE_URL.",
  );
}

/**
 * Drizzle database handle. Throws if accessed in Firestore mode.
 * Typed as non-nullable so existing callers (which expect a real
 * drizzle client) keep their types; the proxy enforces the runtime
 * check instead of a type lie.
 */
export const db: DbHandle = _db
  ? _db
  : (new Proxy({} as DbHandle, {
      get() {
        postgresNotAvailable();
      },
    }) as DbHandle);

/** Node-postgres Pool. Throws if accessed in Firestore mode. */
export const pool: PoolHandle = _pool
  ? _pool
  : (new Proxy({} as PoolHandle, {
      get() {
        postgresNotAvailable();
      },
    }) as PoolHandle);

/** Returns the actual (possibly null) drizzle handle. */
export function getDb(): DbHandle | null {
  return _db;
}

/** Returns the active database mode string. */
export function getDbMode(): "postgres" | "firestore" {
  return dbMode === "firestore" ? "firestore" : "postgres";
}

export * from "./schema/index";

/**
 * Returns the Firestore database instance.
 * Call this only when DB_MODE=firestore is set.
 */
export async function getFirestoreDb() {
  const { getFirestoreDb: getFsDb } = await import("./firestore/index");
  return getFsDb();
}
