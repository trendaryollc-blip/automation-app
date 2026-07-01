# Security Policy

DropFlow takes the security of customer data seriously.  This document
explains how to report a vulnerability, what we promise, and what we
expect from you.

## Supported versions

| Version | Supported           |
| ------- | ------------------- |
| 0.1.x   | ✅ Active           |
| < 0.1   | ❌ No longer maintained |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Email **security@dropflow.com** with:

1. A clear description of the issue and its impact.
2. Reproduction steps, ideally with a minimal proof of concept.
3. The version / commit SHA you observed the issue on.
4. Your name / handle if you'd like to be credited in the fix
   announcement (optional).

We will:

- Acknowledge your email within **3 business days**.
- Provide a status update within **7 business days**.
- Work with you to coordinate disclosure and a fix timeline.

We follow a 90-day responsible-disclosure window.  Please give us a
reasonable amount of time to patch before publishing details.

## Security architecture (high level)

- **Passwords**: bcrypt, 12 rounds, never logged.
- **Sessions**: signed JWT in an HTTP-only, `SameSite=Lax` cookie. The
  `Secure` flag is set automatically in production.
- **Tokens** (password-reset, email-verify): random 32 bytes,
  base64url-encoded, hashed with SHA-256 before being stored in the
  database.  Plaintext tokens are never persisted.
- **Rate limiting**: 300 req/min/IP globally, 30/15min on auth.
  Account-level lockout after 5 consecutive failed logins.
- **CORS**: only the configured `CORS_ORIGIN` (production refuses `*`).
- **CSP / headers**: HSTS, X-Frame-Options=DENY, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy applied at the Vercel edge.
- **Logging**: structured pino logs, no PII, request IDs for tracing.
- **Database**: row-level scoping by `userId`; queries are
  authenticated and parameterized via Drizzle ORM.

## What you (the operator) are responsible for

- Rotating `JWT_SECRET` on any suspected compromise and on a
  quarterly schedule.
- Setting `CORS_ORIGIN` to the **exact** production origin.
- Provisioning managed PostgreSQL (Vercel Postgres / Neon / Supabase
  / RDS) with TLS-only connections and automated backups.
- Provisioning managed email (Resend) and never logging raw customer
  emails.
- Provisioning error monitoring (Sentry) and reviewing alerts.
- Reviewing the `SECURITY.md` and `PRODUCTION_CHECKLIST.md` on every
  release.
- Following the principle of least privilege for database users and
  CI secrets.

## Acknowledgements

We'd like to thank the security researchers and customers who have
helped us improve DropFlow.
