"use client"
import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, UserPlus, Users } from "lucide-react"
import { useData } from "@/lib/store"
import { LEVEL_LABEL } from "@/lib/types"
import { lastSession, weekCount } from "@/lib/metrics"
import { relativeDays } from "@/lib/date"
import { StudentFormModal } from "@/components/student-form"
import { Avatar, EmptyState, PageHeader, cx, Progress } from "@/components/ui"

export default function AlunosPage() {
  return (
    <Suspense>
      <Alunos />
    </Suspense>
  )
}

function Alunos() {
  const d = useData()
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<"ativo" | "arquivado">("ativo")
  const [creating, setCreating] = useState(false)

  // ?novo=1 (atalho vindo do painel) abre o formulário diretamente.
  const fromQuery = params.get("novo") === "1"
  const open = creating || fromQuery
  const close = () => {
    setCreating(false)
    if (fromQuery) router.replace("/studio/alunos")
  }

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return d.students.filter((s) => s.status === status && (!t || s.name.toLowerCase().includes(t) || s.goal.toLowerCase().includes(t))).sort((a, b) => a.name.localeCompare(b.name))
  }, [d.students, q, status])

  const counts = { ativo: d.students.filter((s) => s.status === "ativo").length, arquivado: d.students.filter((s) => s.status === "arquivado").length }

  return (
    <div className="fade-in">
      <PageHeader
        title="Alunos"
        description="Cadastre, acompanhe frequência e consulte o histórico de cada aluno."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <UserPlus size={18} aria-hidden /> Novo aluno
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="busca-aluno" className="sr-only">
            Buscar aluno
          </label>
          <input id="busca-aluno" type="search" className="input pl-10" placeholder="Buscar por nome ou objetivo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div role="group" aria-label="Filtrar por situação" className="flex gap-2">
          {(["ativo", "arquivado"] as const).map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s === "ativo" ? "Ativos" : "Arquivados"} <span className="tabular opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "Nenhum aluno encontrado" : status === "ativo" ? "Nenhum aluno ativo" : "Nenhum aluno arquivado"}
          action={
            q ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setQ("")}>
                Limpar busca
              </button>
            ) : status === "ativo" ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
                Adicionar aluno
              </button>
            ) : undefined
          }
        >
          {q ? `Nada corresponde a “${q}”.` : status === "arquivado" ? "Alunos arquivados aparecem aqui e podem ser reativados." : "Comece adicionando seu primeiro aluno."}
        </EmptyState>
      ) : (
        <ul className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const last = lastSession(d, s.id)
            const wk = weekCount(d, s.id)
            const plans = d.workouts.filter((w) => w.studentIds.includes(s.id)).length
            return (
              <li key={s.id}>
                <Link href={`/studio/alunos/${s.id}`} className="evo-student-card card lift flex h-full flex-col">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate text-sm text-muted">{s.goal || "Sem objetivo definido"}</p>
                    </div>
                    <span className="badge">{LEVEL_LABEL[s.level]}</span>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Semana</dt>
                      <dd className={cx("font-semibold tabular", wk >= s.weeklyTarget && "text-success")}>
                        {wk}/{s.weeklyTarget}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Fichas</dt>
                      <dd className={cx("font-semibold tabular", plans === 0 && "text-warning")}>{plans}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Último treino</dt>
                      <dd className="truncate font-semibold">{last ? relativeDays(last.startedAt) : "—"}</dd>
                    </div>
                  </dl>
                  <div className="evo-student-card-week">
                    <Progress value={(wk / s.weeklyTarget) * 100} label={`${s.name}: ${wk} de ${s.weeklyTarget} treinos na semana`} />
                    <span className="text-xs font-semibold text-muted tabular">{Math.min(100, Math.round((wk / s.weeklyTarget) * 100))}%</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <StudentFormModal open={open} onClose={close} onCreated={(id) => router.push(`/studio/alunos/${id}`)} />
    </div>
  )
}
