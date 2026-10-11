import type { ContactRequest, DemoData, Exercise, Session, Student, TrainerProfile, Workout, WorkoutItem } from "../types"
import { SPECIALTIES } from "../types"
import { DATA_VERSION } from "../seed"
import { isExercise, isProfile, isSession, isStudent, isWorkout } from "../validate"
import { validateMedia, validateProfile, validateStudent, validateWorkout } from "../actions"
import { isCatalogId } from "../catalog"
import type { Changes, MediaRow } from "../sync"
import { affected, type Queryable, type Tenant } from "./db"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
const forbid = (what: string) => new HttpError(403, `Sem permissão: ${what}.`)
const invalid = (what: string) => new HttpError(400, `Dados inválidos: ${what}.`)

type Ctx = Exclude<Tenant, { role: "public" }>

const ID = /^[A-Za-z0-9_-]{1,64}$/
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v))
const isoOrNull = (v: unknown) => (v === null || v === undefined ? null : iso(v))
const validDate = (s: string) => !Number.isNaN(Date.parse(s))

/* ---------- Leitura ---------- */

type Row = Record<string, unknown>

export async function loadWorkspace(q: Queryable, ctx: Ctx): Promise<DemoData> {
  const t = (await q.query<Row>("select * from trainers where id = $1", [ctx.trainerId])).rows[0]
  if (!t) throw new HttpError(404, "Conta não encontrada.")
  // sequencial: a transação usa uma única conexão
  const rows = async (sql: string) => (await q.query<Row>(sql)).rows
  const students = await rows("select * from students order by created_at, id")
  const exercises = await rows("select * from exercises order by name")
  const media = await rows("select * from exercise_media")
  const workouts = await rows("select * from workouts order by created_at, id")
  const assignments = await rows("select * from workout_assignments")
  const sessions = await rows("select * from sessions order by started_at, id")
  const contacts = await rows("select * from contact_requests order by created_at")

  const assigned = new Map<string, string[]>()
  for (const a of assignments) assigned.set(String(a.workout_id), [...(assigned.get(String(a.workout_id)) ?? []), String(a.student_id)])

  return {
    version: DATA_VERSION,
    seededAt: iso(t.created_at),
    profile: {
      slug: String(t.slug),
      name: String(t.name),
      headline: String(t.headline),
      bio: String(t.bio),
      city: String(t.city),
      state: String(t.state),
      region: String(t.region),
      modality: t.modality as TrainerProfile["modality"],
      specialties: (t.specialties as string[]) ?? [],
      registry: String(t.registry),
      accent: t.accent as TrainerProfile["accent"],
      directoryVisible: Boolean(t.directory_visible),
    },
    students: students.map(
      (s): Student => ({
        id: String(s.id),
        name: String(s.name),
        goal: String(s.goal),
        level: s.level as Student["level"],
        weeklyTarget: Number(s.weekly_target),
        notes: String(s.notes),
        status: s.status as Student["status"],
        createdAt: iso(s.created_at),
      }),
    ),
    exercises: exercises.map(
      (e): Exercise => ({ id: String(e.id), name: String(e.name), muscleGroup: String(e.muscle_group), equipment: String(e.equipment), instructions: String(e.instructions), custom: true }),
    ),
    exerciseMedia: Object.fromEntries(media.map((m) => [String(m.exercise_id), { videoUrl: String(m.video_url), tip: String(m.tip) }])),
    workouts: workouts.map(
      (w): Workout => ({
        id: String(w.id),
        name: String(w.name),
        description: String(w.description),
        items: w.items as WorkoutItem[],
        studentIds: assigned.get(String(w.id)) ?? [],
        createdAt: iso(w.created_at),
        updatedAt: iso(w.updated_at),
      }),
    ),
    sessions: sessions.map(
      (s): Session => ({
        id: String(s.id),
        studentId: String(s.student_id),
        workoutId: String(s.workout_id),
        workoutName: String(s.workout_name),
        startedAt: iso(s.started_at),
        finishedAt: isoOrNull(s.finished_at),
        status: s.status as Session["status"],
        sets: s.sets as Session["sets"],
        note: String(s.note),
      }),
    ),
    contactRequests: contacts.map(
      (c): ContactRequest => ({ id: String(c.id), trainerSlug: String(t.slug), name: String(c.name), contact: String(c.contact), message: String(c.message), createdAt: iso(c.created_at) }),
    ),
    activeStudentId: ctx.role === "student" ? ctx.studentId : null,
  }
}

/* ---------- Escrita ---------- */

const LIMIT = { students: 300, exercises: 300, workouts: 200, sessions: 100, items: 60, sets: 400 }

function checkSize<T>(list: T[] | undefined, max: number, what: string) {
  if (list && list.length > max) throw invalid(`muitos registros em ${what}`)
}

function checkStudent(s: unknown): asserts s is Student {
  if (!isStudent(s) || !ID.test(s.id) || !validDate(s.createdAt)) throw invalid("aluno")
  if (Object.keys(validateStudent(s)).length) throw invalid(`aluno “${s.name}”`)
}

