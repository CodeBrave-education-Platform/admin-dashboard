'use client'

import React, { createContext, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let nextToastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success', duration = 4000) => {
    const id = `toast_${nextToastId++}`
    setToasts(prev => [...prev, { id, message, type }])

    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
        {toasts.map(toast => {
          let bg = 'bg-slate-900 text-white border-slate-800'
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />

          if (toast.type === 'error') {
            bg = 'bg-rose-950 text-rose-100 border-rose-800'
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          } else if (toast.type === 'info') {
            bg = 'bg-teal-950 text-teal-100 border-teal-800'
            icon = <Info className="w-5 h-5 text-teal-400 shrink-0" />
          }

          return (
            <div
              key={toast.id}
              className={`p-4 rounded-2xl border ${bg} shadow-2xl flex items-center justify-between gap-3 pointer-events-auto transition-all transform translate-y-0 text-xs font-semibold leading-snug`}
            >
              <div className="flex items-center gap-3">
                {icon}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return { showToast: (msg) => alert(msg) }
  }
  return context
}
