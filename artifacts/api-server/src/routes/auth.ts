/**
 * Authentication routes.
 *
 *   POST /api/auth/signup           create account, send verify email
 *   POST /api/auth/login            log in with email/password
 *   POST /api/auth/logout           clear session
 *   GET  /api/auth/me               current user
 *   POST /api/auth/verify-email     confirm email with token
 *   POST /api/auth/resend-verify    resend verification email
 *   POST /api/auth/forgot-password  start password reset
 *   POST /api/auth/reset-password   complete password reset
 *   POST /api/auth/change-password  change password while logged in
 *   DELETE /api/auth/account        delete account + data (GDPR)
 *   GET  /api/auth/data-export      download user data (GDPR)
 *
 * SECURITY:
 *  - Login throttling: 5 failed attempts => 15-minute lockout.
 *  - Tokens are SHA-256 hashed before being stored in the DB.
 *  - All responses are JSON, no PII leaks in errors.
 */
import { Router, type IRouter, type Response } from "express";
import { z } from "zod/v4";
import { and, eq, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  publicUserSchema,
  productsTable,
  suppliersTable,
  ordersTable,
  researchTable,
  supplierFinderTable,
  priceWatchTable,
  purchaseOrdersTable,
  returnsTable,
  orderTimelineTable,
  promotionsTable,
  productTagsTable,
  launchesTable,
  adCampaignsTable,
  storeConnectionsTable,
  aiSettingsTable,
  fulfillmentQueueTable,
} from "@workspace/db";
import {
  AUTH_COOKIE_NAME,
  hashPassword,
  isProduction,
  signToken,
  TOKEN_TTL_SECONDS,
  verifyPassword,
} from "../lib/auth.js";
import { currentUser, requireAuth } from "../middlewares/auth.js";
import { renderSimpleEmail, sendEmail } from "../lib/email.js";
import {
  emailVerifyExpiry,
  generateToken,
  hashToken,
  passwordResetExpiry,
} from "../lib/tokens.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: TOKEN_TTL_SECONDS * 1000,
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
  });
}

function publicUser(row: typeof usersTable.$inferSelect) {
  return publicUserSchema.parse({
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: !!row.emailVerifiedAt,
    createdAt: row.createdAt.toISOString(),
  });
}

function readString(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function isSignupEnabled(): boolean {
  const v = (readString("SIGNUP_ENABLED") || "true").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function appBaseUrl(): string {
  return readString("APP_URL") || "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const SignupBody = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z.string().min(1).max(120).optional(),
});

const LoginBody = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(1).max(128),
});

const ForgotPasswordBody = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
});

const ResetPasswordBody = z.object({
  token: z.string().min(10).max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

const VerifyEmailBody = z.object({
  token: z.string().min(10).max(200),
});

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

router.post("/auth/signup", async (req, res): Promise<void> => {
  if (!isSignupEnabled()) {
    res
      .status(403)
      .json({ error: "Public signup is disabled. Contact your admin." });
    return;
  }
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, name } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing) {
    res
      .status(409)
      .json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name: name ?? null })
    .returning();

  // Send verification email (best-effort; never blocks signup)
  try {
    await sendVerificationEmail(created);
  } catch (err) {
    logger.error(
      { err, userId: created.id },
      "Failed to send verification email",
    );
  }

  const token = signToken(created.id);
  setAuthCookie(res, token);

  res.status(201).json({ user: publicUser(created) });
});

// ---------------------------------------------------------------------------
// Login (with lockout)
// ---------------------------------------------------------------------------

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!user || user.isDisabled) {
    // Still hash to keep response time roughly constant.
    await verifyPassword(
      password,
      "$2a$12$invalid.hash.placeholder.value.xxxxxxxxxxxxxx",
    );
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    res.status(429).json({
      error:
        "Account temporarily locked due to too many failed login attempts. " +
        "Try again in a few minutes or reset your password.",
    });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    // Increment failed counter; lock if threshold reached.
    const newCount = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newCount >= MAX_FAILED_LOGINS;
    await db
      .update(usersTable)
      .set({
        failedLoginAttempts: newCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_DURATION_MS)
          : null,
      })
      .where(eq(usersTable.id, user.id));
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Successful login: reset counter.
  await db
    .update(usersTable)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(usersTable.id, user.id));

  const token = signToken(user.id);
  setAuthCookie(res, token);

  res.json({ user: publicUser(user) });
});

// ---------------------------------------------------------------------------
// Logout / me
// ---------------------------------------------------------------------------

router.post("/auth/logout", (_req, res): void => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.get("/auth/me", requireAuth, (req, res): void => {
  res.json({ user: currentUser(req) });
});

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

async function sendVerificationEmail(
  user: typeof usersTable.$inferSelect,
): Promise<void> {
  const { token, hash } = generateToken();
  await db
    .update(usersTable)
    .set({
      emailVerificationTokenHash: hash,
      emailVerificationExpiresAt: emailVerifyExpiry(),
    })
    .where(eq(usersTable.id, user.id));

  const url = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const { text, html } = renderSimpleEmail({
    title: "Verify your DropFlow email",
    preheader: "One click to confirm your account.",
    body:
      `Hi${user.name ? ` ${user.name}` : ""},\n\n` +
      `Welcome to DropFlow! Please confirm your email address to unlock ` +
      `all features. The link is valid for 24 hours.`,
    ctaLabel: "Verify email",
    ctaUrl: url,
    footer:
      "If you didn't create this account, you can safely ignore this email.",
  });
  await sendEmail({
    to: user.email,
    subject: "Verify your DropFlow email",
    text,
    html,
  });
}

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { token } = parsed.data;
  const tokenHash = hashToken(token);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.emailVerificationTokenHash, tokenHash),
        gt(usersTable.emailVerificationExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Invalid or expired verification link" });
    return;
  }

  await db
    .update(usersTable)
    .set({
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    })
    .where(eq(usersTable.id, user.id));

  res.json({
    ok: true,
    user: publicUser({ ...user, emailVerifiedAt: new Date() }),
  });
});

