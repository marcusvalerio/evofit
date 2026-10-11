import type { DemoData, Exercise, Session, SetLog, Student, Workout, WorkoutItem } from "./types"
import { addDays, startOfDay } from "./date"
import { catalogExercise } from "./catalog"

export const DATA_VERSION = 2

/** PRNG determinístico para que a demonstração seja reprodutível. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Ids da versão 1 dos dados (biblioteca fixa de 30 exercícios) → exercício equivalente no catálogo.
 * Usado pela migração para preservar fichas e histórico salvos no navegador.
 */
export const LEGACY_EXERCISE_IDS: Record<string, string> = {
  "ex-supino-reto": "Barbell_Bench_Press_-_Medium_Grip",
  "ex-supino-inclinado": "Incline_Dumbbell_Press",
  "ex-crucifixo": "Butterfly",
  "ex-flexao": "Pushups",
  "ex-puxada-frente": "Wide-Grip_Lat_Pulldown",
  "ex-remada-curvada": "Bent_Over_Barbell_Row",
  "ex-remada-baixa": "Seated_Cable_Rows",
  "ex-barra-fixa": "Band_Assisted_Pull-Up",
  "ex-desenvolvimento": "Dumbbell_Shoulder_Press",
  "ex-elevacao-lateral": "Side_Lateral_Raise",
  "ex-face-pull": "Face_Pull",
  "ex-rosca-direta": "EZ-Bar_Curl",
  "ex-rosca-martelo": "Hammer_Curls",
  "ex-triceps-corda": "Triceps_Pushdown_-_Rope_Attachment",
  "ex-triceps-frances": "Standing_Dumbbell_Triceps_Extension",
  "ex-agachamento": "Barbell_Squat",
  "ex-leg-press": "Leg_Press",
  "ex-cadeira-extensora": "Leg_Extensions",
  "ex-afundo": "Dumbbell_Lunges",
  "ex-terra-romeno": "Romanian_Deadlift",
  "ex-mesa-flexora": "Lying_Leg_Curls",
  "ex-elevacao-pelvica": "Barbell_Hip_Thrust",
  "ex-abducao": "Thigh_Abductor",
  "ex-panturrilha": "Standing_Calf_Raises",
  "ex-prancha": "Plank",
  "ex-abdominal-infra": "Reverse_Crunch",
  "ex-kettlebell-swing": "One-Arm_Kettlebell_Swings",
  "ex-bike": "Bicycling_Stationary",
  "ex-esteira": "Walking_Treadmill",
}

/** Exercício da v1 sem equivalente no catálogo: vira exercício próprio se estiver em uso. */
export const LEGACY_CUSTOM: Exercise[] = [
  {
    id: "ex-burpee",
    name: "Burpee",
    muscleGroup: "Corpo inteiro",
    equipment: "Peso corporal",
    instructions: "Agache, leve os pés para trás, faça a flexão, retorne e salte.",
    custom: true,
  },
]

const L = LEGACY_EXERCISE_IDS

const item = (id: string, exerciseId: string, sets: number, reps: string, load: number | null, restSec: number, notes = ""): WorkoutItem => ({
  id,
  exerciseId,
  sets,
  reps,
  load,
  restSec,
  notes,
})

