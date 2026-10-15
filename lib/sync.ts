import type { Assessment, ContactRequest, DemoData, Exercise, Session, Student, TrainerProfile, Workout } from "./types"

/**
 * Diferença entre dois estados do app, usada para sincronizar com o servidor no modo conta.
 * As telas continuam usando as mesmas ações puras (lib/actions.ts); só o que mudou é enviado e o
 * servidor revalida tudo (formato, regras e permissões) antes de gravar.
 */
export interface Coll<T> {
  upsert: T[]
  delete: string[]
}

export interface MediaRow {
  exerciseId: string
  videoUrl: string
  tip: string
}

export interface Changes {
  profile?: TrainerProfile
  students?: Coll<Student>
  exercises?: Coll<Exercise>
  media?: Coll<MediaRow>
  workouts?: Coll<Workout>
  sessions?: Coll<Session>
  contactRequests?: Coll<ContactRequest>
  assessments?: Coll<Assessment>
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function coll<T>(prev: T[], next: T[], key: (x: T) => string): Coll<T> | undefined {
  const before = new Map(prev.map((x) => [key(x), x]))
  const after = new Set(next.map(key))
  const upsert = next.filter((x) => !same(before.get(key(x)), x))
  const del = [...before.keys()].filter((k) => !after.has(k))
  return upsert.length || del.length ? { upsert, delete: del } : undefined
}

const mediaRows = (d: DemoData): MediaRow[] => Object.entries(d.exerciseMedia).map(([exerciseId, m]) => ({ exerciseId, ...m }))

export function diff(prev: DemoData, next: DemoData): Changes {
  const id = (x: { id: string }) => x.id
  const c: Changes = {}
  if (!same(prev.profile, next.profile)) c.profile = next.profile
  const s = coll(prev.students, next.students, id)
  if (s) c.students = s
  const e = coll(prev.exercises, next.exercises, id)
  if (e) c.exercises = e
  const m = coll(mediaRows(prev), mediaRows(next), (x) => x.exerciseId)
  if (m) c.media = m
  const w = coll(prev.workouts, next.workouts, id)
  if (w) c.workouts = w
  const se = coll(prev.sessions, next.sessions, id)
  if (se) c.sessions = se
  const cr = coll(prev.contactRequests, next.contactRequests, id)
  if (cr) c.contactRequests = cr
  const av = coll(prev.assessments, next.assessments, id)
  if (av) c.assessments = av
  return c
}

export const isEmpty = (c: Changes) => Object.keys(c).length === 0
