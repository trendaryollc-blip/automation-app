#!/usr/bin/env bash
# DropFlow — cross-platform dev start (macOS / Linux).
set -euo pipefail
cd "$(dirname "$0")/.."
exec pnpm run dev
