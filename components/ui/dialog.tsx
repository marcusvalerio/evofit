'use client'

import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

/**
 * Diálogo modal sobre o <dialog> nativo: o navegador cuida da camada superior, do bloqueio
 * do fundo, da armadilha de foco e do Esc. Nós ligamos título/descrição e devolvemos o foco.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        // Clique no fundo (fora do painel) fecha.
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line-soft bg-surface p-0 text-ink shadow-pop',
        'open:animate-[evo-pop_0.18s_var(--ease-out-quint)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-6 pb-2">
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-sm text-ink-2">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mr-2 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-gainsboro-soft hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      {children && <div className="px-6 py-3">{children}</div>}
      {footer && <div className="flex flex-col-reverse gap-2 p-6 pt-3 sm:flex-row sm:justify-end">{footer}</div>}
    </dialog>
  )
}
