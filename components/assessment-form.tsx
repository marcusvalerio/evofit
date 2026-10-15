"use client"
import { useState } from "react"
import type { Assessment, Circumference, Sex, Skinfold } from "@/lib/types"
import { CIRCUMFERENCE_LABEL, CIRCUMFERENCES, SKINFOLD_LABEL, SKINFOLDS } from "@/lib/types"
import { saveAssessment, validateAssessment, type AssessmentInput } from "@/lib/actions"
import { bmi, bodyFat, FAT_SOURCE_LABEL, PROTOCOL_SITES, waistHip } from "@/lib/assessment"
import { update } from "@/lib/store"
import { Field, Modal, cx } from "./ui"
import { useToast } from "./providers"

type Draft = {
  date: string
  sex: Sex
  age: string
  weightKg: string
  heightCm: string
  bodyFatPct: string
  notes: string
  skinfolds: Partial<Record<Skinfold, string>>
  circumferences: Partial<Record<Circumference, string>>
}

const num = (s: string | undefined) => {
  if (!s || !s.trim()) return null
  const n = parseFloat(s.replace(",", "."))
  return Number.isFinite(n) ? n : NaN
}
const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","))
const measures = <K extends string>(m: Partial<Record<K, string>>) =>
  Object.fromEntries(Object.entries(m).flatMap(([k, v]) => (num(v as string) === null ? [] : [[k, num(v as string)]]))) as Partial<Record<K, number>>

function toInput(v: Draft): AssessmentInput {
  return {
    date: v.date,
    sex: v.sex,
    age: num(v.age),
    weightKg: num(v.weightKg),
    heightCm: num(v.heightCm),
    bodyFatPct: num(v.bodyFatPct),
    skinfolds: measures(v.skinfolds),
    circumferences: measures(v.circumferences),
    notes: v.notes,
  }
}

const today = () => new Date().toISOString().slice(0, 10)

/** Formulário de avaliação. Ao criar, reaproveita sexo, idade e altura da última avaliação do aluno. */
export function AssessmentFormModal({ open, onClose, studentId, studentName, editing, previous }: { open: boolean; onClose: () => void; studentId: string; studentName: string; editing?: Assessment; previous?: Assessment }) {
  return open ? <AssessmentForm onClose={onClose} studentId={studentId} studentName={studentName} editing={editing} previous={previous} /> : null
}

