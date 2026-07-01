#!/usr/bin/env bash
# DropFlow — cross-platform setup script (macOS / Linux).
# On Windows, use scripts\setup.bat instead.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> DropFlow setup (Unix)"

# 1. Verify Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Please install Node 22+ from https://nodejs.org" >&2
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js >= 22 is required (found $(node -v))." >&2
  exit 1
fi

# 2. Verify pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed. Install with: npm install -g pnpm" >&2
  exit 1
fi

# 3. Install dependencies
echo "==> Installing dependencies"
pnpm install

# 4. Copy .env if missing
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  echo "    Remember to edit .env and set a real JWT_SECRET and DATABASE_URL."
fi

# 5. Build workspace deps
echo "==> Building workspace packages"
pnpm --filter @workspace/api-zod run --if-present build
pnpm --filter @workspace/db run --if-present build
pnpm --filter @workspace/api-client-react run --if-present build
pnpm --filter './artifacts/**' run --if-present build
pnpm --filter './scripts/**' run --if-present build

echo ""
echo "==> Setup complete!"
echo "    Start the dev server:   pnpm run dev"
echo "    Start the API only:     pnpm run dev:server"
echo "    Start the web only:     pnpm run dev:client"
