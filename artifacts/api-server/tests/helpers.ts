/**
 * Test helpers.
 *
 * Provides:
 *   - `setupAuthedUser(app)` — resets the in-memory DB, seeds a fake
 *     user, and returns `{ user, api }` where `api` is a supertest
 *     wrapper that automatically attaches the `dropflow_token` cookie
 *     to every request.
 *   - `asOwned(rows)` — stamp every row in a seed payload with
 *     `userId: 1` so the authed user "owns" the data.
 *   - `authedRequest(app)` — just the authed request (no user setup).
 *
 * The mock DB (`tests/__mocks__/@workspace_db.ts`) provides the
 * `resetDb` and `seedTable` implementations.  Type stubs are also
 * re-exported from `@workspace/db/test-utils` so the tsc-based
 * typecheck can resolve them outside the vitest runtime.
 */
import request from "supertest";
import type { Express } from "express";
import type { Test } from "supertest";
import {
  makeFakeUser,
  makeAuthToken,
  resetDb,
  seedTable,
  type FakeUser,
} from "@workspace/db/test-utils";

/**
 * A supertest `Test` chain that has the auth cookie pre-set.  Every
 * call returns a supertest `Test` which can be awaited for the
 * response.
 */
export type AuthedTest = Test;

export interface AuthedRequest {
  get(url: string): AuthedTest;
  post(url: string): AuthedTest;
  put(url: string): AuthedTest;
  patch(url: string): AuthedTest;
  delete(url: string): AuthedTest;
}

export const DEFAULT_USER_ID = 1;
export const DEFAULT_USER_EMAIL = "test@example.com";

/**
 * Wrap a supertest `request(app)` so every method automatically
 * attaches the `dropflow_token` cookie for the given user.
 */
export function authedRequest(
  app: Express,
  userId: number = DEFAULT_USER_ID,
): AuthedRequest {
  const token = makeAuthToken(userId);
  const cookie = `dropflow_token=${token}`;
  return {
    get: (url) => request(app).get(url).set("Cookie", cookie),
    post: (url) => request(app).post(url).set("Cookie", cookie),
    put: (url) => request(app).put(url).set("Cookie", cookie),
    patch: (url) => request(app).patch(url).set("Cookie", cookie),
    delete: (url) => request(app).delete(url).set("Cookie", cookie),
  };
}

export interface AuthedTestContext {
  user: FakeUser;
  api: AuthedRequest;
}

/**
 * Reset the in-memory DB, seed a default user, and return an
 * authed request helper.  Call this in `beforeEach` to get a fresh
 * authenticated context for every test.
 */
export function setupAuthedUser(
  app: Express,
  overrides: Partial<FakeUser> = {},
): AuthedTestContext {
  resetDb();
  const user = makeFakeUser({
    id: DEFAULT_USER_ID,
    email: DEFAULT_USER_EMAIL,
    ...overrides,
  });
  seedTable("users", [user as unknown as Record<string, unknown>]);
  return { user, api: authedRequest(app, user.id) };
}

/**
 * Stamp a userId on every row in a seed payload.  Use this when
 * you need to seed data that the authed user owns.
 *
 *   seedTable("orders", asOwned([{ orderNumber: "X", ... }]));
 */
export function asOwned<T extends Record<string, unknown>>(
  rows: T[],
  userId: number = DEFAULT_USER_ID,
): (T & { userId: number })[] {
  return rows.map((r) => ({ ...r, userId }));
}
