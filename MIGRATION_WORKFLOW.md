# FFmpeg Audio Manager: Tkinter → Electron + React Migration

## Complete Workflow & Migration Guide

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Migration Strategy](#migration-strategy)
3. [Phase Breakdown](#phase-breakdown)
4. [Detailed Task Lists](#detailed-task-lists)
5. [Setup Instructions](#setup-instructions)
6. [Migration Guide](#migration-guide)
7. [Timeline & Effort Estimation](#timeline--effort-estimation)

---

## Architecture Overview

### **Current State (Tkinter)**
```
FFmpegAudioManager.py
├── UI Layer (Tkinter widgets)
├── Business Logic (mixed with UI)
├── FFmpeg execution (subprocess)
└── Data management (in-memory + files)
```

### **Target State (Electron + React)**
```
audio-manager/
├── Frontend (React + TypeScript)
│   ├── UI Components (design system)
│   ├── State Management (Zustand)
│   ├── Hooks (business logic)
│   └── Styles (CSS variables)
│
├── Backend (Node.js Electron main)
│   ├── FFmpeg Executor
│   ├── MKVToolNix Wrapper
│   ├── Job Queue (Bull)
│   ├── Database (SQLite)
│   └── IPC Server
│
└── Shared
    └── Types & Interfaces
```

---

## Migration Strategy

### **Approach: Parallel Implementation**
- Keep Tkinter app running
- Build new Electron app from scratch
- Port features incrementally
- Test each feature before moving to next
- Final: Switch to new app

### **Benefits**
✅ Zero downtime
✅ Easy rollback
✅ Can copy logic from old code
✅ Better testing opportunity

### **No Rewriting Business Logic**
- Extract FFmpeg logic → Node.js equivalents
- Extract probe logic → Reuse algorithms
- Extract batch processing → Port to Bull queue

---

## Phase Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Project Setup & Infrastructure (Week 1)                │
│ Create project, setup tooling, design system foundation          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Design System & Components (Week 1-2)                  │
│ CSS variables, reusable React components, layout system         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Core UI Screens (Week 2-3)                              │
│ Extract Audio, Merge Audio, History screens                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Backend Integration (Week 3-4)                          │
│ FFmpeg, MKVToolNix, IPC, job queue setup                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: Data Layer (Week 4)                                     │
│ SQLite database, file management, batch processing              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: Advanced Features (Week 5)                              │
│ GPU detection, settings, theme, auto-update                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 7: Testing & Optimization (Week 5-6)                       │
│ Unit tests, E2E tests, performance, security                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 8: Packaging & Launch (Week 6)                             │
│ Build, sign, distribute, auto-update                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Task Lists

### **PHASE 1: Project Setup & Infrastructure** (5-7 days)

**Overview:** Create Electron + React project structure, setup build pipeline, initialize Git

#### Tasks

**1.1 Initialize Node.js Project** (2 hours)
- [ ] Create project directory
- [ ] Initialize npm package.json
- [ ] Create folder structure (src/main, src/renderer, src/shared, public)
- [ ] Initialize Git repository
- [ ] Create .gitignore for Electron/Node/React

**1.2 Setup React + Vite** (3 hours)
- [ ] Install Vite
- [ ] Install React 18+, React DOM
- [ ] Install TypeScript
- [ ] Create vite.config.ts configuration
- [ ] Setup tsconfig.json
- [ ] Create index.html entry point
- [ ] Test dev server runs

**1.3 Setup Electron** (4 hours)
- [ ] Install electron, electron-builder
- [ ] Create electron main entry (src/main/index.ts)
- [ ] Create preload script (src/main/preload.ts)
- [ ] Setup IPC communication bridge
- [ ] Create Electron development script in package.json
- [ ] Test Electron window opens with React app

**1.4 Setup Build Pipeline** (3 hours)
- [ ] Configure electron-builder.yml for all platforms
- [ ] Create build scripts (dev, prod, build:all)
- [ ] Setup concurrent dev environment (frontend + electron)
- [ ] Create production build test
- [ ] Verify builds for Windows, macOS, Linux

**1.5 Setup Dependencies** (2 hours)
- [ ] Install ffmpeg-static
- [ ] Install sqlite3
- [ ] Install bull (job queue)
- [ ] Install zustand (state management)
- [ ] Install react-dnd (drag and drop)
- [ ] Install framer-motion (animations)
- [ ] Create package-lock.json snapshot

**1.6 Setup Development Tools** (2 hours)
- [ ] Install ESLint
- [ ] Install Prettier
- [ ] Create .eslintrc.json
- [ ] Create .prettierrc
- [ ] Setup IDE extensions (VSCode)
- [ ] Create pre-commit hooks (optional)

**1.7 Create Project Documentation** (2 hours)
- [ ] Create README.md
- [ ] Create CONTRIBUTING.md
- [ ] Create DEVELOPMENT.md (setup guide)
- [ ] Create ARCHITECTURE.md
- [ ] Create issues/PR templates

**Deliverables:**
✅ Working Electron app with React
✅ Build pipeline for all OS
✅ Development environment setup
✅ Project documentation

---

### **PHASE 2: Design System & Components** (7-10 days)

**Overview:** Implement design tokens as CSS variables, create reusable React components

#### Tasks

**2.1 Create CSS Design Tokens** (3 hours)
- [ ] Create src/renderer/styles/design-tokens.css
- [ ] Define dark mode tokens (13 colors)
- [ ] Define light mode tokens (13 colors)
- [ ] Define typography variables (font sizes, weights)
- [ ] Define spacing variables (4pt grid)
- [ ] Define radius variables (6px, 10px, 999px)
- [ ] Define component heights (buttons, inputs, tables)
- [ ] Create CSS variable mapping document

**2.2 Setup Global Styles** (2 hours)
- [ ] Create src/renderer/styles/global.css
- [ ] Reset default browser styles
- [ ] Setup font loading (Inter, JetBrains Mono)
- [ ] Create utility classes (.flex, .grid, etc.)
- [ ] Setup dark/light mode switcher
- [ ] Create animations (@keyframes)

**2.3 Create Base Components** (12 hours)
- [ ] Button component (primary, ghost, danger)
  - [ ] 3 sizes (sm, md, lg)
  - [ ] 3 variants (primary, ghost, danger)
  - [ ] States (hover, active, disabled, loading)
  - [ ] Icon support
  - [ ] Tests

- [ ] Input component
  - [ ] Text input
  - [ ] Placeholder styling
  - [ ] Focus states
  - [ ] Error states
  - [ ] Mono variant
  - [ ] Tests

- [ ] Select/Dropdown component
  - [ ] Combobox functionality
  - [ ] Keyboard navigation
  - [ ] Search/filter
  - [ ] Tests

- [ ] Table component
  - [ ] Sortable columns
  - [ ] Row selection (checkboxes)
  - [ ] Hover states
  - [ ] Scrolling
  - [ ] Tests

**2.4 Create Layout Components** (8 hours)
- [ ] Page header (title + subtitle)
- [ ] Sidebar navigation
- [ ] Toolbar (grouped buttons)
- [ ] Card / Panel
- [ ] Divider (horizontal + vertical)
- [ ] Modal dialog
- [ ] Toast notifications
- [ ] Tests for each

**2.5 Create Status Components** (6 hours)
- [ ] Status indicator (dot + label)
- [ ] Status badge
- [ ] Progress bar (determinate + indeterminate)
- [ ] Pulsing animation for "probing"
- [ ] Status row (for footer)
- [ ] Tests

**2.6 Create Advanced Components** (8 hours)
- [ ] Drag-and-drop zone (react-dnd integration)
- [ ] Stream selector dropdown
- [ ] Format selector (pills)
- [ ] File list with checkboxes
- [ ] Progress dock (expandable)
- [ ] Log viewer (scrollable, searchable)
- [ ] Tests

**2.7 Setup Component Library** (4 hours)
- [ ] Create src/renderer/components/index.ts
- [ ] Create Storybook for component showcase (optional)
- [ ] Document component API
- [ ] Create component usage guide
- [ ] Test all components in isolation

**2.8 Setup Theme Switching** (3 hours)
- [ ] Create useTheme hook
- [ ] Setup theme provider context
- [ ] Add theme toggle functionality
- [ ] Persist theme preference
- [ ] Test dark/light switching

**Deliverables:**
✅ Complete design system in CSS
✅ 20+ reusable React components
✅ Component documentation
✅ Theme switching working
✅ All components tested

---

### **PHASE 3: Core UI Screens** (10-14 days)

**Overview:** Build Extract Audio, Merge Audio, and History screens with full layout

#### Tasks

**3.1 Build App Shell** (4 hours)
- [ ] Create main App.tsx layout
- [ ] Setup sidebar navigation
  - [ ] Extract Audio link
  - [ ] Merge Audio link
  - [ ] History link
  - [ ] Active state styling
  - [ ] Icon + label

- [ ] Setup status footer
  - [ ] FFmpeg status indicator
  - [ ] MKVToolNix status
  - [ ] GPU info
  - [ ] Theme toggle button
  - [ ] Update logic

- [ ] Setup routing (React Router)
- [ ] Create layout grid system

**3.2 Extract Audio Screen** (10 hours)
- [ ] Page header (title + subtitle)
- [ ] Toolbar with two groups
  - [ ] File operations (⊕ Add files, ⊕ Folder)
  - [ ] List operations (Search, Remove, Clear)
  - [ ] Ready counter

- [ ] File table
  - [ ] Columns: FILE, SIZE, STREAM, STATUS
  - [ ] Row selection (checkboxes)
  - [ ] Hover effects
  - [ ] Scroll support

- [ ] Output folder selector
  - [ ] Path input
  - [ ] Browse button
  - [ ] Display folder icon

- [ ] Format selector
  - [ ] Radio buttons/pills
  - [ ] Options: Copy, MP3, AAC, FLAC
  - [ ] Default: Copy

- [ ] Primary CTA button
  - [ ] "▸ Extract audio" with icon
  - [ ] Positioned bottom-right
  - [ ] Disabled state when no files

- [ ] Progress dock (idle state)
  - [ ] Single row: "● Idle · FFmpeg ready"
  - [ ] "Show log" button

- [ ] Styling + animations
- [ ] Test all interactions

**3.3 Merge Audio Screen** (8 hours)
- [ ] Similar layout to Extract Audio
- [ ] Dual-file selector
- [ ] Audio track selection
- [ ] Merge options (video container, subtitle handling)
- [ ] Progress dock
- [ ] Test interactions

**3.4 History Screen** (6 hours)
- [ ] Table of past operations
- [ ] Columns: DATE, FILE, OPERATION, DURATION, STATUS
- [ ] Search/filter functionality
- [ ] Sorting by date/status
- [ ] Export options
- [ ] Clear history button
- [ ] Test filtering/sorting

**3.5 Navigation & Routing** (2 hours)
- [ ] Setup React Router
- [ ] Route to each screen
- [ ] Remember last visited screen
- [ ] Navigation state management
- [ ] Test navigation

**Deliverables:**
✅ All three screens fully designed
✅ Layout matches design spec
✅ Animations and transitions working
✅ Navigation complete
✅ All screens tested

---

### **PHASE 4: Backend Integration** (10-14 days)

**Overview:** Integrate FFmpeg, MKVToolNix, setup IPC communication, job queue

#### Tasks

**4.1 Setup Main Process IPC** (4 hours)
- [ ] Create IPC event handlers in src/main/ipc.ts
- [ ] Define IPC channels:
  - [ ] extract-audio
  - [ ] merge-audio
  - [ ] probe-streams
  - [ ] get-ffmpeg-status
  - [ ] get-gpu-info
  - etc.

- [ ] Error handling for IPC
- [ ] Logging/debugging for IPC

**4.2 FFmpeg Integration** (12 hours)
- [ ] Create src/main/ffmpeg.ts module
  - [ ] Detect FFmpeg (system or bundled)
  - [ ] Probe video file (get audio streams)
  - [ ] Extract audio
  - [ ] Encode to MP3/AAC/FLAC
  - [ ] Handle progress output
  - [ ] Error handling

- [ ] Create helper functions:
  - [ ] parseFFprobeOutput()
  - [ ] parseFFmpegProgress()
  - [ ] calculateDuration()
  - [ ] validateOutputPath()

- [ ] Handle various audio codecs (eac3, ac3, aac, flac, mp3)
- [ ] Support GPU encoding detection
- [ ] Test with various video files

**4.3 MKVToolNix Integration** (8 hours)
- [ ] Create src/main/mkvmerge.ts module
  - [ ] Detect mkvmerge (system or bundled)
  - [ ] Parse MKV file
  - [ ] Merge audio tracks
  - [ ] Extract audio from MKV
  - [ ] Handle progress
  - [ ] Error handling

- [ ] Create helper functions
- [ ] Test with MKV files

**4.4 GPU Acceleration** (6 hours)
- [ ] Create src/main/gpu.ts module
  - [ ] Detect NVIDIA GPUs (CUDA)
  - [ ] Detect AMD GPUs (OPENCL)
  - [ ] Detect Intel GPUs (QSV)
  - [ ] Detect Apple GPUs (VideoToolbox)

- [ ] Build appropriate FFmpeg encoding args
- [ ] Test on different hardware

**4.5 Job Queue Setup** (8 hours)
- [ ] Create src/main/queue.ts module
- [ ] Setup Bull queue for batch jobs
- [ ] Job types:
  - [ ] Probe job
  - [ ] Extract job
  - [ ] Merge job

- [ ] Job state management
- [ ] Queue persistence
- [ ] Resume interrupted jobs

**4.6 IPC Communication (React ↔ Node.js)** (6 hours)
- [ ] Create src/renderer/hooks/useIPC.ts
- [ ] Create src/renderer/hooks/useFFmpeg.ts
- [ ] Implement promise-based IPC calls
- [ ] Error handling on React side
- [ ] Progress event handling
- [ ] Real-time updates via IPC

**4.7 Integration Testing** (6 hours)
- [ ] Test FFmpeg extraction
- [ ] Test MKV merging
- [ ] Test GPU detection
- [ ] Test queue processing
- [ ] Test error handling

**Deliverables:**
✅ FFmpeg fully integrated
✅ MKVToolNix fully integrated
✅ GPU detection working
✅ Job queue operational
✅ IPC communication tested

---

### **PHASE 5: Data Layer** (7-10 days)

**Overview:** SQLite database, file management, batch processing, history tracking

#### Tasks

**5.1 Database Schema** (3 hours)
- [ ] Create src/main/db.ts module
- [ ] Initialize SQLite database
- [ ] Create tables:
  - [ ] jobs (id, type, input, output, status, created_at, updated_at)
  - [ ] files (id, path, size, duration, audio_streams, created_at)
  - [ ] history (id, job_id, timestamp, input, output, duration, status)
  - [ ] settings (key, value)

- [ ] Create indexes
- [ ] Test database operations

**5.2 Database Operations** (6 hours)
- [ ] Create CRUD operations:
  - [ ] saveJob()
  - [ ] updateJobStatus()
  - [ ] getJobHistory()
  - [ ] deleteHistoryEntry()
  - [ ] clearHistory()
  - [ ] saveSettings()
  - [ ] loadSettings()

- [ ] Transactions for atomic operations
- [ ] Query optimization
- [ ] Error handling

**5.3 File Management** (4 hours)
- [ ] Create src/main/files.ts module
- [ ] Validate input files
- [ ] Validate output paths
- [ ] Handle file overwrite scenarios
- [ ] Cleanup temporary files
- [ ] Get file properties (size, duration)

**5.4 Batch Processing** (6 hours)
- [ ] Create batch job processor
- [ ] Process multiple files sequentially
- [ ] Handle pause/resume
- [ ] Handle cancellation
- [ ] Aggregate progress
- [ ] Save batch results

**5.5 Settings Management** (3 hours)
- [ ] Create src/main/settings.ts module
- [ ] Settings schema:
  - [ ] Output directory
  - [ ] Default format
  - [ ] GPU settings
  - [ ] Theme preference
  - [ ] Auto-update preference

- [ ] Validate settings
- [ ] Migrate old settings (from Tkinter)

**5.6 History Persistence** (3 hours)
- [ ] Load history on app start
- [ ] Save each completed job
- [ ] Sync history to React state
- [ ] Display in History screen
- [ ] Clear history functionality

**5.7 Data Testing** (4 hours)
- [ ] Test database operations
- [ ] Test file validation
- [ ] Test batch processing
- [ ] Test settings persistence
- [ ] Test history tracking

**Deliverables:**
✅ SQLite database working
✅ All CRUD operations functional
✅ History tracking complete
✅ Settings persistence working
✅ Batch processing operational

---

### **PHASE 6: Advanced Features** (7-10 days)

**Overview:** Settings screen, theme management, auto-update, advanced options

#### Tasks

**6.1 Settings Screen** (8 hours)
- [ ] Create Settings.tsx page
- [ ] Settings sections:
  - [ ] Paths (output directory, FFmpeg path)
  - [ ] Quality (bitrate for MP3/AAC)
  - [ ] Advanced (GPU settings, FFmpeg options)
  - [ ] About (version, links, license)

- [ ] Save/cancel buttons
- [ ] Validation
- [ ] Defaults
- [ ] Test all settings

**6.2 Theme Management** (4 hours)
- [ ] Create useTheme hook
- [ ] Theme switcher UI (sun/moon icon)
- [ ] Apply theme across app
- [ ] Persist theme preference
- [ ] System preference detection (optional)
- [ ] Test switching

**6.3 Auto-Update** (6 hours)
- [ ] Setup electron-updater
- [ ] Configure auto-update server (GitHub releases)
- [ ] Create update check on startup
- [ ] Handle update installation
- [ ] Show update progress UI
- [ ] Restart on update

**6.4 Logging** (4 hours)
- [ ] Create src/main/logger.ts
- [ ] Structured logging (info, warn, error)
- [ ] Log rotation
- [ ] Export logs functionality
- [ ] Debug mode toggle

**6.5 Error Boundaries & Crash Recovery** (4 hours)
- [ ] Create React error boundary
- [ ] Handle FFmpeg errors gracefully
- [ ] Save job state before crash
- [ ] Auto-recovery on startup
- [ ] User-friendly error messages

**6.6 Performance Monitoring** (3 hours)
- [ ] Monitor CPU usage
- [ ] Monitor memory usage
- [ ] Monitor FFmpeg performance
- [ ] Display in UI (optional)

**6.7 Accessibility (A11y)** (4 hours)
- [ ] Add ARIA labels
- [ ] Keyboard navigation
- [ ] Color contrast verification
- [ ] Screen reader testing
- [ ] Focus management

**6.8 Feature Testing** (4 hours)
- [ ] Test settings save/load
- [ ] Test theme switching
- [ ] Test auto-update flow
- [ ] Test error recovery
- [ ] Test accessibility

**Deliverables:**
✅ Settings screen complete
✅ Theme management working
✅ Auto-update functional
✅ Error handling robust
✅ App resilient to crashes

---

### **PHASE 7: Testing & Optimization** (7-10 days)

**Overview:** Unit tests, E2E tests, performance optimization, security audit

#### Tasks

**7.1 Unit Tests** (12 hours)
- [ ] Setup Jest + React Testing Library
- [ ] Test utilities:
  - [ ] parseFFprobeOutput()
  - [ ] calculateDuration()
  - [ ] validatePath()
  - [ ] formatFileSize()

- [ ] Test React components:
  - [ ] Button component
  - [ ] Input component
  - [ ] Table component
  - [ ] All other components

- [ ] Test hooks:
  - [ ] useTheme
  - [ ] useIPC
  - [ ] useFFmpeg

- [ ] Aim for 80%+ coverage

**7.2 E2E Tests** (10 hours)
- [ ] Setup Playwright or Spectron
- [ ] Test workflows:
  - [ ] Open app → Extract audio (end-to-end)
  - [ ] Open app → Merge audio (end-to-end)
  - [ ] Open app → View history
  - [ ] Theme switching
  - [ ] Settings save

- [ ] Test error scenarios
- [ ] Test on all platforms

**7.3 Performance Optimization** (8 hours)
- [ ] Profile React rendering (React DevTools)
- [ ] Optimize re-renders (memoization)
- [ ] Lazy load components
- [ ] Code splitting
- [ ] Image optimization
- [ ] Bundle size analysis
- [ ] Target <300MB total size

**7.4 Memory Optimization** (6 hours)
- [ ] Monitor memory usage during operations
- [ ] Cleanup resources properly
- [ ] Handle large file operations
- [ ] Stream processing for large logs
- [ ] Test with long batch jobs

**7.5 Security Audit** (6 hours)
- [ ] Review IPC security
- [ ] Validate all user inputs
- [ ] Secure file operations
- [ ] Check dependency vulnerabilities
- [ ] Test with npm audit
- [ ] Review sensitive data handling

**7.6 Compatibility Testing** (4 hours)
- [ ] Test on Windows 10/11
- [ ] Test on macOS 11+ (Intel + Apple Silicon)
- [ ] Test on Ubuntu/Debian/Fedora
- [ ] Test with older FFmpeg versions
- [ ] Test with modern FFmpeg

**7.7 Documentation & Cleanup** (4 hours)
- [ ] Update README.md
- [ ] Create TESTING.md
- [ ] Create TROUBLESHOOTING.md
- [ ] Code cleanup
- [ ] Remove debug logging
- [ ] Final code review

**Deliverables:**
✅ 80%+ test coverage
✅ E2E tests passing
✅ Performance optimized
✅ Security audit complete
✅ Cross-platform tested

---

### **PHASE 8: Packaging & Launch** (5-7 days)

**Overview:** Build for all OS, code signing, distribution, auto-update setup

#### Tasks

**8.1 Code Signing Setup** (4 hours)
- [ ] Windows code signing
  - [ ] Obtain certificate
  - [ ] Configure electron-builder
  - [ ] Test signed build

- [ ] macOS code signing
  - [ ] Create developer account
  - [ ] Setup signing certificate
  - [ ] Setup provisioning profile
  - [ ] Test signed build

- [ ] Linux (optional - GPG signing)

**8.2 Build for All Platforms** (6 hours)
- [ ] Create build scripts
- [ ] Build Windows (MSI installer, portable)
- [ ] Build macOS (DMG, notarization)
- [ ] Build Linux (AppImage, deb, rpm)
- [ ] Test each build
- [ ] Verify code signing

**8.3 Auto-Update Server Setup** (4 hours)
- [ ] Setup GitHub releases
- [ ] Create release artifacts
- [ ] Setup electron-updater config
- [ ] Test auto-update flow
- [ ] Document update process

**8.4 Distribution Setup** (3 hours)
- [ ] Create GitHub releases page
- [ ] Setup download links
- [ ] Create installer download page (optional)
- [ ] Setup CDN (optional for speed)

**8.5 Documentation for Users** (4 hours)
- [ ] Create installation guide (per OS)
- [ ] Create quick start guide
- [ ] Create FAQ
- [ ] Create video tutorial (optional)
- [ ] Create troubleshooting guide

**8.6 Release Checklist** (2 hours)
- [ ] Final testing on all platforms
- [ ] Verify all features working
- [ ] Check file sizes
- [ ] Verify auto-update works
- [ ] Test clean install
- [ ] Test upgrade from old version

**8.7 Launch** (2 hours)
- [ ] Create release notes
- [ ] Publish GitHub release
- [ ] Announce on social media
- [ ] Monitor for issues
- [ ] Setup support channels

**Deliverables:**
✅ Signed builds for all OS
✅ Auto-update working
✅ Distribution channels ready
✅ User documentation complete
✅ App publicly available

---

## Timeline & Effort Estimation

| Phase | Duration | Effort | Start | End |
|-------|----------|--------|-------|-----|
| 1. Setup | 5-7 days | 20-25 hrs | Week 1 | Day 5-7 |
| 2. Design System | 7-10 days | 40-50 hrs | Week 1 | Week 2 |
| 3. UI Screens | 10-14 days | 60-80 hrs | Week 2 | Week 3-4 |
| 4. Backend | 10-14 days | 70-90 hrs | Week 3 | Week 4-5 |
| 5. Data Layer | 7-10 days | 45-60 hrs | Week 4 | Week 5 |
| 6. Advanced | 7-10 days | 45-60 hrs | Week 5 | Week 6 |
| 7. Testing | 7-10 days | 50-70 hrs | Week 5-6 | Week 6-7 |
| 8. Packaging | 5-7 days | 25-35 hrs | Week 6 | Week 7 |
| **TOTAL** | **58-72 days** | **355-470 hrs** | | **~3.5 months** |

**Effort Breakdown:**
- 1 full-time developer: 3-4.5 months
- 2 developers: 6-8 weeks (parallel work)
- With testing/QA team: 4-6 weeks

---

## Setup Instructions

### **Prerequisites**

**System Requirements:**
- Node.js 16+ and npm 8+
- Git
- Text editor (VSCode recommended)
- Platform-specific tools:
  - **Windows:** Visual Studio Build Tools
  - **macOS:** Xcode Command Line Tools
  - **Linux:** build-essential, python3

**Install Prerequisites:**

```bash
# Node.js (https://nodejs.org/)
node --version  # Should be 16+
npm --version   # Should be 8+

# Git
git --version

# macOS only
xcode-select --install

# Linux (Ubuntu/Debian)
sudo apt-get install build-essential python3
```

### **Step 1: Create Project Structure**

```bash
# Create project directory
mkdir audio-manager
cd audio-manager

# Initialize npm
npm init -y

# Create folder structure
mkdir -p src/main src/renderer src/shared public

# Create src directories
mkdir -p src/renderer/pages src/renderer/components src/renderer/hooks src/renderer/styles
```

### **Step 2: Install Dependencies**

```bash
# Core dependencies
npm install electron react react-dom zustand

# UI Libraries
npm install framer-motion react-dnd react-dnd-html5-backend

# Build tools
npm install -D vite @vitejs/plugin-react typescript

# Electron tools
npm install -D electron-builder

# Development tools
npm install -D @types/node @types/react

# Backend
npm install ffmpeg-static sqlite3 bull dotenv

# Optional (for better DX)
npm install -D eslint prettier @typescript-eslint/eslint-plugin
```

### **Step 3: Initialize Git & Create Files**

```bash
git init
git config user.email "your-email@example.com"
git config user.name "Your Name"

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
out/
.env
.env.local
*.log
.DS_Store
EOF

git add .
git commit -m "Initial commit: Project structure"
```

### **Step 4: Configure Project Files**

Create `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "vite",
    "electron-dev": "wait-on http://localhost:5173 && electron .",
    "dev:all": "concurrently npm:dev npm:electron-dev",
    "build:vite": "vite build",
    "build:electron": "electron-builder",
    "build": "npm run build:vite && npm run build:electron",
    "build:all": "npm run build:vite && electron-builder -mwl"
  },
  "devDependencies": {
    "concurrently": "^7.0.0",
    "wait-on": "^7.0.0"
  }
}
```

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "jsx": "react-jsx"
  }
}
```

### **Step 5: Create Core Files**

**src/main/index.ts:**

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const isDev = process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    mainWindow.loadURL(isDev);
  } else {
    mainWindow.loadFile('dist/index.html');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

**src/renderer/App.tsx:**

```typescript
import React from 'react';
import './styles/design-tokens.css';
import './styles/global.css';

export const App: React.FC = () => {
  return (
    <div className="app">
      <h1>Audio Manager</h1>
      <p>Ready to build!</p>
    </div>
  );
};

export default App;
```

**src/renderer/main.tsx:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**index.html:**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Audio Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

### **Step 6: Test Development Environment**

```bash
# Install dependencies
npm install

# Start development server
npm run dev:all

# Should open Electron window with React app
# Vite dev server at http://localhost:5173
```

---

## Migration Guide

### **Phase-by-Phase Code Migration**

#### **From Tkinter → Electron/React**

**1. UI Components**

**Old (Tkinter):**
```python
btn = ttk.Button(parent, text="Extract", command=self._on_extract)
```

**New (React):**
```typescript
<Button 
  variant="primary" 
  onClick={handleExtract}
>
  Extract audio
</Button>
```

**2. Event Handling**

**Old (Tkinter):**
```python
def _on_button_click(self):
    self.do_something()
    self.update_ui()
```

**New (React + Hooks):**
```typescript
const handleClick = () => {
  doSomething();
  setUIState(prev => ({ ...prev, updated: true }));
};
```

**3. Data Management**

**Old (Tkinter):**
```python
class App:
    def __init__(self):
        self.files = []
        self.current_theme = 'dark'
    
    def add_file(self, path):
        self.files.append(path)
```

**New (React + Zustand):**
```typescript
const useStore = create((set) => ({
  files: [],
  currentTheme: 'dark',
  addFile: (path) => set(state => ({
    files: [...state.files, path]
  })),
}));
```

**4. FFmpeg Execution**

**Old (Tkinter):**
```python
proc = subprocess.run(['ffmpeg', '-i', input_file, output_file])
```

**New (Electron/Node.js):**
```typescript
// Main process
ipcMain.handle('extract-audio', async (event, { input, output }) => {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-i', input, output]);
    proc.on('close', (code) => {
      code === 0 ? resolve() : reject();
    });
  });
});

// React component
const { ipcRenderer } = window.require('electron');
const result = await ipcRenderer.invoke('extract-audio', {
  input: filePath,
  output: outputPath,
});
```

**5. Database**

**Old (Tkinter):**
```python
# In-memory list
self.history = []

def save_to_history(self, job):
    self.history.append(job)
    # Maybe save to JSON file
```

**New (Electron/SQLite):**
```typescript
// Main process with SQLite
const db = new sqlite3.Database('./app.db');

ipcMain.handle('save-job', async (event, job) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO jobs (input, output, status) VALUES (?, ?, ?)',
      [job.input, job.output, job.status],
      (err) => {
        err ? reject(err) : resolve();
      }
    );
  });
});
```

---

### **File-by-File Migration Checklist**

#### **Extract Audio Feature**

**Tkinter Code → Electron/React**

```
Old: FFmpegAudioManager.py::_build_extract_panel()
New: src/renderer/pages/ExtractAudio.tsx

