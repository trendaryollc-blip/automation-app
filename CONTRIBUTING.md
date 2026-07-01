# Contributing to DropFlow

Thanks for your interest in making DropFlow better!  This document
covers everything you need to know to get set up and submit a pull
request.

## Code of conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/).
By participating you agree to abide by its terms.  Be kind, assume
good faith, and help us keep this a welcoming community.

## Reporting bugs / requesting features

- Search [existing issues](../../issues) before opening a new one.
- Use the bug-report or feature-request template.
- For **security issues** see `SECURITY.md` — do **not** open a
  public GitHub issue.

## Local setup

### Prerequisites

- Node.js 22+ (the project is tested on 25.x)
- pnpm 11+
- PostgreSQL 14+ (or a Firebase project, if you plan to use Firestore)

### One-time

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET.

# 3. Initialize the database
pnpm --filter @workspace/db run push

# 4. Seed (optional, dev only)
pnpm --filter @workspace/db run seed

# 5. Build the workspace packages the API and web need
pnpm run build
```

### Run

```bash
pnpm run dev
# API on http://localhost:8080
# Web on http://localhost:3000
```

## Workflow

1. Create a feature branch off `main`:
   `git checkout -b feat/short-description`
2. Make small, focused commits with conventional-commit messages
   (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
3. Run the checks before pushing:
   ```bash
   pnpm run typecheck
   pnpm run lint
   pnpm run test
   pnpm run build
   ```
4. Open a pull request targeting `main`.
5. Address review feedback.  PRs require one approval and a green
   CI run.

## Code style

- TypeScript everywhere.  Avoid `any` outside of narrowly-scoped
  type assertions.
- Use the workspace `zod` package for runtime validation at every
  trust boundary (HTTP request, queue message, etc.).
- Database access goes through Drizzle ORM (`@workspace/db`); do
  not write raw SQL except in the documented account-deletion path.
- All routes must use `requireAuth` (or `optionalAuth`) and scope
  every query by `userId`.
- Errors: throw `HttpError` for predictable 4xx, log unexpected 5xx
  with a request id, never leak stack traces to the client.

## Testing

- Unit + integration tests use Vitest (`pnpm run test`).
- E2E tests use Playwright (`pnpm run test:e2e`).
- The coverage gate is enforced in CI: 60% statements / 60%
  branches / 60% functions / 55% lines.  Add or update tests with
  every behavioral change.

## Pull request checklist

- [ ] Tests added or updated.
- [ ] Type-check, lint, and tests all pass locally.
- [ ] New env vars documented in `.env.example` and `README.md`.
- [ ] Public API changes reflected in `openapi.yaml` (if applicable)
      and the regenerated Zod / React-Query clients.
- [ ] No debug logs, no committed secrets, no commented-out code.

## Release process

- Maintainers cut a release branch, run the full test matrix, and tag
  a SemVer version.
- The `CHANGELOG.md` is updated in the same PR as the version bump.
- A new GitHub release is published with notes from the changelog.

## License

By contributing you agree that your contributions will be licensed
under the project's existing license.
