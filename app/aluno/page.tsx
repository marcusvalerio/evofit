"use client"
import Link from "next/link"
import { ChevronRight, Clock, Dumbbell, Play } from "lucide-react"
import { update } from "@/lib/store"
import { useActiveStudent } from "@/lib/use-student"
import { inProgressSession, sessionProgress, sessionsOf, weekCount } from "@/lib/metrics"
import { fmtDateLong, isSameDay, relativeDays } from "@/lib/date"
import { StudentChoices } from "@/components/student-shell"
import { EmptyState } from "@/components/ui"
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

  return (
    <div className="fade-in">
      <p className="t-eyebrow first-letter:uppercase">{fmtDateLong(now.toISOString())}</p>
      <h1 className="t-h1 mt-1">Bora treinar, {student.name.split(" ")[0]}</h1>

      <section className="card mt-5 flex items-center gap-4 p-4" aria-label="Meta da semana">
        <Ring value={(wk / student.weeklyTarget) * 100} size={76} stroke={8} label={`${wk} de ${student.weeklyTarget} treinos nesta semana`}>
          <span className="text-xl font-bold tabular">
            <CountUp text={String(wk)} />
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow">Meta da semana</p>
          <p className="mt-1 text-lg font-bold leading-tight">
            {wk >= student.weeklyTarget ? "Meta da semana batida!" : `Faltam ${student.weeklyTarget - wk} de ${student.weeklyTarget} treinos`}
          </p>
          <p className="text-sm text-muted">
            <CountUp text={String(history.length)} /> treinos no total
          </p>
        </div>
      </section>

      {live && (
        <Link href={`/aluno/treino/${live.workoutId}`} className="glow shine pop mt-4 flex items-center gap-4 rounded-2xl bg-primary p-4 text-on-primary shadow-[var(--shadow)]">
          <span className="pulse-soft grid size-12 shrink-0 place-items-center rounded-full bg-black/10">
            <Play size={22} aria-hidden fill="currentColor" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold opacity-85">Treino em andamento</span>
            <span className="block truncate text-lg font-bold">{live.workoutName}</span>
            <span className="block text-sm font-medium opacity-85">
              {sessionProgress(live).done} de {sessionProgress(live).total} séries
            </span>
          </span>
          <ChevronRight size={22} aria-hidden />
        </Link>
      )}

      <h2 className="t-h2 mb-3 mt-7">Seus treinos</h2>
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
