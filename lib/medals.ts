import type { DemoData, Session } from "./types"
import { personalRecords, sessionsOf, weeklySeries } from "./metrics"

export type MedalLevel = "bronze" | "prata" | "ouro" | "absoluto"
export interface Medal {
  level: MedalLevel
  title: string
  rule: string
  earned: boolean
}

export const MEDAL_RULES: { level: MedalLevel; title: string; rule: string }[] = [
  { level: "bronze", title: "Bronze", rule: "10 treinos" },
  { level: "prata", title: "Prata", rule: "4 semanas seguidas" },
  { level: "ouro", title: "Ouro", rule: "Recorde pessoal" },
  { level: "absoluto", title: "Absoluto", rule: "100 treinos" },
]

/** Maior sequência de semanas seguidas com pelo menos um treino concluído. */
export function longestWeekStreak(sessions: Session[], now = new Date()) {
  const weeks = weeklySeries(sessions, 104, now)
  let best = 0
  let cur = 0
  for (const w of weeks) {
    cur = w.count > 0 ? cur + 1 : 0
    best = Math.max(best, cur)
  }
  return best
}

/** Medalhas do aluno, calculadas a partir das sessões concluídas (nada novo é guardado). */
export function medalsOf(d: DemoData, studentId: string, now = new Date()): Medal[] {
  const list = sessionsOf(d, studentId)
  const earned: Record<MedalLevel, boolean> = {
    bronze: list.length >= 10,
    prata: longestWeekStreak(list, now) >= 4,
    ouro: list.some((s) => personalRecords(d, s).length > 0),
    absoluto: list.length >= 100,
  }
  return MEDAL_RULES.map((r) => ({ ...r, earned: earned[r.level] }))
}

/** Medalhas que passaram a valer com esta sessão (para o momento de ganhar no fim do treino). */
export function medalsEarnedBy(d: DemoData, session: Session, now = new Date()): Medal[] {
  const without: DemoData = { ...d, sessions: d.sessions.filter((s) => s.id !== session.id) }
  const before = medalsOf(without, session.studentId, now)
  return medalsOf(d, session.studentId, now).filter((m, i) => m.earned && !before[i].earned)
}
