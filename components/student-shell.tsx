"use client"
import { GlassNav } from "@/components/glass-nav"
import Link from "next/link"
import { useUnread } from "@/lib/chat-client"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BarChart, Check, Home, LayoutDashboard, MessageCircle, UserRound } from "@/components/icons"
import { update, useDemoState } from "@/lib/store"
import { Brand, DemoBanner, ThemeToggle } from "./chrome"
import { Avatar, LoadingScreen, Modal, NotFoundState, cx } from "./ui"
import { useToast } from "./providers"
import { FirstAccessPassword } from "./first-access"
import { usePrecacheWorkouts } from "./offline"
import { GateScreen, useLoginGate } from "./login-gate"
import { WhatsNew } from "./whats-new"

export function StudentShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { data, mode, account } = useDemoState()
  const gated = useLoginGate()
  const [picking, setPicking] = useState(false)
  const student = data?.students.find((s) => s.id === data.activeStudentId && s.status === "ativo")
  const unread = useUnread("student", student?.id ?? null)
  const inWorkout = path.startsWith("/aluno/treino/")
  const role = mode === "account" ? account?.role : null
  const router = useRouter()
  // Personal que abre o app instalado (que começa em /aluno) vai direto para o Studio.
  useEffect(() => {
    if (role === "trainer") router.replace("/studio")
  }, [role, router])

  const mustChange = role === "student" && !!account?.mustChangePassword
  usePrecacheWorkouts(data, student?.id ?? null)
  let content: React.ReactNode = gated ? <GateScreen /> : data ? children : <LoadingScreen action={false} />
  if (data && mustChange) content = <FirstAccessPassword login={account?.email ?? ""} />
  else if (data && role === "trainer") content = <LoadingScreen action={false} />
  else if (data && role === "student" && !student)
    content = (
      <NotFoundState title="Acesso pausado" href="/" cta="Ir para o início">
        Seu personal arquivou seu cadastro. Fale com ele para reativar o acesso.
      </NotFoundState>
    )

  return (
    <div className="min-h-dvh">
      <DemoBanner />
      <header className="sticky top-[var(--safe-top)] z-30 border-b border-line bg-bg">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-2 px-4">
          <Brand suffix="Aluno" href="/aluno" />
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
            {student && (
              <Link href="/aluno/chat" className="btn btn-ghost btn-icon btn-sm relative" aria-label={unread > 0 ? `Conversa com o personal, ${unread} não lida${unread > 1 ? "s" : ""}` : "Conversa com o personal"}>
                <MessageCircle size={20} aria-hidden />
                {unread > 0 && <span className="chat-dot" aria-hidden />}
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={cx("mx-auto max-w-xl px-4 pt-5", inWorkout ? "pb-40" : "pb-28")}>{content}</main>

      {!inWorkout && !mustChange && (
        <GlassNav
          label="Aluno"
          items={[
            { href: "/aluno", label: "Treinos", icon: Home, on: path === "/aluno" },
            { href: "/aluno/historico", label: "Evolução", icon: BarChart, on: path.startsWith("/aluno/historico") },
            { href: "/aluno/perfil", label: "Perfil", icon: UserRound, on: path.startsWith("/aluno/perfil") },
            ...(role ? [] : [{ href: "/studio", label: "Studio", icon: LayoutDashboard, on: false }]),
          ]}
        />
      )}

      <WhatsNew who="aluno" ready={!!data && !gated && !mustChange && !inWorkout && role !== "trainer" && !!student} createdAt={account?.createdAt} />
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
