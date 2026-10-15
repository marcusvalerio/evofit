"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Plus, Ruler } from "lucide-react"
import { useData } from "@/lib/store"
import { assessmentsOf, bodyFat } from "@/lib/assessment"
import { fmtIsoDay, daysSinceIso } from "@/lib/date"
import { Avatar, EmptyState, PageHeader, cx } from "@/components/ui"
import { AssessmentFormModal } from "@/components/assessment-form"
import { Delta, dec } from "@/components/assessment-ui"

export default function Avaliacoes() {
  const d = useData()
  const [creating, setCreating] = useState<string | null>(null)
  const active = d.students.filter((s) => s.status === "ativo")
  const rows = active
    .map((s) => {
      const list = assessmentsOf(d, s.id)
      return { s, list, last: list.at(-1), prev: list.at(-2) }
    })
    // quem nunca foi avaliado ou está há mais tempo sem avaliação aparece primeiro
    .sort((a, b) => (a.last?.date ?? "").localeCompare(b.last?.date ?? ""))
  const due = rows.filter((r) => !r.last || daysSinceIso(r.last.date) > 45).length
  const target = creating ? active.find((s) => s.id === creating) : undefined

  return (
    <div className="fade-in">
      <PageHeader
        title="Avaliações"
        description="Antropometria, dobras cutâneas e circunferências. A evolução aparece só a partir do que foi medido."
      />

      {due > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          <Ruler size={16} aria-hidden /> {due === 1 ? "1 aluno sem avaliação" : `${due} alunos sem avaliação`} há mais de 45 dias.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={Ruler} title="Nenhum aluno ativo">
          Cadastre alunos para registrar avaliações.
        </EmptyState>
      ) : (
        <ul className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ s, list, last, prev }) => {
            const fat = last ? bodyFat(last) : null
            const prevFat = prev ? bodyFat(prev) : null
            const stale = !last || daysSinceIso(last.date) > 45
            return (
              <li key={s.id} className="card lift flex flex-col p-4">
                <Link href={`/studio/avaliacoes/${s.id}`} className="flex items-center gap-3">
                  <Avatar name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className={cx("block text-sm", stale ? "text-warning" : "text-muted")}>
                      {last ? `Última: ${fmtIsoDay(last.date)} · ${list.length} ${list.length === 1 ? "avaliação" : "avaliações"}` : "Nunca avaliado"}
                    </span>
                  </span>
                  <ArrowRight size={18} aria-hidden className="text-muted" />
                </Link>
                {last && (
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Peso</dt>
                      <dd className="font-semibold tabular">{last.weightKg ? `${dec(last.weightKg)} kg` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">% gordura</dt>
                      <dd className="font-semibold tabular">
                        {fat ? `${dec(fat.pct)}%` : "—"}
                        {fat && prevFat && <Delta value={fat.pct - prevFat.pct} unit="pp" />}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Cintura</dt>
                      <dd className="font-semibold tabular">{last.circumferences.cintura ? `${dec(last.circumferences.cintura)} cm` : "—"}</dd>
                    </div>
                  </dl>
                )}
                <button type="button" className="btn btn-outline btn-sm mt-4 self-start" onClick={() => setCreating(s.id)}>
                  <Plus size={16} aria-hidden /> Nova avaliação
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {target && (
        <AssessmentFormModal open onClose={() => setCreating(null)} studentId={target.id} studentName={target.name} previous={assessmentsOf(d, target.id).at(-1)} />
      )}
    </div>
  )
}
