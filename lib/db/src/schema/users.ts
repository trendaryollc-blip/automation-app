import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Users table — owns all data in the system.
 *
 * Every business table has a `userId` foreign key that references this table,
 * and every API query is scoped by the authenticated user's id.
 *
 * Production-only fields:
 *   - `emailVerifiedAt` — set after the user clicks the verification link
 *   - `passwordResetTokenHash` / `passwordResetExpiresAt` — single-use
 *     password-reset token.  Stored hashed, never in plain text.
 *   - `emailVerificationTokenHash` / `emailVerificationExpiresAt` —
 *     single-use email-verification token.  Stored hashed.
 *   - `failedLoginAttempts` / `lockedUntil` — basic account lockout
 *     after repeated failed logins.
 */
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", {
    withTimezone: true,
  }),
  emailVerificationTokenHash: text("email_verification_token_hash"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at", {
    withTimezone: true,
  }),
  failedLoginAttempts: serial("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  isDisabled: boolean("is_disabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  emailVerifiedAt: true,
  passwordResetTokenHash: true,
  passwordResetExpiresAt: true,
  emailVerificationTokenHash: true,
  emailVerificationExpiresAt: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  isDisabled: true,
});

export const publicUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = z.infer<typeof publicUserSchema>;
