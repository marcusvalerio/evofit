"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MessageCircle } from "@/components/icons"
import { useRouter } from "next/navigation"
import { useActiveStudent } from "@/lib/use-student"
import { useChatHours, useThread } from "@/lib/chat-client"
import { hoursText, isOpen } from "@/lib/chat-hours"
import { ChatView } from "@/components/chat-view"
import { PushToggle } from "@/components/push-toggle"
import { EmptyState } from "@/components/ui"

export default function ChatAlunoPage() {
  const { d, student } = useActiveStudent()
  const chat = useThread("student", student?.id ?? null)
  const { hours } = useChatHours()
  const router = useRouter()
  const [ctx, setCtx] = useState<string | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lido da URL depois da hidratação (vem de "Comentar" no treino)
    setCtx(new URLSearchParams(window.location.search).get("sobre")?.slice(0, 160) || null)
  }, [])
  if (!student) {
    return (
      <EmptyState icon={MessageCircle} title="Escolha um aluno" action={<Link href="/aluno" className="btn btn-primary btn-sm">Escolher aluno</Link>}>
        Selecione um aluno para ver a conversa com o personal.
      </EmptyState>
    )
  }
  const trainer = d.profile.name.split(" ")[0] || "seu personal"
  const closed = !isOpen(hours)
  return (
    <div className="fade-in chat-screen">
      <div className="chat-screen-head">
        <button type="button" className="btn btn-ghost btn-icon lg:hidden" aria-label="Voltar" onClick={() => (history.length > 1 ? router.back() : router.push("/aluno"))}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h1 className="t-h1 max-lg:text-lg">Conversa com {trainer}</h1>
      </div>
      <p className="chat-screen-sub mt-1 text-sm text-muted">Só sobre o seu treino. {hoursText(hours).replace("Recebe", `${trainer} recebe`).replace("Responde", `${trainer} responde`)} Em emergência, procure atendimento.</p>
      <div className="chat-screen-sub mb-4 mt-3">
        <PushToggle />
      </div>
      <ChatView
        me="student"
        other={trainer}
        {...chat}
        onSend={chat.send}
        context={ctx}
        onClearContext={() => setCtx(null)}
        notice={closed ? `${trainer} está fora do horário de atendimento agora. Sua mensagem fica guardada e é lida quando o horário voltar.` : null}
      />
    </div>
  )
}
