"use client"
import { useState } from "react"
import { Download } from "@/components/icons"
import { Modal } from "@/components/ui"
import { useToast } from "@/components/providers"
import { update, useData } from "@/lib/store"
import { WORKOUT_CSV_TEMPLATE, applyImport, planImport, type ImportPlan } from "@/lib/import"

/** Importa fichas de uma planilha CSV (Excel, Google Sheets, MFIT) e atribui a um aluno. */
export function ImportWorkouts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useData()
  const toast = useToast()
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [fileName, setFileName] = useState("")
  const [studentId, setStudentId] = useState("")
  const active = d.students.filter((s) => s.status === "ativo")

  const close = () => {
    setPlan(null)
    setFileName("")
    onClose()
  }

  const read = (f: File | undefined) => {
    if (!f) return
    if (f.size > 1_000_000) return toast("Planilha grande demais (máx. 1 MB).")
    const r = new FileReader()
    r.onload = () => {
      setFileName(f.name)
      setPlan(planImport(d, String(r.result ?? "")))
    }
    r.readAsText(f, "utf-8")
  }

  const template = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob(["﻿" + WORKOUT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }))
    a.download = "evofit-fichas-modelo.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const confirm = () => {
    if (!plan) return
    update((x) => applyImport(x, plan, studentId || null).data)
    const n = plan.workouts.length
    toast(`${n} ${n === 1 ? "ficha importada" : "fichas importadas"}${studentId ? " e atribuídas ao aluno" : ""}.`)
    close()
  }

  const canImport = !!plan && plan.workouts.length > 0 && plan.errors.length === 0

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Importar fichas de uma planilha"
      description="Uma linha por exercício: treino, exercício, séries, repetições, carga (kg), descanso (s) e observação. Funciona com Excel, Google Sheets e exportações do MFIT salvas em CSV."
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={close}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={!canImport} onClick={confirm}>
            {plan?.workouts.length ? `Importar ${plan.workouts.length} ${plan.workouts.length === 1 ? "ficha" : "fichas"}` : "Importar"}
          </button>
        </>
      }
    >
      <div className="evo-import">
        <label className="evo-import-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); read(e.dataTransfer.files[0]) }}>
          <input type="file" accept=".csv,.txt,.tsv,text/csv" className="sr-only" onChange={(e) => { read(e.target.files?.[0]); e.target.value = "" }} />
          <Download size={28} aria-hidden />
          <strong>{fileName || "Escolher planilha (CSV)"}</strong>
          <span>No Excel ou Google Sheets: Arquivo → Salvar como / Fazer download → CSV.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={template}>
            Baixar planilha modelo
          </button>
          <a className="btn btn-ghost btn-sm" href="/modelos/evofit-treino-abcd.csv" download>
            Baixar treino ABCD pronto
          </a>
        </div>

        {plan && (
          <div className="evo-import-preview">
            {plan.errors.length > 0 && (
              <ul className="evo-import-errors" role="alert">
                {plan.errors.slice(0, 6).map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
            {plan.workouts.map((w) => (
              <section key={w.name}>
                <h3>{w.name} <span>{w.items.length} exercícios</span></h3>
                <ul>
                  {w.items.map(({ row, exerciseId, exerciseName }) => (
                    <li key={row.line}>
                      <span>{exerciseName}{!exerciseId && <em> · novo</em>}</span>
                      <span>{row.sets} × {row.reps}{row.load !== null ? ` · ${String(row.load).replace(".", ",")} kg` : ""}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {plan.newExercises.length > 0 && (
              <p className="text-sm text-muted">{plan.newExercises.length} {plan.newExercises.length === 1 ? "exercício não está" : "exercícios não estão"} no catálogo e {plan.newExercises.length === 1 ? "será criado" : "serão criados"} como exercício próprio (marcados como “novo”).</p>
            )}
            {plan.workouts.length > 0 && (
              <label className="block">
                <span className="field-label">Atribuir a um aluno (opcional)</span>
                <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">Só importar, atribuo depois</option>
                  {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
