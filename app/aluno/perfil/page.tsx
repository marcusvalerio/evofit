"use client"
import Link from "next/link"
import { UserRound } from "@/components/icons"
import { useActiveStudent } from "@/lib/use-student"
import { sessionsOf } from "@/lib/metrics"
import { longestWeekStreak, medalsOf } from "@/lib/medals"
import { HexMedal } from "@/components/medal"
import { Avatar, EmptyState } from "@/components/ui"

export default function PerfilAlunoPage() {
  const { d, student } = useActiveStudent()
  if (!student) {
    return (
      <EmptyState icon={UserRound} title="Escolha um aluno" action={<Link href="/aluno" className="btn btn-primary btn-sm">Escolher aluno</Link>}>
        Selecione um aluno para ver o perfil e as medalhas.
      </EmptyState>
    )
  }
  const history = sessionsOf(d, student.id)
  const medals = medalsOf(d, student.id)
  const got = medals.filter((m) => m.earned).length
  return (
    <div className="fade-in">
      <div className="flex items-center gap-3">
        <Avatar name={student.name} />
        <div className="min-w-0">
          <h1 className="t-h1 truncate">{student.name}</h1>
          {student.goal && <p className="truncate text-muted">{student.goal}</p>}
        </div>
      </div>

      <dl className="stagger mt-5 grid grid-cols-3 gap-2">
        {[
          { l: "Treinos", v: String(history.length) },
          { l: "Sem. seguidas", v: String(longestWeekStreak(history)) },
          { l: "Medalhas", v: `${got}/${medals.length}` },
        ].map((x) => (
          <div key={x.l} className="card px-3 py-3">
            <dt className="text-xs text-muted">{x.l}</dt>
            <dd className="t-metric mt-1 text-2xl">{x.v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="t-eyebrow mt-8">Medalhas</h2>
      <ul className="medal-grid mt-3">
        {medals.map((m) => (
          <li key={m.level} className={m.earned ? "medal-card" : "medal-card locked"}>
            <HexMedal level={m.level} size={88} locked={!m.earned} />
            <b>{m.title}</b>
            <small>{m.rule}</small>
            {!m.earned && <span className="badge">Bloqueada</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
