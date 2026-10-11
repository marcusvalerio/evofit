import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/ui/cn'

/** Tabela com rolagem horizontal em telas estreitas. `caption` é lido por leitores de tela. */
export function Table({ caption, className, children, ...props }: HTMLAttributes<HTMLTableElement> & { caption: string }) {
  return (
    // Região rolável: precisa de nome e foco por teclado para quem não usa mouse/toque.
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-line-soft bg-surface shadow-sm"
    >
      {/* min-w: em telas estreitas a tabela rola na horizontal em vez de espremer as colunas. */}
      <table className={cn('w-full min-w-[34rem] border-collapse text-left text-sm', className)} {...props}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('whitespace-nowrap border-b border-line bg-paper px-4 py-3 text-xs font-medium text-ink-2', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('whitespace-nowrap border-b border-line-soft px-4 py-3.5 text-ink', className)} {...props} />
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors last:*:border-b-0 hover:bg-gainsboro-soft/60', className)} {...props} />
}

/**
 * Paginação por links (funciona sem JavaScript e é compartilhável). A página atual vem da
 * URL, então recarregar ou voltar no navegador mantém o lugar.
 */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  className,
}: {
  page: number
  pageCount: number
  hrefFor: (page: number) => string
  className?: string
}) {
  if (pageCount <= 1) return null
  const prev = page > 1
  const next = page < pageCount
  const linkClass =
    'inline-flex h-11 items-center gap-1 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-gainsboro-soft'
  const off = 'pointer-events-none opacity-50'

  return (
    <nav aria-label="Paginação" className={cn('flex items-center justify-between gap-3', className)}>
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={!prev}
        tabIndex={prev ? undefined : -1}
        className={cn(linkClass, !prev && off)}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anterior
      </Link>
      <p className="tabular text-sm text-ink-2" aria-live="polite">
        Página {page} de {pageCount}
      </p>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={!next}
        tabIndex={next ? undefined : -1}
        className={cn(linkClass, !next && off)}
      >
        Próxima
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  )
}
