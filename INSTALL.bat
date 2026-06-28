@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title DropFlow - One-Click Setup
color 0A

echo.
echo ========================================
echo   DropFlow Complete Setup
echo ========================================
echo.

:: Check prerequisites
echo [CHECK] Verifying prerequisites...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 22+ from nodejs.org
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pnpm is not installed. Run: npm install -g pnpm
    pause
    exit /b 1
)

echo [OK] Node.js: 
node --version
echo [OK] pnpm: 
call pnpm --version
echo.

:: Step 1: Install all dependencies
echo [1/3] Installing dependencies...
echo       This may take 2-3 minutes depending on your internet speed.
echo.
call pnpm install --no-frozen-lockfile
if %errorlevel% neq 0 (
    echo [ERROR] Installation failed. Please check your internet connection.
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully!
echo.

:: Step 2: Install Firebase for Firestore support
echo [2/3] Adding Firebase Admin SDK...
call pnpm --filter @workspace/db add firebase-admin@^13.2.0
if %errorlevel% neq 0 (
    echo [WARN] Firebase install had issues, but core dependencies are ready.
) else (
    echo [OK] Firebase Admin SDK installed!
)
echo.

:: Step 3: Setup environment file
echo [3/3] Setting up environment...
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo [OK] Created .env file from template.
        echo.
        echo [IMPORTANT] Please edit .env and add your database credentials:
        echo   - For PostgreSQL: Set DATABASE_URL
        echo   - For Firestore: Set DB_MODE=firestore and Firebase credentials
    ) else (
        echo [WARN] .env.example not found. Please create .env manually.
    )
) else (
    echo [OK] .env already exists.
)
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Edit .env with your database credentials
echo   2. Run: pnpm run dev:server   (API server on port 8080)
echo   3. Run: pnpm run dev:client   (Frontend on port 3000)
echo   4. Or run both: pnpm run dev
echo.
echo For deployment to Vercel:
echo   1. Push to GitHub
echo   2. Import in Vercel dashboard
echo   3. Add environment variables in Vercel
echo.
pause
