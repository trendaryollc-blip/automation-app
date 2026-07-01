@echo off
REM DropFlow — cross-platform setup script (Windows).
REM On macOS / Linux, use scripts/setup.sh instead.
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==^> DropFlow setup (Windows)

REM 1. Verify Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Please install Node 22+ from https://nodejs.org 1>&2
  exit /b 1
)

REM 2. Verify pnpm
where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm is not installed. Install with: npm install -g pnpm 1>&2
  exit /b 1
)

REM 3. Install dependencies
echo ==^> Installing dependencies
call pnpm install || exit /b 1

REM 4. Copy .env if missing
if not exist .env (
  echo ==^> Creating .env from .env.example
  copy /Y .env.example .env >nul
  echo     Remember to edit .env and set a real JWT_SECRET and DATABASE_URL.
)

REM 5. Build workspace deps
echo ==^> Building workspace packages
call pnpm --filter @workspace/api-zod run --if-present build || exit /b 1
call pnpm --filter @workspace/db run --if-present build || exit /b 1
call pnpm --filter @workspace/api-client-react run --if-present build || exit /b 1
call pnpm --filter "./artifacts/**" run --if-present build || exit /b 1
call pnpm --filter "./scripts/**" run --if-present build || exit /b 1

echo.
echo ==^> Setup complete!
echo     Start the dev server:   pnpm run dev
echo     Start the API only:     pnpm run dev:server
echo     Start the web only:     pnpm run dev:client
endlocal
