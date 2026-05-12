/// <reference types="vite/client" />

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
        once: (channel: string, listener: (event: any, ...args: any[]) => void) => void
        removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void
      }
    }
  }
}

export {}
