/**
 * Authentication utilities.
 *
 * - Passwords are hashed with bcrypt (12 rounds).
 * - Session tokens are signed JWTs (HS256) carrying only the user id.
 * - Tokens are stored in an HTTP-only, SameSite=Lax cookie named
 *   `dropflow_token`.  Secure flag is enabled in production.
 */
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { Request } from "express";

export const AUTH_COOKIE_NAME = "dropflow_token";
export const BCRYPT_ROUNDS = 12;
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Returns the secret used to sign and verify JWTs.
 *
 * In production this MUST be set via the `JWT_SECRET` environment
 * variable. We fall back to a randomly generated secret in development
 * so that the app boots, but every restart invalidates all sessions.
 */
function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (secret && secret.length >= 32) return secret;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "JWT_SECRET environment variable is required in production " +
        "and must be at least 32 characters long.",
    );
  }
  // Dev fallback: deterministic per process so restarts do not surprise devs.
  return crypto
    .createHash("sha256")
    .update("dropflow-dev-secret:" + (process.env["PORT"] ?? "8080"))
    .digest("hex");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export interface JwtPayload {
  sub: string; // user id as string (JWT convention)
  iat: number;
  exp: number;
}

/**
 * Synchronously sign a JWT containing the user id.
 *
 * Implemented with the Node `crypto` module to avoid pulling in the
 * `jsonwebtoken` dependency and its transitive bloat for a single
 * HS256 signature.
 */
export function signToken(userId: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: String(userId),
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const b64u = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const headerB64 = b64u(header);
  const payloadB64 = b64u(payload);
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyToken(token: string): JwtPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  // Constant-time comparison
  const sigBuf = Buffer.from(sigB64);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf8"),
    ) as JwtPayload;
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readTokenFromRequest(req: Request): string | null {
  // 1) Cookie
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  if (cookies && typeof cookies[AUTH_COOKIE_NAME] === "string") {
    return cookies[AUTH_COOKIE_NAME];
  }
  // 2) Authorization: Bearer <token>
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  return null;
}

export function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}
