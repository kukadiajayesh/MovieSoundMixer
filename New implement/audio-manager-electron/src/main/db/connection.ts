import sqlite3 from 'sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: sqlite3.Database | null = null

export function initDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    try {
      const userDataPath = app.getPath('userData')

      // Ensure AppData Roaming folder path exists
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }

      const dbPath = path.join(userDataPath, 'database.db')
      console.log('Initializing SQLite database at:', dbPath)

      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }

        createTables()
          .then(() => seedDefaultSettings())
          .then(() => resolve(db!))
          .catch(reject)
      })
    } catch (err) {
      reject(err)
    }
  })
}

export function getDatabase(): sqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

function createTables(): Promise<void> {
  const database = getDatabase()
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // 1. Settings Table
      database.run(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`,
        (err) => {
          if (err) return reject(err)
        },
      )

      // 2. History Table
      database.run(
        `CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          file TEXT NOT NULL,
          operation TEXT NOT NULL,
          duration TEXT NOT NULL,
          status TEXT NOT NULL,
          logs TEXT NOT NULL
        )`,
        (err) => {
          if (err) return reject(err)
        },
      )

      // 3. Jobs Table (queue persistence so interrupted jobs can resume on next launch)
      database.run(
        `CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          input_path TEXT NOT NULL,
          output_path TEXT NOT NULL,
          args TEXT NOT NULL,
          duration REAL NOT NULL,
          status TEXT NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0,
          error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        (err) => {
          if (err) return reject(err)
        },
      )

      // 4. Indexes for the hot query paths
      database.run('CREATE INDEX IF NOT EXISTS idx_history_date ON history(date)', (err) => {
        if (err) return reject(err)
      })
      database.run('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })
}

function seedDefaultSettings(): Promise<void> {
  const database = getDatabase()

  // Set default save directory safely to Downloads folder
  let downloadsPath = ''
  try {
    downloadsPath = path.join(app.getPath('downloads'), 'Audio_Extracted')
  } catch (err) {
    downloadsPath = 'C:/Users/Downloads/Audio_Extracted'
  }

  const defaultSettings = [
    { key: 'output_directory', value: downloadsPath },
    { key: 'default_format', value: 'copy' },
    { key: 'gpu_enabled', value: 'true' },
    { key: 'theme', value: 'system' },
    { key: 'auto_update', value: 'true' },
  ]

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      const stmt = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
      for (const s of defaultSettings) {
        stmt.run(s.key, s.value)
      }
      stmt.finalize((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}
