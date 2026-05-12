# Architecture Guide & System Design

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FFMPEG AUDIO MANAGER (Electron App)                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    RENDERER PROCESS (React)                        │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  UI Layer (Pages & Components)                              │ │ │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │ │ │
│  │  │  │  Extract     │ │    Merge     │ │   History    │        │ │ │
│  │  │  │    Audio     │ │    Audio     │ │    Screen    │        │ │ │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘        │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                              ↓                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  Shared Components (20+)                                    │ │ │
│  │  │  Button, Input, Table, StatusDot, ProgressBar, etc.       │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                              ↓                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  State Management & Hooks                                   │ │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐               │ │ │
│  │  │  │ Zustand  │ │useTheme  │ │  useFFmpeg   │               │ │ │
│  │  │  │  Store   │ │          │ │  (IPC calls) │               │ │ │
│  │  │  └──────────┘ └──────────┘ └──────────────┘               │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                              ↓                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  Styling (CSS Variables + Design System)                    │ │ │
│  │  │  Colors, Typography, Spacing, Animations                   │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                  ↕ (IPC Messages)                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                  MAIN PROCESS (Node.js/Electron)                  │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  IPC Server (Event Handlers)                                │ │ │
│  │  │  - extract-audio, merge-audio, probe-streams, etc.         │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                              ↓                                      │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐   │ │
│  │  │   FFmpeg     │ │  MKVToolNix  │ │  GPU Acceleration       │   │ │
│  │  │  Executor    │ │   Wrapper    │ │  Detector               │   │ │
│  │  │              │ │              │ │                         │   │ │
│  │  │ - Probe      │ │ - Merge      │ │ - NVIDIA (CUDA)        │   │ │
│  │  │ - Extract    │ │ - Extract    │ │ - AMD (OPENCL)         │   │ │
│  │  │ - Encode     │ │ - Parse MKV  │ │ - Intel (QSV)          │   │ │
│  │  └──────────────┘ └──────────────┘ └─────────────────────────┘   │ │
│  │                              ↓                                      │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐   │ │
│  │  │  Job Queue   │ │   Database   │ │  File Manager           │   │ │
│  │  │  (Bull)      │ │  (SQLite)    │ │                         │   │ │
│  │  │              │ │              │ │ - Validate files        │   │ │
│  │  │ - Queue jobs │ │ - Jobs table │ │ - Validate paths       │   │ │
│  │  │ - Process    │ │ - History    │ │ - Get file properties  │   │ │
│  │  │ - Retry      │ │ - Settings   │ │ - Handle temp files    │   │ │
│  │  └──────────────┘ └──────────────┘ └─────────────────────────┘   │ │
│  │                              ↓                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  Logging & Monitoring                                       │ │ │
│  │  │  - Structured logging, Log rotation, Debug mode             │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                       EXTERNAL PROCESSES                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐         │ │
│  │  │   FFmpeg     │ │  mkvmerge    │ │  System Resources  │         │ │
│  │  │  (bundled)   │ │  (system)    │ │  - CPU, GPU, RAM   │         │ │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Extract Audio Flow

```
User Interface          IPC Bridge           Main Process            External
─────────────────────────────────────────────────────────────────────────────

Click "Add files"
    │
    ├─→ Open file dialog
    │       │
    │       ├─→ User selects file
    │       │
    │       ├─→ ipcRenderer.invoke('probe-streams', filePath)
    │       │
    │       │           │
    │       │           ├─→ probeStreams(filePath)
    │       │           │       │
    │       │           │       ├─→ spawn ffprobe process
    │       │           │       │       │
    │       │           │       │       └─→ FFmpeg │ffprobe
    │       │           │       │
    │       │           │       ├─→ Parse output
    │       │           │       │
    │       │           │       └─→ Return streams array
    │       │           │
    │       ├─→ Send result back to React
    │       │
    │       └─→ Dispatch to Zustand store
    │
    ├─→ Table renders with stream list
    │
    │
User selects stream
    │
    ├─→ Select output folder
    │
    │
Click "Extract audio"
    │
    ├─→ Validate inputs (Zustand store)
    │
    ├─→ ipcRenderer.invoke('extract-audio', { input, output, format })
    │
    │           │
    │           ├─→ Create job → Save to DB
    │           │
    │           ├─→ Queue job (Bull)
    │           │
    │           ├─→ Execute: spawn ffmpeg
    │           │       │
    │           │       ├─→ FFmpeg │ffmpeg
    │           │       │
    │           │       └─→ Parse progress output
    │           │
    │           ├─→ Send progress updates via IPC (ipcRenderer.on('progress'))
    │           │
    │           └─→ Job complete → Update DB → Send result
    │
    ├─→ Listen for 'progress' events
    │
    ├─→ Update progress bar in UI
    │
    └─→ Show success/error message
```

