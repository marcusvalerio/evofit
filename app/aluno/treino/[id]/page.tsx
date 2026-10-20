"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, Flag, Link2, Medal, Play, PlayCircle, Timer, Trophy, X } from "lucide-react"
import { update } from "@/lib/store"
import { useActiveStudent } from "@/lib/use-student"
import type { Checkin, DemoData, Pain, Session, Sleep, Workout } from "@/lib/types"
import { muscleVolume } from "@/lib/volume"
import { supersets } from "@/lib/superset"
import { discardSession, finishSession, startSession, uid, updateSet } from "@/lib/actions"
import { inProgressSession, personalRecords, previousSets, sessionProgress, sessionVolume, type PersonalRecord } from "@/lib/metrics"
import { durationMin } from "@/lib/date"
import { ConfirmDialog, Field, Modal, NotFoundState, Progress, cx } from "@/components/ui"
import { useToast } from "@/components/providers"
import { getExercise } from "@/lib/catalog"
import { parseVideoUrl } from "@/lib/video"
import { ExerciseGuide, ExerciseThumb } from "@/components/exercise"
import { Confetti, CountUp, Ring, haptic } from "@/components/motion"

/** Folha "Como fazer": demonstração, vídeo do personal, dica e passo a passo. */
function HowTo({ d, exerciseId, onClose }: { d: DemoData; exerciseId: string | null; onClose: () => void }) {
  const ex = exerciseId ? getExercise(d, exerciseId) : undefined
  return (
    <Modal open={!!ex} onClose={onClose} title={ex ? ex.name : ""} description={ex ? `${ex.group} · ${ex.equipment}` : undefined} wide>
      {ex && <ExerciseGuide d={d} id={ex.id} />}
    </Modal>
  )
}

function hasOwnVideo(d: DemoData, id: string) {
  const m = d.exerciseMedia[id]
  return !!(m?.videoUrl && parseVideoUrl(m.videoUrl))
}

