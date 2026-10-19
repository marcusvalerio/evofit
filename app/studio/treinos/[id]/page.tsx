"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Eye, Plus, Search, Trash2 } from "lucide-react"
import { update, useData } from "@/lib/store"
import type { DemoData, Workout, WorkoutItem } from "@/lib/types"
import { balanceNotes, muscleVolume, volumeLevels } from "@/lib/volume"
import { BodyMap } from "@/components/body-map"
import { CATALOG_EQUIPMENT, CATALOG_GROUPS, allExercises, filterExercises, getExercise } from "@/lib/catalog"
import { daysToChange, deleteWorkout, isWorkoutValid, withStartDate, newWorkoutItem, saveWorkout, validateWorkout } from "@/lib/actions"
import { ConfirmDialog, Field, Modal, NotFoundState, cx, revealFirstError, autoFocusOk } from "@/components/ui"
import { useToast } from "@/components/providers"
import { fmtIsoDay } from "@/lib/date"
import { ExerciseThumb } from "@/components/exercise"

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const d = useData()
  const workout = d.workouts.find((w) => w.id === id)
  if (!workout) {
    return (
      <NotFoundState title="Ficha não encontrada" href="/studio/treinos" cta="Voltar para fichas">
        Esta ficha foi excluída ou a demonstração foi restaurada.
      </NotFoundState>
    )
  }
  return <Editor key={workout.id + workout.updatedAt} workout={workout} />
}

const num = (v: number) => (Number.isFinite(v) ? v : "")

