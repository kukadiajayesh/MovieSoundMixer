#!/usr/bin/env bash
# ============================================================
#  FFmpeg Audio Manager - dev launcher (macOS / Linux)
#  Starts Vite + the Electron main-process watcher + Electron.
# ============================================================
set -e

cd "$(dirname "$0")/audio-manager-electron"

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] Node.js / npm not found in PATH. Install Node.js first."
    exit 1
fi

echo "[SETUP] Updating dependencies..."
npm install

echo "[BUILD] Building FFmpeg Audio Manager..."
npm run build:vite
npm run build:main

echo "[START] Launching FFmpeg Audio Manager..."
npm run start
