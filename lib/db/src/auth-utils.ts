/**
 * Password hashing helper used by the seed script.
 *
 * Thin wrapper around bcrypt so the seed script can be a single
 * .ts file.  The api-server has its own `lib/auth.ts` with the full
 * implementation.
 */
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
