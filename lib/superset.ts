import type { WorkoutItem } from "./types"

/** Posição de um exercício dentro de um conjugado (bi-set, tri-set…). */
export interface SupersetSlot {
  /** "A", "B"… na ordem em que os conjugados aparecem na ficha. */
  letter: string
  /** 1-based. */
  position: number
  size: number
  isLast: boolean
  /** Id do próximo exercício do conjugado (null no último). */
  nextId: string | null
}

/**
 * Conjugado = exercícios consecutivos com o mesmo `group`. Um grupo com um exercício só
 * (ex.: o parceiro foi removido) não conta como conjugado.
 */
export function supersets(items: Pick<WorkoutItem, "id" | "group">[]): Map<string, SupersetSlot> {
  const out = new Map<string, SupersetSlot>()
  let n = 0
  for (let i = 0; i < items.length; ) {
    const g = items[i].group
    let j = i + 1
    while (g && j < items.length && items[j].group === g) j++
    if (g && j - i >= 2) {
      const letter = String.fromCharCode(65 + (n++ % 26))
      for (let k = i; k < j; k++) out.set(items[k].id, { letter, position: k - i + 1, size: j - i, isLast: k === j - 1, nextId: k < j - 1 ? items[k + 1].id : null })
    }
    i = j
  }
  return out
}

/** Liga o exercício `index` ao seguinte (entra no conjugado que já existir em qualquer um dos dois). */
export function linkWithNext<T extends WorkoutItem>(items: T[], index: number, newGroup: string): T[] {
  const a = items[index], b = items[index + 1]
  if (!a || !b) return items
  const slots = supersets(items)
  const g = (slots.has(a.id) && a.group) || (slots.has(b.id) && b.group) || newGroup
  const old = slots.has(b.id) ? b.group : null
  return items.map((it, i) => (i === index || i === index + 1 || (old && it.group === old && i > index) ? { ...it, group: g } : it))
}

/** Separa o exercício `index` do seguinte; cada lado mantém o próprio conjugado se ainda tiver 2+. */
export function unlinkFromNext<T extends WorkoutItem>(items: T[], index: number, newGroup: string): T[] {
  const b = items[index + 1]
  if (!b || !b.group) return items
  const g = b.group
  return items.map((it, i) => (i > index && it.group === g ? { ...it, group: newGroup } : it))
}

/** Remove marcações que não formam conjugado (grupos de 1), para salvar a ficha limpa. */
export function cleanGroups<T extends WorkoutItem>(items: T[]): T[] {
  const slots = supersets(items)
  return items.map((it) => (it.group && !slots.has(it.id) ? { ...it, group: null } : it))
}
