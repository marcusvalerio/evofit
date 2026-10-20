import type { Assessment, Checkin, Payment, ContactRequest, DemoData, Exercise, ExerciseMedia, Session, SetLog, Student, TrainerProfile, Workout, WorkoutItem } from "./types"
import { CATALOG, exerciseName, fold, getExercise } from "./catalog"
import { parseVideoUrl, validateVideoUrl } from "./video"
import { cleanGroups } from "./superset"
import { addMonthsIso, daysSinceIso, isValidIsoDay } from "./date"

export function uid(prefix: string) {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rnd}`
}

const now = () => new Date().toISOString()

/* ---------- Alunos ---------- */

export type StudentInput = Pick<Student, "name" | "goal" | "level" | "weeklyTarget" | "notes"> & { phone?: string; monthlyFee?: number | null; dueDay?: number | null }

/** Mantém só os dígitos do telefone. */
export const normalizePhone = (p: string) => p.replace(/\D/g, "")

export function validateStudent(s: StudentInput) {
  const errors: Partial<Record<keyof StudentInput, string>> = {}
  if (s.name.trim().length < 2) errors.name = "Informe o nome do aluno (mínimo 2 caracteres)."
  if (s.name.trim().length > 80) errors.name = "Use no máximo 80 caracteres."
  if (!Number.isInteger(s.weeklyTarget) || s.weeklyTarget < 1 || s.weeklyTarget > 7) errors.weeklyTarget = "A meta deve ser de 1 a 7 sessões por semana."
  if (s.goal.length > 120) errors.goal = "Use no máximo 120 caracteres."
  if (s.notes.length > 500) errors.notes = "Use no máximo 500 caracteres."
  const phone = normalizePhone(s.phone ?? "")
  if (phone && (phone.length < 10 || phone.length > 13)) errors.phone = "Informe o WhatsApp com DDD (10 a 13 dígitos)."
  const fee = s.monthlyFee ?? null
  if (fee !== null && (!Number.isFinite(fee) || fee <= 0 || fee > 100000)) errors.monthlyFee = "Informe um valor entre R$ 1 e R$ 100.000."
  const due = s.dueDay ?? null
  if (due !== null && (!Number.isInteger(due) || due < 1 || due > 31)) errors.dueDay = "Use um dia entre 1 e 31."
  if (fee !== null && due === null && !errors.monthlyFee) errors.dueDay = "Informe o dia de vencimento."
  return errors
}

export function addStudent(d: DemoData, input: StudentInput, id = uid("al")): DemoData {
  const st: Student = { ...input, name: input.name.trim(), goal: input.goal.trim(), notes: input.notes.trim(), phone: normalizePhone(input.phone ?? ""), monthlyFee: input.monthlyFee ?? null, dueDay: input.dueDay ?? null, id, status: "ativo", createdAt: now() }
  return { ...d, students: [...d.students, st] }
}

export function updateStudent(d: DemoData, id: string, input: StudentInput): DemoData {
  return { ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...input, name: input.name.trim(), goal: input.goal.trim(), notes: input.notes.trim(), phone: normalizePhone(input.phone ?? s.phone), monthlyFee: input.monthlyFee === undefined ? s.monthlyFee : input.monthlyFee, dueDay: input.dueDay === undefined ? s.dueDay : input.dueDay } : s)) }
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

export function validateWorkout(w: Pick<Workout, "name" | "items" | "startDate" | "changeDate">) {
  const errors: { name?: string; items?: string; startDate?: string; changeDate?: string; itemErrors: Record<string, string> } = { itemErrors: {} }
  if (w.name.trim().length < 2) errors.name = "Dê um nome à ficha."
  if (w.startDate && !isValidIsoDay(w.startDate)) errors.startDate = "Data inválida."
  if (w.changeDate && !isValidIsoDay(w.changeDate)) errors.changeDate = "Data inválida."
  else if (w.changeDate && w.startDate && !errors.startDate && w.changeDate <= w.startDate) errors.changeDate = "A troca deve ser depois do início."
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
  return !e.name && !e.items && !e.startDate && !e.changeDate && Object.keys(e.itemErrors).length === 0
}

export function newWorkoutItem(exerciseId: string): WorkoutItem {
  return { id: uid("it"), exerciseId, sets: 3, reps: "10-12", load: null, restSec: 60, notes: "" }
}

export function createWorkout(d: DemoData, name: string, id = uid("tr")): DemoData {
  const t = now()
  return { ...d, workouts: [...d.workouts, { id, name: name.trim(), description: "", items: [], studentIds: [], createdAt: t, updatedAt: t }] }
}

export function saveWorkout(d: DemoData, w: Workout): DemoData {
  return { ...d, workouts: d.workouts.map((x) => (x.id === w.id ? { ...w, name: w.name.trim(), items: cleanGroups(w.items), updatedAt: now() } : x)) }
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
  const session: Session = { id, studentId, workoutId, workoutName: w.name, startedAt: now(), finishedAt: null, status: "em_andamento", sets, note: "", checkin: null }
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

export function finishSession(d: DemoData, sessionId: string, note = "", checkin: Checkin | null = null): DemoData {
  return {
    ...d,
    sessions: d.sessions.map((s) => (s.id === sessionId && s.status === "em_andamento" ? { ...s, status: "concluida", finishedAt: now(), note: note.trim(), checkin } : s)),
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
  if (p.pixKey.length > 140) errors.pixKey = "Use no máximo 140 caracteres."
  const wa = normalizePhone(p.whatsapp)
  if (wa && (wa.length < 10 || wa.length > 13)) errors.whatsapp = "Informe o WhatsApp com DDD (10 a 13 dígitos)."
  if (p.instagram && !INSTAGRAM.test(normalizeInstagram(p.instagram))) errors.instagram = "Use só o usuário (letras, números, ponto e _; até 30)."
  return errors
}

const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/
/** Aceita "@usuario", "usuario" ou o link do perfil e guarda só o usuário. */
export const normalizeInstagram = (s: string) =>
  s
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")

export function saveProfile(d: DemoData, p: TrainerProfile): DemoData {
  return {
    ...d,
    profile: { ...p, name: p.name.trim(), city: p.city.trim(), state: p.state.trim().toUpperCase(), region: p.region.trim(), whatsapp: normalizePhone(p.whatsapp), instagram: normalizeInstagram(p.instagram) },
  }
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

/* ---------- Avaliações ---------- */

export type AssessmentInput = Omit<Assessment, "id" | "studentId" | "createdAt">

const inRange = (v: number | null, min: number, max: number) => v === null || (Number.isFinite(v) && v >= min && v <= max)

export function validateAssessment(a: AssessmentInput) {
  const errors: Partial<Record<"date" | "age" | "weightKg" | "heightCm" | "bodyFatPct" | "measures" | "notes", string>> = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date) || Number.isNaN(Date.parse(a.date))) errors.date = "Informe a data da avaliação."
  else if (Date.parse(a.date) > Date.now() + 86_400_000) errors.date = "A data não pode estar no futuro."
  if (!inRange(a.age, 5, 110)) errors.age = "Idade entre 5 e 110 anos."
  if (!inRange(a.weightKg, 20, 350)) errors.weightKg = "Peso entre 20 e 350 kg."
  if (!inRange(a.heightCm, 100, 250)) errors.heightCm = "Altura entre 100 e 250 cm."
  if (!inRange(a.bodyFatPct, 2, 70)) errors.bodyFatPct = "Percentual entre 2 e 70%."
  if (Object.values(a.skinfolds).some((v) => !inRange(v ?? null, 1, 100)) || Object.values(a.circumferences).some((v) => !inRange(v ?? null, 5, 250)))
    errors.measures = "Confira as medidas: dobras de 1 a 100 mm e circunferências de 5 a 250 cm."
  if (a.notes.length > 500) errors.notes = "Use no máximo 500 caracteres."
  const measured = a.weightKg !== null || a.bodyFatPct !== null || Object.keys(a.skinfolds).length > 0 || Object.keys(a.circumferences).length > 0
  if (!measured && !errors.measures) errors.measures = "Registre pelo menos uma medida."
  return errors
}

export function saveAssessment(d: DemoData, studentId: string, input: AssessmentInput, id?: string): DemoData {
  const existing = id ? d.assessments.find((a) => a.id === id) : undefined
  const a: Assessment = { ...input, notes: input.notes.trim(), id: existing?.id ?? id ?? uid("av"), studentId, createdAt: existing?.createdAt ?? now() }
  return { ...d, assessments: existing ? d.assessments.map((x) => (x.id === a.id ? a : x)) : [...d.assessments, a] }
}

export function deleteAssessment(d: DemoData, id: string): DemoData {
  return { ...d, assessments: d.assessments.filter((a) => a.id !== id) }
}

/* ---------- Mensalidades (controle, sem processar pagamento) ---------- */

export function markPaid(d: DemoData, studentId: string, month: string, amount: number, id = uid("pg")): DemoData {
  if (d.payments.some((p) => p.studentId === studentId && p.month === month)) return d
  const p: Payment = { id, studentId, month, amount, paidAt: now() }
  return { ...d, payments: [...d.payments, p] }
}

export function unmarkPaid(d: DemoData, studentId: string, month: string): DemoData {
  return { ...d, payments: d.payments.filter((p) => !(p.studentId === studentId && p.month === month)) }
}

/** Ciclo padrão de uma ficha até a troca sugerida. */
export const WORKOUT_CYCLE_MONTHS = 3

/**
 * Define o início da ficha e sugere a troca para 3 meses depois. Se o personal já tinha mudado
 * a data de troca à mão (diferente da sugestão anterior), ela é mantida.
 */
export function withStartDate<W extends Pick<Workout, "startDate" | "changeDate">>(w: W, startDate: string): W {
  const prevSuggestion = w.startDate && isValidIsoDay(w.startDate) ? addMonthsIso(w.startDate, WORKOUT_CYCLE_MONTHS) : null
  const keepManual = !!w.changeDate && w.changeDate !== prevSuggestion
  if (!startDate) return { ...w, startDate: null }
  if (!isValidIsoDay(startDate)) return { ...w, startDate }
  return { ...w, startDate, changeDate: keepManual ? w.changeDate : addMonthsIso(startDate, WORKOUT_CYCLE_MONTHS) }
}

/** Dias até a troca prevista (negativo = atrasada); null sem data. */
export function daysToChange(w: Pick<Workout, "changeDate">, now = new Date()) {
  if (!w.changeDate || !isValidIsoDay(w.changeDate)) return null
  return -daysSinceIso(w.changeDate, now)
}