---

## File Organization

### Frontend Structure

```
src/renderer/
├── main.tsx                     # React entry point
├── App.tsx                      # Main layout component
├── index.tsx                    # (Rendered to DOM)
│
├── pages/                       # Full-screen pages
│   ├── ExtractAudio.tsx
│   ├── MergeAudio.tsx
│   ├── History.tsx
│   └── Settings.tsx
│
├── components/                  # Reusable UI components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── PageLayout.tsx
│   │
│   ├── buttons/
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   └── ButtonGroup.tsx
│   │
│   ├── forms/
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── FileInput.tsx
│   │   └── FormGroup.tsx
│   │
│   ├── tables/
│   │   ├── Table.tsx
│   │   ├── TableRow.tsx
│   │   └── TableCell.tsx
│   │
│   ├── indicators/
│   │   ├── StatusDot.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Spinner.tsx
│   │   └── Badge.tsx
│   │
│   ├── overlays/
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Tooltip.tsx
│   │   └── DropZone.tsx
│   │
│   └── specialized/
│       ├── StreamSelector.tsx
│       ├── FormatSelector.tsx
│       ├── ProgressDock.tsx
│       ├── LogViewer.tsx
│       └── FileTable.tsx
│
├── hooks/                       # Custom React hooks
│   ├── useIPC.ts               # IPC communication
│   ├── useFFmpeg.ts            # FFmpeg operations
│   ├── useBatchProcessor.ts    # Batch job management
│   ├── useTheme.ts             # Theme switching
│   ├── useLocalStorage.ts      # Persistent state
│   └── useAsync.ts             # Async operations
│
├── stores/                      # Zustand state management
│   ├── appStore.ts             # General app state
│   ├── fileStore.ts            # Files/streams state
│   ├── jobStore.ts             # Job queue state
│   ├── settingsStore.ts        # User settings
│   └── themeStore.ts           # Theme state
│
├── styles/                      # CSS files
│   ├── design-tokens.css       # Design variables
│   ├── global.css              # Global styles
│   ├── components.css          # Component styles
│   ├── layouts.css             # Layout styles
│   └── animations.css          # Animation definitions
│
├── utils/                       # Utility functions
│   ├── format.ts               # Formatting helpers
│   ├── validation.ts           # Input validation
│   ├── time.ts                 # Time utilities
│   └── file.ts                 # File helpers
│
└── types.ts                     # TypeScript definitions
```

### Backend Structure

```
src/main/
├── index.ts                     # Electron main entry
├── preload.ts                   # Preload script (for security)
│
├── ipc.ts                       # IPC event handlers
├── handlers/
│   ├── extractHandler.ts
│   ├── mergeHandler.ts
│   ├── probeHandler.ts
│   ├── settingsHandler.ts
│   └── statusHandler.ts
│
├── ffmpeg/
│   ├── executor.ts             # FFmpeg wrapper
│   ├── parser.ts               # Output parsing
│   ├── detector.ts             # FFmpeg detection
│   └── types.ts                # FFmpeg types
│
├── mkvtoolnix/
│   ├── executor.ts             # mkvmerge wrapper
│   ├── parser.ts               # MKV parsing
│   └── types.ts                # MKV types
│
├── gpu/
│   ├── detector.ts             # GPU detection
│   ├── nvidia.ts               # NVIDIA CUDA support
│   ├── amd.ts                  # AMD support
│   ├── intel.ts                # Intel QSV support
│   └── types.ts                # GPU types
│
├── queue/
│   ├── processor.ts            # Job queue (Bull)
│   ├── jobs.ts                 # Job definitions
│   └── state.ts                # Queue state
│
├── db/
│   ├── connection.ts           # SQLite setup
│   ├── migrations.ts           # Schema migrations
│   ├── repository.ts           # Data operations
│   ├── models/
│   │   ├── Job.ts
│   │   ├── History.ts
│   │   └── Settings.ts
│   └── types.ts                # DB types
│
├── files/
│   ├── validator.ts            # File validation
│   ├── manager.ts              # File operations
│   ├── temp.ts                 # Temp file handling
│   └── types.ts                # File types
│
├── logger.ts                    # Logging service
├── config.ts                    # Configuration
├── constants.ts                # Constants
└── utils.ts                     # Utility functions
```

### Shared Structure

