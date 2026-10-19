import { describe, expect, it } from "vitest"
import { addMonthsIso, daysInMonth, isValidIsoDay } from "@/lib/date"
import { daysToChange, validateWorkout, withStartDate } from "@/lib/actions"
import { feesForMonth } from "@/lib/finance"
import { createSeed } from "@/lib/seed"

describe("datas que respeitam o mês", () => {
  it("sabe quantos dias tem cada mês, inclusive fevereiro bissexto", () => {
    expect([1, 2, 4, 11, 12].map((m) => daysInMonth(2026, m))).toEqual([31, 28, 30, 30, 31])
    expect(daysInMonth(2028, 2)).toBe(29)
  })

  it("valida dias que existem no calendário", () => {
    expect(isValidIsoDay("2026-11-29")).toBe(true)
    expect(isValidIsoDay("2026-10-31")).toBe(true)
    expect(isValidIsoDay("2026-11-31")).toBe(false)
    expect(isValidIsoDay("2027-02-29")).toBe(false)
    expect(isValidIsoDay("2028-02-29")).toBe(true)
  })

  it("soma 3 meses caindo no último dia quando o mês de destino é menor", () => {
    expect(addMonthsIso("2026-10-19", 3)).toBe("2027-01-19")
    expect(addMonthsIso("2026-11-30", 3)).toBe("2027-02-28")
    expect(addMonthsIso("2027-11-30", 3)).toBe("2028-02-29")
    expect(addMonthsIso("2026-05-31", 1)).toBe("2026-06-30")
    expect(addMonthsIso("2026-12-15", 3)).toBe("2027-03-15")
  })
})

describe("início e troca da ficha", () => {
  it("sugere a troca para 3 meses depois e acompanha mudanças do início", () => {
    let w = withStartDate({ startDate: null, changeDate: null }, "2026-10-19")
    expect(w.changeDate).toBe("2027-01-19")
    w = withStartDate(w, "2026-11-29")
    expect(w.changeDate).toBe("2027-02-28")
  })

  it("mantém a troca editada à mão", () => {
    const w = withStartDate({ startDate: "2026-10-19", changeDate: "2026-12-01" }, "2026-10-20")
    expect(w.changeDate).toBe("2026-12-01")
  })

  it("rejeita troca antes do início e datas inexistentes", () => {
    const base = { name: "Ficha A", items: [] }
    expect(validateWorkout({ ...base, startDate: "2026-10-19", changeDate: "2026-10-01" }).changeDate).toBeTruthy()
    expect(validateWorkout({ ...base, startDate: "2026-02-30", changeDate: null }).startDate).toBeTruthy()
  })

  it("conta os dias até a troca", () => {
    const now = new Date(2026, 9, 19, 15)
    expect(daysToChange({ changeDate: "2026-10-29" }, now)).toBe(10)
    expect(daysToChange({ changeDate: "2026-10-17" }, now)).toBe(-2)
    expect(daysToChange({ changeDate: null }, now)).toBeNull()
  })
})

describe("vencimento da mensalidade de 1 a 31", () => {
  it("dia 31 vence no último dia de fevereiro e de novembro", () => {
    const d0 = createSeed(new Date(2026, 0, 1))
    const d = { ...d0, students: d0.students.map((s, i) => (i === 0 ? { ...s, dueDay: 31 } : s)) }
    const id = d.students[0].id
    const due = (m: string) => feesForMonth(d, m, new Date(2026, 0, 1)).find((r) => r.student.id === id)!.due
    expect(due("2026-02").getDate()).toBe(28)
    expect(due("2026-11").getDate()).toBe(30)
    expect(due("2026-10").getDate()).toBe(31)
  })
})
