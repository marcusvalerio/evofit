"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, Dumbbell, History, LayoutDashboard } from "lucide-react"
import { update, useDemoState } from "@/lib/store"
import { Brand, DemoBanner, ThemeToggle } from "./chrome"
import { Avatar, LoadingScreen, Modal, NotFoundState, cx } from "./ui"
import { useToast } from "./providers"
import { FirstAccessPassword } from "./first-access"
import { usePrecacheWorkouts } from "./offline"
import { GateScreen, useLoginGate } from "./login-gate"

export function StudentShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { data, mode, account } = useDemoState()
  const gated = useLoginGate()
  const [picking, setPicking] = useState(false)
  const student = data?.students.find((s) => s.id === data.activeStudentId && s.status === "ativo")
  const inWorkout = path.startsWith("/aluno/treino/")
  const role = mode === "account" ? account?.role : null

  const mustChange = role === "student" && !!account?.mustChangePassword
  usePrecacheWorkouts(data, student?.id ?? null)
  let content: React.ReactNode = gated ? <GateScreen /> : data ? children : <LoadingScreen />
  if (data && mustChange) content = <FirstAccessPassword login={account?.email ?? ""} />
  else if (data && role === "trainer")
    content = (
      <NotFoundState title="Esta é a área do aluno" href="/studio/alunos" cta="Ir para meus alunos">
        Você entrou como personal. Seus alunos acessam o app pelo link de convite que você gera na página de cada aluno.
      </NotFoundState>
    )
  else if (data && role === "student" && !student)
    content = (
      <NotFoundState title="Acesso pausado" href="/" cta="Ir para o início">
        Seu personal arquivou seu cadastro. Fale com ele para reativar o acesso.
      </NotFoundState>
    )

  return (
    <div className="min-h-dvh">
      <DemoBanner />
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-2 px-4">
          <Brand suffix="Aluno" />
          <div className="flex items-center gap-1">
            {student && role === "student" && (
              <span className="flex h-10 items-center gap-2 pl-1 pr-2">
                <Avatar name={student.name} size="sm" />
                <span className="max-w-[7rem] truncate text-sm font-semibold">{student.name.split(" ")[0]}</span>
              </span>
            )}
            {student && !role && (
              <button type="button" onClick={() => setPicking(true)} className="flex h-10 items-center gap-2 rounded-full pl-1 pr-3 hover:bg-line" aria-label={`Aluno atual: ${student.name}. Trocar aluno`}>
                <Avatar name={student.name} size="sm" />
                <span className="max-w-[7rem] truncate text-sm font-semibold">{student.name.split(" ")[0]}</span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={cx("mx-auto max-w-xl px-4 pt-5", inWorkout ? "pb-40" : "pb-28")}>{content}</main>

      {!inWorkout && !mustChange && (
        <nav aria-label="Aluno" className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line">
          <ul className={cx("mx-auto grid max-w-xl", role ? "grid-cols-2" : "grid-cols-3")}>
            {[
              { href: "/aluno", label: "Treinos", icon: Dumbbell, on: path === "/aluno" },
              { href: "/aluno/historico", label: "Histórico", icon: History, on: path.startsWith("/aluno/historico") },
              ...(role ? [] : [{ href: "/studio", label: "Studio", icon: LayoutDashboard, on: false }]),
            ].map(({ href, label, icon: Icon, on }) => (
              <li key={href}>
                <Link href={href} aria-current={on ? "page" : undefined} className={cx("flex h-16 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-semibold transition-colors", on ? "text-accent" : "text-muted")}>
                  <span className={cx("grid h-7 w-12 place-items-center rounded-full transition-all duration-300", on ? "scale-100 bg-accent-soft" : "scale-90")}>
                    <Icon size={20} aria-hidden strokeWidth={on ? 2.25 : 1.75} />
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <StudentPicker open={picking} onClose={() => setPicking(false)} />
    </div>
  )
}

export function StudentPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useDemoState()
  const toast = useToast()
  if (!data) return null
  const active = data.students.filter((s) => s.status === "ativo")
  return (
    <Modal open={open} onClose={onClose} title="Entrar como aluno" description="Sem login nesta demonstração: escolha um aluno fictício para ver o app pelo ponto de vista dele.">
      <StudentChoices
        students={active}
        current={data.activeStudentId}
        onPick={(id, name) => {
          update((d) => ({ ...d, activeStudentId: id }))
          toast(`Você está vendo o app como ${name}.`, "info")
          onClose()
        }}
      />
    </Modal>
  )
}

export function StudentChoices({ students, current, onPick }: { students: { id: string; name: string; goal: string }[]; current: string | null; onPick: (id: string, name: string) => void }) {
  if (!students.length) return <p className="py-6 text-center text-sm text-muted">Nenhum aluno ativo. Cadastre alunos no Studio.</p>
  return (
    <ul className="space-y-2">
      {students.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onPick(s.id, s.name)}
            className={cx("flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors", s.id === current ? "border-fg bg-surface-2" : "border-line hover:border-line-strong")}
          >
            <Avatar name={s.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{s.name}</span>
              <span className="block truncate text-sm text-muted">{s.goal}</span>
            </span>
            {s.id === current && <Check size={18} aria-label="selecionado" />}
          </button>
        </li>
      ))}
    </ul>
  )
}
