import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: any) => ipcRenderer.on(channel, listener),
    once: (channel: string, listener: any) => ipcRenderer.once(channel, listener),
    removeListener: (channel: string, listener: any) =>
      ipcRenderer.removeListener(channel, listener),
  },
})
