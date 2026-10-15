import type { DemoData, WorkoutItem } from "./types"
import { getExercise } from "./catalog"
import type { MuscleKey, MuscleLevels } from "@/components/body-map"

/** Séries por músculo: cada série conta 1 para os principais e 0,5 para os secundários. */
export function muscleVolume(d: DemoData, items: Pick<WorkoutItem, "exerciseId" | "sets">[]) {
  const vol = new Map<MuscleKey, number>()
  for (const it of items) {
    const ex = getExercise(d, it.exerciseId)
    const sets = Number.isFinite(it.sets) ? Math.max(0, it.sets) : 0
    if (!ex || !sets) continue
    for (const m of ex.primary) vol.set(m as MuscleKey, (vol.get(m as MuscleKey) ?? 0) + sets)
    for (const m of ex.secondary) vol.set(m as MuscleKey, (vol.get(m as MuscleKey) ?? 0) + sets * 0.5)
  }
  return [...vol.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets)
}

/** Converte volume em níveis 1–4 relativos ao músculo mais trabalhado da ficha. */
export function volumeLevels(vol: { muscle: MuscleKey; sets: number }[]): MuscleLevels {
  const max = Math.max(0, ...vol.map((v) => v.sets))
  const out: MuscleLevels = {}
  if (!max) return out
  for (const v of vol) out[v.muscle] = Math.max(1, Math.ceil((v.sets / max) * 4))
  return out
}

/** Pares que costumam ser equilibrados numa mesma ficha. */
const PAIRS: [MuscleKey, MuscleKey][] = [
  ["Peito", "Costas"],
  ["Quadríceps", "Posteriores"],
  ["Bíceps", "Tríceps"],
]

/**
 * Observações de equilíbrio: quando um lado do par tem 4+ séries e o outro menos da metade.
 * É uma observação para o personal, não uma regra — a ficha pode ter esse foco de propósito.
 */
export function balanceNotes(vol: { muscle: MuscleKey; sets: number }[]) {
  const get = (m: MuscleKey) => vol.find((v) => v.muscle === m)?.sets ?? 0
  const notes: string[] = []
  for (const [a, b] of PAIRS) {
    const [hi, lo] = get(a) >= get(b) ? [a, b] : [b, a]
    const h = get(hi)
    const l = get(lo)
    if (h >= 4 && l < h / 2) notes.push(l === 0 ? `${lo}: nenhuma série, ${hi}: ${fmt(h)}.` : `${lo} com ${fmt(l)} séries, menos da metade de ${hi} (${fmt(h)}).`)
  }
  return notes
}

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",")