Old: FFmpegAudioManager.py::_on_extract_clicked()
New: src/main/handlers/extractHandler.ts + React hook

Old: FFmpegAudioManager.py::_run_extract()
New: src/main/ffmpeg.ts::extractAudio()

Old: FFmpegAudioManager.py::_probe_audio_streams()
New: src/main/ffmpeg.ts::probeStreams()

Old: VideoEntry class
New: src/shared/types.ts::VideoEntry interface
```

#### **Merge Audio Feature**

```
Old: FFmpegAudioManager.py::_build_merge_panel()
New: src/renderer/pages/MergeAudio.tsx

Old: FFmpegAudioManager.py::_run_merge()
New: src/main/mkvmerge.ts::mergeAudio()

Old: AudioStreamInfo class
New: src/shared/types.ts::AudioStreamInfo interface
```

#### **History Feature**

```
Old: FFmpegAudioManager.py::_build_history_panel()
New: src/renderer/pages/History.tsx

Old: In-memory history list
New: src/main/db.ts::HistoryManager + SQLite
```

---

### **Testing the Migration**

#### **Smoke Tests (Test Each Feature)**

```bash
# After Phase 3 (UI complete)
[ ] Can see Extract Audio screen
[ ] Can see Merge Audio screen
[ ] Can see History screen
[ ] Can click buttons without crashes
[ ] Can type in input fields
[ ] Can select from dropdowns

