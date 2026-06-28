# DropFlow - Dropshipping Automation Platform

A full dropshipping automation platform covering product hunting, supplier management, product research with AI-generated descriptions, and end-to-end order fulfillment.

## Tech Stack

- **Monorepo**: pnpm workspaces, Node.js 25, TypeScript 5.9
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Framer Motion + wouter + React Query
- **API**: Express 5
- **Database**: PostgreSQL + Drizzle ORM **or** Firestore (configurable via `DB_MODE`)
- **Validation**: Zod, drizzle-zod
- **API Codegen**: Orval (from OpenAPI spec)
- **API Build**: esbuild (bundled ESM)
- **Deployment**: Vercel (frontend + serverless API)
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites

- Node.js 22+ (v25 recommended)
- pnpm 11+ (`npm install -g pnpm`)
- PostgreSQL (default) OR a Firebase project

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
pnpm run db:push          # For PostgreSQL
# OR for Firestore:
pnpm --filter @workspace/db run seed:firestore
```

## Database Options

### PostgreSQL (default)

Set `DB_MODE=postgres` (or leave unset) and provide a `DATABASE_URL`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dropflow
```

### Firestore

Set `DB_MODE=firestore` and provide Firebase credentials:

**Option A** - Service account JSON:

```
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

**Option B** - Environment variables:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Project Structure

```
Drop-Ship-Automatezip/
├── api/                    # Vercel serverless function
├── artifacts/
│   ├── api-server/         # Express API server
│   ├── dropflow/           # React frontend
│   └── mockup-sandbox/     # UI prototyping sandbox
├── lib/
│   ├── db/                 # Database (Drizzle + Firestore)
│   ├── api-zod/            # Generated Zod schemas
│   └── api-client-react/   # Generated React Query hooks
├── .env.example            # Env template
├── vercel.json             # Vercel config
├── setup.bat               # Windows setup script
└── package.json            # Workspace root
```

## Available Commands

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `pnpm run dev`        | Start API + frontend              |
| `pnpm run dev:server` | Start API server only             |
| `pnpm run dev:client` | Start frontend only               |
| `pnpm run build`      | Typecheck + build all             |
| `pnpm run db:push`    | Push Drizzle schema to PostgreSQL |
| `pnpm run db:seed`    | Seed PostgreSQL data              |
| `pnpm run lint`       | Format check                      |
| `pnpm run format`     | Format all files                  |

## Vercel Deployment

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Configure:
   - **Framework**: Vite
   - **Build**: `pnpm run build`
   - **Output**: `artifacts/dropflow/dist`
   - **Install**: `pnpm install`
4. Add env vars in Vercel dashboard

## Environment Variables

| Variable                         | Required   | Description                     |
| -------------------------------- | ---------- | ------------------------------- |
| `PORT`                           | No         | API server port (default: 8080) |
| `DATABASE_URL`                   | PostgreSQL | PostgreSQL connection string    |
| `DB_MODE`                        | No         | `postgres` or `firestore`       |
| `FIREBASE_PROJECT_ID`            | Firestore  | Firebase project ID             |
| `FIREBASE_CLIENT_EMAIL`          | Firestore  | Service account email           |
| `FIREBASE_PRIVATE_KEY`           | Firestore  | Service account private key     |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firestore  | Path to service account JSON    |
| `VITE_API_URL`                   | No         | API URL for dev proxy           |
| `CORS_ORIGIN`                    | No         | CORS origin for production      |

## Architecture

- **OpenAPI-first**: API contracts in `openapi.yaml` → codegen → Zod schemas + React hooks
- **Dual DB**: PostgreSQL (Drizzle ORM) or Firestore (Firebase Admin SDK) via `DB_MODE`
- **AI descriptions**: Template-based generator, swappable for real LLM
- **Order numbers**: Auto-generated as `DF-<timestamp>`

### Run Development

```bash
# Run both API server and frontend together:
pnpm run dev

# Or run them separately:
pnpm run dev:server  # API server (port 8080)
pnpm run dev:client  # Frontend (port 3000)
```
