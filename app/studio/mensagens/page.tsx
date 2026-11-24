"use client"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, MessageCircle } from "@/components/icons"
import { useData } from "@/lib/store"
import { useThread, useThreads } from "@/lib/chat-client"
import { ChatView } from "@/components/chat-view"
import { ChatHoursForm } from "@/components/chat-hours-form"
import { PushToggle } from "@/components/push-toggle"
import { Avatar, EmptyState, cx } from "@/components/ui"

const short = (iso: string) => {
  const d = new Date(iso)
  return new Date().toDateString() === d.toDateString()
    ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(d)
}

export default function MensagensPage() {
  const d = useData()
  const students = useMemo(() => d.students.filter((s) => s.status === "ativo").map((s) => ({ id: s.id, name: s.name })), [d.students])
  const threads = useThreads(students)
  const [open, setOpen] = useState<string | null>(null)
  const current = threads.find((t) => t.studentId === open) ?? null
  const chat = useThread("trainer", open)
  useEffect(() => {
    // vindo do aviso no celular: /studio/mensagens?aluno=...
    const a = new URLSearchParams(window.location.search).get("aluno")
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lido da URL depois da hidratação
    if (a) setOpen(a)
  }, [])

  if (students.length === 0) {
    return (
      <EmptyState icon={MessageCircle} title="Nenhum aluno ativo">
        Cadastre um aluno para conversar com ele por aqui.
      </EmptyState>
    )
  }
  return (
    <div className="fade-in">
      <h1 className="t-h1">Mensagens</h1>
      <p className="mt-1 text-muted">Conversas 1 a 1 com seus alunos, sobre o treino.</p>
      <div className="mt-4 space-y-3">
        <ChatHoursForm />
        <PushToggle />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[20rem_1fr]">
        <ul className={cx("card space-y-1 p-2", open && "hidden lg:block")} aria-label="Conversas">
          {threads.map((t) => (
            <li key={t.studentId}>
              <button type="button" className="thread-row" aria-current={t.studentId === open} onClick={() => setOpen(t.studentId)}>
                <Avatar name={t.studentName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <b className="truncate">{t.studentName}</b>
                    {t.last && <span className="shrink-0 text-xs text-muted">{short(t.last.createdAt)}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted">{t.last ? `${t.last.sender === "trainer" ? "Você: " : ""}${t.last.body}` : "Sem mensagens"}</span>
                    {t.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#E5383B] px-1.5 text-[11px] font-bold text-white">{t.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <section className={cx(!open && "hidden lg:block")} aria-label="Conversa">
          {open && current ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <button type="button" className="btn btn-ghost btn-icon btn-sm lg:hidden" onClick={() => setOpen(null)} aria-label="Voltar às conversas">
                  <ArrowLeft size={18} aria-hidden />
                </button>
                <Avatar name={current.studentName} size="sm" />
                <b>{current.studentName}</b>
              </div>
              <ChatView me="trainer" other={current.studentName.split(" ")[0]} {...chat} onSend={chat.send} />
            </>
          ) : (
            <EmptyState icon={MessageCircle} title="Escolha uma conversa">
              Toque num aluno para abrir a conversa.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  )
}
