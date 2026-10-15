"use client"
import Link from "next/link"
import { Check, ChevronRight, Clock, Dumbbell, Play } from "lucide-react"
import { update } from "@/lib/store"
import { useActiveStudent } from "@/lib/use-student"
import { inProgressSession, sessionProgress, sessionsOf, weekCount } from "@/lib/metrics"
import { addDays, fmtDateLong, isSameDay, relativeDays, startOfWeek } from "@/lib/date"
import { StudentChoices } from "@/components/student-shell"
import { cx, EmptyState, Progress } from "@/components/ui"
import { useToast } from "@/components/providers"
import { getExercise } from "@/lib/catalog"
import { ExerciseThumb } from "@/components/exercise"
import { CountUp, Ring } from "@/components/motion"

export default function AlunoHome() {
  const { d, student } = useActiveStudent()
  const toast = useToast()

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
  const week = ["S", "T", "Q", "Q", "S", "S", "D"].map((label, i) => {
    const date = addDays(weekStart, i)
    return {
      label,
      date,
      long: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date),
      done: history.some((h) => isSameDay(new Date(h.startedAt), date)),
      today: isSameDay(date, now),
      future: date > now && !isSameDay(date, now),
    }
  })
  // Sugestão: o treino em andamento ou o que está há mais tempo sem ser feito.
  const next = workouts
    .map((workout) => ({
      workout,
      last: [...history].reverse().find((h) => h.workoutId === workout.id),
      est: Math.round(workout.items.reduce((a, i) => a + i.sets * (45 + i.restSec), 0) / 60),
    }))
    .sort((a, b) => (live?.workoutId === a.workout.id ? -1 : live?.workoutId === b.workout.id ? 1 : (a.last ? new Date(a.last.startedAt).getTime() : 0) - (b.last ? new Date(b.last.startedAt).getTime() : 0)))[0]

  return (
    <div className="fade-in">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="t-eyebrow first-letter:uppercase">{fmtDateLong(now.toISOString())}</p>
          <h1 className="t-h1 mt-1">Bora treinar, {student.name.split(" ")[0]}</h1>
        </div>
        <Ring value={(wk / student.weeklyTarget) * 100} size={56} stroke={6} label={`${wk} de ${student.weeklyTarget} treinos nesta semana`}>
          <span className="text-sm font-bold tabular">
            <CountUp text={String(wk)} />/{student.weeklyTarget}
          </span>
        </Ring>
      </div>

      <section className="card mt-5 p-4" aria-labelledby="week-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="week-title" className="t-h2">
            {wk >= student.weeklyTarget ? "Meta da semana batida!" : wk > 0 ? `${student.weeklyTarget - wk === 1 ? "Falta 1 treino" : `Faltam ${student.weeklyTarget - wk} treinos`} na semana` : "Sua semana começa no primeiro treino"}
          </h2>
          <span className="shrink-0 text-sm text-muted tabular">
            <CountUp text={String(history.length)} /> no total
          </span>
        </div>
        <ol className="evo-week mt-4" aria-label="Treinos concluídos nesta semana">
          {week.map((day) => (
            <li key={day.label + day.date.getDate()} className={cx("evo-week-day", day.today && "is-today")}>
              <span>{day.label}</span>
              <span className={cx("evo-week-dot", day.done && "is-done")} aria-label={`${day.long}: ${day.done ? "treinou" : day.future ? "ainda não chegou" : "sem treino"}`}>
                {day.done && <Check size={14} strokeWidth={3} aria-hidden />}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {next && (
        <section className="evo-student-today ink mt-4" aria-label={live ? "Treino em andamento" : "Seu próximo treino"}>
          <p className="evo-student-kicker">{live ? "Em andamento" : "Próximo treino"}</p>
          <h2>{next.workout.name}</h2>
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
          <Link href={`/aluno/treino/${next.workout.id}`} className="evo-student-primary-action">
            {live ? <Play size={18} aria-hidden fill="currentColor" /> : null}
            {live ? "Continuar treino" : "Ver treino"}
            <ChevronRight size={18} aria-hidden />
          </Link>
        </section>
      )}

      <h2 id="student-workouts" className="t-h2 mb-3 mt-7">Seus treinos <span className="evo-section-count">{workouts.length}</span></h2>
      {workouts.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhum treino liberado">
          Seu personal ainda não atribuiu uma ficha. No Studio, abra uma ficha e marque este aluno.
        </EmptyState>
      ) : (
        <ul className="stagger space-y-3">
          {workouts.map((w) => {
            const last = [...history].reverse().find((s) => s.workoutId === w.id)
            const doneToday = last && isSameDay(new Date(last.startedAt), now)
            const isLive = live?.workoutId === w.id
            const est = Math.round(w.items.reduce((a, i) => a + i.sets * (45 + i.restSec), 0) / 60)
            return (
              <li key={w.id}>
                <Link href={`/aluno/treino/${w.id}`} className="card lift group flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold leading-tight">{w.name}</p>
                      {isLive ? <span className="badge badge-accent">Em andamento</span> : doneToday ? <span className="badge badge-success">Feito hoje</span> : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">{w.items.map((i) => getExercise(d, i.exerciseId)?.name ?? "Exercício").slice(0, 3).join(" · ")}</p>
                    <div className="mt-3 flex -space-x-3" aria-hidden>
                      {w.items.slice(0, 5).map((i) => {
                        const ex = getExercise(d, i.exerciseId)
                        return ex ? <ExerciseThumb key={i.id} ex={ex} className="w-14 shadow-sm ring-2 ring-surface transition-transform group-hover:translate-x-1" /> : null
                      })}
                      {w.items.length > 5 && <span className="thumb grid w-14 place-items-center bg-surface-2 text-xs font-bold text-muted ring-2 ring-surface">+{w.items.length - 5}</span>}
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span className="whitespace-nowrap">{w.items.length} exercícios</span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Clock size={14} aria-hidden /> ~{est} min
                      </span>
                      <span className="whitespace-nowrap">{last ? `último: ${relativeDays(last.startedAt, now)}` : "nunca feito"}</span>
                    </p>
                  </div>
                  <ChevronRight size={20} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
