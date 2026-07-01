/**
 * Test helpers for use with the in-memory mock DB.
 *
 * These helpers are also re-exported from
 * `tests/__mocks__/@workspace_db.ts` so that test code can do
 *
 *   import { makeFakeUser, makeAuthToken } from "@workspace/db";
 *
 * without pulling in the real DB connection.
 */
import { createHmac } from "node:crypto";

export const TEST_JWT_SECRET =
  process.env["JWT_SECRET"] ||
  // Dev fallback mirrors src/lib/auth.ts so tests behave the same.
  createHmac("sha256", "").update("dropflow-test-secret").digest("hex");

export interface FakeUser {
  id: number;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export function makeFakeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 1,
    email: "test@example.com",
    name: "Test User",
    passwordHash: "$2a$12$invalid.hash.placeholder.value.xxxxxxxxxxxxxx",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeAuthToken(userId: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: String(userId), iat: now, exp: now + 3600 };
  const b64u = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const headerB64 = b64u(header);
  const payloadB64 = b64u(payload);
  const sig = createHmac("sha256", TEST_JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${headerB64}.${payloadB64}.${sig}`;
}

// ---------------------------------------------------------------------------
// Stub declarations of the in-memory mock helpers.
//
// In production these do nothing (the real DB is in use).
// In test runs, the vitest module-resolution alias in
// `vitest.config.ts` redirects `@workspace/db` to the mock file which
// replaces these implementations with the in-memory ones.
// We re-export them here purely so the TypeScript compiler can resolve
// the names when type-checking test files outside the vitest runtime.
// ---------------------------------------------------------------------------

export type SeedRow = Record<string, unknown> & { id?: number };

/**
 * Resets the in-memory DB.  No-op in production; replaced by the
 * mock implementation in tests.
 */
export function resetDb(): void {
  // Intentionally empty — the mock provides the real implementation.
}

/**
 * Inserts rows into a table.  No-op in production; replaced by the
 * mock implementation in tests.
 */
export function seedTable(
  _tableName: string,
  _records: readonly SeedRow[],
): SeedRow[] {
  return [];
}

/**
 * Reads all rows from a table.  No-op in production; replaced by the
 * mock implementation in tests.
 */
export function getTableData(_tableName: string): SeedRow[] {
  return [];
}
