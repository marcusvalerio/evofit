import { describe, expect, it } from "vitest"
import { parseMoney } from "@/lib/finance"

describe("valor em reais digitado de qualquer jeito", () => {
  it.each([
    ["350", 350],
    ["350,00", 350],
    ["R$ 300", 300],
    ["R$ 1.250,50", 1250.5],
    ["350.00", 350],
    ["1.250", 1250],
    ["99,9", 99.9],
  ])("%s → %d", (raw, n) => expect(parseMoney(raw)).toBe(n))

  it("vazio é null e texto é inválido", () => {
    expect(parseMoney("  ")).toBeNull()
    expect(parseMoney("abc")).toBeNaN()
  })
})
