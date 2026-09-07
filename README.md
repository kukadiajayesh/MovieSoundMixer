# Movie Audio Mux

**Project Status**: ✅ COMPLETE AND PRODUCTION-READY  
**Technology Stack**: Electron + React + TypeScript + SQLite3 + FFmpeg/mkvmerge  
**Final Build**: Fully Tested, Optimized, and Polished

---
<img width="1312" height="912" alt="Screenshot 2026-09-07 at 14 20 52" src="https://github.com/user-attachments/assets/5a61c3f8-07e7-4167-9ebd-d0b0b7436f30" />
<img width="1312" height="978" alt="Screenshot 2026-09-07 at 14 21 30" src="https://github.com/user-attachments/assets/e3d117be-cdfc-44e4-97cf-8df38a7667d2" />

<img width="1312" height="978" alt="Screenshot 2026-09-07 at 14 21 54" src="https://github.com/user-attachments/assets/1eded3d3-aa39-4927-a94f-ed8ca911609f" />
<img width="1312" height="978" alt="Screenshot 2026-09-07 at 14 28 46" src="https://github.com/user-attachments/assets/4ccf0bbb-44f1-41d4-9bd2-1a5d73611c5e" />




## Executive Summary

The FFmpeg Audio Manager is a professional, high-performance desktop application designed for fast, seamless audio extraction and merging operations. Rebuilt from the ground up as an **Electron + React + TypeScript** desktop suite, it features an SQLite3-backed persistent job queue, advanced GPU acceleration, automatic episode-based audio/video matching, and a beautiful, accessible user interface featuring light/dark theme support and comfortable/compact density modes.

---

## Core Features

### 1. High-Performance Video Thumbnail Extraction & Caching
To deliver a rich and modern visual experience, the app automatically extracts preview frames from target videos and caches them for instantaneous UI rendering.
* **Smart Extractions:** Automatically seeks past starting credits (at 5 seconds with automatic fallback to 0 seconds if the clip is short) using FFmpeg to grab a high-quality frame.
* **Persistent Disk-Level Cache:** Thumbnails are stored in a local temporary cache directory keyed by an MD5 hash of the file's path and its last modified timestamp (`stat.mtimeMs`). Reopening the application is **instantaneous**—no CPU-heavy re-encoding is needed.
* **Optimized IPC Transfer:** Extracts and transfers frames directly as lightweight Base64 data URLs, avoiding separate disk-read roundtrips.
* **Concurrency-Limited Background Queue (`MAX_CONCURRENT = 2`):** A frontend queue schedules thumbnail extractions in the background. Importing hundreds of videos will not degrade system performance or spawn excessive processes.

### 2. Audio Extraction Suite
* **Batch Processing:** Drag & drop multiple videos to extract their audio streams simultaneously.
* **Inline Channel Picker Popover:** Instantly inspect stream indices, codecs, languages, and channels, then select the exact channel you want to extract.
* **Multiple Formats:** Support for `copy` (lossless extraction, fastest), `mp3`, `aac`, and `flac`.
* **Search & Filter:** Easily filter loaded tracks by filename or status.

### 3. Audio Merging Suite (SxxExx Match & Manual Fusion)
* **Automatic Matching:** Automatically parses episode numbers (`SxxExx`) in video and audio files, matching them in a visual grid with live match-preview status cards.
* **Manual Assignment & Fusion:** Users can manually override assignments or assign media by clicking the placeholder to choose **either an audio file or a video file** (where you can select a specific audio channel from a second video to merge into the first).
* **Dual Backends:** Intelligently matches operations to **FFmpeg** or **mkvmerge** depending on the files and stream selections, with full manual override toggles.
* **GPU Hardware Acceleration:**
  * Detects NVIDIA NVENC (`h264_nvenc`), AMD AMF (`h264_amf`), Intel QSV (`h264_qsv`), and Apple VideoToolbox (`h264_videotoolbox`).
  * Offers quality presets (`Fast`, `Balanced`, `Quality`).
  * **Session Safety Reset:** To prevent system-level compatibility crashes, the GPU acceleration toggle **automatically resets to off on application launch**, giving users complete control to safely enable it per session.
  * Seamless, automatic CPU fallback if a GPU encoder fails.

### 4. SQLite3-Backed Persistent Queue
* **Crash & Interruption Recovery:** All active, pending, completed, or failed jobs are written to a persistent SQLite database. If the app is closed or crashes, any interrupted jobs are **automatically resumed on next startup**.
* **Queue Controls:** Play, pause, or adjust the queue concurrency at any time.
* **Collapsible Log Drawer:** A detailed log console at the bottom of the workspace records tagged, timestamped, and color-coded output directly from FFmpeg or mkvmerge.

### 5. Custom Theme & Density System
* Fully implemented using modern **OKLCH design tokens** for high contrast and beautiful color curves.
* **Dark / Light Modes:** Toggle between WCAG AAA-compliant dark and light theme styles.
* **Density Modes:** Switch between `Comfortable` and `Compact` densities to fit more or fewer items on-screen based on screen space.
* Full persistence of theme and density settings across sessions.

---

## Application Architecture

