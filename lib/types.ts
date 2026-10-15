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
  /** Chave Pix do personal, usada só no texto do lembrete de mensalidade. O EVOFIT não processa pagamentos. */
  pixKey: string
  /** Opt-in explícito para aparecer no diretório público. */
  directoryVisible: boolean
}

/** O que o diretório público pode mostrar: nunca a chave Pix. */
export type PublicProfile = Omit<TrainerProfile, "pixKey">

export interface Student {
  id: string
  name: string
  goal: string
  level: Level
  /** Meta de sessões por semana (1–7). */
  weeklyTarget: number
  notes: string
  /** WhatsApp com DDD, só dígitos (ex.: 5511987654321). Vazio = não informado. */
  phone: string
  /** Mensalidade em R$. null = não controlada no EVOFIT. */
  monthlyFee: number | null
  /** Dia de vencimento (1–28). */
  dueDay: number | null
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

export type Pain = "nenhuma" | "leve" | "forte"
export type Sleep = "ruim" | "ok" | "bom"

/** Check-in de 5 segundos ao concluir o treino. Tudo opcional, exceto o esforço. */
export interface Checkin {
  /** Esforço percebido (escala de Borg CR-10, 1–10). */
  effort: number
  pain: Pain | null
  sleep: Sleep | null
}

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
  checkin: Checkin | null
}

export interface ContactRequest {
  id: string
  trainerSlug: string
  name: string
  contact: string
  message: string
  createdAt: string
}

/** Mensalidade marcada como paga pelo personal. Um registro por aluno e mês. */
export interface Payment {
  id: string
  studentId: string
  /** AAAA-MM */
  month: string
  amount: number
  paidAt: string
}

export type Sex = "F" | "M"

export const SKINFOLDS = ["peitoral", "axilar", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"] as const
export type Skinfold = (typeof SKINFOLDS)[number]

export const CIRCUMFERENCES = ["ombros", "torax", "cintura", "abdomen", "quadril", "bracoD", "bracoE", "coxaD", "coxaE", "panturrilhaD", "panturrilhaE"] as const
export type Circumference = (typeof CIRCUMFERENCES)[number]

/** Avaliação física registrada pelo personal. Só mostra o que foi medido — nada é estimado sem dado. */
export interface Assessment {
  id: string
  studentId: string
  /** Data da avaliação (AAAA-MM-DD). */
  date: string
  sex: Sex
  /** Idade na data da avaliação (necessária para as equações de dobras). */
  age: number | null
  weightKg: number | null
  heightCm: number | null
  /** Dobras cutâneas em mm. */
  skinfolds: Partial<Record<Skinfold, number>>
  /** Circunferências em cm. */
  circumferences: Partial<Record<Circumference, number>>
  /** % de gordura medido por outro método (ex.: bioimpedância). Usado quando não há dobras completas. */
  bodyFatPct: number | null
  notes: string
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
  assessments: Assessment[]
  payments: Payment[]
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

export const SKINFOLD_LABEL: Record<Skinfold, string> = {
  peitoral: "Peitoral",
  axilar: "Axilar média",
  triceps: "Tríceps",
  subescapular: "Subescapular",
  abdominal: "Abdominal",
  suprailiaca: "Suprailíaca",
  coxa: "Coxa",
}

export const CIRCUMFERENCE_LABEL: Record<Circumference, string> = {
  ombros: "Ombros",
  torax: "Tórax",
  cintura: "Cintura",
  abdomen: "Abdômen",
  quadril: "Quadril",
  bracoD: "Braço direito",
  bracoE: "Braço esquerdo",
  coxaD: "Coxa direita",
  coxaE: "Coxa esquerda",
  panturrilhaD: "Panturrilha direita",
  panturrilhaE: "Panturrilha esquerda",
}
