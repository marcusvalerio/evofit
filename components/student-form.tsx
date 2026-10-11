"use client"
import { useState } from "react"
import type { Level, Student } from "@/lib/types"
import { LEVEL_LABEL } from "@/lib/types"
import { addStudent, updateStudent, validateStudent, type StudentInput } from "@/lib/actions"
import { update, useIsDemo } from "@/lib/store"
import { Field, Modal } from "./ui"
import { useToast } from "./providers"

const EMPTY: StudentInput = { name: "", goal: "", level: "iniciante", weeklyTarget: 3, notes: "" }

export function StudentFormModal({ open, onClose, student, onCreated }: { open: boolean; onClose: () => void; student?: Student; onCreated?: (id: string) => void }) {
  return open ? <StudentForm onClose={onClose} student={student} onCreated={onCreated} /> : null
}

function StudentForm({ onClose, student, onCreated }: { onClose: () => void; student?: Student; onCreated?: (id: string) => void }) {
  const toast = useToast()
  const demo = useIsDemo()
  const [v, setV] = useState<StudentInput>(student ? { name: student.name, goal: student.goal, level: student.level, weeklyTarget: student.weeklyTarget, notes: student.notes } : EMPTY)
  const [touched, setTouched] = useState(false)
  const errors = validateStudent(v)
  const show = touched ? errors : {}
  const set = <K extends keyof StudentInput>(k: K, val: StudentInput[K]) => setV((p) => ({ ...p, [k]: val }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length) return
    if (student) {
      update((d) => updateStudent(d, student.id, v))
      toast("Dados do aluno atualizados.")
    } else {
      const id = `al-${Date.now().toString(36)}`
      update((d) => addStudent(d, v, id))
      toast(`${v.name.trim()} foi adicionado(a).`)
      onClose()
      onCreated?.(id)
      return
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={student ? "Editar aluno" : "Novo aluno"}
      description={demo ? "Dados fictícios: evite cadastrar informações pessoais reais nesta demonstração." : "Cadastre só o necessário para o acompanhamento, com o consentimento do aluno."}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="student-form" className="btn btn-primary">
            {student ? "Salvar alterações" : "Adicionar aluno"}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" error={show.name} className="sm:col-span-2">
          {(p) => <input {...p} className="input" value={v.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" maxLength={80} autoFocus />}
        </Field>
        <Field label="Objetivo" error={show.goal} className="sm:col-span-2" hint="Ex.: hipertrofia, condicionamento, voltar a treinar.">
          {(p) => <input {...p} className="input" value={v.goal} onChange={(e) => set("goal", e.target.value)} maxLength={120} />}
        </Field>
        <Field label="Nível">
          {(p) => (
            <select {...p} className="input" value={v.level} onChange={(e) => set("level", e.target.value as Level)}>
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Meta semanal (sessões)" error={show.weeklyTarget}>
          {(p) => (
            <input {...p} className="input" type="number" inputMode="numeric" min={1} max={7} value={Number.isNaN(v.weeklyTarget) ? "" : v.weeklyTarget} onChange={(e) => set("weeklyTarget", parseInt(e.target.value, 10))} />
          )}
        </Field>
        <Field label="Observações" error={show.notes} className="sm:col-span-2" hint="Restrições, preferências de horário etc.">
          {(p) => <textarea {...p} className="input" value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} rows={3} />}
        </Field>
      </form>
    </Modal>
  )
}
