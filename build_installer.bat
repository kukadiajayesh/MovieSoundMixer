@echo off
REM ============================================================
REM  FFmpeg Audio Manager - local installer build (Windows)
REM  Builds the renderer + main process, then packages:
REM    release\FFmpeg Audio Manager Setup <version>.exe   (NSIS installer)
REM    release\FFmpeg Audio Manager <version>.exe          (portable)
REM  electron-builder cannot cross-package for macOS/Linux from here -
REM  run build_installer.sh on those OSes, or push a tag and let
REM  .github\workflows\build.yml build all three platforms in CI.
REM ============================================================
setlocal
cd /d "%~dp0audio-manager-electron"

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js / npm not found in PATH. Install Node.js first.
    pause
    exit /b 1
)

echo [SETUP] Installing dependencies...
call npm ci
if errorlevel 1 (
    echo [SETUP] npm ci failed, falling back to npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [BUILD] Building installer for Windows...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo [DONE] Installer(s) written to audio-manager-electron\release\
pause
endlocal
