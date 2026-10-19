"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogIn, PlayCircle, Search } from "lucide-react"
import { useDemoState } from "@/lib/store"
import { homeFor } from "@/lib/account-client"
import { useDemoEnabled } from "./providers"
import { Brand, DemoBanner, ThemeToggle } from "./chrome"
import { cx } from "./ui"

export function PublicShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { mode, account } = useDemoState()
  const demo = useDemoEnabled()
  // Topo enxuto: encontrar personal, como funciona e entrar. O resto fica no rodapé.
  const links = [
    { href: "/personais", label: "Encontrar personal" },
    ...(demo
      ? [
          { href: "/studio", label: "Demonstração do Studio" },
          { href: "/aluno", label: "Demonstração do app do aluno" },
        ]
      : [
          { href: "/#como-funciona", label: "Como funciona" },
          { href: "/criar-conta", label: "Criar conta" },
        ]),
    { href: "/biblioteca", label: "Biblioteca de exercícios" },
  ]
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse">
        Pular para o conteúdo
      </a>
      <DemoBanner />
      <header className="glass sticky top-[var(--safe-top)] z-30 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <nav aria-label="Principal" className="flex items-center gap-1">
            <Link
              href="/personais"
              aria-current={path.startsWith("/personais") ? "page" : undefined}
              className={cx(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                path.startsWith("/personais") ? "bg-surface text-fg shadow-[var(--shadow)]" : "text-muted hover:text-fg",
              )}
            >
              <Search size={15} aria-hidden className="sm:hidden" />
              <span className="sr-only sm:not-sr-only">Encontrar personal</span>
            </Link>
            {demo ? (
              <details className="lp-menu">
                <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:text-fg">
                  <PlayCircle size={15} aria-hidden className="sm:hidden" />
                  <span className="sr-only sm:not-sr-only">Ver como funciona</span>
                  <ChevronDown size={14} aria-hidden className="hidden sm:block" />
                </summary>
                <div className="lp-menu-panel" onClick={(e) => (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open")}>
                  <Link href="/studio">
                    <b>Para o personal</b>
                    <span>O Studio com alunos e fichas de exemplo</span>
                  </Link>
                  <Link href="/aluno">
                    <b>Para o aluno</b>
                    <span>O app que o aluno usa no treino</span>
                  </Link>
                </div>
              </details>
            ) : (
              <Link href="/#como-funciona" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:text-fg">
                <PlayCircle size={15} aria-hidden className="sm:hidden" />
                <span className="sr-only sm:not-sr-only">Como funciona</span>
              </Link>
            )}
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
              Prescrição, execução e evolução em um só sistema para personal trainers autônomos.{demo ? " Versão de demonstração — perfis exibidos são fictícios." : ""}
            </p>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 sm:justify-end">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center text-muted hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
