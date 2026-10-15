import type { Assessment, Payment, ContactRequest, DemoData, Exercise, Session, Student, TrainerProfile, Workout, WorkoutItem } from "./types"
import { CIRCUMFERENCES, SKINFOLDS } from "./types"
import { DATA_VERSION } from "./seed"

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === "string"
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const isNumOrNull = (v: unknown) => v === null || isNum(v)
const isArr = (v: unknown, guard: (x: unknown) => boolean) => Array.isArray(v) && v.every(guard)
const has = (o: Obj, keys: Record<string, (v: unknown) => boolean>) => Object.entries(keys).every(([k, g]) => g(o[k]))

export const isProfile = (v: unknown): v is TrainerProfile =>
  isObj(v) &&
  has(v, {
    slug: isStr, name: isStr, headline: isStr, bio: isStr, city: isStr, state: isStr, region: isStr,
    modality: (m) => m === "presencial" || m === "online" || m === "hibrido",
    specialties: (s) => isArr(s, isStr),
    registry: isStr,
    accent: (a) => a === "otan" || a === "gravy" || a === "cobblestone" || a === "smoke",
    pixKey: isStr,
    whatsapp: isStr,
    instagram: isStr,
    directoryVisible: (b) => typeof b === "boolean",
  })

export const isStudent = (v: unknown): v is Student =>
  isObj(v) &&
  has(v, {
    id: isStr, name: isStr, goal: isStr, notes: isStr, createdAt: isStr, phone: isStr,
    monthlyFee: (n) => n === null || (isNum(n) && n > 0 && n <= 100000),
    dueDay: (n) => n === null || (isNum(n) && Number.isInteger(n) && n >= 1 && n <= 28),
    level: (l) => l === "iniciante" || l === "intermediario" || l === "avancado",
    weeklyTarget: (n) => isNum(n) && n >= 1 && n <= 7,
    status: (s) => s === "ativo" || s === "arquivado",
  })

export const isExercise = (v: unknown): v is Exercise =>
  isObj(v) && has(v, { id: isStr, name: isStr, muscleGroup: isStr, equipment: isStr, instructions: isStr, custom: (b) => typeof b === "boolean" })

const isMediaMap = (v: unknown) =>
  isObj(v) && Object.values(v).every((m) => isObj(m) && has(m, { videoUrl: isStr, tip: isStr }))

export const isItem = (v: unknown): v is WorkoutItem =>
  isObj(v) && has(v, { id: isStr, exerciseId: isStr, sets: isNum, reps: isStr, load: isNumOrNull, restSec: isNum, notes: isStr })

export const isWorkout = (v: unknown): v is Workout =>
  isObj(v) &&
  has(v, { id: isStr, name: isStr, description: isStr, createdAt: isStr, updatedAt: isStr, items: (i) => isArr(i, isItem), studentIds: (s) => isArr(s, isStr) })

const isSet = (v: unknown) =>
  isObj(v) &&
  has(v, { itemId: isStr, exerciseId: isStr, exerciseName: isStr, setIndex: isNum, reps: isNumOrNull, load: isNumOrNull, done: (b) => typeof b === "boolean" })

const isCheckin = (v: unknown) =>
  v === null ||
  (isObj(v) &&
    has(v, {
      effort: (n) => n === null || (isNum(n) && Number.isInteger(n) && n >= 1 && n <= 10),
      pain: (x) => x === null || x === "nenhuma" || x === "leve" || x === "forte",
      sleep: (x) => x === null || x === "ruim" || x === "ok" || x === "bom",
    }))

export const isPayment = (v: unknown): v is Payment =>
  isObj(v) &&
  has(v, { id: isStr, studentId: isStr, paidAt: isStr, month: (m) => isStr(m) && /^\d{4}-(0[1-9]|1[0-2])$/.test(m), amount: (n) => isNum(n) && n > 0 && n <= 100000 })

export const isSession = (v: unknown): v is Session =>
  isObj(v) &&
  has(v, {
    id: isStr, studentId: isStr, workoutId: isStr, workoutName: isStr, startedAt: isStr, note: isStr,
    finishedAt: (f) => f === null || isStr(f),
    status: (s) => s === "em_andamento" || s === "concluida",
    sets: (s) => isArr(s, isSet),
    checkin: isCheckin,
  })

export const isContact = (v: unknown): v is ContactRequest =>
  isObj(v) && has(v, { id: isStr, trainerSlug: isStr, name: isStr, contact: isStr, message: isStr, createdAt: isStr })

const isMeasureMap = (keys: readonly string[], max: number) => (v: unknown) =>
  isObj(v) && Object.entries(v).every(([k, n]) => keys.includes(k) && isNum(n) && n > 0 && n <= max)

export const isAssessment = (v: unknown): v is Assessment =>
  isObj(v) &&
  has(v, {
    id: isStr, studentId: isStr, notes: isStr, createdAt: isStr,
    date: (d) => isStr(d) && /^\d{4}-\d{2}-\d{2}$/.test(d),
    sex: (x) => x === "F" || x === "M",
    age: isNumOrNull,
    weightKg: isNumOrNull,
    heightCm: isNumOrNull,
    bodyFatPct: isNumOrNull,
    skinfolds: isMeasureMap(SKINFOLDS, 100),
    circumferences: isMeasureMap(CIRCUMFERENCES, 250),
  })

/** Valida o formato persistido. Dados de versões antigas ou corrompidos são rejeitados. */
export function isDemoData(v: unknown): v is DemoData {
  return (
    isObj(v) &&
    v.version === DATA_VERSION &&
    isStr(v.seededAt) &&
    isProfile(v.profile) &&
    isArr(v.students, isStudent) &&
    isArr(v.exercises, isExercise) &&
    isMediaMap(v.exerciseMedia) &&
    isArr(v.workouts, isWorkout) &&
    isArr(v.sessions, isSession) &&
    isArr(v.contactRequests, isContact) &&
    isArr(v.assessments, isAssessment) &&
    isArr(v.payments, isPayment) &&
    (v.activeStudentId === null || isStr(v.activeStudentId))
  )
}
