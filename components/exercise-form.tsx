"use client"
import { useState } from "react"
import { update, useData } from "@/lib/store"
import type { Exercise } from "@/lib/types"
import { MUSCLE_GROUPS } from "@/lib/types"
import { addExercise, uid, updateExercise, validateExercise, type ExerciseInput } from "@/lib/actions"
import { Field, Modal, revealFirstError } from "@/components/ui"
import { useToast } from "@/components/providers"

export function ExerciseForm({ exercise, onClose, onCreated }: { exercise?: Exercise; onClose: () => void; onCreated?: (id: string) => void }) {
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
    if (Object.keys(errors).length) return revealFirstError()
    if (exercise) {
      update((x) => updateExercise(x, exercise.id, v))
      toast("Exercício atualizado.")
      onClose()
      return
    }
    const id = uid("ex")
    update((x) => addExercise(x, v, id))
    toast("Exercício criado. Adicione um vídeo para o aluno ver a execução.")
    onClose()
    onCreated?.(id)
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
        <Field label="Instruções de execução" hint="Uma instrução por linha vira um passo numerado para o aluno." error={show.instructions} className="sm:col-span-2">
          {(p) => <textarea {...p} className="input" value={v.instructions} onChange={(e) => set("instructions", e.target.value)} maxLength={600} rows={4} />}
        </Field>
      </form>
    </Modal>
  )
}