export default function TreinoPage() {
  const { id } = useParams<{ id: string }>()
  const { d, student } = useActiveStudent()
  const [finishedId, setFinishedId] = useState<string | null>(null)

  if (finishedId) {
    const s = d.sessions.find((x) => x.id === finishedId)
    if (s) return <Summary session={s} records={personalRecords(d, s)} />
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
  const [howTo, setHowTo] = useState<string | null>(null)
  // grupos mais trabalhados primeiro (o mapa completo fica no Studio)
  const muscles = muscleVolume(d, workout.items).map((v) => v.muscle)
  const planSlots = supersets(workout.items)
  return (
    <div className="fade-in">
      <Link href="/aluno" className="btn btn-ghost btn-sm -ml-3 mb-3">
        <ArrowLeft size={16} aria-hidden /> Treinos
      </Link>
      <h1 className="t-h1">{workout.name}</h1>
      {workout.description && <p className="mt-1 text-muted">{workout.description}</p>}
      <p className="mt-3 text-sm text-muted">
        {workout.items.length} exercícios · {workout.items.reduce((a, i) => a + i.sets, 0)} séries
        {muscles.length > 0 && ` · ${muscles.slice(0, 3).join(", ")}${muscles.length > 3 ? ` +${muscles.length - 3}` : ""}`}
      </p>

      {workout.items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">Esta ficha ainda não tem exercícios.</p>
      ) : (
        <ol className="evo-plan mt-5">
          {workout.items.map((it, i) => {
            const ex = getExercise(d, it.exerciseId)
            const slot = planSlots.get(it.id)
            return (
              <li key={it.id} className={cx(slot && "evo-superset evo-plan-superset", slot && slot.position > 1 && "is-cont", slot && !slot.isLast && "is-linked")}>
                <button type="button" className="evo-plan-row" onClick={() => setHowTo(it.exerciseId)} aria-label={`Como fazer: ${ex?.name ?? "exercício"}`}>
                  {ex ? <ExerciseThumb ex={ex} className="w-12" /> : <span className="thumb w-12" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">
                      <span className="tabular text-muted">{i + 1}.</span> {ex?.name ?? "Exercício"}
                    </span>
                    <span className="block text-sm text-muted tabular">
                      {slot && <span className="font-semibold text-accent">Conjugado {slot.letter} · </span>}
                      {it.sets} séries · {it.reps} reps
                      {hasOwnVideo(d, it.exerciseId) && " · vídeo do personal"}
                    </span>
                  </span>
                  <PlayCircle size={20} aria-hidden className="shrink-0 text-muted" />
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <div className="h-24" aria-hidden />
      <HowTo d={d} exerciseId={howTo} onClose={() => setHowTo(null)} />

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
              className="btn btn-primary btn-lg shine w-full"
              disabled={workout.items.length === 0}
              onClick={() => {
                update((x) => startSession(x, studentId, workout.id, uid("se")))
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
  const [checkin, setCheckin] = useState<Checkin>({ effort: null, pain: null, sleep: null })
  const [howTo, setHowTo] = useState<string | null>(null)
  const now = useNow(true)
  const alerted = useRef(false)
  const progress = sessionProgress(session)
  const elapsed = Math.floor((now - new Date(session.startedAt).getTime()) / 1000)
  const restLeft = restUntil ? Math.ceil((restUntil - now) / 1000) : null

  useEffect(() => {
    if (restLeft !== null && restLeft <= 0 && !alerted.current) {
      alerted.current = true
      haptic(200)
    }
  }, [restLeft])

  // Itens na ordem prescrita; itens removidos da ficha após o início continuam na sessão.
  const order = useMemo(() => [...new Set(session.sets.map((s) => s.itemId))], [session.sets])
  const itemById = new Map(workout.items.map((i) => [i.id, i]))

  const slots = useMemo(() => {
    const groupOf = new Map(workout.items.map((i) => [i.id, i.group]))
    return supersets(order.map((id) => ({ id, group: groupOf.get(id) })))
  }, [order, workout.items])

  const toggleSet = useCallback(
    (itemId: string, setIndex: number, done: boolean, restSec: number) => {
      update((x) => updateSet(x, session.id, itemId, setIndex, { done }))
      if (!done) return
      haptic()
      const slot = slots.get(itemId)
      const pending = (id: string) => session.sets.some((s) => s.itemId === id && !s.done && !(s.itemId === itemId && s.setIndex === setIndex))
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const goTo = (id: string) => setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 450)
      // Conjugado: sem descanso entre os exercícios do grupo; segue direto para o próximo.
      if (slot && !slot.isLast) {
        setRestUntil(null)
        if (slot.nextId) goTo(slot.nextId)
        return
      }
      if (restSec > 0) {
        alerted.current = false
        setRestTotal(restSec)
        setRestUntil(Date.now() + restSec * 1000)
      }
      // Fim da rodada do conjugado: volta ao primeiro exercício do grupo que ainda tem séries.
      if (slot) {
        const first = order.find((id) => slots.get(id)?.letter === slot.letter && pending(id))
        if (first) return void goTo(first)
      }
      // Fechou o exercício: rola suavemente até o próximo pendente.
      if (!pending(itemId)) {
        const next = session.sets.find((s) => s.itemId !== itemId && !s.done)
        if (next) goTo(next.itemId)
      }
    },
    [session.id, session.sets, slots, order],
  )

  return (
    <div>
      <div className="sticky top-[calc(var(--safe-top)+3.5rem)] z-20 -mx-4 mb-4 border-b border-line bg-bg px-4 py-3">
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

      <ol className="space-y-3">
        {order.map((itemId, idx) => {
          const sets = session.sets.filter((s) => s.itemId === itemId)
          const item = itemById.get(itemId)
          const ex = getExercise(d, sets[0].exerciseId)
          const allDone = sets.every((s) => s.done)
          const restSec = item?.restSec ?? 60
          const prev = previousSets(d, session.studentId, sets[0].exerciseId, session.startedAt)
          const slot = slots.get(itemId)
          const nextName = slot?.nextId ? session.sets.find((s) => s.itemId === slot.nextId)?.exerciseName : null
          return (
            <li key={itemId} id={`item-${itemId}`} className={cx("evo-lift scroll-mt-28", allDone && "is-done", slot && "evo-superset", slot && slot.position > 1 && "is-cont", slot && !slot.isLast && "is-linked")}>
              {slot?.position === 1 && (
                <p className="evo-superset-tag">
                  <Link2 size={14} aria-hidden /> Conjugado {slot.letter} · faça os {slot.size} em sequência, descanse no fim
                </p>
              )}
              <div className="evo-lift-head">
                <button type="button" className="evo-lift-thumb" onClick={() => setHowTo(sets[0].exerciseId)} aria-label={`Como fazer: ${sets[0].exerciseName}`}>
                  {ex ? <ExerciseThumb ex={ex} className="w-12" /> : <span className="thumb w-12" />}
                  {allDone && (
                    <span className="evo-lift-check pop">
                      <Check size={12} strokeWidth={3.5} aria-label="concluído" />
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="evo-lift-name">
                    <span className="tabular text-muted">{idx + 1}.</span> {sets[0].exerciseName}
                  </h2>
                  <p className="evo-lift-meta tabular">
                    {item ? `${item.sets} × ${item.reps}` : `${sets.length} séries`}
                    {restSec > 0 && !(slot && !slot.isLast) && (
                      <>
                        {" · "}
                        <Timer size={12} aria-hidden className="inline" /> {mmss(restSec)}
                      </>
                    )}
                    {hasOwnVideo(d, sets[0].exerciseId) && " · vídeo do personal"}
                  </p>
                  {slot && <p className="evo-superset-next">{nextName ? `Em seguida, sem descanso: ${nextName}` : "Último do conjugado: agora descanse"}</p>}
                </div>
                <button type="button" className="btn btn-ghost btn-icon btn-sm text-muted" onClick={() => setHowTo(sets[0].exerciseId)} aria-label={`Ver como fazer ${sets[0].exerciseName}`}>
                  <PlayCircle size={20} aria-hidden />
                </button>
              </div>
              {item?.notes && <p className="evo-lift-note">{item.notes}</p>}

              <div className="evo-sets" role="group" aria-label={`Séries de ${sets[0].exerciseName}`}>
                <div className="evo-sets-row evo-sets-head" aria-hidden>
                  <span>Série</span>
                  <span>Anterior</span>
                  <span>Kg</span>
                  <span>Reps</span>
                  <span className="sr-only">Feito</span>
                  <Check size={14} strokeWidth={3} />
                </div>
                {sets.map((s) => {
                  const p = prev[s.setIndex]
                  const prevText = p ? `${p.load ?? "—"} × ${p.reps ?? "—"}` : "—"
                  return (
                    <div key={s.setIndex} className={cx("evo-sets-row", s.done && "is-done")}>
                      <span className="evo-sets-n tabular">{s.setIndex + 1}</span>
                      {p ? (
                        <button
                          type="button"
                          className="evo-sets-prev tabular"
                          title="Usar o que você fez da última vez"
                          aria-label={`Anterior: ${prevText}. Usar nesta série`}
                          onClick={() => update((x) => updateSet(x, session.id, itemId, s.setIndex, { load: p.load, reps: p.reps }))}
                        >
                          {prevText}
                        </button>
                      ) : (
                        <span className="evo-sets-prev is-empty">—</span>
                      )}
                      <label className="sr-only" htmlFor={`l-${itemId}-${s.setIndex}`}>
                        Carga em kg da série {s.setIndex + 1} de {s.exerciseName}
                      </label>
                      <input
                        id={`l-${itemId}-${s.setIndex}`}
                        className="evo-sets-input tabular"
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min={0}
                        value={s.load ?? ""}
                        placeholder="—"
                        onChange={(e) => update((x) => updateSet(x, session.id, itemId, s.setIndex, { load: e.target.value === "" ? null : Math.max(0, parseFloat(e.target.value) || 0) }))}
                      />
                      <label className="sr-only" htmlFor={`r-${itemId}-${s.setIndex}`}>
                        Repetições da série {s.setIndex + 1} de {s.exerciseName}
                      </label>
                      <input
                        id={`r-${itemId}-${s.setIndex}`}
                        className="evo-sets-input tabular"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={s.reps ?? ""}
                        placeholder="—"
                        onChange={(e) => update((x) => updateSet(x, session.id, itemId, s.setIndex, { reps: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                      <button
                        type="button"
                        aria-pressed={s.done}
                        aria-label={`${s.done ? "Desmarcar" : "Marcar"} série ${s.setIndex + 1} de ${s.exerciseName}`}
                        onClick={() => toggleSet(itemId, s.setIndex, !s.done, restSec)}
                        className="evo-sets-check"
                      >
                        <Check key={String(s.done)} size={18} strokeWidth={3} aria-hidden className={s.done ? "pop" : undefined} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Barra inferior: descanso ou concluir */}
      <div className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line">
        <div className="mx-auto max-w-xl px-4 py-3">
          {restLeft !== null && restLeft > -5 ? (
            <div className="fade-in flex items-center gap-3" role="timer" aria-live="off">
              <Ring value={restTotal ? (Math.max(0, restLeft) / restTotal) * 100 : 0} size={60} stroke={6} className={cx(restLeft <= 0 && "pulse-soft")} label="Tempo de descanso restante">
                <Timer size={20} aria-hidden className={restLeft <= 0 ? "text-accent" : "text-muted"} />
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-muted">{restLeft > 0 ? "Descanso" : "Bora, próxima série!"}</p>
                <p className={cx("text-3xl font-bold tabular", restLeft <= 0 && "text-accent")}>{mmss(Math.max(0, restLeft))}</p>
              </div>
              <button type="button" className="btn btn-outline btn-lg px-4" onClick={() => setRestUntil((r) => (r ?? Date.now()) + 15_000)} aria-label="Adicionar 15 segundos">
                +15s
              </button>
              <button type="button" className="btn btn-inverse btn-lg" onClick={() => setRestUntil(null)}>
                {restLeft > 0 ? "Pular" : "Ok"}
              </button>
            </div>
          ) : (
            <button type="button" className={cx("btn btn-primary btn-lg w-full", progress.done === progress.total && "shine glow")} onClick={() => setFinishing(true)}>
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
                update((x) => finishSession(x, session.id, note, checkin.effort !== null || checkin.pain !== null || checkin.sleep !== null ? checkin : null))
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
            <CheckinForm value={checkin} onChange={setCheckin} />
            <Field label="Quer contar algo ao seu personal? (opcional)" className="mt-4">
              {(p) => <textarea {...p} className="input" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: senti o joelho no agachamento" />}
            </Field>
          </>
        )}
      </Modal>

      <HowTo d={d} exerciseId={howTo} onClose={() => setHowTo(null)} />

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

function Summary({ session, records }: { session: Session; records: PersonalRecord[] }) {
  const p = sessionProgress(session)
  const vol = sessionVolume(session)
  return (
    <div className="fade-in py-6 text-center">
      <div className="relative mx-auto size-20">
        <Confetti />
        <div className="pop glow grid size-20 place-items-center rounded-full bg-primary text-on-primary">
          <Trophy size={36} aria-hidden />
        </div>
      </div>
      <p className="t-eyebrow mt-6">Treino concluído</p>
      <h1 className="t-h1 mt-1">{session.workoutName}</h1>
      <dl className="stagger mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">
        {[
          { l: "Duração", v: `${durationMin(session.startedAt, session.finishedAt)} min` },
          { l: "Séries", v: `${p.done}/${p.total}` },
          { l: "Volume", v: vol ? `${Math.round(vol).toLocaleString("pt-BR")} kg` : "—" },
        ].map((x) => (
          <div key={x.l} className="card px-2 py-3">
            <dt className="text-xs text-muted">{x.l}</dt>
            <dd className="mt-1 font-bold tabular">
              <CountUp text={x.v} />
            </dd>
          </div>
        ))}
      </dl>
      {records.length > 0 && (
        <section className="evo-pr pop mx-auto mt-6 max-w-sm text-left" aria-labelledby="pr-title">
          <h2 id="pr-title" className="evo-pr-title">
            <Medal size={18} aria-hidden /> {records.length === 1 ? "Novo recorde pessoal" : `${records.length} recordes pessoais`}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {records.map((r) => (
              <li key={r.exerciseId} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{r.exerciseName}</span>
                <span className="shrink-0 tabular">
                  <b>{String(r.load).replace(".", ",")} kg</b> <span className="text-muted">antes {String(r.previous).replace(".", ",")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
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

/** Músculos de hoje: o mesmo mapa da ficha, para o aluno saber o que vai trabalhar. */
const EFFORT_HINT: Record<number, string> = { 1: "muito leve", 3: "leve", 5: "moderado", 7: "pesado", 9: "muito pesado", 10: "máximo" }

/** Check-in de 5 segundos: esforço, dor e sono. Tudo opcional; vai para o personal acompanhar. */
function CheckinForm({ value, onChange }: { value: Checkin; onChange: (c: Checkin) => void }) {
  const hint = value.effort === null ? "toque de 1 a 10" : (EFFORT_HINT[value.effort] ?? EFFORT_HINT[value.effort - 1] ?? "")
  return (
    <div className="evo-checkin mt-4">
      <fieldset>
        <legend className="field-label">
          Quão pesado foi? <span className="font-normal text-muted">· {hint}</span>
        </legend>
        <div className="evo-effort" role="radiogroup" aria-label="Esforço de 1 a 10">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value.effort === n}
              aria-label={`Esforço ${n}${EFFORT_HINT[n] ? `, ${EFFORT_HINT[n]}` : ""}`}
              className="evo-effort-dot"
              data-on={value.effort !== null && n <= value.effort ? "" : undefined}
              onClick={() => onChange({ ...value, effort: value.effort === n ? null : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Choice<Pain> legend="Sentiu dor?" options={[["nenhuma", "Não"], ["leve", "Leve"], ["forte", "Forte"]]} value={value.pain} onChange={(pain) => onChange({ ...value, pain })} />
        <Choice<Sleep> legend="Como dormiu?" options={[["ruim", "Mal"], ["ok", "Ok"], ["bom", "Bem"]]} value={value.sleep} onChange={(sleep) => onChange({ ...value, sleep })} />
      </div>
      {value.pain === "forte" && <p className="mt-2 text-sm text-warning">Seu personal vai ver isso. Se a dor continuar, pare e fale com ele antes do próximo treino.</p>}
    </div>
  )
}

function Choice<T extends string>({ legend, options, value, onChange }: { legend: string; options: [T, string][]; value: T | null; onChange: (v: T | null) => void }) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="flex gap-1.5" role="radiogroup" aria-label={legend}>
        {options.map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className="chip flex-1 justify-center" onClick={() => onChange(value === v ? null : v)}>
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
