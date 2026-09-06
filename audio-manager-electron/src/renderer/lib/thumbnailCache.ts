// Memoizes 'get-video-thumbnail' IPC calls per file path so remounting or
// re-rendering the same row never re-requests a thumbnail that's already
// resolved (or in flight). Also caps how many extractions run at once so
// importing a big folder of videos doesn't spawn dozens of ffmpeg processes
// simultaneously.
const cache = new Map<string, Promise<string | null>>()

const MAX_CONCURRENT = 2
let active = 0
const queue: Array<() => void> = []

const runQueued = <T>(task: () => Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const run = () => {
      active++
      task()
        .then(resolve, reject)
        .finally(() => {
          active--
          queue.shift()?.()
        })
    }
    if (active < MAX_CONCURRENT) run()
    else queue.push(run)
  })

export const getVideoThumbnail = (filePath: string): Promise<string | null> => {
  const cached = cache.get(filePath)
  if (cached) return cached

  const promise = runQueued(async () => {
    if (!window.electron?.ipcRenderer) return null
    try {
      const res = await window.electron.ipcRenderer.invoke('get-video-thumbnail', filePath)
      return res?.success ? (res.dataUrl as string) : null
    } catch {
      return null
    }
  })
  cache.set(filePath, promise)
  return promise
}
