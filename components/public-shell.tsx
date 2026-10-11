"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Brand, DemoBanner, ThemeToggle } from "./chrome"
import { cx } from "./ui"

export function PublicShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const links = [
    { href: "/personais", label: "Encontrar personal" },
    { href: "/studio", label: "Studio" },
    { href: "/aluno", label: "App do aluno" },
  ]
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Brand />
          <nav aria-label="Principal" className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={path.startsWith(l.href) ? "page" : undefined}
                className={cx("hidden h-9 items-center rounded-full px-3 text-sm font-medium sm:inline-flex", path.startsWith(l.href) ? "bg-surface text-fg" : "text-muted hover:text-fg")}
              >
                {l.label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:pt-10">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
          <p>EVOFIT · versão de demonstração. Perfis exibidos são fictícios.</p>
          <nav aria-label="Rodapé" className="flex gap-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
