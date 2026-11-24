"use client"
import Link from "next/link"
import { MessageCircle } from "@/components/icons"
import { useActiveStudent } from "@/lib/use-student"
import { useThread } from "@/lib/chat-client"
import { ChatView } from "@/components/chat-view"
import { EmptyState } from "@/components/ui"

export default function ChatAlunoPage() {
  const { d, student } = useActiveStudent()
  const chat = useThread("student", student?.id ?? null)
  if (!student) {
    return (
      <EmptyState icon={MessageCircle} title="Escolha um aluno" action={<Link href="/aluno" className="btn btn-primary btn-sm">Escolher aluno</Link>}>
        Selecione um aluno para ver a conversa com o personal.
      </EmptyState>
    )
  }
  const trainer = d.profile.name.split(" ")[0] || "seu personal"
  return (
    <div className="fade-in">
      <h1 className="t-h1">Conversa com {trainer}</h1>
      <p className="mb-4 mt-1 text-sm text-muted">Só sobre o seu treino. Seu personal responde quando puder; em emergência, procure atendimento.</p>
      <ChatView me="student" other={trainer} {...chat} onSend={chat.send} />
    </div>
  )
}
