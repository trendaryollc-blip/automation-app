# Changelog

All notable changes to DropFlow are documented in this file.  The format
is based on [Keep a Changelog](https://keepachangelog.com/) and this
project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-30

First production-ready cut.  Everything below was added or hardened
relative to the previous dev snapshot.

### Added
- **Authentication & security**
  - Account lockout after 5 failed logins (15-minute cooldown).
  - Forgot-password + reset-password flow with SHA-256 hashed tokens.
  - Email verification flow (24h expiry).
  - Change-password endpoint for logged-in users.
  - Account-disable flag (manual ban support).
  - `SIGNUP_ENABLED` env flag to disable public signup in production.
  - Production startup validation that refuses to boot with
    `JWT_SECRET` placeholder, `CORS_ORIGIN=*`, or missing `DATABASE_URL`.
  - GDPR: `DELETE /api/auth/account` and `GET /api/auth/data-export`.
- **Email service** (`lib/email.ts`)
  - Pluggable provider: `log` (default) or `resend`.
  - Simple HTML email renderer.
- **Webhook signature verification** (`lib/webhook-signature.ts`)
  - HMAC-SHA256 with timestamp + raw body, 5-minute clock skew.
  - Header format: `X-DropFlow-Signature: t=<ts>,v1=<hex>`.
- **Server-side error reporting** (`lib/error-reporter.ts`)
  - Posts to Sentry when `SENTRY_DSN` is set; no-op otherwise.
  - Wired into the global error handler so every unhandled exception
    is captured with request context.
- **Frontend**
  - `forgot-password`, `reset-password`, `verify-email`, `terms`,
    `privacy` pages, all wired into the router.
  - Login page links to password reset, Terms, and Privacy.
  - Signup page shows Terms and Privacy.
  - Top-level `ErrorBoundary` with optional Sentry-style reporting
    when `VITE_SENTRY_DSN` is set.
  - `AccountMenu` in the sidebar: change password, export data
    (GDPR), delete account (GDPR), sign out.
  - `VerifyEmailBanner` shown when a logged-in user has not yet
    verified their email.
  - React Query tuned with sane defaults.
- **Health & observability**
  - `GET /api/healthz` — liveness probe.
  - `GET /api/readyz`  — readiness probe with DB round-trip.
- **Build & deploy**
  - LICENSE field added to every `package.json`.
  - `mockup-sandbox` removed from the pnpm workspace (kept on disk
    for local use only).
  - Coverage gate bumped to 60% on statements/branches/functions and
    55% on lines.
  - Cross-platform setup/start scripts in `scripts/`.
  - Vercel hardening: HSTS, X-Content-Type-Options, X-Frame-Options,
    Referrer-Policy, Permissions-Policy, **Content-Security-Policy**,
    immutable asset caching, `no-store` on `/api/*`.
- **Documentation**
  - `README.md` (rewritten with deployment guide).
  - `CHANGELOG.md` (this file).
  - `SECURITY.md` (vulnerability disclosure, security architecture).
  - `CONTRIBUTING.md` (local setup, PR workflow).
  - `PRODUCTION_CHECKLIST.md` (9-section operator checklist).
  - `docs/STATUS_PAGE.md` (template for status.dropflow.com).

### Changed
- `pnpm-workspace.yaml` now lists workspace packages explicitly so a
  future sandbox directory can't accidentally leak into CI.
- `db` / `pool` exports no longer use the `!` non-null assertion; in
  Firestore mode they are proxies that throw a clear error.
- `lib/db/src/seed.ts` refuses to run in production unless
  `FORCE_SEED=1` is set, and generates a random password + email in
  that case.
- Order numbers in seed use `DF-<base36-timestamp><random-suffix>`
  so business volume is not exposed sequentially.

### Removed
- Windows-only `INSTALL.bat`, `Resume.bat`, root-level `setup.bat` /
  `Start.bat`.  Use `scripts/setup.{sh,bat}` and
  `scripts/start.{sh,bat}` instead.
- Throwaway `debug-*.{mjs,ts}` and `temp-*` files at the repo root.

### Security
- README, SECURITY.md, and PRODUCTION_CHECKLIST.md document the
  minimum required environment for a production deploy.
- Helmet + trust-proxy + per-route CORS already in place; new
  security headers (CSP, Permissions-Policy, immutable cache,
  no-store on API) enforced at the Vercel edge.
- Webhook receivers authenticate via `X-DropFlow-Key` AND verify
  `X-DropFlow-Signature` HMAC.

## [0.0.0] - initial dev snapshot

Pre-release development version.  Not safe to expose to customers.
