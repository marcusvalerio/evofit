"use client"
import { useMemo, useState } from "react"
import { Dumbbell, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { update, useData } from "@/lib/store"
import type { Exercise } from "@/lib/types"
import { MUSCLE_GROUPS } from "@/lib/types"
import { addExercise, deleteExercise, exerciseUsage, updateExercise, validateExercise, type ExerciseInput } from "@/lib/actions"
import { ConfirmDialog, EmptyState, Field, Modal, PageHeader } from "@/components/ui"
import { useToast } from "@/components/providers"

export default function ExerciciosPage() {
  const d = useData()
  const toast = useToast()
  const [q, setQ] = useState("")
  const [group, setGroup] = useState("")
  const [editing, setEditing] = useState<Exercise | "new" | null>(null)
  const [removing, setRemoving] = useState<Exercise | null>(null)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return d.exercises
      .filter((e) => (!group || e.muscleGroup === group) && (!t || e.name.toLowerCase().includes(t) || e.equipment.toLowerCase().includes(t)))
      .sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup) || a.name.localeCompare(b.name))
  }, [d.exercises, q, group])

  return (
    <div className="fade-in">
      <PageHeader
        title="Exercícios"
        description={`${d.exercises.length} exercícios na biblioteca. Os exercícios-base são somente leitura; crie os seus para personalizar.`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={18} aria-hidden /> Novo exercício
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="busca-ex" className="sr-only">
            Buscar exercício
          </label>
          <input id="busca-ex" type="search" className="input pl-10" placeholder="Buscar por nome ou equipamento" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label htmlFor="grupo" className="sr-only">
          Grupo muscular
        </label>
        <select id="grupo" className="input sm:w-56" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Todos os grupos</option>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum exercício encontrado"
          action={
            <button type="button" className="btn btn-outline btn-sm" onClick={() => (setQ(""), setGroup(""))}>
              Limpar filtros
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <li key={e.id} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-sm text-muted">
                    {e.muscleGroup}
                    {e.equipment && ` · ${e.equipment}`}
                  </p>
                </div>
                {e.custom && <span className="badge badge-accent">Seu</span>}
              </div>
              {e.instructions && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{e.instructions}</p>}
              {e.custom && (
                <div className="mt-auto flex gap-1 pt-3">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(e)}>
                    <Pencil size={15} aria-hidden /> Editar
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemoving(e)}>
                    <Trash2 size={15} aria-hidden /> Excluir
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && <ExerciseForm exercise={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}

      {removing && (
        <ConfirmDialog
          open
          onClose={() => setRemoving(null)}
          title={`Excluir “${removing.name}”?`}
          message={
            exerciseUsage(d, removing.id).length
              ? `Este exercício está em uso em: ${exerciseUsage(d, removing.id).map((w) => w.name).join(", ")}. Remova-o dessas fichas antes de excluir.`
              : "O exercício será removido da biblioteca. O histórico de sessões já registradas não é alterado."
          }
          confirmLabel={exerciseUsage(d, removing.id).length ? "Entendi" : "Excluir exercício"}
          danger={!exerciseUsage(d, removing.id).length}
          onConfirm={() => {
            if (exerciseUsage(d, removing.id).length) return
            update((x) => deleteExercise(x, removing.id))
            toast("Exercício excluído.")
          }}
        />
      )}
    </div>
  )
}

function ExerciseForm({ exercise, onClose }: { exercise?: Exercise; onClose: () => void }) {
  const d = useData()
  const toast = useToast()
  const [v, setV] = useState<ExerciseInput>(
    exercise ? { name: exercise.name, muscleGroup: exercise.muscleGroup, equipment: exercise.equipment, instructions: exercise.instructions } : { name: "", muscleGroup: "", equipment: "", instructions: "" },
  )
  const [touched, setTouched] = useState(false)
  const errors = validateExercise(v, d, exercise?.id)
  const show = touched ? errors : {}
  const set = (k: keyof ExerciseInput, val: string) => setV((p) => ({ ...p, [k]: val }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length) return
    update((x) => (exercise ? updateExercise(x, exercise.id, v) : addExercise(x, v)))
    toast(exercise ? "Exercício atualizado." : "Exercício adicionado à biblioteca.")
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={exercise ? "Editar exercício" : "Novo exercício"}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="ex-form" className="btn btn-primary">
            Salvar
          </button>
        </>
      }
    >
      <form id="ex-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" error={show.name} className="sm:col-span-2">
          {(p) => <input {...p} className="input" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} autoFocus />}
        </Field>
        <Field label="Grupo muscular" error={show.muscleGroup}>
          {(p) => (
            <select {...p} className="input" value={v.muscleGroup} onChange={(e) => set("muscleGroup", e.target.value)}>
              <option value="">Selecione</option>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Equipamento">
          {(p) => <input {...p} className="input" value={v.equipment} onChange={(e) => set("equipment", e.target.value)} maxLength={60} placeholder="Ex.: halteres" />}
        </Field>
        <Field label="Instruções de execução" error={show.instructions} className="sm:col-span-2">
          {(p) => <textarea {...p} className="input" value={v.instructions} onChange={(e) => set("instructions", e.target.value)} maxLength={600} rows={4} />}
        </Field>
      </form>
    </Modal>
  )
}
