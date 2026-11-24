import { describe, expect, it } from "vitest"
import { createSeed } from "@/lib/seed"
import { completed, personalRecords } from "@/lib/metrics"
import {
  SAFE,
  availableTemplates,
  buildStoryData,
  exerciseLine,
  formatKg,
  formatNumber,
  formatShortDate,
  repsLabel,
  storyAlt,
  storyLayout,
  type StoryExercise,
  type StoryTemplate,
} from "@/lib/story-card"

const ex = (n: number): StoryExercise[] => Array.from({ length: n }, (_, i) => ({ name: `Ex ${i}`, sets: 3, reps: "10", load: 20, record: false }))

describe("formatação do cartão", () => {
  it("volume e cargas no formato brasileiro", () => {
    expect(formatKg(8420)).toBe("8.420 kg")
    expect(formatKg(8419.6, true)).toBe("8.420 kg")
    expect(formatKg(1234567)).toBe("1.234.567 kg")
    expect(formatKg(22.5)).toBe("22,5 kg")
    expect(formatKg(70)).toBe("70 kg")
    expect(formatNumber(999)).toBe("999")
  })
  it("repetições e linha do exercício", () => {
    expect(repsLabel([10, 10, 10])).toBe("10")
    expect(repsLabel([8, null, 10])).toBe("8–10")
    expect(repsLabel([null])).toBe("")
    expect(exerciseLine({ sets: 4, reps: "10", load: 62 })).toBe("4×10  62 kg")
    expect(exerciseLine({ sets: 3, reps: "", load: null })).toBe("3 séries")
    expect(exerciseLine({ sets: 1, reps: "", load: null })).toBe("1 série")
  })
  it("data curta", () => {
    expect(formatShortDate("2026-11-24T15:00:00")).toBe("24 nov")
  })
})

describe("modelos disponíveis", () => {
  it("Recorde só com recorde pessoal", () => {
    expect(availableTemplates({ record: null })).toEqual(["vidro", "ficha"])
    expect(availableTemplates({ record: { exerciseName: "Supino", load: 60, previous: 55, reps: 8 } })).toEqual(["vidro", "recorde", "ficha"])
  })
})

describe("layout dentro da área segura", () => {
  const all: StoryTemplate[] = ["vidro", "recorde", "ficha"]
  for (const t of all)
    it(`${t} fica entre ${SAFE.top} e ${SAFE.bottom} com 0 a 30 exercícios`, () => {
      for (let n = 0; n <= 30; n++) {
        const l = storyLayout(t, { exercises: ex(n) })
        expect(l.top).toBeGreaterThanOrEqual(SAFE.top)
        expect(l.bottom).toBeLessThanOrEqual(SAFE.bottom)
        expect(l.card.y + l.card.h).toBeLessThanOrEqual(SAFE.bottom)
      }
    })
  it("Ficha resume os exercícios que não cabem", () => {
    const l = storyLayout("ficha", { exercises: ex(20) })
    expect(l.rows + l.more).toBe(20)
    expect(l.more).toBeGreaterThan(0)
    expect(storyLayout("ficha", { exercises: ex(4) })).toMatchObject({ rows: 4, more: 0 })
  })
})

describe("dados reais da sessão", () => {
  it("monta exercícios, volume, músculos e recorde a partir da sessão", () => {
    const d = createSeed()
    const s = completed(d).find((x) => personalRecords(d, x).length > 0) ?? completed(d)[0]
    const recs = personalRecords(d, s)
    const data = buildStoryData(d, s, recs)
    const done = s.sets.filter((x) => x.done)
    expect(data.setsDone).toBe(done.length)
    expect(data.exercises.reduce((a, e) => a + e.sets, 0)).toBe(done.length)
    expect(data.record !== null).toBe(recs.length > 0)
    expect(data.muscles.length).toBeGreaterThan(0)
    expect(storyAlt("vidro", data)).toContain(s.workoutName)
    expect(storyAlt("ficha", data)).toContain(data.exercises[0].name)
    if (data.record) expect(storyAlt("recorde", data)).toContain(formatKg(data.record.load))
  })
})
