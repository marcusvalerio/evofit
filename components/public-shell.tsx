"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogIn } from "lucide-react"
import { useDemoState } from "@/lib/store"
import { homeFor } from "@/lib/account-client"
import { Brand, DemoBanner, ThemeToggle } from "./chrome"
import { cx } from "./ui"

export function PublicShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { mode, account } = useDemoState()
  const links = [
    { href: "/biblioteca", label: "Biblioteca" },
    { href: "/personais", label: "Encontrar personal" },
    { href: "/aluno", label: "App do aluno" },
    { href: "/studio", label: "Studio" },
  ]
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse">
        Pular para o conteúdo
      </a>
      <DemoBanner />
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <nav aria-label="Principal" className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={path.startsWith(l.href) ? "page" : undefined}
                className={cx(
                  "h-9 items-center rounded-full px-3 text-sm font-medium transition-colors",
                  l.href === "/biblioteca" ? "hidden sm:inline-flex" : l.href === "/studio" ? "inline-flex" : "hidden md:inline-flex",
                  path.startsWith(l.href) ? "bg-surface text-fg shadow-[var(--shadow)]" : "text-muted hover:text-fg",
                )}
              >
                {l.label}
              </Link>
            ))}
            {mode === "account" && account ? (
              <Link href={homeFor(account.role)} className="btn btn-primary btn-sm ml-1">
                {account.role === "student" ? "Meus treinos" : "Meu Studio"}
              </Link>
            ) : (
              <>
                <Link href="/entrar" aria-current={path === "/entrar" ? "page" : undefined} className="btn btn-ghost btn-sm">
                  <LogIn size={15} aria-hidden /> Entrar
                </Link>
                <Link href="/criar-conta" className="btn btn-primary btn-sm hidden sm:inline-flex">
                  Criar conta
                </Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-[1fr_auto] sm:px-6">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm leading-relaxed text-muted">
              Prescrição, execução e evolução em um só sistema para personal trainers autônomos. Versão de demonstração — perfis exibidos são fictícios.
            </p>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-muted hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
