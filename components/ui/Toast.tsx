"use client"

import React, { useState } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastItem = { id: number; kind: ToastKind; text: string }

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  function push(text: string, kind: ToastKind = 'info', duration = 2200) {
    const id = Date.now() + Math.floor(Math.random() * 10000)
    setToasts(t => [...t, { id, kind, text }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }

  function dismiss(id: number) {
    setToasts(t => t.filter(x => x.id !== id))
  }

  return { toasts, push, dismiss }
}

export function Toasts({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return (
    <div className="toast toast-end toast-bottom z-50">
      {toasts.map(t => {
        const alertClass =
          t.kind === 'success' ? 'alert-success' :
          t.kind === 'error' ? 'alert-error' :
          'alert-info'
        return (
          <div key={t.id} className={`alert ${alertClass} shadow-lg min-w-[200px] max-w-[320px]`}>
            <div className="flex items-start justify-between w-full gap-2">
              <span className="text-xs">{t.text}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => dismiss(t.id)}>×</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
