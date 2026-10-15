"use client"
import type { Session } from "@/lib/types"
import { durationMin, fmtDate, fmtTime } from "@/lib/date"
import { sessionProgress, sessionVolume } from "@/lib/metrics"
import { ChevronDown } from "lucide-react"
import { CheckinBadges } from "./checkin-badges"

/** Lista de sessões concluídas, com detalhamento por exercício. */
export function SessionList({ sessions, limit = 20 }: { sessions: Session[]; limit?: number }) {
  const list = [...sessions].reverse().slice(0, limit)
  return (
    <ul className="divide-y divide-line">
      {list.map((s) => {
        const p = sessionProgress(s)
        const vol = sessionVolume(s)
        const byItem = new Map<string, { name: string; sets: Session["sets"] }>()
        for (const x of s.sets) {
          const g = byItem.get(x.itemId) ?? { name: x.exerciseName, sets: [] }
          g.sets.push(x)
          byItem.set(x.itemId, g)
        }
        return (
          <li key={s.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg py-3 [&::-webkit-details-marker]:hidden">
                <div className="grid w-12 shrink-0 place-items-center rounded-xl bg-surface-2 py-1.5 text-center leading-tight">
                  <span className="text-[0.6875rem] uppercase text-muted">{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(s.startedAt)).replace(".", "")}</span>
                  <span className="text-lg font-bold tabular">{new Date(s.startedAt).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.workoutName}</p>
                  <p className="text-sm text-muted tabular">
                    {fmtTime(s.startedAt)} · {durationMin(s.startedAt, s.finishedAt)} min · {p.done}/{p.total} séries
                    {vol > 0 && ` · ${Math.round(vol).toLocaleString("pt-BR")} kg de volume`}
                  </p>
                  {s.checkin && (
                    <p className="mt-1">
                      <CheckinBadges checkin={s.checkin} />
                    </p>
                  )}
                </div>
                <ChevronDown size={18} aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="mb-3 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[20rem] text-left text-sm">
                  <caption className="sr-only">Séries registradas em {fmtDate(s.startedAt)}</caption>
                  <thead className="bg-surface-2 text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Exercício
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Séries (reps × kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...byItem.values()].map((g, i) => (
                      <tr key={i} className="border-t border-line align-top">
                        <td className="px-3 py-2 font-medium">{g.name}</td>
                        <td className="px-3 py-2 tabular text-muted">
                          {g.sets
                            .map((x) => (x.done ? `${x.reps ?? "—"}${x.load !== null ? ` × ${x.load}` : ""}` : "não feita"))
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {s.note && <p className="border-t border-line px-3 py-2 text-sm">“{s.note}”</p>}
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )
}
