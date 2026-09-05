#!/usr/bin/env bash
# ============================================================
#  FFmpeg Audio Manager - local installer build (macOS / Linux)
#  Builds the renderer + main process, then packages an
#  installer for the CURRENT OS with electron-builder:
#    macOS  -> release/FFmpeg Audio Manager-<version>[-arm64].dmg (+ .zip)
#    Linux  -> release/FFmpeg Audio Manager-<version>.AppImage (+ .deb)
#  electron-builder cannot cross-package for Windows from here - run
#  build_installer.bat on Windows for that, or push a tag and let
#  .github/workflows/build.yml build all three platforms in CI.
# ============================================================
set -e

cd "$(dirname "$0")/audio-manager-electron"

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] Node.js / npm not found in PATH. Install Node.js first."
    exit 1
fi

echo "[SETUP] Installing dependencies..."
npm ci || npm install

echo "[BUILD] Building installer for $(uname -s)..."
npm run build

echo "[DONE] Installer(s) written to audio-manager-electron/release/"
ls -1 release | grep -Ev '^(mac|linux|win)(-unpacked|-arm64)?$|^builder-'
