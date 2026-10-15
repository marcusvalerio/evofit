"use client"
import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Pencil, Plus, Ruler, Trash2 } from "lucide-react"
import { update, useData } from "@/lib/store"
import { deleteAssessment } from "@/lib/actions"
import { assessmentsOf, bmi, bodyFat, composition, FAT_SOURCE_LABEL, sumSkinfolds, waistHip } from "@/lib/assessment"
import { CIRCUMFERENCE_LABEL, CIRCUMFERENCES, SKINFOLD_LABEL, SKINFOLDS, type Assessment } from "@/lib/types"
import { fmtIsoDay } from "@/lib/date"
import { LineChart } from "@/components/charts"
import { Avatar, ConfirmDialog, EmptyState, NotFoundState } from "@/components/ui"
import { AssessmentFormModal } from "@/components/assessment-form"
import { Delta, dec } from "@/components/assessment-ui"
import { useToast } from "@/components/providers"

type Row = { label: string; unit: string; get: (a: Assessment) => number | null }

const ROWS: Row[] = [
  { label: "Peso", unit: "kg", get: (a) => a.weightKg },
  { label: "% de gordura", unit: "%", get: (a) => bodyFat(a)?.pct ?? null },
  { label: "Massa magra", unit: "kg", get: (a) => composition(a)?.leanKg ?? null },
  { label: "Massa gorda", unit: "kg", get: (a) => composition(a)?.fatKg ?? null },
  { label: "IMC", unit: "", get: bmi },
  { label: "Cintura/quadril", unit: "", get: waistHip },
  { label: "Soma das dobras", unit: "mm", get: sumSkinfolds },
  ...SKINFOLDS.map((k): Row => ({ label: `Dobra ${SKINFOLD_LABEL[k].toLowerCase()}`, unit: "mm", get: (a) => a.skinfolds[k] ?? null })),
  ...CIRCUMFERENCES.map((k): Row => ({ label: CIRCUMFERENCE_LABEL[k], unit: "cm", get: (a) => a.circumferences[k] ?? null })),
]

const HEADLINE = ["Peso", "% de gordura", "Massa magra", "Cintura"]
const CHARTS = ["Peso", "% de gordura", "Massa magra", "Soma das dobras", "Cintura"]

