import { getDatabase } from './connection'

export interface DBHistoryItem {
  id: string
  date: string
  file: string
  operation: string
  duration: string
  status: 'Completed' | 'Failed'
  logs: string[]
  // Absolute source path, so a run can be re-queued from History. Optional for
  // rows written before this column existed.
  inputPath?: string
}

// --------------------------------------------------------
// SETTINGS REPOSITORY
// --------------------------------------------------------

export function getSettings(): Promise<{ [key: string]: string }> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings', (err, rows: Array<{ key: string; value: string }>) => {
      if (err) {
        reject(err)
        return
      }

      const settings: { [key: string]: string } = {}
      for (const row of rows) {
        settings[row.key] = row.value
      }
      resolve(settings)
    })
  })
}

export function updateSetting(key: string, value: string): Promise<void> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value],
      (err) => {
        if (err) reject(err)
        else resolve()
      },
    )
  })
}

// --------------------------------------------------------
// HISTORY REPOSITORY
// --------------------------------------------------------

export function getHistory(): Promise<DBHistoryItem[]> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, date, file, operation, duration, status, logs, input_path FROM history ORDER BY date DESC',
      (err, rows: any[]) => {
        if (err) {
          reject(err)
          return
        }

        const items: DBHistoryItem[] = rows.map((row) => ({
          id: row.id,
          date: row.date,
          file: row.file,
          operation: row.operation,
          duration: row.duration,
          status: row.status,
          // Safely parse JSON logged lines
          logs: JSON.parse(row.logs || '[]'),
          inputPath: row.input_path ?? undefined,
        }))

        resolve(items)
      },
    )
  })
}

export function insertHistoryItem(item: Omit<DBHistoryItem, 'id' | 'date'>): Promise<void> {
  const db = getDatabase()
  const id = `hist-${Math.random().toString(36).substring(2, 9)}`

  // Format local date
  const now = new Date()
  const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO history (id, date, file, operation, duration, status, logs, input_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        dateString,
        item.file,
        item.operation,
        item.duration,
        item.status,
        JSON.stringify(item.logs),
        item.inputPath ?? null,
      ],
      (err) => {
        if (err) reject(err)
        else resolve()
      },
    )
  })
}

export function deleteHistoryItem(id: string): Promise<void> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM history WHERE id = ?', [id], (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function clearHistory(): Promise<void> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM history', (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// --------------------------------------------------------
// JOBS REPOSITORY (queue persistence)
// --------------------------------------------------------

export type JobStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled'

export interface DBJob {
  id: string
  type: 'extract' | 'merge'
  inputPath: string
  outputPath: string
  args: string[]
  duration: number
  status: JobStatus
  progress: number
  error?: string
}

export function insertJob(job: DBJob): Promise<void> {
  const db = getDatabase()
  const now = new Date().toISOString()
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO jobs
        (id, type, input_path, output_path, args, duration, status, progress, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.id,
        job.type,
        job.inputPath,
        job.outputPath,
        JSON.stringify(job.args),
        job.duration,
        job.status,
        job.progress,
        job.error ?? null,
        now,
        now,
      ],
      (err) => (err ? reject(err) : resolve()),
    )
  })
}

export function updateJobStatus(id: string, status: JobStatus, error?: string): Promise<void> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?',
      [status, error ?? null, new Date().toISOString(), id],
      (err) => (err ? reject(err) : resolve()),
    )
  })
}

export function updateJobProgress(id: string, progress: number): Promise<void> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?',
      [progress, new Date().toISOString(), id],
      (err) => (err ? reject(err) : resolve()),
    )
  })
}

// Jobs that were pending or mid-flight when the app last closed.
export function getResumableJobs(): Promise<DBJob[]> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM jobs WHERE status IN ('pending', 'processing') ORDER BY created_at ASC",
      (err, rows: any[]) => {
        if (err) return reject(err)
        resolve(
          rows.map((row) => ({
            id: row.id,
            type: row.type,
            inputPath: row.input_path,
            outputPath: row.output_path,
            args: JSON.parse(row.args || '[]'),
            duration: row.duration,
            status: row.status,
            progress: row.progress,
            error: row.error ?? undefined,
          })),
        )
      },
    )
  })
}

export function deleteJob(id: string): Promise<void> {
  const db = getDatabase()
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM jobs WHERE id = ?', [id], (err) => (err ? reject(err) : resolve()))
  })
}
