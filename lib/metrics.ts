import type { DemoData, Session, Student } from "./types"
import { DAY_MS, addDays, startOfDay, startOfWeek } from "./date"

export const completed = (d: DemoData) => d.sessions.filter((s) => s.status === "concluida")

export function sessionsOf(d: DemoData, studentId: string) {
  return completed(d).filter((s) => s.studentId === studentId)
}

export function lastSession(d: DemoData, studentId: string): Session | undefined {
  const list = sessionsOf(d, studentId)
  return list[list.length - 1]
}

export function inProgressSession(d: DemoData, studentId: string) {
  return d.sessions.find((s) => s.studentId === studentId && s.status === "em_andamento")
}

/** Sessões concluídas na semana corrente (seg–dom). */
export function weekCount(d: DemoData, studentId: string, now = new Date()) {
  const from = startOfWeek(now).getTime()
  return sessionsOf(d, studentId).filter((s) => new Date(s.startedAt).getTime() >= from).length
}

/** Contagem de sessões concluídas por semana, das `weeks` semanas mais recentes (a última é a atual). */
export function weeklySeries(sessions: Session[], weeks = 8, now = new Date()) {
  const thisWeek = startOfWeek(now)
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - i))
    const end = addDays(start, 7)
    const count = sessions.filter((s) => {
      const t = new Date(s.startedAt).getTime()
      return s.status === "concluida" && t >= start.getTime() && t < end.getTime()
    }).length
    return { start, count }
  })
}

export function daysSinceLast(d: DemoData, studentId: string, now = new Date()) {
  const last = lastSession(d, studentId)
  if (!last) return null
  return Math.floor((startOfDay(now).getTime() - startOfDay(new Date(last.startedAt)).getTime()) / DAY_MS)
}

/**
 * Aderência da semana corrente: soma das sessões feitas (limitadas à meta de cada aluno)
 * dividida pela soma das metas dos alunos ativos.
 */
export function weekAdherence(d: DemoData, now = new Date()) {
  const active = d.students.filter((s) => s.status === "ativo")
  const target = active.reduce((a, s) => a + s.weeklyTarget, 0)
  if (!target) return null
  const done = active.reduce((a, s) => a + Math.min(s.weeklyTarget, weekCount(d, s.id, now)), 0)
  return Math.round((done / target) * 100)
}

/** Alunos ativos que não treinam há `days` dias ou mais (ou nunca treinaram). */
export function needsAttention(d: DemoData, days = 7, now = new Date()): { student: Student; since: number | null }[] {
  return d.students
    .filter((s) => s.status === "ativo")
    .map((student) => ({ student, since: daysSinceLast(d, student.id, now) }))
    .filter((x) => x.since === null || x.since >= days)
    .sort((a, b) => (b.since ?? Infinity) - (a.since ?? Infinity))
}

export function sessionVolume(s: Session) {
  return s.sets.reduce((a, x) => a + (x.done && x.reps && x.load ? x.reps * x.load : 0), 0)
}

export function sessionProgress(s: Session) {
  const total = s.sets.length
  const done = s.sets.filter((x) => x.done).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

/** Maior carga registrada por sessão para um exercício (evolução de carga). */
export function loadProgression(d: DemoData, studentId: string, exerciseId: string) {
  return sessionsOf(d, studentId)
    .map((s) => {
      const loads = s.sets.filter((x) => x.exerciseId === exerciseId && x.done && x.load !== null).map((x) => x.load as number)
      return loads.length ? { date: s.startedAt, value: Math.max(...loads) } : null
    })
    .filter((x): x is { date: string; value: number } => x !== null)
}

/** Exercícios com carga registrada no histórico do aluno. */
export function trackedExercises(d: DemoData, studentId: string) {
  const ids = new Map<string, string>()
  for (const s of sessionsOf(d, studentId)) for (const x of s.sets) if (x.load !== null && x.done) ids.set(x.exerciseId, x.exerciseName)
  return [...ids.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
}

export interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  load: number
  previous: number
}

/**
 * Recordes de carga de uma sessão: a maior carga concluída supera a maior carga já registrada
 * pelo aluno naquele exercício em sessões anteriores. Primeira vez não conta (não há base).
 */
export function personalRecords(d: DemoData, session: Session): PersonalRecord[] {
  const before = sessionsOf(d, session.studentId).filter((s) => s.id !== session.id && s.startedAt < session.startedAt)
  const best = new Map<string, number>()
  for (const s of before) for (const x of s.sets) if (x.done && x.load !== null && x.load > (best.get(x.exerciseId) ?? 0)) best.set(x.exerciseId, x.load)
  const out = new Map<string, PersonalRecord>()
  for (const x of session.sets) {
    const prev = best.get(x.exerciseId)
    if (!x.done || x.load === null || prev === undefined || x.load <= prev) continue
    const cur = out.get(x.exerciseId)
    if (!cur || x.load > cur.load) out.set(x.exerciseId, { exerciseId: x.exerciseId, exerciseName: x.exerciseName, load: x.load, previous: prev })
  }
  return [...out.values()]
}
