import { describe, expect, it } from "vitest"
import { createSeed } from "@/lib/seed"
import { longestWeekStreak, medalsEarnedBy, medalsOf } from "@/lib/medals"
import type { Session } from "@/lib/types"

const NOW = new Date("2026-10-11T12:00:00")
const done = (studentId: string, iso: string, i: number): Session => ({
  id: `t${i}`, studentId, workoutId: "w", workoutName: "Treino", startedAt: iso, finishedAt: iso, status: "concluida", sets: [], note: "", checkin: null,
})

describe("medalhas", () => {
  it("bronze com 10 treinos e prata com 4 semanas seguidas", () => {
    const d = createSeed(NOW)
    const sid = d.students[0].id
    const base = { ...d, sessions: [] as Session[] }
    expect(medalsOf(base, sid, NOW).some((m) => m.earned)).toBe(false)
    const ten = Array.from({ length: 10 }, (_, i) => done(sid, new Date(NOW.getTime() - i * 7 * 86400000).toISOString(), i))
    const withTen = { ...d, sessions: ten }
    const m = medalsOf(withTen, sid, NOW)
    expect(m.find((x) => x.level === "bronze")?.earned).toBe(true)
    expect(longestWeekStreak(ten, NOW)).toBeGreaterThanOrEqual(4)
    expect(m.find((x) => x.level === "prata")?.earned).toBe(true)
    expect(m.find((x) => x.level === "absoluto")?.earned).toBe(false)
    // a 10ª sessão é a que dá o bronze
    const nine = { ...d, sessions: ten }
    expect(medalsEarnedBy(nine, ten[0], NOW).map((x) => x.level)).toContain("bronze")
  })
})
