# DropFlow - Dropshipping Automation Platform

A full dropshipping automation platform covering product hunting, supplier
management, product research with AI-generated descriptions, and end-to-end
order fulfillment.

## Tech stack

- **Monorepo**: pnpm workspaces, Node.js 22+, TypeScript 5.9
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Framer Motion + wouter + React Query
- **API**: Express 5
- **Database**: PostgreSQL + Drizzle ORM **or** Firestore (configurable via `DB_MODE`)
- **Validation**: Zod, drizzle-zod
- **API Build**: esbuild (bundled ESM)
- **Email**: Resend-compatible (`EMAIL_PROVIDER=resend`)
- **Deployment**: Vercel (frontend + serverless API)
- **CI/CD**: GitHub Actions
- **Error reporting**: Sentry-compatible

## Quick start

### Prerequisites

- Node.js 22+ (24/25 recommended)
- pnpm 11+ (`npm install -g pnpm`)
- PostgreSQL 14+ (default) **or** a Firebase project

### One-line setup

**macOS / Linux:**

```bash
./scripts/setup.sh
```

**Windows:**

```bat
scripts\setup.bat
```

This installs dependencies, builds the workspace packages, and creates
a `.env` from the template.

### Manual setup

```bash
pnpm install
cp .env.example .env
# Edit .env: set DATABASE_URL and a real JWT_SECRET.
pnpm --filter @workspace/db run push          # For PostgreSQL
pnpm run build
pnpm run dev
```

The API is on `http://localhost:8080`, the web on `http://localhost:3000`.

## Database options

### PostgreSQL (default)

Set `DB_MODE=postgres` (or leave unset) and provide `DATABASE_URL`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dropflow
```

### Firestore

Set `DB_MODE=firestore` and provide Firebase credentials:

```
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
# OR
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Project structure

```
.
├── api/                       # Vercel serverless function entry
├── artifacts/
│   ├── api-server/            # Express API server
│   ├── dropflow/              # React frontend
│   └── mockup-sandbox/        # UI prototyping sandbox (NOT in workspace)
├── lib/
│   ├── api-zod/               # Zod schemas
│   ├── api-client-react/      # React Query hooks
│   └── db/                    # Drizzle schema + Firestore repository
├── scripts/                   # cross-platform setup / start / coverage
├── .env.example               # Env template
├── vercel.json                # Vercel config + security headers
├── CHANGELOG.md
├── SECURITY.md
├── CONTRIBUTING.md
└── PRODUCTION_CHECKLIST.md
```

## Available commands

| Command               | Description                                |
| --------------------- | ------------------------------------------ |
| `pnpm run dev`        | Start API + frontend                       |
| `pnpm run dev:server` | Start API server only                      |
| `pnpm run dev:client` | Start frontend only                        |
| `pnpm run build`      | Typecheck + build all                      |
| `pnpm run db:push`    | Push Drizzle schema to PostgreSQL          |
| `pnpm run db:seed`    | Seed PostgreSQL data (dev only by default) |
| `pnpm run typecheck`  | TypeScript check across the workspace      |
| `pnpm run lint`       | Format check (Prettier)                    |
| `pnpm run format`     | Format all files                           |
| `pnpm run test`       | Run unit + integration tests with coverage |
| `pnpm run test:e2e`   | Run Playwright E2E tests                   |

## Going to production

**Read `PRODUCTION_CHECKLIST.md` first.** In summary:

1. Generate a strong `JWT_SECRET` (`openssl rand -hex 32`).
2. Set `CORS_ORIGIN` to the exact production origin (NOT `*`).
3. Provision managed Postgres / Firestore with backups.
4. Provision Resend (or another provider) for email.
5. Set `SIGNUP_ENABLED=false` for invite-only launches.
6. Set Sentry DSN for error monitoring.
7. Have a lawyer review `pages/terms.tsx` and `pages/privacy.tsx`.
8. Run a closed beta before opening the doors.

The server **refuses to boot** in production if any of the following
are missing or set to an unsafe default:

- `JWT_SECRET` < 32 characters
- `CORS_ORIGIN=*` or unset
- `DATABASE_URL` missing (when `DB_MODE=postgres`)

This is enforced in `artifacts/api-server/src/lib/env.ts`.

## Vercel deployment

1. Push to GitHub.
2. Import the repo at [vercel.com](https://vercel.com).
3. Configure:
   - **Framework**: Vite
   - **Build**: `pnpm run build`
   - **Output**: `artifacts/dropflow/dist`
   - **Install**: `pnpm install`
4. Add env vars in the Vercel dashboard (see `.env.example`).
5. Add a custom domain; HTTPS is automatic.

`vercel.json` includes HSTS, X-Frame-Options, X-Content-Type-Options,
Referrer-Policy, and Permissions-Policy by default.

## Environment variables

| Variable                         | Required       | Description                                      |
| -------------------------------- | -------------- | ------------------------------------------------ |
| `PORT`                           | No             | API server port (default: 8080)                  |
| `DATABASE_URL`                   | PostgreSQL     | PostgreSQL connection string                     |
| `DB_MODE`                        | No             | `postgres` or `firestore`                        |
| `FIREBASE_PROJECT_ID`            | Firestore      | Firebase project ID                              |
| `FIREBASE_CLIENT_EMAIL`          | Firestore      | Service account email                            |
| `FIREBASE_PRIVATE_KEY`           | Firestore      | Service account private key                      |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firestore      | Path to service account JSON                     |
| `JWT_SECRET`                     | **Yes (prod)** | 32+ char random secret                           |
| `CORS_ORIGIN`                    | **Yes (prod)** | Exact production origin                          |
| `SIGNUP_ENABLED`                 | No             | `true`/`false`; `false` for invite-only launches |
| `VITE_API_URL`                   | No             | API URL (omit for same-origin on Vercel)         |
| `APP_URL`                        | Yes (prod)     | Public origin of the app, used in emails         |
| `EMAIL_PROVIDER`                 | No             | `log` (default) or `resend`                      |
| `RESEND_API_KEY`                 | If resend      | Resend API key                                   |
| `EMAIL_FROM`                     | If resend      | From address, e.g. `DropFlow <no-reply@…>`       |
| `SENTRY_DSN`                     | No             | Server-side Sentry DSN                           |
| `VITE_SENTRY_DSN`                | No             | Browser-side Sentry DSN                          |
| `LOG_LEVEL`                      | No             | `debug` / `info` / `warn` / `error`              |

## Architecture

- **OpenAPI-first**: contracts in `openapi.yaml` → codegen → Zod
  schemas + React hooks.
- **Dual DB**: PostgreSQL (Drizzle ORM) or Firestore (Firebase Admin
  SDK) via `DB_MODE`.
- **Auth**: JWT in HTTP-only cookies, bcrypt password hashing, account
  lockout, password reset & email verification, GDPR endpoints.
- **Order numbers**: `DF-<base36-timestamp><random-suffix>` —
  timestamp-based so business volume is not exposed sequentially.

## Security

See `SECURITY.md` for the supported-versions table, how to report
vulnerabilities, and the security architecture overview.

## License

UNLICENSED — see `LICENSE` for the full text.
