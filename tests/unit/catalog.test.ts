import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { CATALOG, CATALOG_GROUPS, allExercises, filterExercises, getExercise, isCatalogId } from "@/lib/catalog"
import { createSeed, DATA_VERSION, LEGACY_EXERCISE_IDS } from "@/lib/seed"
import { migrate } from "@/lib/migrate"
import { isDemoData } from "@/lib/validate"
import { parseVideoUrl, validateVideoUrl } from "@/lib/video"
import * as A from "@/lib/actions"

const NOW = new Date("2026-10-11T12:00:00")
const pub = (p: string) => path.join(process.cwd(), "public", p)

describe("catálogo de exercícios", () => {
  it("tem centenas de exercícios com ids únicos e nomes em português", () => {
    expect(CATALOG.length).toBeGreaterThan(800)
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length)
    expect(CATALOG.every((e) => e.name.trim().length > 1 && e.primary.length > 0 && e.group)).toBe(true)
    expect(CATALOG_GROUPS).toContain("Peito")
  })

  it("todo exercício tem passo a passo e as imagens declaradas existem", () => {
    for (const e of CATALOG) {
      const detail = JSON.parse(fs.readFileSync(pub(`exercises/data/${e.id}.json`), "utf8"))
      expect(detail.steps.length, e.id).toBeGreaterThan(0)
      for (let i = 0; i < e.frames; i++) expect(fs.existsSync(pub(`exercises/img/${e.id}-${i}.webp`)), `${e.id}-${i}`).toBe(true)
    }
    expect(CATALOG.filter((e) => e.frames === 2).length / CATALOG.length).toBeGreaterThan(0.99)
  })

  it("busca ignora acentos e aceita o nome em inglês", () => {
    expect(filterExercises(CATALOG, { q: "triceps corda" }).some((e) => e.id === "Triceps_Pushdown_-_Rope_Attachment")).toBe(true)
    expect(filterExercises(CATALOG, { q: "squat" }).some((e) => e.id === "Barbell_Squat")).toBe(true)
    const peito = filterExercises(CATALOG, { group: "Peito", equipment: "Halteres" })
    expect(peito.length).toBeGreaterThan(5)
    expect(peito.every((e) => e.primary.includes("Peito") && e.equipment === "Halteres")).toBe(true)
  })

  it("exercícios próprios aparecem junto com o catálogo", () => {
    const d = A.addExercise(createSeed(NOW), { name: "Remada cavalinho", muscleGroup: "Costas", equipment: "Barra T", instructions: "Passo um.\nPasso dois." }, "ex-own")
    expect(getExercise(d, "ex-own")).toMatchObject({ name: "Remada cavalinho", custom: true, frames: 0 })
    expect(allExercises(d)[0].id).toBe("ex-own")
  })

  it("a demonstração só usa exercícios existentes", () => {
    const d = createSeed(NOW)
    for (const w of d.workouts) for (const i of w.items) expect(isCatalogId(i.exerciseId), i.exerciseId).toBe(true)
    for (const id of Object.values(LEGACY_EXERCISE_IDS)) expect(isCatalogId(id), id).toBe(true)
    for (const id of Object.keys(d.exerciseMedia)) expect(isCatalogId(id)).toBe(true)
  })
})