function Editor({ workout }: { workout: Workout }) {
  const d = useData()
  const router = useRouter()
  const toast = useToast()
  const [draft, setDraft] = useState<Workout>(workout)
  const [picking, setPicking] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [tried, setTried] = useState(false)
  const [bulkSets, setBulkSets] = useState("3")
  const [bulkReps, setBulkReps] = useState("8-12")
  const [bulkRest, setBulkRest] = useState("60")
  const [studentQuery, setStudentQuery] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const errors = validateWorkout(draft)
  const valid = isWorkoutValid(errors)
  const dirty = JSON.stringify(draft) !== JSON.stringify(workout)
  const activeStudents = d.students.filter((s) => s.status === "ativo")
  const visibleStudents = activeStudents.filter((s) => s.name.toLocaleLowerCase("pt-BR").includes(studentQuery.trim().toLocaleLowerCase("pt-BR")))
  const applyBulk = () => {
    const sets = Number.parseInt(bulkSets, 10)
    const restSec = Number.parseInt(bulkRest, 10)
    if (!Number.isInteger(sets) || sets < 1 || sets > 20 || !Number.isInteger(restSec) || restSec < 0 || restSec > 600 || !bulkReps.trim()) {
      toast("Confira séries, repetições e descanso antes de aplicar.", "error")
      return
    }
    setDraft((w) => ({ ...w, items: w.items.map((item) => ({ ...item, sets, reps: bulkReps.trim(), restSec })) }))
    toast("Configuração aplicada a todos os exercícios.")
  }

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  const setItem = (itemId: string, patch: Partial<WorkoutItem>) => setDraft((w) => ({ ...w, items: w.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }))
  const move = (idx: number, dir: -1 | 1) =>
    setDraft((w) => {
      const items = [...w.items]
      const j = idx + dir
      if (j < 0 || j >= items.length) return w
      ;[items[idx], items[j]] = [items[j], items[idx]]
      return { ...w, items }
    })

  const save = () => {
    setTried(true)
    if (!valid) {
      revealFirstError()
      toast("Corrija os campos destacados antes de salvar.", "error")
      return
    }
    update((x) => saveWorkout(x, draft))
    toast("Ficha salva.")
  }

  const show: Partial<typeof errors> & Pick<typeof errors, "itemErrors"> = tried ? errors : { itemErrors: {} }
  const toChange = daysToChange(draft)

  return (
    <div className="fade-in pb-20 lg:pb-0">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/studio/treinos" className="btn btn-ghost btn-sm -ml-3">
          <ArrowLeft size={16} aria-hidden /> Fichas
        </Link>
        <span className={cx("badge", dirty ? "badge-warning" : "badge-success")} aria-live="polite">
          {dirty ? "Alterações não salvas" : "Salvo"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-4">
          <div className="card space-y-4 p-5">
            <Field label="Nome da ficha" error={show.name}>
              {(p) => <input {...p} className="input text-lg font-semibold" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
            </Field>
            <Field label="Descrição / foco" hint="Opcional. Aparece para o aluno antes de iniciar.">
              {(p) => <textarea {...p} className="input" rows={2} maxLength={300} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Início do treino" error={show.startDate} hint="Ao preencher, sugerimos a troca para 3 meses depois.">
                {(p) => <input {...p} className="input" type="date" min="2000-01-01" max="2100-12-31" value={draft.startDate ?? ""} onChange={(e) => setDraft((w) => withStartDate(w, e.target.value))} />}
              </Field>
              <Field
                label="Troca prevista"
                error={show.changeDate}
                hint={
                  toChange === null
                    ? "Data sugerida para trocar a ficha. Pode editar."
                    : toChange < 0
                      ? `Troca atrasada há ${-toChange} ${toChange === -1 ? "dia" : "dias"}.`
                      : toChange === 0
                        ? "A troca é hoje."
                        : `Faltam ${toChange} ${toChange === 1 ? "dia" : "dias"} (${fmtIsoDay(draft.changeDate!)}).`
                }
              >
                {(p) => <input {...p} className="input" type="date" min={draft.startDate || "2000-01-01"} max="2100-12-31" value={draft.changeDate ?? ""} onChange={(e) => setDraft((w) => ({ ...w, changeDate: e.target.value || null }))} />}
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="t-h2">
              Exercícios <span className="text-muted tabular">({draft.items.length})</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreviewOpen(true)}>
                <Eye size={16} aria-hidden /> Prévia do aluno
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicking(true)}>
                <Plus size={16} aria-hidden /> Adicionar
              </button>
            </div>
          </div>
          {draft.items.length > 1 && (
            <section className="evo-bulk-prescription card p-4" aria-label="Aplicar configuração em lote">
              <div className="flex items-start gap-3">
                <span className="evo-bulk-icon"><Copy size={18} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold tracking-tight">Ajuste em lote</h3>
                  <p className="mt-1 text-sm text-muted">Aplique séries, repetições e descanso a todos os exercícios desta ficha. As cargas e instruções individuais serão preservadas.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <Field label="Séries">
                  {(p) => <input {...p} className="input tabular" type="number" min={1} max={20} value={bulkSets} onChange={(e) => setBulkSets(e.target.value)} />}
                </Field>
                <Field label="Repetições">
                  {(p) => <input {...p} className="input" value={bulkReps} maxLength={20} onChange={(e) => setBulkReps(e.target.value)} />}
                </Field>
                <Field label="Descanso (s)">
                  {(p) => <input {...p} className="input tabular" type="number" min={0} max={600} step={15} value={bulkRest} onChange={(e) => setBulkRest(e.target.value)} />}
                </Field>
              </div>
              <button type="button" className="btn btn-outline btn-sm mt-3 w-full sm:w-auto" onClick={applyBulk}><Copy size={15} aria-hidden /> Aplicar aos {draft.items.length} exercícios</button>
            </section>
          )}
          {show.items && <p className="field-error">{show.items}</p>}

          {draft.items.length === 0 ? (
            <button type="button" onClick={() => setPicking(true)} className="flex w-full flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-muted hover:border-fg">
              <Plus size={22} aria-hidden />
              <span className="mt-2 font-semibold text-fg">Adicionar o primeiro exercício</span>
              <span className="text-sm">Escolha na biblioteca</span>
            </button>
          ) : (
            <ol className="space-y-3">
              {draft.items.map((it, idx) => {
                const ex = getExercise(d, it.exerciseId)
                const err = show.itemErrors[it.id]
                return (
                  <li key={it.id} className={cx("card p-4", err && "border-danger")}>
                    <div className="mb-3 flex items-start gap-3">
                      <span className="relative shrink-0">
                        {ex ? <ExerciseThumb ex={ex} className="w-16 sm:w-20" /> : <span className="thumb w-16 sm:w-20" />}
                        <span className="absolute -left-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-inverse text-xs font-bold text-on-inverse tabular">{idx + 1}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{ex?.name ?? "Exercício removido"}</p>
                        <p className="text-sm text-muted">
                          {ex ? `${ex.group} · ${ex.equipment}` : ""}
                          {ex && (
                            <>
                              {" · "}
                              <Link href={`/studio/exercicios/${encodeURIComponent(ex.id)}`} className="font-medium text-accent hover:underline">
                                ver execução
                              </Link>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0">
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label={`Mover ${ex?.name} para cima`}>
                          <ArrowUp size={16} />
                        </button>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={idx === draft.items.length - 1} onClick={() => move(idx, 1)} aria-label={`Mover ${ex?.name} para baixo`}>
                          <ArrowDown size={16} />
                        </button>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setDraft((w) => ({ ...w, items: w.items.filter((i) => i.id !== it.id) }))} aria-label={`Remover ${ex?.name}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="Séries">
                        {(p) => <input {...p} className="input tabular" type="number" inputMode="numeric" min={1} max={20} value={num(it.sets)} onChange={(e) => setItem(it.id, { sets: parseInt(e.target.value, 10) })} />}
                      </Field>
                      <Field label="Repetições">
                        {(p) => <input {...p} className="input tabular" value={it.reps} maxLength={20} placeholder="8-12" onChange={(e) => setItem(it.id, { reps: e.target.value })} />}
                      </Field>
                      <Field label="Carga (kg)">
                        {(p) => (
                          <input
                            {...p}
                            className="input tabular"
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min={0}
                            placeholder="livre"
                            value={it.load ?? ""}
                            onChange={(e) => setItem(it.id, { load: e.target.value === "" ? null : parseFloat(e.target.value) })}
                          />
                        )}
                      </Field>
                      <Field label="Descanso (s)">
                        {(p) => <input {...p} className="input tabular" type="number" inputMode="numeric" min={0} max={600} step={15} value={num(it.restSec)} onChange={(e) => setItem(it.id, { restSec: parseInt(e.target.value, 10) })} />}
                      </Field>
                      <Field label="Instruções para o aluno" className="col-span-2 sm:col-span-4">
                        {(p) => <input {...p} className="input" value={it.notes} maxLength={200} placeholder="Opcional" onChange={(e) => setItem(it.id, { notes: e.target.value })} />}
                      </Field>
                    </div>
                    {err && <p className="field-error">{err}</p>}
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        <aside className="space-y-4">
          <WorkoutBalance d={d} items={draft.items} />
          <div className="card p-5">
            <h2 className="t-h2">Alunos</h2>
            <p className="mt-1 text-sm text-muted">Quem verá esta ficha no app.</p>
            {activeStudents.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nenhum aluno ativo.</p>
            ) : (
              <>
                <div className="mt-3"><label className="sr-only" htmlFor="assigned-student-search">Buscar aluno para atribuir ficha</label><input id="assigned-student-search" className="input" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Buscar aluno..." /></div>
                {visibleStudents.length === 0 && <p className="mt-3 text-sm text-muted">Nenhum aluno encontrado.</p>}
                <ul className="mt-3 space-y-1">
                {visibleStudents.map((s) => {
                  const on = draft.studentIds.includes(s.id)
                  return (
                    <li key={s.id}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1">
                        <input
                          type="checkbox"
                          className="size-5 accent-[var(--primary)]"
                          checked={on}
                          onChange={() => setDraft((w) => ({ ...w, studentIds: on ? w.studentIds.filter((x) => x !== s.id) : [...w.studentIds, s.id] }))}
                        />
                        <span className="text-[0.9375rem]">{s.name}</span>
                      </label>
                    </li>
                  )
                })}
                </ul>
              </>
            )}
          </div>
          <div className="card hidden space-y-2 p-5 lg:block">
            <button type="button" className="btn btn-primary w-full" onClick={save} disabled={!dirty}>
              <Check size={18} aria-hidden /> Salvar ficha
            </button>
            <button type="button" className="btn btn-outline w-full" onClick={() => setDraft(workout)} disabled={!dirty}>
              Descartar alterações
            </button>
            <button type="button" className="btn btn-ghost w-full" onClick={() => setRemoving(true)}>
              <Trash2 size={16} aria-hidden /> Excluir ficha
            </button>
          </div>
          <button type="button" className="btn btn-ghost w-full lg:hidden" onClick={() => setRemoving(true)}>
            <Trash2 size={16} aria-hidden /> Excluir ficha
          </button>
        </aside>
      </div>

      {/* Barra de salvar (mobile) */}
      <div className="glass fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-line px-4 py-3 lg:hidden">
        <button type="button" className="btn btn-outline flex-1" onClick={() => setDraft(workout)} disabled={!dirty}>
          Descartar
        </button>
        <button type="button" className="btn btn-primary flex-[2]" onClick={save} disabled={!dirty}>
          <Check size={18} aria-hidden /> Salvar ficha
        </button>
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Prévia do aluno"
        description="Visualização da ficha com as alterações atuais, antes de salvar."
        wide
        footer={<button type="button" className="btn btn-primary" onClick={() => setPreviewOpen(false)}>Voltar ao editor</button>}
      >
        <div className="evo-workout-preview">
          <div className="evo-workout-preview-head">
            <p className="evo-workout-preview-kicker">EVOFIT · PLANO DE TREINO</p>
            <h3>{draft.name.trim() || "Sua ficha de treino"}</h3>
            <p>{draft.description.trim() || "Siga a sequência proposta e registre seu desempenho a cada exercício."}</p>
            <div className="evo-workout-preview-summary">
              <span><strong>{draft.items.length}</strong> exercícios</span>
              <span><strong>{draft.items.reduce((sum, item) => sum + (Number.isFinite(item.sets) ? item.sets : 0), 0)}</strong> séries no total</span>
            </div>
          </div>
          {draft.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Adicione exercícios para montar a prévia do aluno.</p>
          ) : (
            <ol className="evo-workout-preview-list">
              {draft.items.map((item, index) => {
                const exercise = getExercise(d, item.exerciseId)
                return (
                  <li key={item.id} className="evo-workout-preview-item">
                    <span className="evo-workout-preview-number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <strong>{exercise?.name ?? "Exercício indisponível"}</strong>
                      <p>{exercise ? exercise.group + " · " + exercise.equipment : "Confira este exercício no editor."}</p>
                      {item.notes.trim() && <p className="evo-workout-preview-notes">{item.notes}</p>}
                      <div className="evo-workout-preview-metrics">
                        <span><small>Séries</small><b>{Number.isFinite(item.sets) ? item.sets : "—"}</b></span>
                        <span><small>Repetições</small><b>{item.reps || "—"}</b></span>
                        <span><small>Carga</small><b>{item.load == null ? "Livre" : String(item.load) + " kg"}</b></span>
                        <span><small>Descanso</small><b>{Number.isFinite(item.restSec) ? String(item.restSec) + "s" : "—"}</b></span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </Modal>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(exerciseId) => setDraft((w) => ({ ...w, items: [...w.items, newWorkoutItem(exerciseId)] }))}
          selected={draft.items.map((i) => i.exerciseId)}
        />
      )}

      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        title={`Excluir “${workout.name}”?`}
        message="A ficha deixa de aparecer para os alunos. Sessões concluídas continuam no histórico."
        confirmLabel="Excluir ficha"
        danger
        onConfirm={() => {
          update((x) => deleteWorkout(x, workout.id))
          toast("Ficha excluída.")
          router.push("/studio/treinos")
        }}
      />
    </div>
  )
}

const PAGE = 40

function ExercisePicker({ onClose, onPick, selected }: { onClose: () => void; onPick: (id: string) => void; selected: string[] }) {
  const d = useData()
  const [q, setQ] = useState("")
  const [group, setGroup] = useState("")
  const [equipment, setEquipment] = useState("")
  const [limit, setLimit] = useState(PAGE)
  const [added, setAdded] = useState<string[]>([])
  const all = useMemo(() => allExercises(d), [d])
  const list = useMemo(() => filterExercises(all, { q, group, equipment }), [all, q, group, equipment])
  const reset = () => setLimit(PAGE)
  return (
    <Modal
      open
      onClose={onClose}
      title="Adicionar exercícios"
      description={`${all.length} exercícios com demonstração. Toque para adicionar — dá para escolher vários antes de fechar.`}
      wide
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Concluir{added.length > 0 && ` (${added.length} adicionado${added.length > 1 ? "s" : ""})`}
        </button>
      }
    >
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-3 space-y-2 bg-surface px-5 pb-3 pt-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <label htmlFor="pick-q" className="sr-only">
              Buscar exercício
            </label>
            <input id="pick-q" type="search" className="input pl-10" placeholder="Ex.: supino, agachamento, squat" value={q} onChange={(e) => (setQ(e.target.value), reset())} autoFocus={autoFocusOk()} />
          </div>
          <label htmlFor="pick-eq" className="sr-only">
            Equipamento
          </label>
          <select id="pick-eq" className="input !w-36 sm:!w-48" value={equipment} onChange={(e) => (setEquipment(e.target.value), reset())}>
            <option value="">Equipamento</option>
            {CATALOG_EQUIPMENT.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="scroll-x -mx-5 px-5 pb-1" role="group" aria-label="Grupo muscular">
          <button type="button" className="chip shrink-0" aria-pressed={!group} onClick={() => (setGroup(""), reset())}>
            Todos
          </button>
          {CATALOG_GROUPS.map((g) => (
            <button key={g} type="button" className="chip shrink-0" aria-pressed={group === g} onClick={() => (setGroup(group === g ? "" : g), reset())}>
              {g}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted" aria-live="polite">
          {list.length} resultado{list.length === 1 ? "" : "s"}
        </p>
      </div>
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nenhum exercício encontrado. Tente outro termo ou crie um exercício próprio em Exercícios.</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {list.slice(0, limit).map((e) => {
              const count = selected.filter((s) => s === e.id).length
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-lg py-2.5 text-left transition-colors hover:bg-line/40"
                    onClick={() => {
                      onPick(e.id)
                      setAdded((a) => [...a, e.id])
                    }}
                  >
                    <ExerciseThumb ex={e} className="w-16" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{e.name}</p>
                      <p className="truncate text-sm text-muted">
                        {e.group} · {e.equipment}
                        {e.custom && " · próprio"}
                      </p>
                    </div>
                    {count > 0 ? (
                      <span key={count} className="badge badge-success pop">
                        <Check size={12} aria-hidden /> {count > 1 ? `${count}×` : "na ficha"}
                      </span>
                    ) : (
                      <Plus size={18} aria-hidden className="text-muted transition-transform group-hover:scale-125" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          {list.length > limit && (
            <button type="button" className="btn btn-outline mt-3 w-full" onClick={() => setLimit((l) => l + PAGE)}>
              Mostrar mais ({list.length - limit})
            </button>
          )}
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {added.length ? `${added.length} exercício(s) adicionado(s)` : ""}
      </span>
    </Modal>
  )
}

/** Mapa de calor do volume da ficha por músculo, atualizado enquanto o personal edita. */
function WorkoutBalance({ d, items }: { d: DemoData; items: Workout["items"] }) {
  const vol = muscleVolume(d, items)
  const notes = balanceNotes(vol)
  return (
    <section className="card p-5" aria-labelledby="balance-title">
      <h2 id="balance-title" className="t-h2">
        Equilíbrio da ficha
      </h2>
      <p className="mt-1 text-sm text-muted">Séries por músculo (secundário conta meia série).</p>
      {vol.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Adicione exercícios para ver o mapa.</p>
      ) : (
        <>
          <BodyMap levels={volumeLevels(vol)} className="mt-4" />
          <ul className="mt-4 space-y-1.5 text-sm">
            {vol.slice(0, 6).map((v) => (
              <li key={v.muscle} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate">{v.muscle}</span>
                <span className="evo-vol-bar" aria-hidden>
                  <span style={{ width: `${(v.sets / vol[0].sets) * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right tabular text-muted">{String(Math.round(v.sets * 10) / 10).replace(".", ",")}</span>
              </li>
            ))}
          </ul>
          {notes.length > 0 && (
            <div className="mt-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
              <p className="font-semibold">Observação de equilíbrio</p>
              <ul className="mt-1 space-y-1">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs opacity-90">Se o foco é intencional, ignore.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
