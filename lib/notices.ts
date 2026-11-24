import type { DemoData } from "./types"
import { churnRadar } from "./radar"
import { completed, personalRecords } from "./metrics"
import { DAY_MS } from "./date"

export type NoticePriority = "alta" | "media" | "baixa"
export interface Notice {
  id: string
  priority: NoticePriority
  kind: "dor" | "radar" | "recorde" | "treino" | "sem-ficha"
  title: string
  detail: string
  at: string
  href: string
}

const RANK: Record<NoticePriority, number> = { alta: 0, media: 1, baixa: 2 }

/**
 * Central de avisos do personal (proposta de Chat e Avisos, MVP item 2).
 * Tudo derivado do que já está registrado: nada novo é guardado no servidor.
 */
export function trainerNotices(d: DemoData, now = new Date(), days = 14): Notice[] {
  const from = now.getTime() - days * DAY_MS
  const names = new Map(d.students.map((s) => [s.id, s.name]))
  const out: Notice[] = []
  for (const s of completed(d)) {
    const t = new Date(s.finishedAt ?? s.startedAt).getTime()
    if (t < from || !names.has(s.studentId)) continue
    const name = names.get(s.studentId)!
    const href = `/studio/alunos/${s.studentId}`
    if (s.checkin?.pain === "forte") out.push({ id: `dor-${s.id}`, priority: "alta", kind: "dor", title: `${name} relatou dor forte`, detail: `No treino ${s.workoutName}. Vale conversar antes do próximo treino.`, at: s.finishedAt ?? s.startedAt, href })
    for (const r of personalRecords(d, s)) out.push({ id: `pr-${s.id}-${r.exerciseId}`, priority: "media", kind: "recorde", title: `${name} bateu recorde`, detail: `${r.exerciseName}: ${String(r.load).replace(".", ",")} kg (antes ${String(r.previous).replace(".", ",")} kg).`, at: s.finishedAt ?? s.startedAt, href })
    out.push({ id: `tr-${s.id}`, priority: "baixa", kind: "treino", title: `${name} treinou`, detail: s.workoutName, at: s.finishedAt ?? s.startedAt, href })
  }
  const nowIso = now.toISOString()
  for (const r of churnRadar(d, now)) {
    if (r.level === "alto") out.push({ id: `radar-${r.student.id}-${r.daysSince ?? "x"}`, priority: "alta", kind: "radar", title: `${r.student.name} está sumindo`, detail: r.reasons.slice(0, 2).join(" · "), at: nowIso, href: `/studio/alunos/${r.student.id}` })
  }
  for (const s of d.students.filter((x) => x.status === "ativo")) {
    if (!d.workouts.some((w) => w.studentIds.includes(s.id))) out.push({ id: `sf-${s.id}`, priority: "media", kind: "sem-ficha", title: `${s.name} está sem ficha`, detail: "Monte ou atribua uma ficha para treinar pelo app.", at: nowIso, href: "/studio/treinos" })
  }
  return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.at.localeCompare(a.at))
}

const KEY = "evofit:avisos-lidos"
export function readNoticeIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[])
  } catch {
    return new Set()
  }
}
export function markNoticesRead(ids: string[]) {
  const all = readNoticeIds()
  ids.forEach((i) => all.add(i))
  try {
    localStorage.setItem(KEY, JSON.stringify([...all].slice(-500)))
  } catch {}
}