function checkExercise(e: unknown): asserts e is Exercise {
  if (!isExercise(e) || !ID.test(e.id) || e.custom !== true) throw invalid("exercício")
  const n = e.name.trim()
  if (n.length < 2 || n.length > 80 || !e.muscleGroup || e.muscleGroup.length > 40 || e.equipment.length > 60 || e.instructions.length > 600) throw invalid(`exercício “${e.name}”`)
}

function checkWorkout(w: unknown): asserts w is Workout {
  if (!isWorkout(w) || !ID.test(w.id) || !validDate(w.createdAt) || !validDate(w.updatedAt)) throw invalid("ficha")
  const n = w.name.trim()
  if (n.length < 2 || n.length > 80 || w.description.length > 300 || w.items.length > LIMIT.items) throw invalid(`ficha “${w.name}”`)
  if (w.items.some((i) => !ID.test(i.id) || i.exerciseId.length > 120 || i.reps.length > 20 || i.notes.length > 300)) throw invalid(`itens da ficha “${w.name}”`)
  if (Object.keys(validateWorkout(w).itemErrors).length) throw invalid(`itens da ficha “${w.name}”`)
  if (new Set(w.studentIds).size !== w.studentIds.length || w.studentIds.some((s) => !ID.test(s))) throw invalid("alunos da ficha")
}

function checkSession(s: unknown): asserts s is Session {
  if (!isSession(s) || !ID.test(s.id) || !ID.test(s.studentId) || !ID.test(s.workoutId)) throw invalid("sessão")
  if (!validDate(s.startedAt) || (s.finishedAt !== null && !validDate(s.finishedAt))) throw invalid("datas da sessão")
  if ((s.status === "concluida") !== (s.finishedAt !== null)) throw invalid("situação da sessão")
  if (s.workoutName.length > 80 || s.note.length > 300 || s.sets.length > LIMIT.sets) throw invalid("sessão")
  if (s.sets.some((x) => x.exerciseName.length > 120 || x.exerciseId.length > 120 || (x.reps !== null && (x.reps < 0 || x.reps > 1000)) || (x.load !== null && (x.load < 0 || x.load > 2000))))
    throw invalid("séries da sessão")
}

async function upsertSession(q: Queryable, ctx: Ctx, s: Session) {
  await q.query(
    `insert into sessions (trainer_id, id, student_id, workout_id, workout_name, started_at, finished_at, status, sets, note)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
     on conflict (trainer_id, id) do update set finished_at = excluded.finished_at, status = excluded.status, sets = excluded.sets, note = excluded.note`,
    [ctx.trainerId, s.id, s.studentId, s.workoutId, s.workoutName, s.startedAt, s.finishedAt, s.status, JSON.stringify(s.sets), s.note],
  )
}

