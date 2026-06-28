@echo off
title DropFlow
color 0B
echo ========================================================
echo   DropFlow
echo ========================================================
echo.

:: Make sure dependencies are set up
if not exist node_modules (
    echo [1/2] Dependencies not found. Running setup...
    call pnpm install --no-frozen-lockfile
    if %errorlevel% neq 0 (
        echo [ERROR] pnpm install failed.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [1/2] Dependencies already installed.
    echo.
)

:: Make sure env file exists
if not exist .env (
    echo [2/2] .env not found. Creating from template...
    if exist .env.example copy .env.example .env
    echo.
    echo [IMPORTANT] Edit .env with your database credentials before continuing.
    pause
    exit /b 1
) else (
    echo [2/2] .env already exists.
    echo.
)

echo Starting server and frontend...
echo Close this window to stop everything.
echo.

:: Run the API server
start "DropFlow API" cmd /c "pnpm run dev:server"

:: Give the server a moment to boot before opening the client
timeout /t 3 /nobreak >nul

:: Open the frontend - Vite will auto-select the next free port if needed
start "DropFlow Frontend" cmd /c "pnpm run dev:client"

echo.
echo If ports are busy, the frontend may use 3001/3002/etc.
echo Look at the Frontend window to see the actual port.
echo.
pause
