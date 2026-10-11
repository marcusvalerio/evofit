import type { ContactRequest, DemoData, Exercise, ExerciseMedia, Session, SetLog, Student, TrainerProfile, Workout, WorkoutItem } from "./types"
import { CATALOG, exerciseName, fold, getExercise } from "./catalog"
import { parseVideoUrl, validateVideoUrl } from "./video"

export function uid(prefix: string) {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rnd}`
}

const now = () => new Date().toISOString()

/* ---------- Alunos ---------- */

export type StudentInput = Pick<Student, "name" | "goal" | "level" | "weeklyTarget" | "notes">

export function validateStudent(s: StudentInput) {
  const errors: Partial<Record<keyof StudentInput, string>> = {}
  if (s.name.trim().length < 2) errors.name = "Informe o nome do aluno (mínimo 2 caracteres)."
  if (s.name.trim().length > 80) errors.name = "Use no máximo 80 caracteres."
  if (!Number.isInteger(s.weeklyTarget) || s.weeklyTarget < 1 || s.weeklyTarget > 7) errors.weeklyTarget = "A meta deve ser de 1 a 7 sessões por semana."
  if (s.goal.length > 120) errors.goal = "Use no máximo 120 caracteres."
  if (s.notes.length > 500) errors.notes = "Use no máximo 500 caracteres."
  return errors
}

export function addStudent(d: DemoData, input: StudentInput, id = uid("al")): DemoData {
  const st: Student = { ...input, name: input.name.trim(), goal: input.goal.trim(), notes: input.notes.trim(), id, status: "ativo", createdAt: now() }
  return { ...d, students: [...d.students, st] }
}

export function updateStudent(d: DemoData, id: string, input: StudentInput): DemoData {
  return { ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...input, name: input.name.trim(), goal: input.goal.trim(), notes: input.notes.trim() } : s)) }
}

export function setStudentStatus(d: DemoData, id: string, status: Student["status"]): DemoData {
  return {
    ...d,
    students: d.students.map((s) => (s.id === id ? { ...s, status } : s)),
    activeStudentId: status === "arquivado" && d.activeStudentId === id ? null : d.activeStudentId,
  }
}

/* ---------- Exercícios ---------- */

export type ExerciseInput = Pick<Exercise, "name" | "muscleGroup" | "equipment" | "instructions">

export function validateExercise(e: ExerciseInput, d: DemoData, editingId?: string) {
  const errors: Partial<Record<keyof ExerciseInput, string>> = {}
  const name = e.name.trim()
  if (name.length < 2) errors.name = "Informe o nome do exercício."
  else if (name.length > 80) errors.name = "Use no máximo 80 caracteres."
  else if (d.exercises.some((x) => x.id !== editingId && fold(x.name) === fold(name))) errors.name = "Você já tem um exercício com esse nome."
  else if (CATALOG.some((x) => fold(x.name) === fold(name))) errors.name = "Esse exercício já existe no catálogo — use-o direto na ficha."
  if (!e.muscleGroup) errors.muscleGroup = "Selecione o grupo muscular."
  if (e.instructions.length > 600) errors.instructions = "Use no máximo 600 caracteres."
  return errors
}

export function addExercise(d: DemoData, input: ExerciseInput, id = uid("ex")): DemoData {
  return { ...d, exercises: [...d.exercises, { ...input, name: input.name.trim(), equipment: input.equipment.trim(), instructions: input.instructions.trim(), id, custom: true }] }
}

export function updateExercise(d: DemoData, id: string, input: ExerciseInput): DemoData {
  return { ...d, exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...input, name: input.name.trim(), equipment: input.equipment.trim(), instructions: input.instructions.trim() } : e)) }
}

export function exerciseUsage(d: DemoData, id: string) {
  return d.workouts.filter((w) => w.items.some((i) => i.exerciseId === id))
}

export function deleteExercise(d: DemoData, id: string): DemoData {
  const ex = d.exercises.find((e) => e.id === id)
  if (!ex || exerciseUsage(d, id).length) return d
  const exerciseMedia = { ...d.exerciseMedia }
  delete exerciseMedia[id]
  return { ...d, exercises: d.exercises.filter((e) => e.id !== id), exerciseMedia }
}

export function validateMedia(m: ExerciseMedia) {
  const errors: Partial<Record<keyof ExerciseMedia, string>> = {}
  const v = validateVideoUrl(m.videoUrl)
  if (v) errors.videoUrl = v
  if (m.tip.length > 300) errors.tip = "Use no máximo 300 caracteres."
  return errors
}

/** Salva vídeo/dica do personal. Campos vazios removem o registro. */
export function setExerciseMedia(d: DemoData, id: string, m: ExerciseMedia): DemoData {
  if (!getExercise(d, id)) return d
  const clean = { videoUrl: m.videoUrl.trim(), tip: m.tip.trim() }
  if (clean.videoUrl && !parseVideoUrl(clean.videoUrl)) return d
  const exerciseMedia = { ...d.exerciseMedia }
  if (!clean.videoUrl && !clean.tip) delete exerciseMedia[id]
  else exerciseMedia[id] = clean
  return { ...d, exerciseMedia }
}

/* ---------- Fichas de treino ---------- */

export function validateWorkout(w: Pick<Workout, "name" | "items">) {
  const errors: { name?: string; items?: string; itemErrors: Record<string, string> } = { itemErrors: {} }
  if (w.name.trim().length < 2) errors.name = "Dê um nome à ficha."
  if (w.items.length === 0) errors.items = "Adicione pelo menos um exercício."
  for (const it of w.items) {
    if (!Number.isInteger(it.sets) || it.sets < 1 || it.sets > 20) errors.itemErrors[it.id] = "Séries devem ficar entre 1 e 20."
    else if (!it.reps.trim()) errors.itemErrors[it.id] = "Informe as repetições (ex.: 10 ou 8-12)."
    else if (it.load !== null && (it.load < 0 || it.load > 1000)) errors.itemErrors[it.id] = "Carga inválida."
    else if (!Number.isInteger(it.restSec) || it.restSec < 0 || it.restSec > 600) errors.itemErrors[it.id] = "Descanso deve ficar entre 0 e 600 s."
  }
  return errors
}

export function isWorkoutValid(e: ReturnType<typeof validateWorkout>) {
  return !e.name && !e.items && Object.keys(e.itemErrors).length === 0
}

export function newWorkoutItem(exerciseId: string): WorkoutItem {
  return { id: uid("it"), exerciseId, sets: 3, reps: "10-12", load: null, restSec: 60, notes: "" }
}

export function createWorkout(d: DemoData, name: string, id = uid("tr")): DemoData {
  const t = now()
  return { ...d, workouts: [...d.workouts, { id, name: name.trim(), description: "", items: [], studentIds: [], createdAt: t, updatedAt: t }] }
}

export function saveWorkout(d: DemoData, w: Workout): DemoData {
  return { ...d, workouts: d.workouts.map((x) => (x.id === w.id ? { ...w, name: w.name.trim(), updatedAt: now() } : x)) }
}

export function duplicateWorkout(d: DemoData, id: string, newId = uid("tr")): DemoData {
  const src = d.workouts.find((w) => w.id === id)
  if (!src) return d
  const t = now()
  const copy: Workout = { ...src, id: newId, name: `${src.name} (cópia)`, items: src.items.map((i) => ({ ...i, id: uid("it") })), studentIds: [], createdAt: t, updatedAt: t }
  return { ...d, workouts: [...d.workouts, copy] }
}

/** Remove a ficha. O histórico mantém o nome da ficha registrado em cada sessão. Sessões em andamento são descartadas. */
export function deleteWorkout(d: DemoData, id: string): DemoData {
  return { ...d, workouts: d.workouts.filter((w) => w.id !== id), sessions: d.sessions.filter((s) => !(s.workoutId === id && s.status === "em_andamento")) }
}

export function toggleAssignment(d: DemoData, workoutId: string, studentId: string): DemoData {
  return {
    ...d,
    workouts: d.workouts.map((w) =>
      w.id !== workoutId ? w : { ...w, studentIds: w.studentIds.includes(studentId) ? w.studentIds.filter((s) => s !== studentId) : [...w.studentIds, studentId] },
    ),
  }
}

/* ---------- Sessões (execução do aluno) ---------- */

/** Última carga registrada pelo aluno em um exercício, para pré-preencher a série. */
export function lastLoad(d: DemoData, studentId: string, exerciseId: string): number | null {
  for (let i = d.sessions.length - 1; i >= 0; i--) {
    const s = d.sessions[i]
    if (s.studentId !== studentId || s.status !== "concluida") continue
    const sets = s.sets.filter((x) => x.exerciseId === exerciseId && x.done && x.load !== null)
    if (sets.length) return sets[sets.length - 1].load
  }
  return null
}

export function startSession(d: DemoData, studentId: string, workoutId: string, id = uid("se")): DemoData {
  const w = d.workouts.find((x) => x.id === workoutId)
  if (!w || !w.studentIds.includes(studentId)) return d
  if (d.sessions.some((s) => s.studentId === studentId && s.status === "em_andamento")) return d
  const sets: SetLog[] = w.items.flatMap((it) => {
    const target = parseInt(it.reps, 10)
    const prev = lastLoad(d, studentId, it.exerciseId)
    return Array.from({ length: it.sets }, (_, i) => ({
      itemId: it.id,
      exerciseId: it.exerciseId,
      exerciseName: exerciseName(d, it.exerciseId),
      setIndex: i,
      reps: Number.isFinite(target) ? target : null,
      load: it.load === null ? null : (prev ?? it.load),
      done: false,
    }))
  })
  const session: Session = { id, studentId, workoutId, workoutName: w.name, startedAt: now(), finishedAt: null, status: "em_andamento", sets, note: "" }
  return { ...d, sessions: [...d.sessions, session] }
}

export function updateSet(d: DemoData, sessionId: string, itemId: string, setIndex: number, patch: Partial<Pick<SetLog, "reps" | "load" | "done">>): DemoData {
  return {
    ...d,
    sessions: d.sessions.map((s) =>
      s.id !== sessionId || s.status !== "em_andamento"
        ? s
        : { ...s, sets: s.sets.map((x) => (x.itemId === itemId && x.setIndex === setIndex ? { ...x, ...patch } : x)) },
    ),
  }
}

export function finishSession(d: DemoData, sessionId: string, note = ""): DemoData {
  return {
    ...d,
    sessions: d.sessions.map((s) => (s.id === sessionId && s.status === "em_andamento" ? { ...s, status: "concluida", finishedAt: now(), note: note.trim() } : s)),
  }
}

export function discardSession(d: DemoData, sessionId: string): DemoData {
  return { ...d, sessions: d.sessions.filter((s) => !(s.id === sessionId && s.status === "em_andamento")) }
}

/* ---------- Perfil e diretório ---------- */

export function validateProfile(p: TrainerProfile) {
  const errors: Partial<Record<keyof TrainerProfile, string>> = {}
  if (p.name.trim().length < 2) errors.name = "Informe seu nome profissional."
  if (p.headline.length > 100) errors.headline = "Use no máximo 100 caracteres."
  if (p.bio.length > 600) errors.bio = "Use no máximo 600 caracteres."
  if (!p.city.trim()) errors.city = "Informe a cidade de atendimento."
  if (!/^[A-Za-z]{2}$/.test(p.state.trim())) errors.state = "Use a sigla do estado (ex.: SP)."
  if (p.specialties.length === 0) errors.specialties = "Selecione pelo menos uma especialidade."
  return errors
}

export function saveProfile(d: DemoData, p: TrainerProfile): DemoData {
  return { ...d, profile: { ...p, name: p.name.trim(), city: p.city.trim(), state: p.state.trim().toUpperCase(), region: p.region.trim() } }
}

export type ContactInput = Pick<ContactRequest, "name" | "contact" | "message">

export function validateContact(c: ContactInput) {
  const errors: Partial<Record<keyof ContactInput, string>> = {}
  if (c.name.trim().length < 2) errors.name = "Informe seu nome."
  if (c.contact.trim().length < 5) errors.contact = "Informe como prefere ser contatado."
  if (c.message.length > 500) errors.message = "Use no máximo 500 caracteres."
  return errors
}

export function addContactRequest(d: DemoData, trainerSlug: string, c: ContactInput): DemoData {
  const req: ContactRequest = { id: uid("ct"), trainerSlug, name: c.name.trim(), contact: c.contact.trim(), message: c.message.trim(), createdAt: now() }
  return { ...d, contactRequests: [...d.contactRequests, req] }
}

export function removeContactRequest(d: DemoData, id: string): DemoData {
  return { ...d, contactRequests: d.contactRequests.filter((c) => c.id !== id) }
}
