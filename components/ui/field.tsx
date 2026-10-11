import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

/** Props de acessibilidade que o Field injeta no controle. */
export type FieldControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
}

/**
 * Rótulo + dica + erro ligados ao controle por id/aria-describedby.
 * O erro é anunciado por leitores de tela (role="alert").
 *
 * <Field label="E-mail" error={err}>{(p) => <Input type="email" {...p} />}</Field>
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  className?: string
  children: (props: FieldControlProps) => ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const control =
  'w-full rounded-md border border-line-strong bg-surface text-base text-ink placeholder:text-ink-3 ' +
  'transition-[border-color,box-shadow] duration-150 hover:border-maastricht ' +
  'focus-visible:border-maastricht focus-visible:outline-2 focus-visible:outline-offset-1 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger ' +
  'disabled:cursor-not-allowed disabled:bg-gainsboro-soft disabled:text-ink-3 disabled:hover:border-line-strong'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-11 px-3.5', className)} {...props} />
}

export function Textarea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(control, 'min-h-24 px-3.5 py-2.5 leading-6', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(control, 'h-11 appearance-none pl-3.5 pr-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-2"
        aria-hidden="true"
      />
    </div>
  )
}

/** Campo de busca. O rótulo é obrigatório para leitores de tela, mesmo que não apareça. */
export function SearchField({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'aria-label'> & { label: string }) {
  return (
    <div className={cn('relative', className)} role="search">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-2"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label={label}
        enterKeyHint="search"
        autoComplete="off"
        className={cn(control, 'h-11 pl-10 pr-3.5')}
        {...props}
      />
    </div>
  )
}
