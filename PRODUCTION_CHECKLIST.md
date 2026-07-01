# Production Deployment Checklist

This is the **minimum** you must do before exposing DropFlow to paying
customers.  Each item is something that can break the launch if you
skip it.

## 1. Secrets & environment

- [ ] `JWT_SECRET` is a fresh 32+ char random value (NOT the
      example/placeholder).  `openssl rand -hex 32` is a good source.
- [ ] `CORS_ORIGIN` is set to the **exact** production origin, e.g.
      `https://app.dropflow.com`.  Do NOT leave `*`.
- [ ] `DATABASE_URL` points to a managed Postgres with TLS, automated
      backups, and PITR enabled (or to a production Firestore project
      with export schedule).
- [ ] `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` is set to a real
      Resend API key with a verified sending domain.
- [ ] `EMAIL_FROM` is a real address on a domain you control
      (DKIM/SPF/DMARC configured).
- [ ] `APP_URL` is the absolute origin of the deployed web app.
- [ ] `SIGNUP_ENABLED=false` for invite-only launches.
- [ ] `SENTRY_DSN` and `VITE_SENTRY_DSN` are set to a real Sentry
      project.  `SENTRY_TRACES_SAMPLE_RATE=0.1` for prod traffic.
- [ ] No `.env`, no service-account JSON, no `firebase-*.json`, no
      `temp-*` files are committed to the repository.

## 2. Database

- [ ] `pnpm --filter @workspace/db run push` ran against the
      production database.
- [ ] All new columns introduced in this version (notably the auth
      fields added to `users`) are present.  Run the migration and
      verify with `\d users` in psql or a schema dump.
- [ ] Backups are running.  Test a restore.
- [ ] No demo data exists in the production database.
      The seed script will refuse to run in prod unless `FORCE_SEED=1`.

## 3. Frontend

- [ ] `VITE_API_URL` is unset (so the app uses same-origin) OR set to
      the absolute origin of the API.
- [ ] The Terms of Service and Privacy Policy pages are reviewed by
      your legal counsel.  Update the company name, address, contact
      email, and effective date in `pages/terms.tsx` /
      `pages/privacy.tsx`.
- [ ] The login page is reachable at the canonical URL and
      redirects to the dashboard after sign-in.
- [ ] Signup is closed (`SIGNUP_ENABLED=false`) for invite-only
      launches, OR you've decided public signup is OK and the email
      service is delivering reliably.

## 4. Infrastructure

- [ ] Vercel project created from the GitHub repo.
- [ ] `vercel.json` security headers (HSTS, X-Frame-Options, etc.)
      are in effect.  Test with `curl -I https://app.dropflow.com`.
- [ ] Custom domain configured with HTTPS.
- [ ] Rate limit, body-size limit, and helmet defaults verified by
      hitting the deployed `/api/healthz` endpoint.
- [ ] Cold-start acceptable.  Increase `maxDuration` in
      `vercel.json` if your endpoints routinely exceed 30s.

## 5. Observability

- [ ] Sentry is receiving test events from both client and server.
- [ ] Pino logs are visible in Vercel's log stream.
- [ ] `/api/healthz` and `/api/readyz` return 200 from the deployed
      URL.
- [ ] Uptime monitor pointed at `/api/healthz` with email/Slack
      alerting on failure.
- [ ] (Recommended) Status page configured (e.g. statuspage.io or
      self-hosted).

## 6. Customer-facing

- [ ] Support email (`support@dropflow.com` or similar) is monitored.
- [ ] Password-reset and email-verification flows tested end-to-end
      with a real customer email.
- [ ] Account-deletion and data-export flows tested end-to-end
      (GDPR).
- [ ] `Terms` and `Privacy` pages linked from the signup / login
      footer.

## 7. CI / quality

- [ ] CI is green on `main`.
- [ ] Coverage gate is at the production threshold (60% / 60% /
      60% / 55%) — see `scripts/check-coverage.cjs`.  Override with
      `COVERAGE_MIN_PCT` only with a written justification.

## 8. Pre-launch

- [ ] Run a closed beta with 5–10 friendly users for one week.
- [ ] Have a rollback plan (Vercel → previous deployment is one click).
- [ ] Have an incident-response runbook (who to page, who to email,
      which dashboards to check, how to disable signup in a hurry).

## 9. Post-launch (within 24h)

- [ ] Watch error rates, signup completion, and password-reset
      requests in Sentry + Vercel logs.
- [ ] Read every support email personally for the first week.
- [ ] Schedule a security review for week 3.

---

If anything on this list is unclear, open a discussion issue — the
answers belong in the docs.
