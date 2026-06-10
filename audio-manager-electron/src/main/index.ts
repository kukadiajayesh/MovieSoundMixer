import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { setMainWindow, resumeInterruptedJobs } from './queue/jobQueue'
import { setupIPCHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  })

  // Initialize job queue window binding and IPC handlers
  setMainWindow(mainWindow)
  setupIPCHandlers(mainWindow)

  // Re-queue any jobs that were interrupted by a previous shutdown.
  mainWindow.webContents.once('did-finish-load', () => {
    resumeInterruptedJobs()
  })

  const isDev = process.env.NODE_ENV?.trim() === 'development' || !app.isPackaged
  const url = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../index.html')}`

  mainWindow.loadURL(url)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', async () => {
  try {
    const { initDatabase } = await import('./db/connection')
    await initDatabase()
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err)
  }
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.handle('get-version', () => {
  return app.getVersion()
})
