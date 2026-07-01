/**
 * Authentication middleware.
 *
 * `requireAuth` rejects any request without a valid session token
 * (cookie or Authorization header) and attaches the authenticated user
 * (minus password hash) to `req.user`.
 *
 * `optionalAuth` does the same, but does not reject unauthenticated
 * requests — useful for endpoints that personalize their response but
 * also serve anonymous traffic.
 */
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { readTokenFromRequest, verifyToken } from "../lib/auth.js";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
}

function toAuthenticatedUser(row: User): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? null,
    emailVerified: !!row.emailVerifiedAt,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Helper used by route handlers to access the authenticated user with
 * a non-nullable type.  Throws an internal error if the request was
 * not authenticated — only call this after `requireAuth`.
 */
export function currentUser(req: Request): AuthenticatedUser {
  const user = (req as Request & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error(
      "currentUser() called on an unauthenticated request. " +
        "Did you forget to attach requireAuth middleware?",
    );
  }
  return user;
}

/**
 * Read-only accessor for handlers that may or may not be authenticated.
 */
export function maybeUser(req: Request): AuthenticatedUser | undefined {
  return (req as Request & { user?: AuthenticatedUser }).user;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = readTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(401).json({ error: "Invalid session payload" });
    return;
  }

  // Look up the user record to make sure the account still exists.
  Promise.resolve()
    .then(async () => {
      const [row] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!row) {
        res.status(401).json({ error: "Account no longer exists" });
        return;
      }
      if (row.isDisabled) {
        res.status(403).json({ error: "Account is disabled" });
        return;
      }
      (req as Request & { user?: AuthenticatedUser }).user =
        toAuthenticatedUser(row);
      next();
    })
    .catch((err) => {
      next(err);
    });
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = readTokenFromRequest(req);
  if (!token) {
    next();
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    next();
    return;
  }
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) {
    next();
    return;
  }
  Promise.resolve()
    .then(async () => {
      const [row] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (row && !row.isDisabled) {
        (req as Request & { user?: AuthenticatedUser }).user =
          toAuthenticatedUser(row);
      }
      next();
    })
    .catch(() => {
      next();
    });
}