```
audio-manager-electron/
├── src/
│   ├── main/                   # Main Process (Node/Electron)
│   │   ├── db/                 # SQLite3 Database & Repository Models
│   │   │   ├── connection.ts   # DB schema, seeding & launch reset hooks
│   │   │   └── repository.ts   # CRUD interfaces for jobs & settings
│   │   ├── ffmpeg/             # FFmpeg & mkvmerge wrappers
│   │   │   ├── detector.ts     # Path & binary auto-detection
│   │   │   ├── mkv.ts          # mkvmerge container analyzer
│   │   │   ├── prober.ts       # FFprobe video & audio stream metadata extraction
│   │   │   └── thumbnail.ts    # MD5-keyed video thumbnail extraction
│   │   ├── files/              # FileManager helpers & path sanitizers
│   │   ├── gpu/                # GPU hardware acceleration detection
│   │   ├── queue/              # Job Queue scheduling & execution manager
│   │   ├── settings/           # Backend settings schema & validation
│   │   ├── index.ts            # App entry point & window manager
│   │   └── ipc.ts              # IPC main listener registering all handlers
│   │
│   └── renderer/               # Renderer Process (React + TypeScript)
│       ├── components/         # Highly-interactive design-system components
│       │   ├── design/         # Dropzone, LogDrawer, Toasts, MergeRow, Switch
│       │   ├── specialized/    # FormatSelector, FileTable, ProgressDock, StreamSelector
│       │   └── layout/         # Card, Toolbar, Divider, PageHeader
│       ├── hooks/              # Custom React hooks (useFFmpeg, useIPC, useTheme)
│       ├── lib/                # Media labels & frontend thumbnailCache memoizer
│       ├── pages/              # App switch pages (MergeAudio, ComponentShowcase)
│       ├── stores/             # Zustand state management stores
│       └── styles/             # Modular OKLCH CSS (animations, global, design-tokens)
```

---

## Technical Specifications & Requirements

### System Requirements
* **OS:** Windows 10/11, macOS 11.0+ (Intel/Apple Silicon), Linux (Ubuntu/Debian)
* **RAM:** 4GB minimum (8GB recommended)
* **Disk Space:** ~200MB for installation + space for temporary audio/video caches
* **FFmpeg:** Automatically bundles/detects local system installations.

---

## Installation & Running Guide

Ensure you have [Node.js (v18 or newer)](https://nodejs.org/) installed on your machine.

### Method 1: Using the Root Scripts
At the root directory of the repository, convenient launcher scripts are available:

**For macOS / Linux:**
```bash
# Set executable permissions (if not already done)
chmod +x run.sh

# Run the dev launcher (performs npm install, builds renderer, and starts Electron dev mode)
./run.sh
```

**For Windows:**
```cmd
:: Run the batch developer launcher
run.bat
```

### Method 2: Manual Development Commands
If you prefer running commands manually, navigate into the Electron workspace:

```bash
cd audio-manager-electron

# Install dependencies
npm install

# Start Vite server, watch main process TypeScript, and launch Electron
npm start
```

### Compiling & Packaging for Production
To package a standalone executable for your operating system:

```bash
cd audio-manager-electron

# Run a production compilation (typechecks + bundles renderer + main processes)
npm run build

# Or package as a standalone platform installer/portable executable (dist/release folder)
npm run build:electron
```

---

## Technical Features Deep Dive

### 1. Resilient Stream Probing & Parsing
Using `ffprobe` and `mkvmerge -J`, the application extracts detailed container metadata, including:
* Video codecs, framerates, resolutions, and exact millisecond-accurate durations.
* Audio stream counts, languages, channel layouts (mono/stereo/5.1 surround), and formats.
* Integrated stream mapping mapping streams precisely over IPC using standard `0:a:N` parameters.

### 2. Intelligent Merge Logic
When merging audio tracks into target videos, the application chooses between backends:
1. **mkvmerge (Preferred for MKV):** Uses lossless multiplexing, injecting the audio track without touching or re-encoding the original video, resulting in near-instantaneous merges.
2. **FFmpeg (Standard for MP4/MOV):** Handles remuxing streams efficiently. If GPU hardware acceleration is toggled on, it leverages specialized hardware codecs to speed up encoding by up to 5x.

### 3. Graceful Error Handling
* **Binary Fallbacks:** Instantly falls back to CPU encoding (`libx264`) if the requested hardware encoder fails.
* **Corrupted File Detection:** Robust error boundaries catch prober failures, displaying localized error panels in the UI instead of crashing the app.
* **Clean Work Directories:** Automatically generates and cleans up unique temporary files upon completion of conversion queues.

---

## Future Roadmap & Upcoming Features

To take the FFmpeg Audio Manager even further, the following features are planned for future development releases:

1. **A/V Sync Offset Controls:** Slide or type precise millisecond-level offsets to shift audio tracks relative to the video, allowing you to easily fix out-of-sync audio.
2. **Subtitle Multiplexing (Mux) Support:** Detect, select, and package external/internal subtitle files (such as SRT, ASS, or VTT tracks) straight into the final MKV or MP4 containers.
3. **Audio Waveform Visualization:** View a detailed waveform of both the source and target files inside the app for direct visual cue matching and synchronization checks.
4. **Scrub-to-Compare In-App Preview Player:** A built-in split-pane video player with scrubbing controls to preview and compare the before-and-after audio swaps before committing to a merge.
5. **Per-Job Estimated Time Remaining:** Real-time velocity tracking to display accurate remaining-time countdown counters for each active background encoding job.
6. **Auto-Generated Subtitles [LOW Priority]:** Integration of lightweight, offline speech-to-text models (such as Whisper) to automatically transcribe audio tracks and produce localized subtitle tracks.

