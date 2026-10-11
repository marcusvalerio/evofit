import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps } from 'react'
import { cn } from '@/lib/ui/cn'
import { Spinner } from '@/components/ui/feedback'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
  'transition-[background-color,box-shadow,transform,color] duration-150 ease-out ' +
  'active:translate-y-px aria-disabled:pointer-events-none aria-disabled:opacity-50 ' +
  'disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  // Laranja = ação prioritária. O rótulo é preto suavizado (contraste 5,2:1); branco não passa.
  primary: 'bg-portland text-ink shadow-xs hover:bg-portland-hi hover:shadow-sm',
  secondary: 'bg-maastricht text-paper shadow-xs hover:bg-maastricht-hi hover:shadow-sm',
  outline: 'border border-line-strong bg-surface text-ink hover:bg-gainsboro-soft',
  ghost: 'text-ink-2 hover:bg-gainsboro-soft hover:text-ink',
  danger: 'bg-danger text-surface shadow-xs hover:brightness-110',
}

// md e lg respeitam o alvo de toque mínimo de 44 px.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Mostra o indicador de carregamento e bloqueia novos cliques. */
  loading?: boolean
}

export function Button({ variant, size, loading, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      // Desabilitado esmaece; carregando NÃO: precisa parecer em andamento, não travado.
      className={buttonClasses(variant, size, cn(disabled && !loading && 'opacity-50', loading && 'cursor-progress', className))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />
}
