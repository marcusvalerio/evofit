'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/ui/cn'

export type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** Casa só a rota exata (ex.: o painel). Por padrão casa também as sub-rotas. */
  exact?: boolean
  /** Número a exibir (ex.: solicitações pendentes). Só aparece se for > 0. */
  badge?: number
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
}

/** Navegação lateral do Studio (desktop). Superfície escura Maastricht. */
export function SidebarNav({ items, header, footer }: { items: NavItem[]; header?: ReactNode; footer?: ReactNode }) {
  const pathname = usePathname()
  return (
    <aside className="on-dark hidden h-dvh w-64 shrink-0 flex-col bg-maastricht text-paper lg:flex">
      {header && <div className="px-6 pb-4 pt-7">{header}</div>}
      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                    active ? 'bg-maastricht-hi text-paper' : 'text-gainsboro hover:bg-maastricht-hi/60 hover:text-paper',
                  )}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-portland" aria-hidden="true" />}
                  <Icon className={cn('size-5', active ? 'text-portland' : 'text-gainsboro')} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="tabular rounded-full bg-portland px-2 py-0.5 text-xs font-semibold text-ink">
                      <span className="sr-only">{item.badge} pendentes: </span>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {footer && <div className="border-t border-maastricht-hi p-4">{footer}</div>}
    </aside>
  )
}

/** Navegação inferior mobile (Studio em telas pequenas e app do aluno). */
export function BottomNav({ items, label = 'Principal' }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label={label}
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium transition-colors',
                  active ? 'text-maastricht' : 'text-ink-3 hover:text-ink',
                )}
              >
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-portland" aria-hidden="true" />}
                <span className="relative">
                  <Icon className="size-6" aria-hidden />
                  {item.badge ? (
                    <span className="tabular absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-portland px-1 text-center text-[0.65rem] font-semibold leading-4 text-ink">
                      <span className="sr-only">{item.badge} pendentes: </span>
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
