# Database backup & restore

DropFlow stores all customer data in a managed Postgres database
(Neon / Vercel Postgres / Supabase / RDS — pick one and update this
doc).

## Backups

The managed Postgres provider is responsible for automated backups.
Specifically:

- **Daily full backup**, retained for **30 days**.
- **Point-in-time recovery (PITR)** enabled, retained for **7 days**.
- Backups are **encrypted at rest** with the provider's KMS.
- Backups live in the **same region** as the primary.

The above is the minimum.  If your provider offers cross-region
backup copies, enable them.  If your provider offers on-demand
backups, take one before every schema migration.

## Verifying backups

Schedule a **monthly** restore drill.  Pick a quiet weekend.  Steps:

1. Provision a new empty Postgres database (do not reuse the prod
   one).
2. Restore the most recent nightly backup into it.
3. Run the schema check:

   ```bash
   pnpm --filter @workspace/db run push
   ```

   This should be a no-op if the backup is consistent with the
   current schema.

4. Run the integration test suite against the restored DB:

   ```bash
   DATABASE_URL=postgres://...restored... pnpm run test
   ```

5. Spot-check a few rows:

   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM products;
   SELECT MAX(created_at) FROM orders;
   ```

   Numbers should be plausible (not zero, not a future date).

6. If everything looks good, drop the restored DB.  If not, open an
   incident with the provider and document the timeline.

## Manual backup before risky changes

Before any destructive operation (manual SQL, migration with
`--force`, schema rework), take a manual snapshot:

- **Neon**: Branch the project.  Branches are copy-on-write and free
  for the first month.
- **Vercel Postgres**: Use the dashboard "Create snapshot".
- **Supabase**: Use the CLI `supabase db snapshot`.
- **RDS**: Take a manual snapshot from the console.

## Restoring from backup

In the unlikely event of a real disaster:

1. **Don't panic.**  Verify the issue with `/api/readyz` and Sentry
   first; the DB is rarely the cause.
2. Open a PITR window with the provider for the timestamp **just
   before** the bad change.  Most providers let you do this in the
   console.
3. Restore into a new DB.  Do **not** overwrite the live DB until
   you've diffed the data.
4. Once verified, point `DATABASE_URL` at the restored DB and
   re-deploy.  Vercel will pick up the new env var on the next
   cold start.
5. Open a postmortem doc, share it with the team, and add the
   contributing factors to the next retro.

## What this doc does NOT cover

- **Firestore backups** (when `DB_MODE=firestore`).  If you switch
  modes, write a parallel procedure for Firestore's daily export to
  Cloud Storage.
- **Application-level backups** (e.g. uploaded images).  DropFlow
  doesn't store user-uploaded binaries today; if that changes, add
  S3/GCS backup procedures here.
- **Disaster recovery across regions.**  Add when you have customers
  in more than one region.
