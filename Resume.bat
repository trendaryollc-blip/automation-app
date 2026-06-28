@echo off
title DropFlow - Resume Installation
color 0E

set "PROJECT_DIR=%~dp0"

echo ========================================================
echo   DropFlow - Resume Installation
echo ========================================================
echo.

echo Project folder:
echo %PROJECT_DIR%
echo.

echo Press Ctrl+C to cancel, or close this window to exit.
echo.
pause

cd /d "%PROJECT_DIR%"

echo [1/1] Resuming dependency installation...
echo       Using registry: https://registry.npmmirror.com
echo.
pnpm install --no-frozen-lockfile

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Installation failed.
    echo If it keeps failing, check your internet connection or proxy settings.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   Installation Complete
echo ========================================================
echo.
echo Next:
echo   1. Run: pnpm run dev:server   (API server on port 8080)
echo   2. Run: pnpm run dev:client   (Frontend on port 3000)
echo   3. Or run both: pnpm run dev
echo.
pause