router.post(
  "/auth/resend-verify",
  requireAuth,
  async (req, res): Promise<void> => {
    const u = currentUser(req);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, u.id))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.emailVerifiedAt) {
      res.json({ ok: true, message: "Email already verified" });
      return;
    }
    try {
      await sendVerificationEmail(user);
    } catch (err) {
      logger.error({ err, userId: user.id }, "resend-verify failed");
      res.status(500).json({ error: "Failed to send verification email" });
      return;
    }
    res.json({ ok: true });
  },
);

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email } = parsed.data;

  // Always respond 200 with the same message to prevent user-enumeration.
  const generic = { ok: true } as const;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!user) {
    res.json(generic);
    return;
  }

  const { token, hash } = generateToken();
  await db
    .update(usersTable)
    .set({
      passwordResetTokenHash: hash,
      passwordResetExpiresAt: passwordResetExpiry(),
    })
    .where(eq(usersTable.id, user.id));

  const url = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const { text, html } = renderSimpleEmail({
    title: "Reset your DropFlow password",
    preheader: "Use this link within the next hour.",
    body:
      "We received a request to reset the password for your DropFlow account. " +
      "Click the button below to choose a new password. The link is valid for 1 hour.",
    ctaLabel: "Reset password",
    ctaUrl: url,
    footer:
      "If you didn't request this, you can safely ignore this email and your password will stay the same.",
  });
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your DropFlow password",
      text,
      html,
    });
  } catch (err) {
    logger.error({ err, userId: user.id }, "forgot-password email failed");
  }

  res.json(generic);
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.passwordResetTokenHash, tokenHash),
        gt(usersTable.passwordResetExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(usersTable)
    .set({
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(usersTable.id, user.id));

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Change password (logged in)
// ---------------------------------------------------------------------------

router.post(
  "/auth/change-password",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = ChangePasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { currentPassword, newPassword } = parsed.data;
    const u = currentUser(req);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, u.id))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await hashPassword(newPassword);
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, user.id));
    res.json({ ok: true });
  },
);

// ---------------------------------------------------------------------------
// GDPR: account deletion & data export
// ---------------------------------------------------------------------------

/**
 * Every user-owned table declares a foreign key to `users.id` with
 * `onDelete: "cascade"`, so deleting the user row in a single
 * transaction transparently removes all owned data.  We rely on the
 * database as the source of truth for the cascade graph — this avoids
 * a fragile list of table names and a `sql.raw` round-trip.
 *
 * If you ever add a new owned table, just give its `userId` column a
 * `.references(() => usersTable.id, { onDelete: "cascade" })` and the
 * deletion will keep working with no change to this file.
 */
router.delete("/auth/account", requireAuth, async (req, res): Promise<void> => {
  const u = currentUser(req);
  await db.transaction(async (tx) => {
    await tx.delete(usersTable).where(eq(usersTable.id, u.id));
  });
  clearAuthCookie(res);
  res.status(204).end();
});

/**
 * Tables whose rows are owned by a user and should be included in the
 * GDPR data export.  Each table exposes a `userId` column, so we use a
 * small generic loop instead of a per-table handler.
 */
type OwnedTable = {
  key: string;
  table: {
    userId: import("drizzle-orm/pg-core").PgColumn;
  };
};

const OWNED_TABLES: OwnedTable[] = [
  { key: "products", table: productsTable },
  { key: "suppliers", table: suppliersTable },
  { key: "orders", table: ordersTable },
  { key: "research", table: researchTable },
  { key: "supplierFinder", table: supplierFinderTable },
  { key: "priceWatch", table: priceWatchTable },
  { key: "purchaseOrders", table: purchaseOrdersTable },
  { key: "returns", table: returnsTable },
  { key: "orderTimeline", table: orderTimelineTable },
  { key: "promotions", table: promotionsTable },
  { key: "productTags", table: productTagsTable },
  { key: "launches", table: launchesTable },
  { key: "adCampaigns", table: adCampaignsTable },
  { key: "storeConnections", table: storeConnectionsTable },
  { key: "aiSettings", table: aiSettingsTable },
  { key: "fulfillmentQueue", table: fulfillmentQueueTable },
];

router.get(
  "/auth/data-export",
  requireAuth,
  async (req, res): Promise<void> => {
    const u = currentUser(req);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, u.id))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Fetch the user's owned rows.  We do this in a single transaction
    // so the export is a consistent snapshot of the user's data.
    const data: Record<string, unknown[]> = {};
    await db.transaction(async (tx) => {
      for (const { key, table } of OWNED_TABLES) {
        const rows = await tx
          .select()
          .from(table as never)
          .where(eq(table.userId, u.id));
        data[key] = rows;
      }
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      data,
    };
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="dropflow-data.json"',
    );
    res.json(exportData);
  },
);

export default router;
