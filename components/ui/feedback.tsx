import type { HTMLAttributes, ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} aria-label={label} className="inline-flex">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn('size-5 animate-[evo-spin_0.8s_linear_infinite]', className)}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** Placeholder de carregamento. Decorativo: o contêiner deve anunciar aria-busy. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-[evo-pulse_1.6s_ease-in-out_infinite] rounded-md bg-gainsboro', className)}
      {...props}
    />
  )
}

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const alertTones: Record<AlertTone, { box: string; icon: typeof Info }> = {
  info: { box: 'border-line bg-surface text-ink', icon: Info },
  success: { box: 'border-success/30 bg-success-wash text-success', icon: CheckCircle2 },
  warning: { box: 'border-warning/30 bg-warning-wash text-warning', icon: TriangleAlert },
  danger: { box: 'border-danger/30 bg-danger-wash text-danger', icon: AlertCircle },
}

/**
 * Mensagem em linha. Erros e avisos usam role="alert" (anunciado na hora);
 * as demais usam role="status".
 */
export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  className?: string
}) {
  const { box, icon: Icon } = alertTones[tone]
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border p-4 text-sm', box, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-1', 'text-ink-2')}>{children}</div>}
      </div>
    </div>
  )
}

/** Estado vazio: sempre indica o próximo passo, nunca só "nada aqui". */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gainsboro text-maastricht">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

type ProgressTone = 'accent' | 'brand'

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
  className,
}: {
  value: number
  max?: number
  /** Descrição acessível, ex.: "Séries concluídas". */
  label: string
  tone?: ProgressTone
  className?: string
}) {
  const safeMax = max > 0 ? max : 1
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(Math.max(value, 0), safeMax)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-gainsboro', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          tone === 'accent' ? 'bg-portland' : 'bg-maastricht',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
