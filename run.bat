@echo off
REM ============================================================
REM  FFmpeg Audio Manager - dev launcher
REM  Starts Vite + the Electron main-process watcher + Electron.
REM ============================================================
setlocal
cd /d "%~dp0audio-manager-electron"

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js / npm not found in PATH. Install Node.js first.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [SETUP] Installing dependencies - first run only...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [START] Launching FFmpeg Audio Manager...
call npm run start
endlocal
