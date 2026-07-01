/**
 * Single-use, time-limited, hashed tokens for password-reset and
 * email-verification flows.
 *
 * Tokens are generated with Node's `crypto.randomBytes` and stored on
 * the user row as a SHA-256 hash.  Plain-text tokens are only ever
 * returned to the requester once (via the API response in dev, or in
 * the email link in production).  Hashing at rest means a database
 * leak does not let an attacker take over accounts.
 */
import { createHash, randomBytes } from "node:crypto";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const TOKEN_TTL = {
  passwordResetMs: PASSWORD_RESET_TTL_MS,
  emailVerifyMs: EMAIL_VERIFY_TTL_MS,
} as const;

export function passwordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS);
}

export function emailVerifyExpiry(): Date {
  return new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
}
