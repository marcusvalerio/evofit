import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/ui/cn'

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-gainsboro text-ink',
  brand: 'bg-maastricht text-paper',
  accent: 'bg-portland-wash text-portland-ink',
  success: 'bg-success-wash text-success',
  warning: 'bg-warning-wash text-warning',
  danger: 'bg-danger-wash text-danger',
}

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-ink-3',
  brand: 'bg-portland',
  accent: 'bg-portland-ink',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/**
 * Status em texto + ponto. O significado nunca depende só da cor: o rótulo sempre aparece.
 */
export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Mapas de status do domínio → rótulo em português e tom. */
export const contactStatus: Record<'pending' | 'responded' | 'closed' | 'cancelled', { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendente', tone: 'accent' },
  responded: { label: 'Respondida', tone: 'success' },
  closed: { label: 'Encerrada', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
}

export const linkStatus: Record<'invited' | 'active' | 'ended', { label: string; tone: BadgeTone }> = {
  invited: { label: 'Convite enviado', tone: 'warning' },
  active: { label: 'Ativo', tone: 'success' },
  ended: { label: 'Encerrado', tone: 'neutral' },
}

export const planStatus: Record<'draft' | 'published', { label: string; tone: BadgeTone }> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  published: { label: 'Publicado', tone: 'success' },
}