export default function AvaliacaoAluno() {
  const { id } = useParams<{ id: string }>()
  const d = useData()
  const toast = useToast()
  const [form, setForm] = useState<{ editing?: Assessment } | null>(null)
  const [removing, setRemoving] = useState<Assessment | null>(null)
  const student = d.students.find((s) => s.id === id)
  const list = student ? assessmentsOf(d, student.id) : []
  const [fromId, setFromId] = useState<string>("")
  const [toId, setToId] = useState<string>("")

  if (!student)
    return (
      <NotFoundState title="Aluno não encontrado" href="/studio/avaliacoes" cta="Voltar para avaliações">
        Este aluno não existe ou o link está incorreto.
      </NotFoundState>
    )

  const last = list.at(-1)
  const prev = list.at(-2)
  const a = list.find((x) => x.id === fromId) ?? list[0]
  const b = list.find((x) => x.id === toId) ?? last
  const row = (label: string) => ROWS.find((r) => r.label === label)!
  const fat = last ? bodyFat(last) : null

  return (
    <div className="fade-in">
      <Link href="/studio/avaliacoes" className="btn btn-ghost btn-sm -ml-3 mb-4">
        <ArrowLeft size={16} aria-hidden /> Avaliações
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div className="min-w-0">
            <p className="t-eyebrow">Avaliação física</p>
            <h1 className="t-h1 truncate">{student.name}</h1>
            <p className="text-sm text-muted">
              {list.length ? `${list.length} ${list.length === 1 ? "avaliação" : "avaliações"} · primeira em ${fmtIsoDay(list[0].date)}` : "Nenhuma avaliação registrada"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/studio/alunos/${student.id}`} className="btn btn-outline">
            Ver aluno
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => setForm({})}>
            <Plus size={18} aria-hidden /> Nova avaliação
          </button>
        </div>
      </div>

      {!last ? (
        <EmptyState icon={Ruler} title="Comece pela primeira avaliação" action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({})}>Registrar avaliação</button>}>
          Registre peso, dobras e circunferências. A partir da segunda avaliação, o EVOFIT mostra a evolução de cada medida.
        </EmptyState>
      ) : (
        <>
          <section className="evo-av-hero ink" aria-label="Última avaliação">
            <div className="evo-av-hero-head">
              <div>
                <p className="evo-today-kicker">Última avaliação</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-tight">{fmtIsoDay(last.date)}</p>
              </div>
              {fat && <span className="badge">{FAT_SOURCE_LABEL[fat.source]}</span>}
            </div>
            <dl className="evo-av-tiles">
              {HEADLINE.map((label) => {
                const r = row(label)
                const v = r.get(last)
                const p = prev ? r.get(prev) : null
                return (
                  <div key={label} className="evo-av-tile">
                    <dt>{label}</dt>
                    <dd>
                      <strong className="tabular">{v === null ? "—" : dec(v)}</strong>
                      {v !== null && <span className="evo-av-unit">{r.unit}</span>}
                    </dd>
                    <dd className="evo-av-delta">{v !== null && p !== null ? <Delta value={v - p} unit={r.unit === "%" ? "pp" : r.unit} className="!ml-0 !text-on-ink-muted" /> : <span>{prev ? "não medido antes" : "primeira medição"}</span>}</dd>
                  </div>
                )
              })}
            </dl>
          </section>

          {list.length > 1 && (
            <section className="mt-6" aria-labelledby="evo-title">
              <h2 id="evo-title" className="t-h2">
                Evolução medida
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {CHARTS.map((label) => {
                  const r = row(label)
                  const points = list.flatMap((x) => {
                    const v = r.get(x)
                    return v === null ? [] : [{ date: `${x.date}T12:00:00`, value: v }]
                  })
                  if (points.length < 2) return null
                  return (
                    <div key={label} className="card p-4">
                      <LineChart title={label} unit={r.unit || "valor"} points={points} />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {list.length > 1 && a && b && (
            <section className="card mt-6 overflow-hidden" aria-labelledby="cmp-title">
              <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-end sm:justify-between">
                <h2 id="cmp-title" className="t-h2">
                  Comparativo
                </h2>
                <div className="flex items-center gap-2 text-sm">
                  <label className="sr-only" htmlFor="cmp-a">
                    Avaliação inicial
                  </label>
                  <select id="cmp-a" className="input !min-h-9 !py-1 text-sm" value={a.id} onChange={(e) => setFromId(e.target.value)}>
                    {list.map((x) => (
                      <option key={x.id} value={x.id}>
                        {fmtIsoDay(x.date)}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted">→</span>
                  <label className="sr-only" htmlFor="cmp-b">
                    Avaliação final
                  </label>
                  <select id="cmp-b" className="input !min-h-9 !py-1 text-sm" value={b.id} onChange={(e) => setToId(e.target.value)}>
                    {list.map((x) => (
                      <option key={x.id} value={x.id}>
                        {fmtIsoDay(x.date)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="evo-av-table">
                  <caption className="sr-only">
                    Comparativo entre {fmtIsoDay(a.date)} e {fmtIsoDay(b.date)}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Medida</th>
                      <th scope="col">{fmtIsoDay(a.date)}</th>
                      <th scope="col">{fmtIsoDay(b.date)}</th>
                      <th scope="col">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((r) => {
                      const va = r.get(a)
                      const vb = r.get(b)
                      if (va === null && vb === null) return null
                      return (
                        <tr key={r.label}>
                          <th scope="row">{r.label}</th>
                          <td>{va === null ? "—" : `${dec(va)} ${r.unit}`}</td>
                          <td>{vb === null ? "—" : `${dec(vb)} ${r.unit}`}</td>
                          <td>{va !== null && vb !== null ? <Delta value={vb - va} unit={r.unit === "%" ? "pp" : r.unit} className="!ml-0" /> : <span className="text-muted">—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mt-6" aria-labelledby="hist-title">
            <h2 id="hist-title" className="t-h2">
              Histórico
            </h2>
            <ul className="card mt-3 divide-y divide-line">
              {[...list].reverse().map((x) => {
                const f = bodyFat(x)
                return (
                  <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                    <span className="w-28 font-semibold tabular">{fmtIsoDay(x.date)}</span>
                    <span className="text-sm text-muted tabular">{x.weightKg ? `${dec(x.weightKg)} kg` : "sem peso"}</span>
                    <span className="text-sm text-muted tabular">{f ? `${dec(f.pct)}% gordura` : "sem % de gordura"}</span>
                    {x.notes && <span className="min-w-0 flex-1 truncate text-sm text-muted">{x.notes}</span>}
                    <span className="ml-auto flex">
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Editar avaliação de ${fmtIsoDay(x.date)}`} onClick={() => setForm({ editing: x })}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Excluir avaliação de ${fmtIsoDay(x.date)}`} onClick={() => setRemoving(x)}>
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      {form && <AssessmentFormModal open onClose={() => setForm(null)} studentId={student.id} studentName={student.name} editing={form.editing} previous={last} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Excluir avaliação?"
        message={removing ? `A avaliação de ${fmtIsoDay(removing.date)} sai do histórico e dos gráficos. Esta ação não pode ser desfeita.` : ""}
        confirmLabel="Excluir avaliação"
        danger
        onConfirm={() => {
          if (!removing) return
          update((x) => deleteAssessment(x, removing.id))
          toast("Avaliação excluída.")
        }}
      />
    </div>
  )
}
