import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++idCounter
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => remove(id), 4000)
    },
    [remove]
  )

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }

  const styles = {
    success: { bar: 'bg-emerald-500', icon: '✓', iconCls: 'bg-emerald-50 text-emerald-600' },
    error: { bar: 'bg-red-500', icon: '✕', iconCls: 'bg-red-50 text-red-600' },
    info: { bar: 'bg-primary', icon: 'i', iconCls: 'bg-primary-50 text-primary' },
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5">
        {toasts.map((t) => {
          const s = styles[t.type] || styles.info
          return (
            <div
              key={t.id}
              className="relative flex w-72 items-center gap-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white py-3 pl-3 pr-4 text-sm text-slate-700 shadow-card-hover animate-slide-up"
              role="alert"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${s.iconCls}`}>
                {s.icon}
              </span>
              <span className="flex-1 font-medium">{t.message}</span>
              <span className={`absolute bottom-0 left-0 h-0.5 ${s.bar}`} style={{ width: '100%' }} />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
