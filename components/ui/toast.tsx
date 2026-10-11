'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

type ToastTone = 'success' | 'danger' | 'info'
type ToastItem = { id: number; tone: ToastTone; message: string }

type ToastApi = {
  /** Mostra uma notificação. Use o mesmo verbo do botão que a gerou ("Publicar" → "Treino publicado"). */
  show: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const icons = { success: CheckCircle2, danger: AlertCircle, info: Info }
const toneClass: Record<ToastTone, string> = {
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-maastricht',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), [])

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++
    setItems((cur) => [...cur.slice(-3), { id, tone, message }])
  }, [])

  const api = useMemo<ToastApi>(
    () => ({ show, success: (m) => show(m, 'success'), error: (m) => show(m, 'danger') }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Região "viva": leitores de tela anunciam cada notificação nova. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = icons[item.tone]
  useEffect(() => {
    // Erros ficam mais tempo na tela do que confirmações.
    const timer = setTimeout(() => onDismiss(item.id), item.tone === 'danger' ? 8000 : 4500)
    return () => clearTimeout(timer)
  }, [item.id, item.tone, onDismiss])

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line-soft bg-surface p-4 shadow-pop',
        'animate-[evo-pop_0.2s_var(--ease-out-quint)]',
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', toneClass[item.tone])} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-ink">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dispensar notificação"
        className="-mr-1.5 -mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-gainsboro-soft hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
