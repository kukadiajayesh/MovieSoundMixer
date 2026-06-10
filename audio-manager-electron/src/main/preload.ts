import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: any) => ipcRenderer.on(channel, listener),
    once: (channel: string, listener: any) => ipcRenderer.once(channel, listener),
    removeListener: (channel: string, listener: any) =>
      ipcRenderer.removeListener(channel, listener),
  },
  // File.path was removed from the renderer in modern Electron; this is the
  // sanctioned way to resolve a dropped File object to an absolute path.
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
})