describe("migração v1 → v2", () => {
  /** Monta dados no formato antigo a partir da demonstração atual. */
  function legacy() {
    const reverse = Object.fromEntries(Object.entries(LEGACY_EXERCISE_IDS).map(([a, b]) => [b, a]))
    const d = createSeed(NOW)
    const workouts = d.workouts.map((w) => ({ ...w, items: w.items.map((i) => ({ ...i, exerciseId: reverse[i.exerciseId] })) }))
    workouts[0].items.push({ id: "z1", exerciseId: "ex-burpee", sets: 3, reps: "10", load: null, restSec: 30, notes: "" })
    workouts[0].items.push({ id: "z2", exerciseId: "ex-meu", sets: 3, reps: "10", load: null, restSec: 30, notes: "" })
    const sessions = d.sessions.map((s) => ({ ...s, sets: s.sets.map((x) => ({ ...x, exerciseId: reverse[x.exerciseId] })) }))
    const { exerciseMedia: _drop, ...rest } = d
    void _drop
    return {
      ...rest,
      version: 1,
      workouts,
      sessions,
      exercises: [
        { id: "ex-supino-reto", name: "Supino reto com barra", muscleGroup: "Peito", equipment: "Barra", instructions: "", custom: false },
        { id: "ex-burpee", name: "Burpee", muscleGroup: "Corpo inteiro", equipment: "", instructions: "", custom: false },
        { id: "ex-meu", name: "Meu exercício", muscleGroup: "Core", equipment: "", instructions: "x", custom: true },
      ],
    }
  }

  it("preserva fichas, histórico e exercícios próprios", () => {
    const old = legacy()
    expect(isDemoData(old)).toBe(false)
    const m = migrate(JSON.parse(JSON.stringify(old)))
    expect(m).not.toBeNull()
    expect(m!.version).toBe(DATA_VERSION)
    expect(m!.sessions.length).toBe(old.sessions.length)
    const ids = m!.workouts[0].items.map((i) => i.exerciseId)
    expect(ids[0]).toBe("Barbell_Bench_Press_-_Medium_Grip")
    expect(ids).toContain("ex-burpee")
    expect(ids).toContain("ex-meu")
    expect(m!.exercises.map((e) => e.id).sort()).toEqual(["ex-burpee", "ex-meu"])
    expect(m!.sessions.flatMap((s) => s.sets).every((x) => isCatalogId(x.exerciseId))).toBe(true)
    expect(m!.exerciseMedia).toEqual({})
  })

  it("rejeita lixo e mantém dados atuais intactos", () => {
    expect(migrate(null)).toBeNull()
    expect(migrate({ version: 1 })).toBeNull()
    expect(migrate({ version: 99 })).toBeNull()
    const cur = createSeed(NOW)
    expect(migrate(cur)).toBe(cur)
  })
})

describe("links de vídeo do personal", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "youtube"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "youtube"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x", "youtube"],
    ["https://vimeo.com/123456789", "vimeo"],
    ["https://vimeo.com/123456789/abcdef1234", "vimeo"],
    ["https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing", "drive"],
    ["https://cdn.exemplo.com.br/videos/agachamento.mp4", "file"],
  ])("aceita %s", (url, kind) => {
    expect(parseVideoUrl(url)?.kind).toBe(kind)
    expect(validateVideoUrl(url)).toBeNull()
  })

  it("gera embeds apenas em domínios fixos", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({ embed: expect.stringMatching(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/) })
    expect(parseVideoUrl("https://vimeo.com/123456789/abcdef1234")).toMatchObject({ embed: "https://player.vimeo.com/video/123456789?dnt=1&h=abcdef1234" })
  })

  it.each([
    "http://youtu.be/dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://youtu.be/curto",
    "https://evil.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://exemplo.com/pagina.html",
    "não é link",
  ])("rejeita %s", (url) => {
    expect(parseVideoUrl(url)).toBeNull()
    expect(validateVideoUrl(url)).toBeTruthy()
  })

  it("salva, valida e remove vídeo/dica", () => {
    const d0 = createSeed(NOW)
    expect(A.validateMedia({ videoUrl: "https://evil.com/x", tip: "" }).videoUrl).toBeTruthy()
    expect(A.validateMedia({ videoUrl: "", tip: "x".repeat(301) }).tip).toBeTruthy()
    let d = A.setExerciseMedia(d0, "Leg_Press", { videoUrl: " https://youtu.be/dQw4w9WgXcQ ", tip: " Pés na largura do quadril " })
    expect(d.exerciseMedia.Leg_Press).toEqual({ videoUrl: "https://youtu.be/dQw4w9WgXcQ", tip: "Pés na largura do quadril" })
    expect(isDemoData(d)).toBe(true)
    // link inválido nunca é persistido
    expect(A.setExerciseMedia(d, "Leg_Press", { videoUrl: "https://evil.com/x", tip: "" })).toBe(d)
    // exercício inexistente
    expect(A.setExerciseMedia(d, "nao-existe", { videoUrl: "", tip: "x" })).toBe(d)
    d = A.setExerciseMedia(d, "Leg_Press", { videoUrl: "", tip: "" })
    expect(d.exerciseMedia.Leg_Press).toBeUndefined()
  })
})
