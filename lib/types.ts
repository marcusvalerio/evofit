export type Modality = "presencial" | "online" | "hibrido"
export type Level = "iniciante" | "intermediario" | "avancado"
export type StudentStatus = "ativo" | "arquivado"
export type AccentChoice = "otan" | "gravy" | "cobblestone" | "smoke"

export interface TrainerProfile {
  slug: string
  name: string
  headline: string
  bio: string
  city: string
  state: string
  /** Bairro ou zona de atendimento. Nunca um endereço completo. */
  region: string
  modality: Modality
  specialties: string[]
  /** Registro profissional declarado pelo próprio usuário (opcional). */
  registry: string
  accent: AccentChoice
  /** Opt-in explícito para aparecer no diretório público. */
  directoryVisible: boolean
}

export interface Student {
  id: string
  name: string
  goal: string
  level: Level
  /** Meta de sessões por semana (1–7). */
  weeklyTarget: number
  notes: string
  status: StudentStatus
  createdAt: string
}

/** Exercício criado pelo personal. Os exercícios do catálogo ficam em lib/catalog.ts e não são persistidos. */
export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  instructions: string
  custom: boolean
}

/** Material próprio do personal para um exercício (catálogo ou próprio). */
export interface ExerciseMedia {
  /** Link de vídeo (YouTube, Vimeo, Google Drive ou arquivo direto em HTTPS). Vazio = sem vídeo. */
  videoUrl: string
  /** Dica do personal exibida ao aluno durante o treino. */
  tip: string
}

export interface WorkoutItem {
  id: string
  exerciseId: string
  sets: number
  reps: string
  /** Carga prescrita em kg. null = peso corporal / livre. */
  load: number | null
  restSec: number
  notes: string
}

export interface Workout {
  id: string
  name: string
  description: string
  items: WorkoutItem[]
  studentIds: string[]
  createdAt: string
  updatedAt: string
}

export interface SetLog {
  itemId: string
  exerciseId: string
  exerciseName: string
  setIndex: number
  reps: number | null
  load: number | null
  done: boolean
}

export type SessionStatus = "em_andamento" | "concluida"

export interface Session {
  id: string
  studentId: string
  workoutId: string
  workoutName: string
  startedAt: string
  finishedAt: string | null
  status: SessionStatus
  sets: SetLog[]
  note: string
}

export interface ContactRequest {
  id: string
  trainerSlug: string
  name: string
  contact: string
  message: string
  createdAt: string
}

export interface DemoData {
  version: number
  seededAt: string
  profile: TrainerProfile
  students: Student[]
  exercises: Exercise[]
  /** Vídeos e dicas do personal, por id de exercício. */
  exerciseMedia: Record<string, ExerciseMedia>
  workouts: Workout[]
  sessions: Session[]
  contactRequests: ContactRequest[]
  /** Aluno que o visitante está "usando" na experiência do aluno. */
  activeStudentId: string | null
}

export const MODALITY_LABEL: Record<Modality, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrido: "Híbrido",
}

export const LEVEL_LABEL: Record<Level, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
}

export const SPECIALTIES = [
  "Hipertrofia",
  "Emagrecimento",
  "Força",
  "Condicionamento",
  "Mobilidade",
  "Idosos",
  "Gestantes",
  "Corrida",
  "Reabilitação",
  "Funcional",
] as const

export const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Trapézio",
  "Abdômen",
  "Lombar",
  "Quadríceps",
  "Posteriores",
  "Glúteos",
  "Adutores",
  "Abdutores",
  "Panturrilha",
  "Pescoço",
  "Corpo inteiro",
  "Cardio",
] as const