```
src/shared/
├── types.ts                     # Shared TypeScript types
│   ├── AudioStreamInfo
│   ├── VideoEntry
│   ├── Job
│   ├── JobStatus
│   ├── FFmpegFormat
│   ├── GPUInfo
│   ├── Settings
│   └── Progress
│
└── constants.ts                 # Shared constants
    ├── FORMATS
    ├── STATUSES
    ├── IPC_CHANNELS
    └── DEFAULT_SETTINGS
```

---

## Component Hierarchy

```
App
├── Sidebar
│   ├── Logo
│   ├── Navigation
│   │   ├── NavLink (Extract Audio)
│   │   ├── NavLink (Merge Audio)
│   │   └── NavLink (History)
│   ├── Separator
│   └── StatusFooter
│       ├── StatusIndicator (FFmpeg)
│       ├── StatusIndicator (mkvmerge)
│       ├── StatusIndicator (GPU)
│       └── ThemeToggle
│
└── MainContent
    ├── Header
    │   ├── PageTitle
    │   ├── PageSubtitle
    │   └── Utilities (Search, Menu)
    │
    └── Page (based on route)
        │
        ├── ExtractAudioPage
        │   ├── Toolbar
        │   │   ├── ButtonGroup (Add files, Add folder)
        │   │   ├── Separator
        │   │   ├── SearchInput
        │   │   ├── Button (Remove)
        │   │   ├── Button (Clear)
        │   │   └── Counter
        │   │
        │   ├── FileTable
        │   │   ├── TableHeader
        │   │   ├── TableBody
        │   │   │   └── TableRow (repeating)
        │   │   │       ├── Checkbox
        │   │   │       ├── FileName
        │   │   │       ├── FileSize
        │   │   │       ├── StreamSelector (Dropdown)
        │   │   │       └── StatusIndicator
        │   │   │
        │   │   └── TableFooter
        │   │       └── Counter "X of Y ready"
        │   │
        │   ├── OutputSection
        │   │   ├── Label
        │   │   ├── Input
        │   │   └── Button (Browse)
        │   │
        │   ├── FormatSection
        │   │   ├── Label
        │   │   └── RadioGroup
        │   │       ├── Radio (Copy)
        │   │       ├── Radio (MP3)
        │   │       ├── Radio (AAC)
        │   │       └── Radio (FLAC)
        │   │
        │   ├── ProgressDock (conditional)
        │   │   ├── StatusRow (Idle or Processing)
        │   │   ├── ProgressBar (per-file)
        │   │   ├── ProgressBar (overall)
        │   │   ├── Controls (Pause, Stop, Logs)
        │   │   └── LogViewer (expandable)
        │   │
        │   └── PrimaryCTA
        │       └── Button "▸ Extract audio"
        │
        ├── MergeAudioPage
        │   └── (Similar structure to Extract)
        │
        └── HistoryPage
            ├── FilterBar
            │   ├── SearchInput
            │   └── FilterButtons
            │
            ├── HistoryTable
            │   ├── TableHeader
            │   ├── TableBody
            │   │   └── HistoryRow (repeating)
            │   │       ├── Date
            │   │       ├── File
            │   │       ├── Operation
            │   │       ├── Duration
            │   │       └── Status
            │   │
            │   └── TableFooter
            │       └── Pagination
            │
            └── ClearHistoryButton
```

---

## IPC Channel Reference

### Available IPC Channels

| Channel | Direction | Args | Returns | Purpose |
|---------|-----------|------|---------|---------|
| `probe-streams` | invoke | `{ filePath: string }` | `AudioStreamInfo[]` | Detect audio streams |
| `extract-audio` | invoke | `{ input, output, format, streamIndex }` | `{ success: boolean }` | Start extraction |
| `merge-audio` | invoke | `{ inputs: string[], output }` | `{ success: boolean }` | Start merge |
| `cancel-job` | invoke | `{ jobId: string }` | `{ success: boolean }` | Cancel running job |
| `get-ffmpeg-status` | invoke | `{}` | `{ available: boolean, version: string }` | Check FFmpeg |
| `get-gpu-info` | invoke | `{}` | `GPUInfo` | Get GPU info |
| `save-settings` | invoke | `Settings` | `{ success: boolean }` | Save settings |
| `get-settings` | invoke | `{}` | `Settings` | Load settings |
| `get-history` | invoke | `{}` | `JobHistory[]` | Load history |
| `clear-history` | invoke | `{ clearAll: boolean }` | `{ success: boolean }` | Clear history |
| `browse-folder` | invoke | `{}` | `{ canceled: boolean, filePath: string }` | Open folder dialog |
| `open-file-dialog` | invoke | `{}` | `{ canceled: boolean, filePaths: string[] }` | Open file dialog |
| `progress` | on/off | N/A | `Progress` | Listen for progress updates |
| `job-complete` | on/off | N/A | `JobResult` | Listen for job completion |
| `log-output` | on/off | N/A | `{ timestamp, level, message }` | Listen for log output |

