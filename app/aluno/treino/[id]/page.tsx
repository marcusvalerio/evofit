"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, ChevronDown, Flag, Info, Play, Timer, Trophy, X } from "lucide-react"
import { update } from "@/lib/store"
import { useActiveStudent } from "@/lib/use-student"
import type { DemoData, Session, Workout } from "@/lib/types"
import { discardSession, finishSession, startSession, uid, updateSet } from "@/lib/actions"
import { inProgressSession, sessionProgress, sessionVolume } from "@/lib/metrics"
import { durationMin } from "@/lib/date"
import { ConfirmDialog, Field, Modal, NotFoundState, Progress, cx } from "@/components/ui"
import { useToast } from "@/components/providers"

export default function TreinoPage() {
  const { id } = useParams<{ id: string }>()
  const { d, student } = useActiveStudent()
  const [finishedId, setFinishedId] = useState<string | null>(null)

  if (finishedId) {
    const s = d.sessions.find((x) => x.id === finishedId)
    if (s) return <Summary session={s} />
  }

  if (!student) {
    return (
      <NotFoundState title="Escolha um aluno" href="/aluno" cta="Escolher aluno">
        Selecione um aluno de demonstração para acessar os treinos.
      </NotFoundState>
    )
  }
  const workout = d.workouts.find((w) => w.id === id)
  if (!workout || !workout.studentIds.includes(student.id)) {
    return (
      <NotFoundState title="Treino indisponível" href="/aluno" cta="Ver meus treinos">
        Esta ficha não existe ou não está atribuída a {student.name.split(" ")[0]}. Peça ao seu personal para liberá-la.
      </NotFoundState>
    )
  }

  const live = inProgressSession(d, student.id)
  if (live && live.workoutId === workout.id) return <Running d={d} workout={workout} session={live} onFinished={setFinishedId} />
  return <Overview d={d} workout={workout} studentId={student.id} other={live} />
}

/* ---------- Não iniciado ---------- */

