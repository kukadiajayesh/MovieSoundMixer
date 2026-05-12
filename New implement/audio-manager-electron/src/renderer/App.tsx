import { useEffect, useState } from 'react'

export default function App() {
  const [version, setVersion] = useState('')

  useEffect(() => {
    const getVersion = async () => {
      try {
        const v = await window.electron?.ipcRenderer?.invoke('get-version')
        setVersion(v)
      } catch (error) {
        console.error('Failed to get version:', error)
      }
    }
    getVersion()
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>FFmpeg Audio Manager</h1>
        {version && <span className="version">v{version}</span>}
      </header>
      <main className="app-main">
        <p>Welcome! This is your Electron + React application.</p>
      </main>
    </div>
  )
}
