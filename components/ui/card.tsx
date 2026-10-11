import type { HTMLAttributes, ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

type CardProps = HTMLAttributes<HTMLElement> & {
  /** 'raised' = profundidade sutil (padrão); 'flat' = só borda; 'dark' = superfície Maastricht. */
  tone?: 'raised' | 'flat' | 'dark'
  as?: 'div' | 'section' | 'article' | 'li'
}

const tones = {
  raised: 'bg-surface shadow-sm border border-line-soft',
  flat: 'bg-surface border border-line',
  dark: 'on-dark bg-maastricht text-paper shadow-md',
}

export function Card({ tone = 'raised', as: Tag = 'div', className, ...props }: CardProps) {
  return <Tag className={cn('rounded-lg', tones[tone], className)} {...props} />
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-5 pb-0', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/**
 * Indicador do painel. Só recebe valores reais: sem `value`, mostra um traço e a dica
 * de vazio, para nunca exibir um número inventado.
 */
export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  emptyHint = 'Sem dados ainda',
  className,
}: {
  label: string
  value: number | string | null
  unit?: string
  /** Variação em relação ao período anterior (opcional). */
  delta?: number | null
  deltaLabel?: string
  emptyHint?: string
  className?: string
}) {
  const empty = value === null || value === undefined
  const positive = typeof delta === 'number' && delta >= 0
  return (
    <Card className={cn('p-5', className)}>
      <p className="text-sm text-ink-2">{label}</p>
      <p className="tabular mt-2 flex items-baseline gap-1.5 text-3xl font-semibold tracking-tight text-ink">
        {empty ? <span aria-label="sem dados">—</span> : value}
        {!empty && unit && <span className="text-base font-medium text-ink-3">{unit}</span>}
      </p>
      {empty ? (
        <p className="mt-1.5 text-sm text-ink-3">{emptyHint}</p>
      ) : (
        typeof delta === 'number' && (
          <p className={cn('mt-1.5 flex items-center gap-1 text-sm', positive ? 'text-success' : 'text-danger')}>
            {positive ? (
              <ArrowUpRight className="size-4" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="size-4" aria-hidden="true" />
            )}
            <span className="tabular font-medium">{Math.abs(delta)}</span>
            {deltaLabel && <span className="text-ink-3">{deltaLabel}</span>}
          </p>
        )
      )}
    </Card>
  )
}