function Overview({ d, workout, studentId, other }: { d: DemoData; workout: Workout; studentId: string; other?: Session }) {
  const exById = new Map(d.exercises.map((e) => [e.id, e]))
  const toast = useToast()
  return (
    <div className="fade-in">
      <Link href="/aluno" className="btn btn-ghost btn-sm -ml-3 mb-3">
        <ArrowLeft size={16} aria-hidden /> Treinos
      </Link>
      <h1 className="t-h1">{workout.name}</h1>
      {workout.description && <p className="mt-1 text-muted">{workout.description}</p>}
      <p className="mt-3 text-sm text-muted">
        {workout.items.length} exercícios · {workout.items.reduce((a, i) => a + i.sets, 0)} séries
      </p>

      {workout.items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">Esta ficha ainda não tem exercícios.</p>
      ) : (
        <ol className="mt-5 space-y-2">
          {workout.items.map((it, i) => {
            const ex = exById.get(it.exerciseId)
            return (
              <li key={it.id} className="card flex items-center gap-3 p-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-bold tabular">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{ex?.name ?? "Exercício"}</p>
                  <p className="text-sm text-muted tabular">
                    {it.sets} × {it.reps}
                    {it.load !== null && ` · ${it.load} kg`}
                    {it.restSec > 0 && ` · ${it.restSec}s descanso`}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <div className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line">
        <div className="mx-auto max-w-xl px-4 py-3">
          {other ? (
            <div className="text-center text-sm">
              <p className="mb-2 text-muted">Você já tem “{other.workoutName}” em andamento. Conclua ou descarte antes de iniciar outro.</p>
              <Link href={`/aluno/treino/${other.workoutId}`} className="btn btn-inverse btn-lg w-full">
                Ir para o treino em andamento
              </Link>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-lg w-full"
              disabled={workout.items.length === 0}
              onClick={() => {
                update((x) => startSession(x, studentId, workout.id, uid("se")))
                toast("Treino iniciado. Bom treino!", "info")
              }}
            >
              <Play size={20} aria-hidden fill="currentColor" /> Iniciar treino
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Em andamento ---------- */

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`

function Running({ d, workout, session, onFinished }: { d: DemoData; workout: Workout; session: Session; onFinished: (id: string) => void }) {
  const router = useRouter()
  const toast = useToast()
  const [restUntil, setRestUntil] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [note, setNote] = useState("")
  const [openInfo, setOpenInfo] = useState<string | null>(null)
  const now = useNow(true)
  const alerted = useRef(false)
  const exById = new Map(d.exercises.map((e) => [e.id, e]))
  const progress = sessionProgress(session)
  const elapsed = Math.floor((now - new Date(session.startedAt).getTime()) / 1000)
  const restLeft = restUntil ? Math.ceil((restUntil - now) / 1000) : null

  useEffect(() => {
    if (restLeft !== null && restLeft <= 0 && !alerted.current) {
      alerted.current = true
      try {
        navigator.vibrate?.(200)
      } catch {}
    }
  }, [restLeft])

  // Itens na ordem prescrita; itens removidos da ficha após o início continuam na sessão.
  const order = [...new Set(session.sets.map((s) => s.itemId))]
  const itemById = new Map(workout.items.map((i) => [i.id, i]))

  const toggleSet = useCallback(
    (itemId: string, setIndex: number, done: boolean, restSec: number) => {
      update((x) => updateSet(x, session.id, itemId, setIndex, { done }))
      if (done && restSec > 0) {
        alerted.current = false
        setRestTotal(restSec)
        setRestUntil(Date.now() + restSec * 1000)
      }
    },
    [session.id],
  )

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{workout.name}</p>
            <p className="text-sm text-muted tabular">
              <Timer size={13} aria-hidden className="mr-1 inline" />
              {mmss(elapsed)} · {progress.done}/{progress.total} séries
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDiscarding(true)}>
            <X size={16} aria-hidden /> Sair
          </button>
        </div>
        <div className="mt-2">
          <Progress value={progress.pct} label={`${progress.done} de ${progress.total} séries concluídas`} />
        </div>
      </div>

      <ol className="space-y-4">
        {order.map((itemId, idx) => {
          const sets = session.sets.filter((s) => s.itemId === itemId)
          const item = itemById.get(itemId)
          const ex = exById.get(sets[0].exerciseId)
          const allDone = sets.every((s) => s.done)
          const restSec = item?.restSec ?? 60
          return (
            <li key={itemId} className={cx("card overflow-hidden", allDone && "opacity-75")}>
              <div className="flex items-start gap-3 p-4 pb-3">
                <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold tabular", allDone ? "bg-success text-bg" : "bg-inverse text-on-inverse")}>
                  {allDone ? <Check size={16} aria-label="concluído" /> : idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-tight">{sets[0].exerciseName}</h2>
                  <p className="mt-0.5 text-sm text-muted tabular">
                    {item ? `${item.sets} × ${item.reps}` : `${sets.length} séries`}
                    {item?.load !== null && item?.load !== undefined && ` · ${item.load} kg prescrito`}
                    {restSec > 0 && ` · ${restSec}s`}
                  </p>
                </div>
                {(ex?.instructions || item?.notes) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    aria-expanded={openInfo === itemId}
                    aria-label={`Orientações de ${sets[0].exerciseName}`}
                    onClick={() => setOpenInfo(openInfo === itemId ? null : itemId)}
                  >
                    {openInfo === itemId ? <ChevronDown size={18} className="rotate-180" /> : <Info size={18} />}
                  </button>
                )}
              </div>
              {item?.notes && <p className="mx-4 mb-3 rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium">{item.notes}</p>}
              {openInfo === itemId && ex?.instructions && <p className="mx-4 mb-3 text-sm leading-relaxed text-muted">{ex.instructions}</p>}

              <div className="border-t border-line">
                <div className="grid grid-cols-[2rem_1fr_1fr_3.25rem] items-center gap-2 px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-muted" aria-hidden>
                  <span>Série</span>
                  <span>Reps</span>
                  <span>Kg</span>
                  <span className="text-center">Feito</span>
                </div>
                {sets.map((s) => (
                  <div key={s.setIndex} className={cx("grid grid-cols-[2rem_1fr_1fr_3.25rem] items-center gap-2 px-4 py-1.5", s.done && "bg-success-soft")}>
                    <span className="text-center font-bold tabular">{s.setIndex + 1}</span>
                    <label className="sr-only" htmlFor={`r-${itemId}-${s.setIndex}`}>
                      Repetições da série {s.setIndex + 1} de {s.exerciseName}
                    </label>
                    <input
                      id={`r-${itemId}-${s.setIndex}`}
                      className="input h-12 text-center text-lg font-semibold tabular"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={s.reps ?? ""}
                      placeholder="—"
                      onChange={(e) => update((x) => updateSet(x, session.id, itemId, s.setIndex, { reps: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                    />
                    <label className="sr-only" htmlFor={`l-${itemId}-${s.setIndex}`}>
                      Carga em kg da série {s.setIndex + 1} de {s.exerciseName}
                    </label>
                    <input
                      id={`l-${itemId}-${s.setIndex}`}
                      className="input h-12 text-center text-lg font-semibold tabular"
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={0}
                      value={s.load ?? ""}
                      placeholder="livre"
                      onChange={(e) => update((x) => updateSet(x, session.id, itemId, s.setIndex, { load: e.target.value === "" ? null : Math.max(0, parseFloat(e.target.value) || 0) }))}
                    />
                    <button
                      type="button"
                      aria-pressed={s.done}
                      aria-label={`${s.done ? "Desmarcar" : "Marcar"} série ${s.setIndex + 1} de ${s.exerciseName}`}
                      onClick={() => toggleSet(itemId, s.setIndex, !s.done, restSec)}
                      className={cx(
                        "grid size-12 place-items-center rounded-xl border-2 transition-colors",
                        s.done ? "border-success bg-success text-bg" : "border-line-strong text-muted hover:border-fg",
                      )}
                    >
                      <Check size={22} strokeWidth={3} aria-hidden />
                    </button>
                  </div>
                ))}
                <div className="h-2" />
              </div>
            </li>
          )
        })}
      </ol>

      {/* Barra inferior: descanso ou concluir */}
      <div className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line">
        <div className="mx-auto max-w-xl px-4 py-3">
          {restLeft !== null && restLeft > -5 ? (
            <div className="flex items-center gap-3" role="timer" aria-live="off">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-muted">{restLeft > 0 ? "Descanso" : "Descanso concluído"}</p>
                <p className={cx("text-3xl font-bold tabular", restLeft <= 0 && "text-accent")}>{mmss(Math.max(0, restLeft))}</p>
                <div className="mt-1">
                  <Progress value={restTotal ? ((restTotal - Math.max(0, restLeft)) / restTotal) * 100 : 100} label="Tempo de descanso" />
                </div>
              </div>
              <button type="button" className="btn btn-outline btn-lg px-4" onClick={() => setRestUntil((r) => (r ?? Date.now()) + 15_000)} aria-label="Adicionar 15 segundos">
                +15s
              </button>
              <button type="button" className="btn btn-inverse btn-lg" onClick={() => setRestUntil(null)}>
                {restLeft > 0 ? "Pular" : "Ok"}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-lg w-full" onClick={() => setFinishing(true)}>
              <Flag size={20} aria-hidden /> Concluir treino
            </button>
          )}
        </div>
      </div>

      <Modal
        open={finishing}
        onClose={() => setFinishing(false)}
        title="Concluir treino?"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setFinishing(false)}>
              Continuar treinando
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={progress.done === 0}
              onClick={() => {
                update((x) => finishSession(x, session.id, note))
                setFinishing(false)
                onFinished(session.id)
                toast("Treino concluído e registrado no histórico.")
              }}
            >
              <Flag size={18} aria-hidden /> Concluir
            </button>
          </>
        }
      >
        {progress.done === 0 ? (
          <p className="text-muted">Marque pelo menos uma série como feita para registrar o treino, ou use “Sair” para descartar.</p>
        ) : (
          <>
            <p className="text-muted">
              Você fez <strong className="text-fg">{progress.done}</strong> de {progress.total} séries.
              {progress.done < progress.total && " As séries não marcadas ficam registradas como não feitas."}
            </p>
            <Field label="Como foi o treino? (opcional)" className="mt-4">
              {(p) => <textarea {...p} className="input" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: senti o joelho no agachamento" />}
            </Field>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={discarding}
        onClose={() => setDiscarding(false)}
        title="Sair e descartar o treino?"
        message="As séries marcadas nesta sessão serão perdidas. Para salvar o progresso, use “Concluir treino”."
        confirmLabel="Descartar treino"
        danger
        onConfirm={() => {
          update((x) => discardSession(x, session.id))
          toast("Treino descartado.", "info")
          router.push("/aluno")
        }}
      />
    </div>
  )
}

/* ---------- Concluído ---------- */

function Summary({ session }: { session: Session }) {
  const p = sessionProgress(session)
  const vol = sessionVolume(session)
  return (
    <div className="fade-in py-6 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-on-primary">
        <Trophy size={36} aria-hidden />
      </div>
      <p className="t-eyebrow mt-6">Treino concluído</p>
      <h1 className="t-h1 mt-1">{session.workoutName}</h1>
      <dl className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">
        {[
          { l: "Duração", v: `${durationMin(session.startedAt, session.finishedAt)} min` },
          { l: "Séries", v: `${p.done}/${p.total}` },
          { l: "Volume", v: vol ? `${Math.round(vol).toLocaleString("pt-BR")} kg` : "—" },
        ].map((x) => (
          <div key={x.l} className="card px-2 py-3">
            <dt className="text-xs text-muted">{x.l}</dt>
            <dd className="mt-1 font-bold tabular">{x.v}</dd>
          </div>
        ))}
      </dl>
      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2">
        <Link href="/aluno/historico" className="btn btn-primary btn-lg">
          Ver histórico
        </Link>
        <Link href="/aluno" className="btn btn-outline btn-lg">
          Voltar aos treinos
        </Link>
      </div>
    </div>
  )
}