# After Phase 4 (Backend)
[ ] Can add video files
[ ] Can probe streams (FFmpeg works)
[ ] Can select output folder
[ ] Can click Extract (IPC works)
[ ] Progress appears (backend communication)

# After Phase 5 (Data)
[ ] Job history saves to database
[ ] Can view previous jobs
[ ] Can clear history
[ ] Settings persist across restarts

# After Phase 6 (Advanced)
[ ] Can toggle theme
[ ] Theme persists
[ ] Auto-update checks work
[ ] Settings screen works
```

#### **Regression Tests**

Compare behavior between old and new:

```
Extract Audio:
- [ ] File probing works same way
- [ ] Stream detection identical
- [ ] Output format options same
- [ ] Quality settings preserved
- [ ] GPU acceleration works (if available)

Merge Audio:
- [ ] Audio track selection same
- [ ] Merge output quality same
- [ ] Container options work
- [ ] Error handling equivalent

History:
- [ ] Past jobs display correctly
- [ ] Job details accurate
- [ ] Search/filter works
- [ ] Export functionality
```

---

### **Data Migration (Tkinter → Electron)**

#### **Settings Migration**

```typescript
// src/main/migration.ts
export async function migrateSettings() {
  const oldConfig = await loadOldTkinterSettings();
  
  const newSettings = {
    outputDirectory: oldConfig.output_dir,
    defaultFormat: oldConfig.format || 'copy',
    gpuEnabled: oldConfig.gpu_enabled,
    theme: oldConfig.dark_mode ? 'dark' : 'light',
  };

  await saveSettings(newSettings);
}
```

#### **History Migration**

```typescript
export async function migrateHistory() {
  const oldHistory = await loadOldTkinterHistory();
  
  for (const job of oldHistory) {
    await db.run(
      'INSERT INTO jobs (input, output, type, status, duration, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        job.inputFile,
        job.outputFile,
        job.operation,
        job.status,
        job.duration,
        job.timestamp,
      ]
    );
  }
}
```

---

## Development Workflow

### **Daily Development Process**

1. **Start development:**
```bash
npm run dev:all
# Opens both Vite dev server and Electron window
```

2. **Edit files:**
- React components: Changes hot-reload in Electron window
- Main process: Requires Electron restart (Ctrl+R)
- Styles: Hot-reload automatically

3. **Debug:**
- **Frontend:** DevTools (Ctrl+Shift+I in Electron window)
- **Backend:** VSCode debugger or console.log

4. **Test:**
```bash
npm run test          # Run unit tests
npm run test:e2e      # Run E2E tests
```

5. **Build:**
```bash
npm run build         # Build for current platform
npm run build:all     # Build for all platforms
```

---

## Key Differences from Tkinter

| Aspect | Tkinter | Electron + React |
|--------|---------|------------------|
| **Styling** | Limited, ttk | Full CSS support |
| **Animations** | Very difficult | Easy with CSS/JS |
| **Components** | Basic widgets | Composable components |
| **State** | Instance variables | Zustand/Context |
| **Async** | threading module | Async/await, promises |
| **IPC** | N/A | Event-driven |
| **Database** | In-memory/files | SQLite in process |
| **Distribution** | py2exe, PyInstaller | electron-builder |
| **Size** | ~50MB | ~200MB |
| **Learning curve** | Moderate | Steep (web stack) |

---

## Troubleshooting

### **Common Issues**

**"Module not found" errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Electron won't start:**
```bash
# Check Node.js version
node --version  # Should be 16+

# Try deleting cache
rm -rf node_modules/.bin/electron
npm install
```

**Vite dev server connection refused:**
```bash
# Port 5173 might be in use
lsof -i :5173  # Find process
kill -9 <PID>   # Kill it
```

**Build failures on macOS:**
```bash
# Need Xcode tools
xcode-select --install

# And sometimes need to accept Xcode license
sudo xcode-select --reset
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

---

## Next Steps After Migration

1. **Optimize performance**
   - Profile bundle size
   - Optimize images
   - Lazy load components

2. **Add more features**
   - Batch processing improvements
   - Advanced codec options
   - Playlist support

3. **Community**
   - Open source on GitHub
   - Ask for contributions
   - Build community

4. **Monetization (optional)**
   - Freemium model
   - Pro features
   - Sponsorship/donations

---

**Ready to start? Begin with Phase 1: Project Setup!**