/** Aplica as mudanças enviadas pelo app, revalidando formato, regras e permissões. RLS é a segunda barreira. */
export async function applyChanges(q: Queryable, ctx: Ctx, c: Changes) {
  checkSize(c.students?.upsert, LIMIT.students, "alunos")
  checkSize(c.exercises?.upsert, LIMIT.exercises, "exercícios")
  checkSize(c.workouts?.upsert, LIMIT.workouts, "fichas")
  checkSize(c.sessions?.upsert, LIMIT.sessions, "sessões")
  checkSize(c.media?.upsert, LIMIT.exercises, "vídeos e dicas")

  if (ctx.role === "student") {
    if (c.profile || c.students || c.exercises || c.media || c.workouts || c.contactRequests) throw forbid("alunos só registram os próprios treinos")
    for (const s of c.sessions?.upsert ?? []) {
      checkSession(s)
      if (s.studentId !== ctx.studentId) throw forbid("sessão de outro aluno")
      const w = await q.query("select 1 from workouts where id = $1", [s.workoutId])
      if (!w.rows.length) throw forbid("ficha não liberada para você")
      await upsertSession(q, ctx, s).catch((e) => {
        throw toHttp(e, "sessão já concluída não pode ser alterada")
      })
    }
    for (const id of c.sessions?.delete ?? []) {
      const r = await q.query("delete from sessions where id = $1", [id])
      if (!affected(r)) throw forbid("só é possível descartar um treino em andamento")
    }
    return
  }

  // ----- personal -----
  if (c.sessions?.upsert.length) throw forbid("sessões são registradas pelo aluno")
  if (c.contactRequests?.upsert.length) throw forbid("solicitações chegam pelo diretório")
  if (c.students?.delete.length) throw forbid("alunos são arquivados, não excluídos")

  if (c.profile) {
    const p = c.profile
    if (!isProfile(p) || Object.keys(validateProfile(p)).length) throw invalid("perfil")
    if (p.specialties.length > SPECIALTIES.length || p.specialties.some((s) => !(SPECIALTIES as readonly string[]).includes(s))) throw invalid("especialidades")
    if (p.name.length > 80 || p.city.length > 80 || p.region.length > 80 || p.registry.length > 40) throw invalid("perfil")
    await q.query(
      `update trainers set name = $2, headline = $3, bio = $4, city = $5, state = $6, region = $7, modality = $8, specialties = $9, registry = $10, accent = $11, directory_visible = $12 where id = $1`,
      [ctx.trainerId, p.name, p.headline, p.bio, p.city, p.state, p.region, p.modality, p.specialties, p.registry, p.accent, p.directoryVisible],
    )
  }

  for (const s of c.students?.upsert ?? []) {
    checkStudent(s)
    await q.query(
      `insert into students (trainer_id, id, name, goal, level, weekly_target, notes, status, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (trainer_id, id) do update set name = excluded.name, goal = excluded.goal, level = excluded.level, weekly_target = excluded.weekly_target, notes = excluded.notes, status = excluded.status`,
      [ctx.trainerId, s.id, s.name, s.goal, s.level, s.weeklyTarget, s.notes, s.status, s.createdAt],
    )
  }

  for (const e of c.exercises?.upsert ?? []) {
    checkExercise(e)
    await q.query(
      `insert into exercises (trainer_id, id, name, muscle_group, equipment, instructions) values ($1, $2, $3, $4, $5, $6)
       on conflict (trainer_id, id) do update set name = excluded.name, muscle_group = excluded.muscle_group, equipment = excluded.equipment, instructions = excluded.instructions`,
      [ctx.trainerId, e.id, e.name.trim(), e.muscleGroup, e.equipment, e.instructions],
    )
  }

  for (const w of c.workouts?.upsert ?? []) {
    checkWorkout(w)
    await q.query(
      `insert into workouts (trainer_id, id, name, description, items, created_at, updated_at) values ($1, $2, $3, $4, $5::jsonb, $6, $7)
       on conflict (trainer_id, id) do update set name = excluded.name, description = excluded.description, items = excluded.items, updated_at = excluded.updated_at`,
      [ctx.trainerId, w.id, w.name.trim(), w.description, JSON.stringify(w.items), w.createdAt, w.updatedAt],
    )
    await q.query("delete from workout_assignments where workout_id = $1", [w.id])
    for (const sid of w.studentIds) {
      await q.query("insert into workout_assignments (trainer_id, workout_id, student_id) values ($1, $2, $3)", [ctx.trainerId, w.id, sid]).catch((e) => {
        throw toHttp(e, "aluno da ficha não existe")
      })
    }
  }

  for (const m of c.media?.upsert ?? []) {
    const row = m as MediaRow
    if (!row || typeof row.exerciseId !== "string" || typeof row.videoUrl !== "string" || typeof row.tip !== "string") throw invalid("vídeo/dica")
    if (Object.keys(validateMedia(row)).length) throw invalid("vídeo/dica")
    const known = isCatalogId(row.exerciseId) || (await q.query("select 1 from exercises where id = $1", [row.exerciseId])).rows.length > 0
    if (!known) throw invalid("exercício do vídeo/dica")
    await q.query(
      `insert into exercise_media (trainer_id, exercise_id, video_url, tip) values ($1, $2, $3, $4)
       on conflict (trainer_id, exercise_id) do update set video_url = excluded.video_url, tip = excluded.tip`,
      [ctx.trainerId, row.exerciseId, row.videoUrl.trim(), row.tip.trim()],
    )
  }

  for (const id of c.sessions?.delete ?? []) {
    const r = await q.query("delete from sessions where id = $1", [id])
    if (!affected(r)) throw forbid("só treinos em andamento podem ser descartados")
  }
  for (const id of c.workouts?.delete ?? []) await q.query("delete from workouts where id = $1", [id])
  for (const id of c.media?.delete ?? []) await q.query("delete from exercise_media where exercise_id = $1", [id])
  for (const id of c.exercises?.delete ?? []) {
    const used = await q.query("select 1 from workouts where items @> $1::jsonb limit 1", [JSON.stringify([{ exerciseId: id }])])
    if (used.rows.length) throw invalid("exercício em uso em uma ficha")
    await q.query("delete from exercise_media where exercise_id = $1", [id])
    await q.query("delete from exercises where id = $1", [id])
  }
  for (const id of c.contactRequests?.delete ?? []) await q.query("delete from contact_requests where id = $1", [id])
}

/** Converte erros do Postgres (RLS, restrições) em respostas compreensíveis. */
export function toHttp(e: unknown, message: string) {
  if (e instanceof HttpError) return e
  const code = (e as { code?: string })?.code
  if (code === "42501") return new HttpError(403, `Sem permissão: ${message}.`)
  if (code === "23505") return new HttpError(409, "Já existe um treino em andamento.")
  if (code === "23503" || code === "23514" || code === "22P02" || code === "22007" || code === "22008") return new HttpError(400, `Dados inválidos: ${message}.`)
  return e
}
