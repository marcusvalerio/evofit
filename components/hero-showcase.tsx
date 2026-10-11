"use client"
import { useEffect, useState } from "react"
import { Check, PlayCircle, Timer } from "lucide-react"
import { catalogExercise } from "@/lib/catalog"
import { ExerciseDemo } from "./exercise"
import { cx } from "./ui"
import { useReducedMotion } from "./motion"

/** Ids reais do catálogo usados na vitrine da página inicial. */
const SHOWCASE = [
  { id: "Barbell_Squat", sets: "4 × 6-8", load: "50 kg" },
  { id: "Incline_Dumbbell_Press", sets: "3 × 12", load: "10 kg" },
  { id: "Barbell_Hip_Thrust", sets: "3 × 12", load: "60 kg" },
  { id: "Wide-Grip_Lat_Pulldown", sets: "4 × 10-12", load: "45 kg" },
]

/** Prévia ilustrativa do app do aluno (não é um treino real). */
export function HeroShowcase() {
  const reduced = useReducedMotion()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setTick((x) => x + 1), 1200)
    return () => clearInterval(t)
  }, [reduced])

  // a cada 4 batidas: 3 séries marcadas e troca de exercício
  const cur = SHOWCASE[Math.floor(tick / 4) % SHOWCASE.length]
  const ex = catalogExercise(cur.id)
  if (!ex) return null
  const done = reduced ? 1 : tick % 4

  return (
    <div className="relative mx-auto w-full max-w-sm" aria-label="Prévia ilustrativa do app do aluno" role="img">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_50%_40%,var(--accent-soft),transparent)]" aria-hidden />
      <div className="card overflow-hidden p-3 shadow-[var(--shadow-lg)]" aria-hidden>
        <div key={cur.id} className="fade-in">
          <ExerciseDemo ex={ex} compact />
          <div className="flex items-start justify-between gap-3 px-1.5 pb-1 pt-3">
            <div className="min-w-0">
              <p className="truncate font-bold leading-tight">{ex.name}</p>
              <p className="text-sm text-muted tabular">
                {cur.sets} · {cur.load}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
              <PlayCircle size={14} /> Como fazer
            </span>
          </div>
        </div>
        <div className="mt-2 space-y-1.5 px-1.5 pb-1.5">
          {[0, 1, 2].map((s) => {
            const on = s < done
            return (
              <div key={s} className={cx("flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors duration-300", on && "bg-success-soft")}>
                <span className="w-5 text-center text-sm font-bold tabular">{s + 1}</span>
                <span className="h-2 flex-1 rounded-full bg-line" />
                <span className={cx("grid size-8 place-items-center rounded-lg border-2 transition-colors duration-300", on ? "border-success bg-success text-bg" : "border-line-strong text-muted")}>
                  <Check key={String(on)} size={16} strokeWidth={3} className={on ? "pop" : undefined} />
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="glass pop absolute -bottom-5 -left-3 flex items-center gap-2 rounded-2xl border border-line px-3 py-2 text-sm font-semibold shadow-[var(--shadow)] sm:-left-8" aria-hidden>
        <Timer size={16} className="text-accent" /> Descanso 1:30
      </div>
    </div>
  )
}
