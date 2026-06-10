import React, { createContext, useCallback, useContext, useState } from 'react'
import { Icon } from './Icon'

export interface ToastInput {
  kind?: 'ok' | 'error' | 'info'
  title: string
  desc?: string
  duration?: number
}

type PushToast = (t: ToastInput) => void

const ToastCtx = createContext<PushToast>(() => {})

export const useToast = () => useContext(ToastCtx)

export const ToastHost: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<ToastInput & { id: string }>>([])

  const push = useCallback<PushToast>((t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((arr) => [...arr, { id, ...t }])
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), t.duration || 3500)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || ''}`}>
            <Icon name={t.kind === 'ok' ? 'check' : t.kind === 'error' ? 'error' : 'info'} />
            <div className="body">
              <div className="title">{t.title}</div>
              {t.desc && <div className="desc">{t.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
