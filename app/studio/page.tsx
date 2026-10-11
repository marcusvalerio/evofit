"use client"
import Link from "next/link"
import { ArrowRight, CalendarCheck, ClipboardList, Inbox, UserPlus } from "lucide-react"
import { useData, useIsDemo } from "@/lib/store"
import { completed, needsAttention, sessionProgress, weekAdherence, weekCount, weeklySeries } from "@/lib/metrics"
import { addDays, fmtDate, fmtDayMonth, fmtTime, relativeDays } from "@/lib/date"
import { BarChart } from "@/components/charts"
import { Avatar, EmptyState, PageHeader, Progress, Stat } from "@/components/ui"

export default function StudioDashboard() {
  const d = useData()
  const demo = useIsDemo()
  const now = new Date()
  const active = d.students.filter((s) => s.status === "ativo")
  const done = completed(d)
  const last7 = done.filter((s) => new Date(s.startedAt) >= addDays(now, -7)).length
  const adherence = weekAdherence(d, now)
  const attention = needsAttention(d, 7, now)
  const series = weeklySeries(done, 8, now)
  const recent = [...done].reverse().slice(0, 6)
  const noWorkout = active.filter((s) => !d.workouts.some((w) => w.studentIds.includes(s.id)))
  const studentName = new Map(d.students.map((s) => [s.id, s.name]))
  const inbox = d.contactRequests.filter((c) => c.trainerSlug === d.profile.slug)
  const live = d.sessions.filter((s) => s.status === "em_andamento")

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now)}
        title={`Olá, ${d.profile.name.split(" ")[0]}`}
        description={demo ? "Resumo calculado a partir dos alunos, fichas e sessões registradas nesta demonstração." : "Resumo calculado a partir dos seus alunos, fichas e treinos registrados."}
        actions={
          <>
            <Link href="/studio/alunos?novo=1" className="btn btn-outline">
              <UserPlus size={18} aria-hidden /> Novo aluno
            </Link>
            <Link href="/studio/treinos?novo=1" className="btn btn-primary">
              <ClipboardList size={18} aria-hidden /> Nova ficha
            </Link>
          </>
        }
      />

      <section aria-label="Indicadores" className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Alunos ativos" value={String(active.length)} hint={`${d.students.length - active.length} arquivado(s)`} />
        <Stat label="Treinos · 7 dias" value={String(last7)} hint="sessões concluídas" />
        <Stat label="Aderência da semana" value={adherence === null ? "—" : String(adherence)} unit={adherence === null ? undefined : "%"} hint="sessões feitas ÷ metas semanais" tone="accent" />
        <Stat label="Sem treinar 7+ dias" value={String(attention.length)} hint="alunos ativos" tone={attention.length ? "warning" : undefined} />
      </section>

      <div className="stagger mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-labelledby="freq-title">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 id="freq-title" className="t-h2">
              Sessões concluídas por semana
            </h2>
            <span className="text-sm text-muted">últimas 8 semanas</span>
          </div>
          <BarChart
            title="Sessões concluídas por semana, todos os alunos"
            unit="sessões"
            data={series.map((w, i) => ({
              label: i === series.length - 1 ? "Atual" : fmtDayMonth(w.start.toISOString()),
              value: w.count,
              detail: `Semana de ${fmtDate(w.start.toISOString())}`,
            }))}
          />
        </section>

        <section className="card p-5" aria-labelledby="att-title">
          <h2 id="att-title" className="t-h2">
            Precisam de atenção
          </h2>
          <p className="mt-1 text-sm text-muted">Alunos ativos sem treino concluído há 7 dias ou mais.</p>
          {attention.length === 0 ? (
            <p className="mt-6 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success">Todos os alunos ativos treinaram nos últimos 7 dias.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {attention.map(({ student, since }) => (
                <li key={student.id}>
                  <Link href={`/studio/alunos/${student.id}`} className="flex items-center gap-3 rounded-lg py-3 hover:bg-line/40">
                    <Avatar name={student.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium">{student.name}</span>
                    <span className="badge badge-warning">{since === null ? "nunca treinou" : `${since} dias`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {noWorkout.length > 0 && (
            <div className="mt-4 rounded-xl border border-line px-4 py-3 text-sm">
              <strong>{noWorkout.length} aluno(s) sem ficha atribuída:</strong> <span className="text-muted">{noWorkout.map((s) => s.name).join(", ")}.</span>
            </div>
          )}
        </section>
      </div>

      <div className="stagger mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-title" className="t-h2">
              Atividade recente
            </h2>
          </div>
          {live.length > 0 && (
            <ul className="mb-3 space-y-2">
              {live.map((s) => {
                const p = sessionProgress(s)
                return (
                  <li key={s.id} className="rounded-xl bg-accent-soft px-4 py-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <strong>{studentName.get(s.studentId)}</strong> está treinando <span className="text-muted">· {s.workoutName}</span>
                      </span>
                      <span className="badge badge-accent">em andamento</span>
                    </div>
                    <div className="mt-2">
                      <Progress value={p.pct} label={`Progresso: ${p.done} de ${p.total} séries`} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {recent.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Nenhuma sessão registrada">
              As sessões aparecem aqui quando um aluno conclui um treino no app do aluno.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <Avatar name={studentName.get(s.studentId) ?? "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {studentName.get(s.studentId) ?? "Aluno removido"} <span className="font-normal text-muted">concluiu</span> {s.workoutName}
                    </p>
                    <p className="text-xs text-muted">
                      {relativeDays(s.startedAt, now)} · {fmtTime(s.startedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5" aria-labelledby="week-title">
          <h2 id="week-title" className="t-h2">
            Metas desta semana
          </h2>
          <ul className="mt-4 space-y-4">
            {active.map((s) => {
              const n = weekCount(d, s.id, now)
              return (
                <li key={s.id}>
                  <Link href={`/studio/alunos/${s.id}`} className="block rounded-lg hover:opacity-80">
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="tabular text-muted">
                        {n}/{s.weeklyTarget}
                      </span>
                    </div>
                    <Progress value={(n / s.weeklyTarget) * 100} label={`${s.name}: ${n} de ${s.weeklyTarget} sessões`} />
                  </Link>
                </li>
              )
            })}
          </ul>
          <Link href="/studio/alunos" className="btn btn-ghost btn-sm mt-4 -ml-2">
            Ver todos os alunos <ArrowRight size={16} aria-hidden />
          </Link>
          {inbox.length > 0 && (
            <Link href="/studio/perfil#solicitacoes" className="mt-4 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm hover:bg-line/40">
              <Inbox size={18} aria-hidden className="text-accent" />
              <span className="flex-1">
                <strong>{inbox.length}</strong> solicitação(ões) de contato pelo diretório
              </span>
              <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </section>
      </div>
    </div>
  )
}
