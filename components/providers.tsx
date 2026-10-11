"use client"
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react"

type Tone = "success" | "error" | "info"
interface Toast {
  id: number
  tone: Tone
  message: string
}

const ToastCtx = createContext<(message: string, tone?: Tone) => void>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = ++seq.current
      setToasts((t) => [...t.slice(-2), { id, tone, message }])
      setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )
  const value = useMemo(() => push, [push])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:top-auto lg:items-end"
      >
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info
          return (
            <div key={t.id} className="fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-inverse px-4 py-3 text-sm text-on-inverse shadow-[var(--shadow-lg)]">
              <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100" aria-label="Fechar aviso">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
