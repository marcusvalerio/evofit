import type { Metadata } from "next"
import Link from "next/link"
import { Activity, AlertTriangle, ArrowLeft, BadgeCheck, BarChart, Database, Lightbulb, MessageCircle, Users, Wallet } from "@/components/icons"
import { Brand, DemoBanner, ThemeToggle } from "@/components/chrome"

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
}

/** Âncoras das seções do painel, na mesma ordem em que aparecem na página. */
const SECTIONS = [
  { href: "#visao-geral", label: "Visão geral", icon: Activity },
  { href: "#personais", label: "Personais", icon: Users },
  { href: "#assinaturas", label: "Assinaturas", icon: BadgeCheck },
  { href: "#pedidos", label: "Pedidos e acessos", icon: Wallet },
  { href: "#cadastros", label: "Cadastros", icon: BarChart },
  { href: "#saude", label: "Saúde e registro", icon: Database },
  { href: "#erros", label: "Erros", icon: AlertTriangle },
  { href: "#equipe", label: "Ideias e equipe", icon: Lightbulb },
  { href: "#vendas", label: "Vendas e WhatsApp", icon: MessageCircle },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse">
        Pular para o conteúdo
      </a>
      <DemoBanner />
      <div className="mx-auto flex max-w-[90rem]">
        <aside className="side-glass sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] w-60 shrink-0 flex-col rounded-[32px] px-3 py-5 lg:flex">
          <div className="px-3">
            <Brand suffix="Admin" />
          </div>
          <nav aria-label="Seções da administração" className="mt-8 flex flex-col gap-1">
            {SECTIONS.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium text-muted transition-colors hover:bg-line hover:text-fg">
                <Icon size={18} aria-hidden /> {label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-1 pt-4">
            <Link href="/studio" className="btn btn-ghost btn-sm">
              <ArrowLeft size={16} aria-hidden /> Studio
            </Link>
            <ThemeToggle />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-[var(--safe-top)] z-30 border-b border-line lg:hidden">
            <div className="flex h-14 items-center justify-between gap-2 px-4">
              <Brand suffix="Admin" />
              <div className="flex items-center gap-1">
                <Link href="/studio" className="btn btn-ghost btn-sm">
                  <ArrowLeft size={16} aria-hidden /> Studio
                </Link>
                <ThemeToggle />
              </div>
            </div>
            <nav aria-label="Seções da administração" className="evo-admin-jump">
              {SECTIONS.map(({ href, label }) => (
                <a key={href} href={href} className="chip shrink-0">
                  {label}
                </a>
              ))}
            </nav>
          </header>
          <main id="conteudo" className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
