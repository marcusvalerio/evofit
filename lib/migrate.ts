import type { DemoData, Exercise } from "./types"
import { DATA_VERSION, LEGACY_CUSTOM, LEGACY_EXERCISE_IDS } from "./seed"
import { isDemoData } from "./validate"

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)

/**
 * v1 → v2: a biblioteca fixa de 30 exercícios deu lugar ao catálogo completo.
 * Ids antigos são trocados pelo equivalente do catálogo em fichas e histórico; exercícios próprios
 * continuam como estão; exercícios antigos sem equivalente viram exercícios próprios se estiverem em uso.
 */
function v1ToV2(v: Obj): Obj {
  const map = (id: unknown) => (typeof id === "string" ? (LEGACY_EXERCISE_IDS[id] ?? id) : id)
  const workouts = Array.isArray(v.workouts)
    ? v.workouts.map((w) => (isObj(w) && Array.isArray(w.items) ? { ...w, items: w.items.map((i) => (isObj(i) ? { ...i, exerciseId: map(i.exerciseId) } : i)) } : w))
    : v.workouts
  const sessions = Array.isArray(v.sessions)
    ? v.sessions.map((s) => (isObj(s) && Array.isArray(s.sets) ? { ...s, sets: s.sets.map((x) => (isObj(x) ? { ...x, exerciseId: map(x.exerciseId) } : x)) } : s))
    : v.sessions
  const used = new Set<string>()
  for (const w of Array.isArray(workouts) ? workouts : []) if (isObj(w) && Array.isArray(w.items)) for (const i of w.items) if (isObj(i) && typeof i.exerciseId === "string") used.add(i.exerciseId)
  const own = Array.isArray(v.exercises) ? v.exercises.filter((e) => isObj(e) && e.custom === true) : []
  const ownIds = new Set(own.map((e) => (e as Obj).id))
  const revived: Exercise[] = LEGACY_CUSTOM.filter((e) => used.has(e.id) && !ownIds.has(e.id))
  return { ...v, version: 2, exercises: [...own, ...revived], exerciseMedia: {}, workouts, sessions }
}

/** Tenta trazer dados salvos de versões anteriores para o formato atual. Retorna null se não for possível. */
export function migrate(v: unknown): DemoData | null {
  if (isDemoData(v)) return v
  if (!isObj(v) || typeof v.version !== "number") return null
  let cur: Obj = v
  if (cur.version === 1) cur = v1ToV2(cur)
  return cur.version === DATA_VERSION && isDemoData(cur) ? cur : null
}
