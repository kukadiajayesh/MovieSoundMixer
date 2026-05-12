# Quick Start Setup Guide

## 5-Minute Setup for Audio Manager Migration

Follow these steps exactly to set up your development environment.

---

## Step 1: Verify Prerequisites (2 minutes)

Open terminal/PowerShell and run:

```bash
# Check Node.js
node --version
# Should show v16.0.0 or higher

# Check npm
npm --version
# Should show 8.0.0 or higher

# Check Git
git --version
```

**Don't have these?** Download from:
- Node.js: https://nodejs.org (install LTS version)
- Git: https://git-scm.com
- VSCode: https://code.visualstudio.com (recommended)

---

## Step 2: Create Project Directory (1 minute)

```bash
# Create and enter directory
mkdir audio-manager
cd audio-manager

# Initialize Git
git init

# Initialize Node.js project
npm init -y
```

---

## Step 3: Create Folder Structure (1 minute)

```bash
# Create all necessary folders
mkdir -p src/main src/renderer src/shared public
mkdir -p src/renderer/pages src/renderer/components src/renderer/hooks src/renderer/styles

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
out/
*.log
.env
.DS_Store
EOF
```

**Windows PowerShell?** Use this instead:

```powershell
New-Item -Path "src/main" -ItemType Directory -Force
New-Item -Path "src/renderer/pages" -ItemType Directory -Force
New-Item -Path "src/renderer/components" -ItemType Directory -Force
New-Item -Path "src/renderer/hooks" -ItemType Directory -Force
New-Item -Path "src/renderer/styles" -ItemType Directory -Force
New-Item -Path "src/shared" -ItemType Directory -Force
New-Item -Path "public" -ItemType Directory -Force
```

---

## Step 4: Install Dependencies (3 minutes)

```bash
# Install all packages (this takes ~2-3 minutes)
npm install electron react react-dom zustand framer-motion sqlite3 bull ffmpeg-static electron-builder vite @vitejs/plugin-react typescript @types/react @types/node -D

# Wait for installation to complete...
```

---

## Step 5: Create Configuration Files (2 minutes)

### A. Create `package.json` scripts

Find the `"scripts"` section in package.json and replace it:

```json
"scripts": {
  "dev": "vite",
  "build:vite": "vite build",
  "build:electron": "electron-builder",
  "build": "npm run build:vite && npm run build:electron"
}
```

### B. Create `vite.config.ts`

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

### C. Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  }
}
```

---

## Step 6: Create Core Application Files (2 minutes)

### A. Create `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FFmpeg Audio Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

### B. Create `src/main/index.ts`

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Development or production
  const isDev = process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    mainWindow.loadURL(isDev);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### C. Create `src/renderer/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### D. Create `src/renderer/App.tsx`

```typescript
import React from 'react';
import './styles/design-tokens.css';

export default function App() {
  return (
    <div className="app" style={{ padding: '20px' }}>
      <h1>Audio Manager</h1>
      <p>Setup Complete! Ready to build.</p>
      <pre>
        Next steps:
        1. npm run dev
        2. Start building components
      </pre>
    </div>
  );
}
```

### E. Create `src/renderer/styles/design-tokens.css`

```css
:root[data-theme="dark"],
:root {
  /* Colors - Dark */
  --bg-0: #0E1014;
  --bg-1: #14171D;
  --bg-2: #1B1F27;
  --bg-3: #232833;
  --line: #262C36;
  --fg-0: #E8EAEE;
  --fg-1: #A6ADBB;
  --fg-2: #6B7280;
  --accent: #4F8CFF;
  --accent-2: #1F66E0;
  --ok: #34D399;
  --warn: #F5B544;
  --err: #F26D6D;

  /* Typography */
  --font-size-title: 24px;
  --font-size-section: 15px;
  --font-size-body: 13px;
  --font-size-small: 11px;
  --font-size-mono: 12px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-xxl: 24px;
  --spacing-xxxl: 32px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 999px;

  /* Heights */
  --height-button-sm: 28px;
  --height-button-md: 36px;
  --height-button-lg: 44px;
  --height-input: 36px;
  --height-table-header: 36px;
  --height-table-row: 44px;
}

:root[data-theme="light"] {
  /* Colors - Light */
  --bg-0: #F7F7F5;
  --bg-1: #FFFFFF;
  --bg-2: #F1F1EE;
  --bg-3: #E7E7E3;
  --line: #DFDFD9;
  --fg-0: #16181C;
  --fg-1: #4B5363;
  --fg-2: #8A93A4;
  --accent: #2563EB;
  --accent-2: #1E4FCB;
}
```

### F. Create `src/renderer/styles/global.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
}

body {
  font-family: -apple-system, 'Segoe UI Variable', 'Segoe UI', Inter, sans-serif;
  background-color: var(--bg-0);
  color: var(--fg-0);
  font-size: var(--font-size-body);
  line-height: 1.45;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
}

h1 {
  font-size: var(--font-size-title);
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
}

input {
  font-family: inherit;
  font-size: inherit;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-1);
}

::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: var(--radius-sm);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--fg-2);
}
```

---

## Step 7: Test the Setup (1 minute)

### A. Start development server

```bash
npm run dev
```

**Expected output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### B. In another terminal, start Electron

```bash
npx electron . --inspect=5555
```

**Expected result:**
- Electron window opens
- Shows "Audio Manager" with "Setup Complete!"
- DevTools open at bottom

### C. Test hot reload

Edit `src/renderer/App.tsx` and change the title. It should refresh automatically in the Electron window.

---

## Step 8: Commit Initial Setup

```bash
git add .
git commit -m "feat: Initial Electron + React project setup"
```

---

## Folder Structure Created

```
audio-manager/
├── src/
│   ├── main/
│   │   └── index.ts          # Electron main process
│   ├── renderer/
│   │   ├── main.tsx          # React entry
│   │   ├── App.tsx           # Main component
│   │   └── styles/
│   │       ├── design-tokens.css  # Design tokens
│   │       └── global.css         # Global styles
│   └── shared/               # Shared types
├── public/                   # Static assets
├── index.html               # HTML entry
├── vite.config.ts          # Vite config
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
└── .gitignore
```

---

## Next: Phase 1 Deep Dive

Now that setup is complete, you're ready for Phase 1 tasks:

1. **Configure Electron Builder** (for packaging)
2. **Setup development scripts** (dev:all for frontend + electron)
3. **Create project documentation**
4. **Start Phase 2: Design System**

See `MIGRATION_WORKFLOW.md` for detailed Phase 1 tasks.

---

## Troubleshooting This Setup

### "Command not found: npm"
- Node.js not installed
- Restart terminal after installing Node.js
- Use full path: `C:\Program Files\nodejs\npm.cmd` (Windows)

### "Cannot find module 'react'"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 already in use
```bash
# Find process using the port
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Kill it or use different port
# Edit vite.config.ts to use port 5174
```

### Electron window blank
- Make sure Vite dev server is running first
- Check http://localhost:5173 opens in browser
- Check DevTools console for errors

### TypeScript errors
```bash
# Reinstall TypeScript
npm install typescript --save-dev
```

---

## What You Have Now

✅ Complete development environment
✅ Electron + React running
✅ Hot reload working
✅ Design tokens CSS file
✅ TypeScript configured
✅ Ready to start Phase 1

**Time taken:** ~15-20 minutes total

**Next:** Create Phase 1 task checklist in your project!
