import { describe, expect, it } from "vitest"
import { cleanGroups, linkWithNext, supersets, unlinkFromNext } from "@/lib/superset"
import type { WorkoutItem } from "@/lib/types"

const item = (id: string, group: string | null = null): WorkoutItem => ({ id, exerciseId: id, sets: 3, reps: "10", load: null, restSec: 60, notes: "", group })
const groups = (items: WorkoutItem[]) => items.map((i) => i.group ?? "-").join(" ")

describe("conjugados", () => {
  it("agrupa exercícios consecutivos e nomeia A, B…", () => {
    const s = supersets([item("a", "x"), item("b", "x"), item("c"), item("d", "y"), item("e", "y"), item("f", "y")])
    expect(s.get("a")).toMatchObject({ letter: "A", position: 1, size: 2, isLast: false, nextId: "b" })
    expect(s.get("b")).toMatchObject({ letter: "A", isLast: true, nextId: null })
    expect(s.has("c")).toBe(false)
    expect(s.get("f")).toMatchObject({ letter: "B", position: 3, size: 3, isLast: true })
  })

  it("grupo de um exercício só não é conjugado", () => {
    expect(supersets([item("a", "x"), item("b")]).size).toBe(0)
    expect(groups(cleanGroups([item("a", "x"), item("b")]))).toBe("- -")
  })

  it("conjuga em sequência formando tri-set e separa mantendo o resto", () => {
    let it3 = linkWithNext([item("a"), item("b"), item("c")], 0, "g1")
    it3 = linkWithNext(it3, 1, "g2")
    expect(supersets(it3).get("c")).toMatchObject({ size: 3, position: 3 })
    const split = unlinkFromNext(it3, 1, "g3")
    expect(supersets(split).get("b")).toMatchObject({ size: 2, isLast: true })
    expect(supersets(split).has("c")).toBe(false)
  })

  it("ligar dois conjugados vizinhos une os dois", () => {
    const items = [item("a", "x"), item("b", "x"), item("c", "y"), item("d", "y")]
    expect(supersets(linkWithNext(items, 1, "z")).get("d")).toMatchObject({ size: 4 })
  })
})