function AssessmentForm({ onClose, studentId, studentName, editing, previous }: { onClose: () => void; studentId: string; studentName: string; editing?: Assessment; previous?: Assessment }) {
  const toast = useToast()
  const src = editing ?? previous
  const [v, setV] = useState<Draft>({
    date: editing?.date ?? today(),
    sex: src?.sex ?? "F",
    age: str(src?.age),
    weightKg: str(editing?.weightKg),
    heightCm: str(src?.heightCm),
    bodyFatPct: str(editing?.bodyFatPct),
    notes: editing?.notes ?? "",
    skinfolds: Object.fromEntries(Object.entries(editing?.skinfolds ?? {}).map(([k, n]) => [k, str(n)])),
    circumferences: Object.fromEntries(Object.entries(editing?.circumferences ?? {}).map(([k, n]) => [k, str(n)])),
  })
  const [touched, setTouched] = useState(false)
  const input = toInput(v)
  const nanField = [input.age, input.weightKg, input.heightCm, input.bodyFatPct, ...Object.values(input.skinfolds), ...Object.values(input.circumferences)].some((n) => Number.isNaN(n))
  const errors = { ...validateAssessment(input), ...(nanField ? { measures: "Use apenas números (ex.: 72,5)." } : {}) }
  const show: Partial<Record<string, string>> = touched ? errors : {}
  const set = <K extends keyof Draft>(k: K, val: Draft[K]) => setV((p) => ({ ...p, [k]: val }))

  const preview: Assessment = { ...input, id: "preview", studentId, createdAt: "" }
  const fat = nanField ? null : bodyFat(preview)
  const imc = nanField ? null : bmi(preview)
  const rcq = nanField ? null : waistHip(preview)
  const p3 = new Set(PROTOCOL_SITES.pollock3[v.sex])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length) return
    update((d) => saveAssessment(d, studentId, input, editing?.id))
    toast(editing ? "Avaliação atualizada." : `Avaliação de ${studentName.split(" ")[0]} registrada.`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={editing ? "Editar avaliação" : "Nova avaliação"}
      description={`${studentName} · preencha só o que você mediu. Nada é estimado sem dado.`}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="assessment-form" className="btn btn-primary">
            {editing ? "Salvar alterações" : "Registrar avaliação"}
          </button>
        </>
      }
    >
      <form id="assessment-form" onSubmit={submit} noValidate className="space-y-6">
        <div className="evo-av-live" aria-live="polite">
          <div>
            <span>% de gordura</span>
            <strong className="tabular">{fat ? `${String(fat.pct).replace(".", ",")}%` : "—"}</strong>
            <small>{fat ? FAT_SOURCE_LABEL[fat.source] : "dobras completas + idade, ou valor informado"}</small>
          </div>
          <div>
            <span>IMC</span>
            <strong className="tabular">{imc ? String(imc).replace(".", ",") : "—"}</strong>
            <small>peso ÷ altura²</small>
          </div>
          <div>
            <span>Cintura/quadril</span>
            <strong className="tabular">{rcq ? String(rcq).replace(".", ",") : "—"}</strong>
            <small>RCQ</small>
          </div>
        </div>

        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <legend className="evo-av-legend">Dados gerais</legend>
          <Field label="Data" error={show.date} className="col-span-2 sm:col-span-1">
            {(p) => <input {...p} className="input" type="date" value={v.date} max={today()} onChange={(e) => set("date", e.target.value)} />}
          </Field>
          <div className="col-span-2 sm:col-span-1">
            <span className="field-label" id="sex-label">
              Sexo
            </span>
            <div className="flex gap-2" role="radiogroup" aria-labelledby="sex-label">
              {(["F", "M"] as const).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={v.sex === s} className="chip flex-1 justify-center" onClick={() => set("sex", s)}>
                  {s === "F" ? "Feminino" : "Masculino"}
                </button>
              ))}
            </div>
          </div>
          <Field label="Idade" error={show.age}>
            {(p) => <input {...p} className="input" inputMode="numeric" value={v.age} onChange={(e) => set("age", e.target.value)} placeholder="anos" />}
          </Field>
          <Field label="Peso (kg)" error={show.weightKg}>
            {(p) => <input {...p} className="input" inputMode="decimal" value={v.weightKg} onChange={(e) => set("weightKg", e.target.value)} placeholder="72,5" />}
          </Field>
          <Field label="Altura (cm)" error={show.heightCm}>
            {(p) => <input {...p} className="input" inputMode="decimal" value={v.heightCm} onChange={(e) => set("heightCm", e.target.value)} placeholder="168" />}
          </Field>
        </fieldset>

        <fieldset>
          <legend className="evo-av-legend">
            Dobras cutâneas <span>mm · destacadas: protocolo de 3 dobras para {v.sex === "F" ? "mulheres" : "homens"}</span>
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SKINFOLDS.map((k) => (
              <Field key={k} label={SKINFOLD_LABEL[k]}>
                {(p) => (
                  <input
                    {...p}
                    className={cx("input tabular", p3.has(k) && "evo-av-key")}
                    inputMode="decimal"
                    value={v.skinfolds[k] ?? ""}
                    onChange={(e) => set("skinfolds", { ...v.skinfolds, [k]: e.target.value })}
                  />
                )}
              </Field>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="evo-av-legend">
            Circunferências <span>cm</span>
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CIRCUMFERENCES.map((k) => (
              <Field key={k} label={CIRCUMFERENCE_LABEL[k]}>
                {(p) => (
                  <input {...p} className="input tabular" inputMode="decimal" value={v.circumferences[k] ?? ""} onChange={(e) => set("circumferences", { ...v.circumferences, [k]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <legend className="evo-av-legend">Outros</legend>
          <Field label="% de gordura informado" error={show.bodyFatPct} hint="Ex.: bioimpedância. Usado se as dobras estiverem incompletas.">
            {(p) => <input {...p} className="input" inputMode="decimal" value={v.bodyFatPct} onChange={(e) => set("bodyFatPct", e.target.value)} />}
          </Field>
          <Field label="Observações" error={show.notes}>
            {(p) => <textarea {...p} className="input" rows={3} maxLength={500} value={v.notes} onChange={(e) => set("notes", e.target.value)} />}
          </Field>
        </fieldset>

        {show.measures && (
          <p role="alert" className="field-error">
            {show.measures}
          </p>
        )}
      </form>
    </Modal>
  )
}
