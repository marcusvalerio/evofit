"use client"
import { useState } from "react"
import Link from "next/link"
import { History } from "lucide-react"
import { useActiveStudent } from "@/lib/use-student"
import { loadProgression, sessionsOf, trackedExercises, weekCount, weeklySeries } from "@/lib/metrics"
import { fmtDate, fmtDayMonth } from "@/lib/date"
import { BarChart, LineChart } from "@/components/charts"
import { SessionList } from "@/components/session-list"
import { EmptyState, Field } from "@/components/ui"

export default function HistoricoPage() {
  const { d, student } = useActiveStudent()
  const [exerciseId, setExerciseId] = useState("")
  if (!student) {
    return (
      <EmptyState icon={History} title="Escolha um aluno" action={<Link href="/aluno" className="btn btn-primary btn-sm">Escolher aluno</Link>}>
        Selecione um aluno de demonstração para ver o histórico.
      </EmptyState>
    )
  }
  const history = sessionsOf(d, student.id)
  const series = weeklySeries(history, 8)
  const tracked = trackedExercises(d, student.id)
  const chosen = tracked.some((t) => t.id === exerciseId) ? exerciseId : tracked[0]?.id
  const wk = weekCount(d, student.id)
  const active = series.filter((w) => w.count >= student.weeklyTarget).length
  const progression = chosen ? loadProgression(d, student.id, chosen) : []
  const lastLoads = progression.slice(-2)
  const loadInsight = lastLoads.length < 2
    ? "Registre este exercício em mais sessões para identificar uma tendência de carga."
    : lastLoads[1].value > lastLoads[0].value
      ? `A carga registrada subiu de ${lastLoads[0].value} kg para ${lastLoads[1].value} kg na última sessão.`
      : lastLoads[1].value < lastLoads[0].value
        ? `A última carga registrada foi de ${lastLoads[1].value} kg, abaixo dos ${lastLoads[0].value} kg anteriores. Considere o contexto do treino antes de ajustar o plano.`
        : `A carga registrada se manteve em ${lastLoads[1].value} kg nas duas últimas sessões.`
  const weekInsight = wk >= student.weeklyTarget
    ? "Meta semanal alcançada. Mantenha a consistência."
    : wk === 0
      ? "Nenhuma sessão concluída nesta semana. Escolha um treino e retome no seu ritmo."
      : `Você concluiu ${wk} de ${student.weeklyTarget} treinos previstos nesta semana.`

  return (
    <div className="fade-in">
      <h1 className="t-h1">Histórico</h1>
      <p className="mt-1 text-muted">Sessões concluídas e sua evolução.</p>

      <dl className="stagger mt-5 grid grid-cols-3 gap-2">
        {[
          { l: "Total", v: String(history.length) },
          { l: "Semana", v: `${wk}/${student.weeklyTarget}` },
          { l: "Metas batidas", v: `${active}/8 sem.` },
        ].map((x) => (
          <div key={x.l} className="card px-3 py-3">
            <dt className="text-xs text-muted">{x.l}</dt>
            <dd className="mt-1 text-xl font-bold tabular">{x.v}</dd>
          </div>
        ))}
      </dl>

      <section className="card mt-4 p-4" aria-labelledby="evo-insight">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><History size={19} aria-hidden /></div>
          <div className="min-w-0 flex-1">
            <h2 id="evo-insight" className="t-h2">Leitura da sua evolução</h2>
            <p className="mt-1 text-sm text-muted">{weekInsight}</p>
            {tracked.length > 0 && <p className="mt-2 text-sm leading-relaxed">{loadInsight}</p>}
          </div>
        </div>
      </section>

      {history.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={History} title="Nenhum treino concluído ainda" action={<Link href="/aluno" className="btn btn-primary btn-sm">Ver treinos</Link>}>
            Conclua um treino para ele aparecer aqui.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="card mt-4 p-4" aria-labelledby="freq">
            <h2 id="freq" className="t-h2 mb-4">
              Frequência
            </h2>
            <BarChart
              title="Treinos por semana"
              unit="treinos"
              data={series.map((w, i) => ({ label: i === series.length - 1 ? "Atual" : fmtDayMonth(w.start.toISOString()), value: w.count, detail: `Semana de ${fmtDate(w.start.toISOString())}` }))}
            />
          </section>

          {tracked.length > 0 && (
            <section className="card mt-4 p-4" aria-labelledby="carga">
              <h2 id="carga" className="t-h2 mb-3">
                Evolução de carga
              </h2>
              <Field label="Exercício" className="mb-3">
                {(p) => (
                  <select {...p} className="input" value={chosen} onChange={(e) => setExerciseId(e.target.value)}>
                    {tracked.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              {chosen && <LineChart title="Maior carga por sessão" unit="kg" points={progression} />}
            </section>
          )}

          <section className="card mt-4 p-4" aria-labelledby="sessoes">
            <h2 id="sessoes" className="t-h2">
              Sessões
            </h2>
            <SessionList sessions={history} limit={30} />
          </section>
        </>
      )}
    </div>
  )
}
