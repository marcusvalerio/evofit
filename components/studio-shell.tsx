"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, MessageCircle, BadgeCheck, ClipboardList, Dumbbell, LayoutDashboard, Ruler, Search, ShieldCheck, Smartphone, UserRound, Users, Wallet } from "@/components/icons"
import { GlassNav } from "./glass-nav"
import { Brand, DemoBanner, ThemeToggle } from "./chrome"
import { Avatar, cx, LoadingScreen, NotFoundState } from "./ui"
import { useDemoState } from "@/lib/store"
import { FirstAccessPassword } from "./first-access"
import { AccessLocked, Onboarding } from "./onboarding"
import { GateScreen, useLoginGate } from "./login-gate"
import { WhatsNew } from "./whats-new"

const NAV = [
  { href: "/studio", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/studio/avisos", label: "Avisos", icon: Bell },
  { href: "/studio/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/studio/alunos", label: "Alunos", icon: Users },
  { href: "/studio/treinos", label: "Treinos", icon: ClipboardList },
  { href: "/studio/avaliacoes", label: "Avaliações", icon: Ruler },
  { href: "/studio/caixa", label: "Caixa", icon: Wallet },
  { href: "/studio/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/studio/perfil", label: "Perfil", icon: UserRound },
  { href: "/studio/plano", label: "Plano", icon: BadgeCheck },
]

function isActive(path: string, href: string, exact?: boolean) {
  return exact ? path === href : path === href || path.startsWith(`${href}/`)
}

export function StudioShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { data, mode, account } = useDemoState()
  const gated = useLoginGate()
  const isStudent = mode === "account" && account?.role === "student"
  const mustChange = mode === "account" && account?.role === "trainer" && !!account.mustChangePassword
  const isAdmin = mode === "account" && !!account?.isAdmin
  const trainerAccount = mode === "account" && account?.role === "trainer" && !account.mustChangePassword
  const needsOnboarding = trainerAccount && account?.onboarded === false
  const locked = trainerAccount && account?.hasAccess === false && !path.startsWith("/studio/plano") && !path.startsWith("/studio/perfil")

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse">
        Pular para o conteúdo
      </a>
      <DemoBanner />
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar (desktop) */}
        <aside className="side-glass sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] w-60 shrink-0 flex-col rounded-[32px] px-3 py-5 lg:flex">
          <div className="px-3">
            <Brand suffix="Studio" href="/studio" />
          </div>
          <nav aria-label="Studio" className="mt-8 flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const on = isActive(path, href, exact)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors",
                    on ? "side-on text-fg" : "text-muted hover:bg-line hover:text-fg",
                  )}
                >
                  <Icon size={20} aria-hidden filled={on} className={on ? "text-accent" : undefined} />
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-8 border-t border-line pt-4">
            <p className="t-eyebrow px-3 pb-2">Outras experiências</p>
            <Link href="/aluno" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-line hover:text-fg">
              <Smartphone size={17} aria-hidden /> App do aluno
            </Link>
            <Link href="/personais" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-line hover:text-fg">
              <Search size={17} aria-hidden /> Encontrar personal
            </Link>
            {isAdmin && (
              <Link href="/admin" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-line hover:text-fg">
                <ShieldCheck size={17} aria-hidden /> Administração
              </Link>
            )}
          </div>
          <div className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2">
            {data && <Avatar name={data.profile.name} accent={data.profile.accent} size="sm" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{data?.profile.name ?? "…"}</p>
              <p className="text-xs text-muted">{mode === "account" ? "Conta EVOFIT" : "Conta demonstrativa"}</p>
            </div>
            <ThemeToggle />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topo (mobile/tablet) */}
          <header className="glass sticky top-[var(--safe-top)] z-30 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-line px-4 lg:hidden">
            <Brand suffix="Studio" href="/studio" />
            <div className="flex shrink-0 items-center gap-0.5">
              {isAdmin && (
                <Link href="/admin" className="btn btn-ghost btn-icon btn-sm" aria-label="Administração">
                  <ShieldCheck size={17} aria-hidden />
                </Link>
              )}
              <Link href="/studio/mensagens" className="btn btn-ghost btn-icon btn-sm" aria-label="Mensagens">
                <MessageCircle size={18} aria-hidden />
              </Link>
              <Link href="/studio/avisos" className="btn btn-ghost btn-icon btn-sm" aria-label="Avisos">
                <Bell size={18} aria-hidden />
              </Link>
              <Link href="/aluno" className="btn btn-ghost btn-sm" aria-label="Abrir app do aluno">
                <Smartphone size={17} aria-hidden />
                <span className="hidden sm:inline">App do aluno</span>
              </Link>
              <span className="hidden sm:contents">
                <ThemeToggle />
              </span>
              <Link href="/studio/perfil" className="grid h-11 w-11 shrink-0 place-items-center" aria-label="Perfil">
                {data ? <Avatar name={data.profile.name} accent={data.profile.accent} size="sm" /> : <UserRound size={18} aria-hidden />}
              </Link>
            </div>
          </header>

          <main id="conteudo" className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
            {gated ? (
              <GateScreen />
            ) : !data ? (
              <LoadingScreen />
            ) : mustChange ? (
              <FirstAccessPassword login={account?.email ?? ""} who="trainer" />
            ) : needsOnboarding ? (
              <Onboarding />
            ) : locked ? (
              <AccessLocked />
            ) : isStudent ? (
              <NotFoundState title="Esta é a área do personal" href="/aluno" cta="Ir para meus treinos">
                Você entrou com uma conta de aluno. Seus treinos estão no app do aluno.
              </NotFoundState>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      <WhatsNew who="personal" ready={!!data && !gated && !mustChange && !needsOnboarding && !locked && !isStudent} createdAt={account?.createdAt} />

      {/* Navegação inferior de vidro (mobile/tablet) */}
      <div className="lg:hidden">
        <GlassNav
          label="Studio"
          items={NAV.filter((n) => !["/studio/plano", "/studio/avisos", "/studio/mensagens", "/studio/perfil"].includes(n.href)).map(({ href, label, icon, exact }) => ({
            href,
            label: label === "Avaliações" ? "Avaliar" : label,
            icon,
            on: isActive(path, href, exact),
          }))}
        />
      </div>
    </div>
  )
}
