import type { DemoData, Student } from "./types"
import { DAY_MS, daysInMonth, startOfDay } from "./date"

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })

export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number)
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1))
}

export type FeeStatus = "paga" | "a_vencer" | "vencida"

export interface FeeRow {
  student: Student
  amount: number
  due: Date
  status: FeeStatus
  /** Dias desde o vencimento (só quando vencida). */
  overdueDays: number
  paidAt: string | null
}

/** Situação das mensalidades de um mês para os alunos ativos com mensalidade definida. */
export function feesForMonth(d: DemoData, month: string, now = new Date()): FeeRow[] {
  const [y, m] = month.split("-").map(Number)
  const today = startOfDay(now)
  return d.students
    .filter((s) => s.status === "ativo" && s.monthlyFee !== null && s.dueDay !== null)
    .map((student) => {
      // Vencimento no dia 29–31 cai no último dia dos meses mais curtos.
      const due = new Date(y, m - 1, Math.min(student.dueDay!, daysInMonth(y, m)))
      const paid = d.payments.find((p) => p.studentId === student.id && p.month === month)
      const overdueDays = Math.floor((today.getTime() - due.getTime()) / DAY_MS)
      const status: FeeStatus = paid ? "paga" : overdueDays > 0 ? "vencida" : "a_vencer"
      return { student, amount: paid?.amount ?? student.monthlyFee!, due, status, overdueDays: status === "vencida" ? overdueDays : 0, paidAt: paid?.paidAt ?? null }
    })
    .sort((a, b) => order[a.status] - order[b.status] || b.overdueDays - a.overdueDays || a.due.getTime() - b.due.getTime())
}
const order: Record<FeeStatus, number> = { vencida: 0, a_vencer: 1, paga: 2 }

export function feeTotals(rows: FeeRow[]) {
  const sum = (s: FeeStatus) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.amount, 0)
  return { received: sum("paga"), pending: sum("a_vencer"), overdue: sum("vencida"), expected: rows.reduce((a, r) => a + r.amount, 0) }
}

/** Lembrete de mensalidade no tom do personal: gentil antes do vencimento, direto depois. */
export function feeMessage(row: FeeRow, trainerName: string, pixKey: string, month: string) {
  const first = row.student.name.split(" ")[0]
  const due = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(row.due)
  const lead =
    row.status === "vencida"
      ? `a mensalidade de ${monthLabel(month)} (${brl(row.amount)}) venceu em ${due}. Consegue acertar hoje?`
      : `passando para lembrar da mensalidade de ${monthLabel(month)} (${brl(row.amount)}), com vencimento em ${due}.`
  const pix = pixKey.trim() ? `\n\nChave Pix: ${pixKey.trim()}` : ""
  return `Oi, ${first}! Aqui é ${trainerName.split(" ")[0]}, ${lead}${pix}\n\nQualquer coisa, me chama. 💪`
}

/**
 * Lê um valor em reais digitado de qualquer jeito: "350", "350,00", "R$ 1.250,50", "350.00".
 * Vírgula é sempre o decimal; sem vírgula, um ponto seguido de 1–2 dígitos no fim também é.
 * Retorna null para vazio e NaN para algo que não é número.
 */
export function parseMoney(raw: string): number | null {
  const t = raw.replace(/[^\d.,]/g, "")
  if (!raw.trim()) return null
  if (!t) return NaN
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /\.\d{1,2}$/.test(t) ? t.replace(/\.(?=.*\.)/g, "") : t.replace(/\./g, "")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}
