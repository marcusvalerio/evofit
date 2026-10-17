import { describe, expect, it } from "vitest"
import { createSeed } from "@/lib/seed"
import { completed, previousSets } from "@/lib/metrics"

describe("coluna Anterior do treino", () => {
  it("traz carga × reps de cada série da última sessão com o exercício", () => {
    const d = createSeed()
    const done = completed(d).sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    const last = done.at(-1)!
    const set = last.sets.find((x) => x.done)!
    const prev = previousSets(d, last.studentId, set.exerciseId, "9999-01-01T00:00:00Z")
    expect(prev[set.setIndex]).toEqual({ load: set.load, reps: set.reps })
    // nada antes da primeira sessão
    expect(previousSets(d, last.studentId, set.exerciseId, "2000-01-01T00:00:00Z")).toEqual([])
  })
})
