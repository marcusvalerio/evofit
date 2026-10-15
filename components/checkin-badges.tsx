import type { Checkin } from "@/lib/types"

const PAIN = { nenhuma: "sem dor", leve: "dor leve", forte: "dor forte" } as const
const SLEEP = { ruim: "dormiu mal", ok: "sono ok", bom: "dormiu bem" } as const

/** Resumo do check-in pós-treino. Dor forte ganha destaque para o personal agir. */
export function CheckinBadges({ checkin }: { checkin: Checkin | null }) {
  if (!checkin) return null
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {checkin.effort !== null && <span className={`badge ${checkin.effort >= 9 ? "badge-warning" : ""}`}>esforço {checkin.effort}/10</span>}
      {checkin.pain && <span className={`badge ${checkin.pain === "forte" ? "badge-danger" : checkin.pain === "leve" ? "badge-warning" : ""}`}>{PAIN[checkin.pain]}</span>}
      {checkin.sleep && <span className="badge">{SLEEP[checkin.sleep]}</span>}
    </span>
  )
}