---

## State Management (Zustand)

### Store Structure

```typescript
// appStore
{
  currentPage: 'extract' | 'merge' | 'history';
  isProcessing: boolean;
  lastError: string | null;
  actions: {
    setCurrentPage,
    setProcessing,
    setError,
    clearError,
  }
}

// fileStore
{
  files: VideoEntry[];
  selectedIndices: number[];
  searchQuery: string;
  actions: {
    addFiles,
    removeFiles,
    selectFile,
    deselectFile,
    setSearchQuery,
    clearAll,
  }
}

// jobStore
{
  jobs: Job[];
  currentJobId: string | null;
  progress: Progress;
  actions: {
    addJob,
    updateJob,
    removeJob,
    setProgress,
    cancelJob,
  }
}

// settingsStore
{
  outputDirectory: string;
  defaultFormat: string;
  gpuEnabled: boolean;
  theme: 'light' | 'dark';
  autoUpdate: boolean;
  actions: {
    updateSetting,
    loadSettings,
    saveSettings,
  }
}

// themeStore
{
  isDark: boolean;
  actions: {
    toggleTheme,
    setTheme,
  }
}
```

---

## Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'extract' | 'merge'
  input_files TEXT NOT NULL,    -- JSON array of paths
  output_file TEXT NOT NULL,
  output_format TEXT,           -- 'mp3', 'aac', 'flac', 'copy'
  status TEXT NOT NULL,         -- 'pending', 'processing', 'complete', 'failed'
  progress REAL DEFAULT 0,
  duration INTEGER,             -- Milliseconds
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  metadata TEXT                 -- JSON for additional data
);

CREATE INDEX idx_status ON jobs(status);
CREATE INDEX idx_created_at ON jobs(created_at DESC);
```

### Settings Table
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sample data:
-- output_directory | /home/user/Audio
-- default_format | copy
-- gpu_enabled | true
-- theme | dark
-- auto_update | true
```

---

## Communication Flow

### React → Node.js → External

```
User Action
    ↓
React Component
    ↓
Zustand Store Update
    ↓
useIPC Hook
    ↓
ipcRenderer.invoke('channel-name', args)
    ↓
[IPC Bridge]
    ↓
Electron Main Process
    ↓
IPC Handler (ipcMain.handle)
    ↓
Business Logic Module (FFmpeg, DB, etc.)
    ↓
Spawn External Process / Database Query
    ↓
Collect Result
    ↓
Return to Handler
    ↓
[IPC Bridge]
    ↓
Promise Resolution
    ↓
React Component Update
    ↓
UI Renders
```

---

## Performance Considerations

### Optimization Strategies

1. **Code Splitting**
   - Lazy load pages with React.lazy()
   - Split components dynamically

2. **State Management**
   - Use Zustand slices for granular updates
   - Memoize selectors

3. **Rendering**
   - Virtualize long lists (Table component)
   - Use React.memo for expensive components
   - Debounce search input

4. **IPC Communication**
   - Batch multiple IPC calls when possible
   - Use event streaming for progress (not polling)
   - Limit file sizes in IPC messages

5. **Database**
   - Create appropriate indexes
   - Use pagination for history
   - Archive old jobs periodically

---

## Error Handling Strategy

```
Frontend Error
    ↓
├─→ User Input Error → Show validation message
├─→ IPC Error → Show toast with retry option
├─→ Network Error → Queue and retry later
└─→ Unknown Error → Log + Show error boundary

Backend Error
    ↓
├─→ FFmpeg Error → Save to job, show in UI
├─→ File Error → Validate path, show dialog
├─→ Database Error → Log, fallback to memory
└─→ GPU Error → Fall back to CPU encoding
```

---

## Deployment Checklist

- [ ] All tests passing
- [ ] Build succeeds for all platforms
- [ ] Code signed (Windows + macOS)
- [ ] Auto-update configured
- [ ] Release notes written
- [ ] GitHub release created
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped in package.json

---

This architecture ensures:
✅ Clean separation of concerns
✅ Type-safe communication
✅ Easy testing and debugging
✅ Scalable component structure
✅ Maintainable codebase
