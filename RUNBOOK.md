# Operations Runbook

A short, opinionated guide for the on-call engineer. Keep this file
under 5 minutes of reading. If a step here gets too long, link out to a
dedicated doc instead.

## Quick links

- **App (frontend + API)**: Vercel project `dropflow`
- **Database**: managed Postgres (Neon / Vercel Postgres / Supabase / RDS)
- **Email**: Resend (`https://resend.com`)
- **Error tracking**: Sentry
- **Logs**: Vercel function logs (JSON pino output)
- **Uptime monitor**: external service pointed at `/api/healthz`
- **Status page**: see `docs/STATUS_PAGE.md`
- **Repo / CI**: GitHub → repo → Actions

## Health endpoints

| Endpoint       | Purpose                              | What 5xx means                |
| -------------- | ------------------------------------ | ----------------------------- |
| `/api/healthz` | Liveness — "is the process up?"      | Process crashed / not booted  |
| `/api/readyz`  | Readiness — "is the DB reachable?"   | DB outage, blocked by 503     |

The uptime monitor should poll `/api/healthz` every 60s with a 5s
timeout. Alert on 2 consecutive failures.

## Common incidents

### 1. "Signup is broken" / "Emails not going out"

1. Check Sentry for new errors tagged with `signup` or `email`.
2. In Resend, look at the "Logs" tab for failed sends and bounces.
3. Confirm `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` are set in
   Vercel (Settings → Environment Variables).  Rotate the key if it
   leaked.
4. Confirm `EMAIL_FROM` is on a verified domain.  Resend will reject
   otherwise.

### 2. "Users can't log in" / "JWT errors in Sentry"

1. Check `JWT_SECRET` in Vercel.  If it was rotated, **all sessions are
   invalidated** — that is expected.  Communicate via status page.
2. Confirm `NODE_ENV=production` in Vercel.  If dev, the per-process
   fallback secret is in use and every cold start invalidates
   sessions.
3. Check Postgres connectivity from `/api/readyz`.

### 3. "Database is slow / queries timing out"

1. Check Vercel logs for repeated `db.execute` timeouts.
2. In your DB console, run `SELECT * FROM pg_stat_activity ORDER BY
   query_start DESC LIMIT 20;` to see long-running queries.
3. If a specific route is hot, check for missing indexes — most tables
   have `userId` indexed by FK convention; `orders` has additional
   indexes on `createdAt` and `status` in the schema.
4. As a stop-gap, scale up the DB plan or add a connection pooler
   (PgBouncer / Neon pooler).  Restart function instances by
   re-deploying if needed.

### 4. "Sentry is full of 500s"

1. Open Sentry, group by `error.message`, find the top issue.
2. Click the latest event, look at the request id, grep Vercel logs.
3. If the issue is in a third-party (Resend, Sentry SDK, etc.), check
   their status page.

### 5. "I need to disable signup RIGHT NOW"

Set `SIGNUP_ENABLED=false` in Vercel env vars and re-deploy.  The
`POST /api/auth/signup` endpoint will return 403.  This is
documented and tested in `env.ts` and `auth.ts`.

### 6. "I need to roll back the last deploy"

Vercel → Project → Deployments → click the previous successful
deployment → "Promote to Production".  One click, takes ~30s.  No DB
migration rollback is needed for app-only rollbacks.

### 7. "I think a customer has been compromised"

1. Disable the user: set `is_disabled = true` in `users` (you can do
   this with a one-off DB query).
2. Force a password reset by clearing `password_hash` is too aggressive
   — instead, ask the user to use the forgot-password flow.
3. Rotate `JWT_SECRET` if the compromise was credential-based.
4. Check `Sentry` for the user's recent activity in the same timeframe.

## Deploy checklist (every release)

- [ ] `pnpm run typecheck` and `pnpm run test` are green on the PR.
- [ ] `pnpm run build` succeeds.
- [ ] Preview deployment was smoke-tested manually (signup → login →
      one product create).
- [ ] No new `console.log` left in `main` (Prettier + lint is a good
      guard).
- [ ] CHANGELOG entry added for user-visible changes.

## Secrets rotation schedule

| Secret            | Rotation cadence             | Owner       |
| ----------------- | ---------------------------- | ----------- |
| `JWT_SECRET`      | Quarterly + on compromise    | Eng on-call |
| `RESEND_API_KEY`  | Annually + on compromise     | Eng on-call |
| `SENTRY_DSN`      | On compromise only           | Eng on-call |
| `DATABASE_URL`    | Quarterly (DB user password) | Eng on-call |

## When in doubt

1. Check `Sentry` first.
2. Check Vercel logs second.
3. Check `/api/readyz` third.
4. Page a teammate before doing anything destructive.
