"use client"
import { Check, Play } from "lucide-react"
import { useEffect, useState } from "react"
import { useDemoState } from "@/lib/store"
import { createSeed } from "@/lib/seed"
import type { DemoData } from "@/lib/types"
import { completed, needsAttention, weekAdherence, weeklySeries } from "@/lib/metrics"
import { catalogExercise } from "@/lib/catalog"
import { ExerciseThumb } from "./exercise"
import { CountUp } from "./motion"
import { useTilt } from "./landing-motion"

/** Exercícios reais do catálogo usados no telefone da prévia. */
const PHONE = [
  { id: "Barbell_Squat", rx: "4 séries × 8 × 50 kg" },
  { id: "Incline_Dumbbell_Press", rx: "3 séries × 12 × 14 kg" },
  { id: "Wide-Grip_Lat_Pulldown", rx: "4 séries × 10 × 45 kg" },
]
/** Meta flexível do aluno da prévia: 4 treinos, 3 feitos. */
const GOAL = ["seg", "qua", "sex", null]

/**
 * Prévia do hero: o app do aluno (exercícios do catálogo) e o painel do Studio
 * calculado com os mesmos dados que aparecem em /studio.
 */
export function LandingPreview() {
  const items = PHONE.map((p) => ({ ...p, ex: catalogExercise(p.id) })).filter((p) => p.ex)
  const tilt = useTilt<HTMLDivElement>()
  return (
    <div ref={tilt} className="lp-stage" aria-label="Prévia do EVOFIT com dados da demonstração">
      <div className="lp-stage-peak" aria-hidden />
      <div className="lp-stage-left">
        <div className="lp-stage-word t-athletic" aria-hidden>
          Evolução
          <br />
          registrada
        </div>
        <StudioPanel />
      </div>

      <div className="lp-phone" aria-hidden>
        <div className="lp-phone-screen">
          <div className="lp-phone-top">
            <span>9:41</span>
            <span className="lp-phone-island" />
            <span>●●●</span>
          </div>
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <p className="t-athletic text-[2rem]">Hoje</p>
            <span className="lp-avatar">AR</span>
          </div>

          <div className="lp-phone-card mx-3">
            <div className="flex items-center justify-between gap-2">
              <p className="t-athletic text-[0.95rem]">Treino A · Força</p>
              <span className="lp-phone-start">Iniciar</span>
            </div>
            <p className="mt-2 t-athletic text-[1.6rem]">~48 min</p>
            <p className="lp-phone-sub text-[0.7rem]">Quadríceps, peitoral, costas</p>
            <div className="mt-2.5 flex gap-1.5">
              {items.map((p) => (
                <ExerciseThumb key={p.id} ex={p.ex!} className="w-12 !rounded-lg" />
              ))}
            </div>
          </div>

          <div className="lp-week mx-3 mt-2">
            <span className="lp-week-title">Meta 4x · 3 feitos</span>
            {GOAL.map((d, i) => (
              <span key={i} className="lp-week-day" style={{ "--i": i } as React.CSSProperties}>
                <span className={d ? "lp-streak on" : "lp-streak"}>{d ? <Check size={10} strokeWidth={3.5} /> : i + 1}</span>
                {d ?? "—"}
              </span>
            ))}
          </div>

          <p className="t-athletic px-4 pb-2 pt-4 text-[1.15rem]">Exercícios</p>
          <div className="space-y-1.5 px-3 pb-4">
            {items.slice(0, 2).map((p) => (
              <div key={p.id} className="lp-phone-row">
                <ExerciseThumb ex={p.ex!} className="w-14 !rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.72rem] font-bold uppercase tracking-tight">{p.ex!.name}</p>
                  <p className="lp-phone-sub text-[0.62rem]">{p.rx}</p>
                </div>
                <span className="lp-play">
                  <Play size={11} fill="currentColor" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Na demonstração usa os dados dela; com contas reais, sempre dados de exemplo (nunca os da conta). */
function useSampleData() {
  const { data, mode } = useDemoState()
  const [sample, setSample] = useState<DemoData | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- datas relativas a hoje, só no cliente
    if (mode !== "demo" && mode !== "loading") setSample(createSeed())
  }, [mode])
  return mode === "demo" ? data : sample
}

function StudioPanel() {
  const data = useSampleData()
  if (!data) {
    return (
      <div className="lp-panel space-y-3" aria-hidden>
        <div className="h-5 w-2/3 rounded-md bg-white/10" />
        <div className="h-11 rounded-xl bg-white/5" />
        <div className="h-11 rounded-xl bg-white/5" />
        <div className="h-16 rounded-xl bg-white/5" />
      </div>
    )
  }
  const now = new Date()
  const active = data.students.filter((s) => s.status === "ativo")
  const attention = needsAttention(data, 7, now).slice(0, 2)
  const noWorkout = active.filter((s) => !data.workouts.some((w) => w.studentIds.includes(s.id)))
  const adherence = weekAdherence(data, now)
  const series = weeklySeries(completed(data), 6, now)
  const max = Math.max(1, ...series.map((w) => w.count))

  return (
    <div className="lp-panel">
      <div className="flex items-baseline justify-between gap-3">
        <p className="lp-panel-kicker">Studio · precisa de você</p>
        <span className="text-xs text-on-ink-muted tabular">{active.length} ativos</span>
      </div>
      <div className="mt-1.5">
        {attention.map(({ student, since }) => (
          <div key={student.id} className="lp-panel-row">
            <span className="lp-dot lp-dot-warn">{initials(student.name)}</span>
            <span className="min-w-0 flex-1 truncate">
              <b>{student.name}</b>
              <small>sem treinar</small>
            </span>
            <span className="lp-tag lp-tag-warn">{since === null ? "nunca treinou" : `${since} dias`}</span>
          </div>
        ))}
        {noWorkout.slice(0, 1).map((s) => (
          <div key={s.id} className="lp-panel-row">
            <span className="lp-dot">{initials(s.name)}</span>
            <span className="min-w-0 flex-1 truncate">
              <b>{s.name}</b>
              <small>sem ficha atribuída</small>
            </span>
            <span className="lp-tag">montar ficha</span>
          </div>
        ))}
        {attention.length === 0 && noWorkout.length === 0 && (
          <div className="lp-panel-row">
            <span className="lp-dot lp-dot-ok">✓</span>
            <span className="flex-1">Todos os alunos ativos treinaram nos últimos 7 dias.</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-end gap-3 border-t border-white/10 pt-3">
        <div>
          <p className="text-[0.6875rem] text-on-ink-muted">Aderência da semana</p>
          <p className="t-athletic text-[2.1rem] tabular">{adherence === null ? "—" : <CountUp text={`${adherence}%`} duration={1400} />}</p>
        </div>
        <div className="lp-bars flex-1" aria-hidden>
          {series.map((w, i) => (
            <i key={w.start.toISOString()} style={{ height: `${Math.max(10, (w.count / max) * 100)}%`, "--i": i } as React.CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}