/** Gera o conjunto inicial de dados demonstrativos, relativo a `now`. */
export function createSeed(now = new Date()): DemoData {
  const rand = mulberry32(20261011)
  const iso = (d: Date) => d.toISOString()
  const created = iso(addDays(startOfDay(now), -70))

  const students: Student[] = [
    { id: "al-ana", name: "Ana Ribeiro", goal: "Hipertrofia de membros inferiores", level: "intermediario", weeklyTarget: 4, notes: "Prefere treinar pela manhã.", status: "ativo", createdAt: created },
    { id: "al-bruno", name: "Bruno Tavares", goal: "Ganho de força", level: "avancado", weeklyTarget: 4, notes: "", status: "ativo", createdAt: created },
    { id: "al-carla", name: "Carla Menezes", goal: "Condicionamento e emagrecimento", level: "iniciante", weeklyTarget: 3, notes: "Histórico de dor lombar leve — evitar carga axial alta.", status: "ativo", createdAt: created },
    { id: "al-diego", name: "Diego Faria", goal: "Retomar a rotina de treinos", level: "iniciante", weeklyTarget: 3, notes: "", status: "ativo", createdAt: created },
    { id: "al-elisa", name: "Elisa Prado", goal: "Mobilidade e qualidade de vida", level: "intermediario", weeklyTarget: 2, notes: "", status: "ativo", createdAt: created },
    { id: "al-fabio", name: "Fábio Lins", goal: "Hipertrofia", level: "intermediario", weeklyTarget: 3, notes: "Pausou os treinos por viagem.", status: "arquivado", createdAt: created },
  ]

  const workouts: Workout[] = [
    {
      id: "tr-a-superiores",
      name: "Treino A — Superiores",
      description: "Empurrar e puxar com foco em volume moderado.",
      items: [
        item("a1", L["ex-supino-reto"], 4, "8-10", 40, 90, "Última série até próximo da falha."),
        item("a2", L["ex-puxada-frente"], 4, "10-12", 45, 75),
        item("a3", L["ex-desenvolvimento"], 3, "10", 12, 75),
        item("a4", L["ex-remada-baixa"], 3, "12", 40, 60),
        item("a5", L["ex-triceps-corda"], 3, "12-15", 20, 45),
        item("a6", L["ex-rosca-direta"], 3, "10-12", 20, 45),
      ],
      studentIds: ["al-ana", "al-bruno", "al-fabio"],
      createdAt: created,
      updatedAt: created,
    },
    {
      id: "tr-b-inferiores",
      name: "Treino B — Inferiores",
      description: "Quadríceps, posteriores e glúteos.",
      items: [
        item("b1", L["ex-agachamento"], 4, "6-8", 50, 120, "Aquecer com 2 séries leves antes."),
        item("b2", L["ex-leg-press"], 4, "10-12", 140, 90),
        item("b3", L["ex-terra-romeno"], 3, "10", 40, 90),
        item("b4", L["ex-elevacao-pelvica"], 3, "12", 60, 75),
        item("b5", L["ex-mesa-flexora"], 3, "12", 30, 60),
        item("b6", L["ex-panturrilha"], 4, "15", 50, 45),
      ],
      studentIds: ["al-ana", "al-bruno", "al-fabio"],
      createdAt: created,
      updatedAt: created,
    },
    {
      id: "tr-full-body",
      name: "Full body — Base",
      description: "Treino de corpo inteiro para construir rotina e técnica.",
      items: [
        item("f1", L["ex-leg-press"], 3, "12", 80, 75),
        item("f2", L["ex-puxada-frente"], 3, "12", 30, 60),
        item("f3", L["ex-supino-inclinado"], 3, "12", 10, 60),
        item("f4", L["ex-elevacao-pelvica"], 3, "12", 30, 60),
        item("f5", L["ex-prancha"], 3, "30 s", null, 45, "Contar o tempo, não repetições."),
        item("f6", L["ex-bike"], 1, "10 min", null, 0, "Intensidade moderada para finalizar."),
      ],
      studentIds: ["al-carla", "al-diego"],
      createdAt: created,
      updatedAt: created,
    },
    {
      id: "tr-mobilidade",
      name: "Mobilidade e core",
      description: "Sessão leve para controle motor e estabilidade.",
      items: [
        item("m1", L["ex-face-pull"], 3, "15", 10, 45),
        item("m2", L["ex-afundo"], 3, "10 por perna", 6, 60),
        item("m3", L["ex-abdominal-infra"], 3, "12", null, 45),
        item("m4", L["ex-prancha"], 3, "40 s", null, 45),
      ],
      studentIds: ["al-elisa"],
      createdAt: created,
      updatedAt: created,
    },
  ]

  /** Probabilidade de cumprir a sessão planejada, por aluno. */
  const consistency: Record<string, number> = { "al-ana": 0.9, "al-bruno": 0.8, "al-carla": 0.65, "al-diego": 0.35, "al-elisa": 0.85, "al-fabio": 0.7 }
  const sessions: Session[] = []
  const today = startOfDay(now)

  for (const st of students) {
    const plan = workouts.filter((w) => w.studentIds.includes(st.id))
    if (!plan.length) continue
    // Fábio parou há 3 semanas; Diego parou há 10 dias.
    const stopAt = st.id === "al-fabio" ? 21 : st.id === "al-diego" ? 10 : 1
    const gap = Math.max(1, Math.floor(7 / st.weeklyTarget))
    let rotation = 0
    let n = 0
    for (let back = 56; back >= stopAt; back -= gap) {
      if (rand() > consistency[st.id]) continue
      const day = addDays(today, -back)
      const start = new Date(day)
      start.setHours(6 + Math.floor(rand() * 14), Math.floor(rand() * 4) * 15)
      const w = plan[rotation % plan.length]
      rotation++
      n++
      const progress = 1 + Math.min(0.15, n * 0.006)
      const sets: SetLog[] = []
      for (const it of w.items) {
        for (let s = 0; s < it.sets; s++) {
          const target = parseInt(it.reps, 10)
          sets.push({
            itemId: it.id,
            exerciseId: it.exerciseId,
            exerciseName: catalogExercise(it.exerciseId)?.name ?? "Exercício",
            setIndex: s,
            reps: Number.isFinite(target) ? Math.max(1, target - Math.floor(rand() * 3)) : null,
            load: it.load === null ? null : Math.round(it.load * progress * 2) / 2,
            done: true,
          })
        }
      }
      const finished = new Date(start.getTime() + (40 + Math.floor(rand() * 30)) * 60_000)
      sessions.push({
        id: `se-${st.id}-${back}`,
        studentId: st.id,
        workoutId: w.id,
        workoutName: w.name,
        startedAt: iso(start),
        finishedAt: iso(finished),
        status: "concluida",
        sets,
        note: "",
      })
    }
  }

  sessions.sort((a, b) => a.startedAt.localeCompare(b.startedAt))

  return {
    version: DATA_VERSION,
    seededAt: iso(now),
    profile: {
      slug: "camila-rocha-demo",
      name: "Camila Rocha",
      headline: "Treino de força e hipertrofia com acompanhamento próximo",
      bio: "Perfil fictício usado na demonstração do EVOFIT. Atendimento individual com foco em técnica, progressão de carga e constância.",
      city: "São Paulo",
      state: "SP",
      region: "Zona Oeste",
      modality: "hibrido",
      specialties: ["Hipertrofia", "Força", "Emagrecimento"],
      registry: "",
      accent: "otan",
      directoryVisible: true,
    },
    students,
    exercises: [],
    exerciseMedia: {
      [L["ex-agachamento"]]: { videoUrl: "", tip: "Respire fundo e trave o abdômen antes de descer. Se o calcanhar sair do chão, reduza a amplitude." },
      [L["ex-elevacao-pelvica"]]: { videoUrl: "", tip: "Segure 1 segundo no topo apertando os glúteos. Queixo levemente para baixo." },
      [L["ex-prancha"]]: { videoUrl: "", tip: "Se a lombar começar a afundar, pare a série — qualidade vale mais que tempo." },
    },
    workouts,
    sessions,
    contactRequests: [],
    activeStudentId: "al-ana",
  }
}
