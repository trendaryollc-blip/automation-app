@echo off
REM DropFlow — cross-platform dev start (Windows).
setlocal
cd /d "%~dp0\.."
call pnpm run dev
endlocal
