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

echo [SETUP] Updating dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo [BUILD] Building FFmpeg Audio Manager...
call npm run build:vite
if errorlevel 1 (
    echo [ERROR] Vite build failed.
    pause
    exit /b 1
)
call npm run build:main
if errorlevel 1 (
    echo [ERROR] Main process build failed.
    pause
    exit /b 1
)

echo [START] Launching FFmpeg Audio Manager...
call npm run start
endlocal
