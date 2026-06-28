@echo off
echo ============================================
echo  DropFlow - Setup Script
echo ============================================
echo.

echo [1/4] Installing dependencies via pnpm...
call pnpm install --no-frozen-lockfile
if %errorlevel% neq 0 (
    echo ERROR: pnpm install failed.
    echo Make sure you have pnpm installed: npm install -g pnpm
    pause
    exit /b 1
)

echo.
echo [2/4] Installing Firebase Admin SDK...
call pnpm --filter @workspace/db add firebase-admin@^13.2.0

echo.
echo [3/4] Copying environment file...
if not exist .env (
    copy .env.example .env
    echo Created .env from .env.example - please edit it with your settings.
) else (
    echo .env already exists, skipping.
)

echo.
echo [4/4] Setup complete!
echo.
echo Next steps:
echo   1. Edit .env with your database credentials
echo   2. For Firestore, set DB_MODE=firestore and Firebase credentials in .env
echo   3. Run: pnpm run dev:server  (starts the API server)
echo   4. Run: pnpm run dev:client  (starts the frontend)
echo.
echo Or run both together: pnpm run dev
echo.
pause
