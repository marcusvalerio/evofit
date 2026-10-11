import type { DemoData } from "./types"
import { DATA_VERSION } from "./seed"

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === "string"
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const isNumOrNull = (v: unknown) => v === null || isNum(v)
const isArr = (v: unknown, guard: (x: unknown) => boolean) => Array.isArray(v) && v.every(guard)
const has = (o: Obj, keys: Record<string, (v: unknown) => boolean>) => Object.entries(keys).every(([k, g]) => g(o[k]))

const isProfile = (v: unknown) =>
  isObj(v) &&
  has(v, {
    slug: isStr, name: isStr, headline: isStr, bio: isStr, city: isStr, state: isStr, region: isStr,
    modality: (m) => m === "presencial" || m === "online" || m === "hibrido",
    specialties: (s) => isArr(s, isStr),
    registry: isStr,
    accent: (a) => a === "otan" || a === "gravy" || a === "cobblestone" || a === "smoke",
    directoryVisible: (b) => typeof b === "boolean",
  })

const isStudent = (v: unknown) =>
  isObj(v) &&
  has(v, {
    id: isStr, name: isStr, goal: isStr, notes: isStr, createdAt: isStr,
    level: (l) => l === "iniciante" || l === "intermediario" || l === "avancado",
    weeklyTarget: (n) => isNum(n) && n >= 1 && n <= 7,
    status: (s) => s === "ativo" || s === "arquivado",
  })

const isExercise = (v: unknown) =>
  isObj(v) && has(v, { id: isStr, name: isStr, muscleGroup: isStr, equipment: isStr, instructions: isStr, custom: (b) => typeof b === "boolean" })

const isMediaMap = (v: unknown) =>
  isObj(v) && Object.values(v).every((m) => isObj(m) && has(m, { videoUrl: isStr, tip: isStr }))

const isItem = (v: unknown) =>
  isObj(v) && has(v, { id: isStr, exerciseId: isStr, sets: isNum, reps: isStr, load: isNumOrNull, restSec: isNum, notes: isStr })

const isWorkout = (v: unknown) =>
  isObj(v) &&
  has(v, { id: isStr, name: isStr, description: isStr, createdAt: isStr, updatedAt: isStr, items: (i) => isArr(i, isItem), studentIds: (s) => isArr(s, isStr) })

const isSet = (v: unknown) =>
  isObj(v) &&
  has(v, { itemId: isStr, exerciseId: isStr, exerciseName: isStr, setIndex: isNum, reps: isNumOrNull, load: isNumOrNull, done: (b) => typeof b === "boolean" })

const isSession = (v: unknown) =>
  isObj(v) &&
  has(v, {
    id: isStr, studentId: isStr, workoutId: isStr, workoutName: isStr, startedAt: isStr, note: isStr,
    finishedAt: (f) => f === null || isStr(f),
    status: (s) => s === "em_andamento" || s === "concluida",
    sets: (s) => isArr(s, isSet),
  })

const isContact = (v: unknown) =>
  isObj(v) && has(v, { id: isStr, trainerSlug: isStr, name: isStr, contact: isStr, message: isStr, createdAt: isStr })

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
    (v.activeStudentId === null || isStr(v.activeStudentId))
  )
}
