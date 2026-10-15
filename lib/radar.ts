import type { DemoData, Student } from "./types"
import { DAY_MS, startOfDay } from "./date"
import { daysSinceLast, sessionsOf } from "./metrics"
import { feesForMonth, monthKey } from "./finance"

export type RiskLevel = "alto" | "medio" | "baixo"

export interface RiskRow {
  student: Student
  level: RiskLevel
  score: number
  /** Motivos legíveis, do mais forte ao mais fraco. */
  reasons: string[]
  daysSince: number | null
}

/**
 * Radar de evasão: soma sinais observados nos registros (nada de previsão opaca).
 * Cada sinal tem peso fixo e vira um motivo legível para o personal agir.
 */
export function churnRadar(d: DemoData, now = new Date()): RiskRow[] {
  const today = startOfDay(now)
  const fees = new Map(feesForMonth(d, monthKey(now), now).map((r) => [r.student.id, r]))
  return d.students
    .filter((s) => s.status === "ativo")
    .map((student) => {
      const signals: { w: number; text: string }[] = []
      const since = daysSinceLast(d, student.id, now)
      const gap = 7 / student.weeklyTarget
      if (since === null) signals.push({ w: 3, text: "ainda não registrou nenhum treino" })
      else if (since >= Math.max(7, gap * 3)) signals.push({ w: 3, text: `${since} dias sem treinar` })
      else if (since >= Math.max(4, gap * 2)) signals.push({ w: 2, text: `${since} dias sem treinar (meta de ${student.weeklyTarget}x/semana)` })

      const done = sessionsOf(d, student.id)
      const inWindow = (from: number, to: number) => done.filter((s) => {
        const t = new Date(s.startedAt).getTime()
        return t >= today.getTime() - from * DAY_MS && t < today.getTime() - to * DAY_MS + DAY_MS
      }).length
      const recent = inWindow(14, 0)
      const before = inWindow(42, 14) / 2 // média por quinzena nas 4 semanas anteriores
      if (before >= 2 && recent <= before * 0.5) signals.push({ w: 2, text: `frequência caiu ${Math.round((1 - recent / before) * 100)}% nas últimas 2 semanas` })

      const checkins = done.filter((s) => s.checkin).slice(-3).map((s) => s.checkin!)
      if (checkins.slice(-2).some((c) => c.pain === "forte")) signals.push({ w: 2, text: "relatou dor forte em treino recente" })
      else if (checkins.filter((c) => c.pain === "leve").length >= 2) signals.push({ w: 1, text: "relatou dor leve em treinos seguidos" })
      if (checkins.length >= 2 && checkins.slice(-2).every((c) => c.effort >= 9)) signals.push({ w: 1, text: "esforço no limite nos últimos treinos" })

      const fee = fees.get(student.id)
      if (fee?.status === "vencida") signals.push({ w: fee.overdueDays > 7 ? 2 : 1, text: `mensalidade vencida há ${fee.overdueDays} ${fee.overdueDays === 1 ? "dia" : "dias"}` })
      if (!d.workouts.some((w) => w.studentIds.includes(student.id))) signals.push({ w: 1, text: "sem ficha atribuída" })

      signals.sort((a, b) => b.w - a.w)
      const score = signals.reduce((a, x) => a + x.w, 0)
      const level: RiskLevel = score >= 5 ? "alto" : score >= 3 ? "medio" : "baixo"
      return { student, level, score, reasons: signals.map((x) => x.text), daysSince: since }
    })
    .sort((a, b) => b.score - a.score)
}

/** Soma das mensalidades de quem está em risco alto ou médio. */
export function revenueAtRisk(rows: RiskRow[]) {
  return rows.filter((r) => r.level !== "baixo").reduce((a, r) => a + (r.student.monthlyFee ?? 0), 0)
}
