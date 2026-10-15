import { describe, expect, it } from "vitest"
import { createSeed } from "@/lib/seed"
import { feeMessage, feesForMonth, feeTotals, monthKey } from "@/lib/finance"
import { churnRadar, revenueAtRisk } from "@/lib/radar"
import { markPaid } from "@/lib/actions"

const now = new Date(2026, 9, 15, 12) // 15/10/2026
const d0 = createSeed(now)

describe("mensalidades", () => {
  it("classifica paga, a vencer e vencida no mês", () => {
    const rows = feesForMonth(d0, monthKey(now), now)
    const by = new Map(rows.map((r) => [r.student.id, r]))
    expect(by.get("al-ana")?.status).toBe("paga")
    expect(by.get("al-diego")).toMatchObject({ status: "vencida", overdueDays: 10 }) // vence dia 5
    expect(by.get("al-carla")?.status).toBe("a_vencer") // vence hoje, dia 15
    expect(by.get("al-elisa")?.status).toBe("a_vencer") // vence dia 20
    expect(by.has("al-fabio")).toBe(false) // arquivado
    expect(rows[0].student.id).toBe("al-diego") // vencidas primeiro
    const t = feeTotals(rows)
    expect(t).toEqual({ received: 830, pending: 600, overdue: 300, expected: 1730 })
  })

  it("marcar como paga muda a situação e a mensagem leva o Pix do personal", () => {
    const d = markPaid(d0, "al-diego", monthKey(now), 300)
    expect(feesForMonth(d, monthKey(now), now).find((r) => r.student.id === "al-diego")?.status).toBe("paga")
    const row = feesForMonth(d0, monthKey(now), now).find((r) => r.student.id === "al-diego")!
    const msg = feeMessage(row, "Camila Rocha", "camila@pix.com", monthKey(now))
    expect(msg).toContain("Oi, Diego!")
    expect(msg).toContain("venceu em 05/10")
    expect(msg).toContain("Chave Pix: camila@pix.com")
    expect(feeMessage(row, "Camila Rocha", "", monthKey(now))).not.toContain("Pix")
  })
})

describe("radar de evasão", () => {
  it("explica o risco com sinais dos registros e soma a receita em risco", () => {
    const rows = churnRadar(d0, now)
    const diego = rows.find((r) => r.student.id === "al-diego")!
    expect(diego.level).toBe("alto")
    expect(diego.reasons[0]).toMatch(/dias sem treinar/)
    expect(diego.reasons.join(" ")).toMatch(/mensalidade vencida há 10 dias/)
    const carla = rows.find((r) => r.student.id === "al-carla")!
    expect(carla.reasons.join(" ")).toMatch(/dor forte/)
    const ana = rows.find((r) => r.student.id === "al-ana")!
    expect(ana.level).toBe("baixo")
    expect(rows[0].score).toBeGreaterThanOrEqual(rows[rows.length - 1].score)
    expect(revenueAtRisk(rows)).toBe(rows.filter((r) => r.level !== "baixo").reduce((a, r) => a + (r.student.monthlyFee ?? 0), 0))
    expect(revenueAtRisk(rows)).toBeGreaterThan(0)
  })

  it("aluno sem nenhum treino e sem ficha aparece com os dois motivos", () => {
    const d = { ...d0, students: [...d0.students, { ...d0.students[0], id: "al-novo", name: "Novo Aluno", monthlyFee: null, dueDay: null }] }
    const r = churnRadar(d, now).find((x) => x.student.id === "al-novo")!
    expect(r.reasons).toEqual(["ainda não registrou nenhum treino", "sem ficha atribuída"])
    expect(r.level).toBe("medio")
  })
})
