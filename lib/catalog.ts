import INDEX from "./exercise-index.json"
import type { DemoData, Exercise, Level } from "./types"

/** Entrada compacta do catálogo aberto (free-exercise-db, domínio público), traduzida para PT-BR. */
interface CatalogEntry {
  id: string
  /** nome em PT-BR */
  n: string
  /** nome original em inglês (útil na busca) */
  en: string
  /** grupo principal */
  g: string
  pm: string[]
  sm: string[]
  eq: string
  lv: string
  c: string
  /** quantidade de quadros de demonstração (0 ou 2) */
  img: number
}

/** Visão unificada de um exercício: catálogo ou criado pelo personal. */
export interface ExerciseView {
  id: string
  name: string
  nameEn: string
  group: string
  primary: string[]
  secondary: string[]
  equipment: string
  level: Level | null
  category: string
  /** quadros de demonstração disponíveis (0 = sem imagem) */
  frames: number
  custom: boolean
  /** texto livre (apenas exercícios próprios) */
  instructions: string
}

const fromCatalog = (e: CatalogEntry): ExerciseView => ({
  id: e.id,
  name: e.n,
  nameEn: e.en,
  group: e.g,
  primary: e.pm,
  secondary: e.sm,
  equipment: e.eq,
  level: (e.lv as Level) ?? null,
  category: e.c,
  frames: e.img,
  custom: false,
  instructions: "",
})

const fromCustom = (e: Exercise): ExerciseView => ({
  id: e.id,
  name: e.name,
  nameEn: "",
  group: e.muscleGroup,
  primary: [e.muscleGroup],
  secondary: [],
  equipment: e.equipment || "—",
  level: null,
  category: "Próprio",
  frames: 0,
  custom: true,
  instructions: e.instructions,
})

export const CATALOG: readonly ExerciseView[] = (INDEX as CatalogEntry[]).map(fromCatalog)
const byId = new Map(CATALOG.map((e) => [e.id, e]))

export const CATALOG_SIZE = CATALOG.length

export function catalogExercise(id: string): ExerciseView | undefined {
  return byId.get(id)
}

export function isCatalogId(id: string) {
  return byId.has(id)
}

/** Procura primeiro nos exercícios próprios do personal e depois no catálogo. */
export function getExercise(d: DemoData, id: string): ExerciseView | undefined {
  const own = d.exercises.find((e) => e.id === id)
  return own ? fromCustom(own) : byId.get(id)
}

export function exerciseName(d: DemoData, id: string) {
  return getExercise(d, id)?.name ?? "Exercício"
}

/** Catálogo + exercícios próprios (os próprios primeiro). */
export function allExercises(d: DemoData): ExerciseView[] {
  return [...d.exercises.map(fromCustom), ...CATALOG]
}

export const frameUrl = (id: string, i: number) => `/exercises/img/${encodeURIComponent(id)}-${i}.webp`

const count = (key: (e: ExerciseView) => string) => {
  const m = new Map<string, number>()
  for (const e of CATALOG) m.set(key(e), (m.get(key(e)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
}
export const CATALOG_GROUPS = count((e) => e.group)
export const CATALOG_EQUIPMENT = count((e) => e.equipment)
export const CATALOG_CATEGORIES = count((e) => e.category)

/** Normaliza para busca sem acento e sem caixa. */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export interface ExerciseFilter {
  q?: string
  group?: string
  equipment?: string
  level?: string
  category?: string
}

export function filterExercises(list: readonly ExerciseView[], f: ExerciseFilter) {
  const terms = fold(f.q ?? "").split(/\s+/).filter(Boolean)
  return list.filter((e) => {
    if (f.group && !e.primary.includes(f.group) && e.group !== f.group) return false
    if (f.equipment && e.equipment !== f.equipment) return false
    if (f.level && e.level !== f.level) return false
    if (f.category && e.category !== f.category) return false
    if (terms.length) {
      const hay = fold(`${e.name} ${e.nameEn} ${e.primary.join(" ")} ${e.equipment}`)
      return terms.every((t) => hay.includes(t))
    }
    return true
  })
}

/* ---------- Passo a passo (carregado sob demanda) ---------- */

export interface ExerciseDetail {
  steps: string[]
  mechanic: string | null
  force: string | null
}

const detailCache = new Map<string, Promise<ExerciseDetail | null>>()

export function loadDetail(id: string): Promise<ExerciseDetail | null> {
  if (!byId.has(id)) return Promise.resolve(null)
  let p = detailCache.get(id)
  if (!p) {
    p = fetch(`/exercises/data/${encodeURIComponent(id)}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        if (!j || typeof j !== "object" || !Array.isArray((j as ExerciseDetail).steps)) return null
        const o = j as ExerciseDetail
        return { steps: o.steps.filter((s) => typeof s === "string"), mechanic: o.mechanic ?? null, force: o.force ?? null }
      })
      .catch(() => {
        detailCache.delete(id)
        return null
      })
    detailCache.set(id, p)
  }
  return p
}

export const MECHANIC_LABEL: Record<string, string> = { compound: "Multiarticular", isolation: "Isolado" }
export const FORCE_LABEL: Record<string, string> = { push: "Empurrar", pull: "Puxar", static: "Isométrico" }

/** Animação com a marca EVOFIT gerada pela rota /api/gif (somente exercícios do catálogo com dois quadros). */
export const animUrl = (id: string, format: "gif" | "webp" = "gif", download = false) =>
  `/api/gif/${encodeURIComponent(id)}${format === "webp" ? "?f=webp" : ""}${download ? `${format === "webp" ? "&" : "?"}download` : ""}`
export const libraryUrl = (id: string) => `/biblioteca/${encodeURIComponent(id)}`
