"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronRight, Clock, Dumbbell, Play } from "lucide-react"
import { update } from "@/lib/store"
import { startSession, uid } from "@/lib/actions"
import { useActiveStudent } from "@/lib/use-student"
import { inProgressSession, sessionProgress, sessionsOf, weekCount, weeklySeries } from "@/lib/metrics"
import { isSameDay, relativeDays, startOfWeek } from "@/lib/date"
import { StudentChoices } from "@/components/student-shell"
import { cx, EmptyState, Progress } from "@/components/ui"
import { useToast } from "@/components/providers"
import { getExercise } from "@/lib/catalog"

export default function AlunoHome() {
  const { d, student } = useActiveStudent()
  const toast = useToast()
  const router = useRouter()

  if (!student) {
    return (
      <div className="fade-in">
        <h1 className="t-h1">Entrar como aluno</h1>
        <p className="mb-5 mt-1 text-muted">Sem login nesta demonstração. Escolha um aluno fictício para ver os treinos atribuídos a ele.</p>
        <StudentChoices
          students={d.students.filter((s) => s.status === "ativo")}
          current={null}
          onPick={(id, name) => {
            update((x) => ({ ...x, activeStudentId: id }))
            toast(`Você está vendo o app como ${name}.`, "info")
          }}
        />
      </div>
    )
  }

  const now = new Date()
  const workouts = d.workouts.filter((w) => w.studentIds.includes(student.id))
  const live = inProgressSession(d, student.id)
  const history = sessionsOf(d, student.id)
  const wk = weekCount(d, student.id, now)
  const weekStart = startOfWeek(now)
  const thisWeek = history.filter((h) => new Date(h.startedAt) >= weekStart)
  const dayName = (iso: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(iso)).replace(".", "")
  // Semanas completas seguidas batendo a meta (a semana atual entra só se já bateu).
  const weeks = weeklySeries(history, 26, now)
  let streak = 0
  for (let i = weeks.length - 1; i >= 0; i--) {
    const hit = weeks[i].count >= student.weeklyTarget
    if (i === weeks.length - 1 && !hit) continue
    if (!hit) break
    streak++
  }
  // Sugestão: o treino em andamento ou o que está há mais tempo sem ser feito.
  const next = workouts
    .map((workout) => ({
      workout,
      last: [...history].reverse().find((h) => h.workoutId === workout.id),
      est: Math.round(workout.items.reduce((a, i) => a + i.sets * (45 + i.restSec), 0) / 60),
    }))
    .sort((a, b) => (live?.workoutId === a.workout.id ? -1 : live?.workoutId === b.workout.id ? 1 : (a.last ? new Date(a.last.startedAt).getTime() : 0) - (b.last ? new Date(b.last.startedAt).getTime() : 0)))[0]

  // Semana de segunda a domingo, um ponto por dia com treino (como o calendário do Hevy).
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + i)
    return { day, done: thisWeek.some((h) => isSameDay(new Date(h.startedAt), day)), today: isSameDay(day, now) }
  })
  const others = workouts.filter((w) => w.id !== next?.workout.id)

  const start = (workoutId: string) => {
    if (!live) update((x) => startSession(x, student.id, workoutId, uid("se")))
    router.push(`/aluno/treino/${workoutId}`)
  }

  return (
    <div className="fade-in">
      <h1 className="t-h1">Bora treinar, {student.name.split(" ")[0]}</h1>

      <section className="evo-week mt-4" aria-label={`Meta da semana: ${wk} de ${student.weeklyTarget} treinos`}>
        <ol className="evo-week-days">
          {days.map(({ day, done, today }) => (
            <li key={day.toISOString()} className={cx(done && "is-done", today && "is-today")}>
              <span className="evo-week-dot">{done ? <Check size={13} strokeWidth={3.5} aria-hidden /> : null}</span>
              <span className="evo-week-label">{dayName(day.toISOString()).slice(0, 3)}</span>
              <span className="sr-only">{done ? "treinou" : "sem treino"}</span>
            </li>
          ))}
        </ol>
        <p className="evo-week-goal">
          <b className="tabular">
            {wk}/{student.weeklyTarget}
          </b>
          <span>{wk >= student.weeklyTarget ? "meta batida" : "na semana"}</span>
          {streak > 0 && <span className="evo-week-streak">{streak} sem. seguidas</span>}
        </p>
      </section>

      {next && (
        <section className="evo-student-today ink mt-4" aria-label={live ? "Treino em andamento" : "Seu próximo treino"}>
          <p className="evo-student-kicker">{live ? "Em andamento" : "Próximo treino"}</p>
          <h2>
            <Link href={`/aluno/treino/${next.workout.id}`} className="hover:underline">
              {next.workout.name}
            </Link>
          </h2>
          <p className="evo-student-meta">
            <span>{next.workout.items.length} exercícios</span>
            <span>
              <Clock size={14} aria-hidden /> ~{next.est} min
            </span>
            {live ? (
              <span>
                {sessionProgress(live).done} de {sessionProgress(live).total} séries
              </span>
            ) : (
              <span>{next.last ? `último: ${relativeDays(next.last.startedAt, now)}` : "ainda não feito"}</span>
            )}
          </p>
          {live && (
            <div className="mt-3">
              <Progress value={sessionProgress(live).pct} label={`${sessionProgress(live).done} de ${sessionProgress(live).total} séries concluídas`} />
            </div>
          )}
          <button type="button" className="evo-student-primary-action" onClick={() => start(next.workout.id)} disabled={next.workout.items.length === 0}>
            <Play size={18} aria-hidden fill="currentColor" />
            {live ? "Continuar treino" : "Começar treino"}
          </button>
        </section>
      )}

      {workouts.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Dumbbell} title="Nenhum treino liberado">
            Seu personal ainda não liberou uma ficha para você. Assim que ele liberar, ela aparece aqui.
          </EmptyState>
        </div>
      ) : (
        others.length > 0 && (
          <>
            <h2 className="t-eyebrow mb-2 mt-7">Outros treinos</h2>
            <ul className="evo-plan">
              {others.map((w) => {
                const last = [...history].reverse().find((s) => s.workoutId === w.id)
                const doneToday = last && isSameDay(new Date(last.startedAt), now)
                return (
                  <li key={w.id}>
                    <Link href={`/aluno/treino/${w.id}`} className="evo-plan-row">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{w.name}</span>
                        <span className="block truncate text-sm text-muted">
                          {doneToday ? "Feito hoje · " : last ? `${relativeDays(last.startedAt, now)} · ` : ""}
                          {w.items.map((i) => getExercise(d, i.exerciseId)?.name ?? "Exercício").slice(0, 3).join(", ")}
                        </span>
                      </span>
                      <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )
      )}
    </div>
  )
}
