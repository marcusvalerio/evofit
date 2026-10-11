import type { DemoData, Exercise, Session, SetLog, Student, Workout, WorkoutItem } from "./types"
import { addDays, startOfDay } from "./date"

export const DATA_VERSION = 1

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

const ex = (id: string, name: string, muscleGroup: string, equipment: string, instructions: string): Exercise => ({
  id,
  name,
  muscleGroup,
  equipment,
  instructions,
  custom: false,
})

export const BASE_EXERCISES: Exercise[] = [
  ex("ex-supino-reto", "Supino reto com barra", "Peito", "Barra e banco", "Escápulas retraídas, pés firmes no chão. Desça a barra até a linha do peito e empurre sem tirar o quadril do banco."),
  ex("ex-supino-inclinado", "Supino inclinado com halteres", "Peito", "Halteres e banco", "Banco a 30°. Desça os halteres controlando a fase excêntrica e mantenha os cotovelos levemente abaixo da linha dos ombros."),
  ex("ex-crucifixo", "Crucifixo na máquina", "Peito", "Máquina", "Cotovelos semiflexionados e fixos. Feche os braços contraindo o peitoral, sem bater as manoplas."),
  ex("ex-flexao", "Flexão de braços", "Peito", "Peso corporal", "Corpo alinhado da cabeça aos pés. Desça até o peito quase tocar o chão."),
  ex("ex-puxada-frente", "Puxada frontal", "Costas", "Polia alta", "Puxe a barra até a parte alta do peito, conduzindo com os cotovelos. Evite balançar o tronco."),
  ex("ex-remada-curvada", "Remada curvada com barra", "Costas", "Barra", "Tronco inclinado a ~45°, coluna neutra. Puxe a barra em direção ao umbigo."),
  ex("ex-remada-baixa", "Remada baixa sentada", "Costas", "Polia baixa", "Peito aberto, puxe o triângulo até o abdômen e controle o retorno."),
  ex("ex-barra-fixa", "Barra fixa assistida", "Costas", "Gravitron", "Pegada pronada na largura dos ombros. Suba até o queixo passar a barra."),
  ex("ex-desenvolvimento", "Desenvolvimento com halteres", "Ombros", "Halteres", "Sentado, core firme. Empurre os halteres acima da cabeça sem hiperestender a lombar."),
  ex("ex-elevacao-lateral", "Elevação lateral", "Ombros", "Halteres", "Eleve os braços até a linha dos ombros, cotovelos levemente flexionados."),
  ex("ex-face-pull", "Face pull", "Ombros", "Polia com corda", "Puxe a corda em direção ao rosto, abrindo os cotovelos e rotacionando externamente os ombros."),
  ex("ex-rosca-direta", "Rosca direta", "Bíceps", "Barra W", "Cotovelos fixos ao lado do corpo. Evite usar impulso do tronco."),
  ex("ex-rosca-martelo", "Rosca martelo", "Bíceps", "Halteres", "Pegada neutra, suba alternando os braços com controle."),
  ex("ex-triceps-corda", "Tríceps na polia com corda", "Tríceps", "Polia alta", "Cotovelos fixos, estenda completamente e afaste as pontas da corda no final."),
  ex("ex-triceps-frances", "Tríceps francês", "Tríceps", "Halter", "Cotovelos apontados para cima. Desça o halter atrás da cabeça e estenda."),
  ex("ex-agachamento", "Agachamento livre", "Quadríceps", "Barra", "Pés na largura dos ombros. Desça mantendo o tronco firme e os joelhos alinhados com os pés."),
  ex("ex-leg-press", "Leg press 45°", "Quadríceps", "Máquina", "Lombar apoiada. Desça até ~90° de flexão de joelho e empurre sem travar os joelhos."),
  ex("ex-cadeira-extensora", "Cadeira extensora", "Quadríceps", "Máquina", "Estenda os joelhos completamente e segure 1 s no topo."),
  ex("ex-afundo", "Afundo com halteres", "Quadríceps", "Halteres", "Passo longo, desça até o joelho de trás quase tocar o chão."),
  ex("ex-terra-romeno", "Levantamento terra romeno", "Posteriores", "Barra", "Joelhos semiflexionados, leve o quadril para trás mantendo a coluna neutra."),
  ex("ex-mesa-flexora", "Mesa flexora", "Posteriores", "Máquina", "Quadril apoiado no banco. Flexione os joelhos e controle a descida."),
  ex("ex-elevacao-pelvica", "Elevação pélvica", "Glúteos", "Barra e banco", "Escápulas no banco, queixo levemente baixo. Estenda o quadril e contraia os glúteos no topo."),
  ex("ex-abducao", "Cadeira abdutora", "Glúteos", "Máquina", "Tronco levemente inclinado à frente, abra as pernas com controle."),
  ex("ex-panturrilha", "Panturrilha em pé", "Panturrilha", "Máquina", "Amplitude completa: alongue embaixo e suba na ponta dos pés."),
  ex("ex-prancha", "Prancha", "Core", "Peso corporal", "Antebraços no chão, corpo alinhado. Contraia abdômen e glúteos."),
  ex("ex-abdominal-infra", "Abdominal infra", "Core", "Peso corporal", "Deitado, eleve o quadril trazendo os joelhos ao peito sem impulso."),
  ex("ex-kettlebell-swing", "Kettlebell swing", "Corpo inteiro", "Kettlebell", "Movimento de dobradiça de quadril. Projete o kettlebell com a extensão do quadril, não com os braços."),
  ex("ex-burpee", "Burpee", "Corpo inteiro", "Peso corporal", "Agache, leve os pés para trás, faça a flexão, retorne e salte."),
  ex("ex-bike", "Bicicleta ergométrica", "Cardio", "Bicicleta", "Ritmo moderado. Ajuste o banco para leve flexão do joelho na pedalada mais baixa."),
  ex("ex-esteira", "Caminhada inclinada", "Cardio", "Esteira", "Inclinação entre 8 e 12%, sem se apoiar nas barras laterais."),
]

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
        item("a1", "ex-supino-reto", 4, "8-10", 40, 90, "Última série até próximo da falha."),
        item("a2", "ex-puxada-frente", 4, "10-12", 45, 75),
        item("a3", "ex-desenvolvimento", 3, "10", 12, 75),
        item("a4", "ex-remada-baixa", 3, "12", 40, 60),
        item("a5", "ex-triceps-corda", 3, "12-15", 20, 45),
        item("a6", "ex-rosca-direta", 3, "10-12", 20, 45),
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
        item("b1", "ex-agachamento", 4, "6-8", 50, 120, "Aquecer com 2 séries leves antes."),
        item("b2", "ex-leg-press", 4, "10-12", 140, 90),
        item("b3", "ex-terra-romeno", 3, "10", 40, 90),
        item("b4", "ex-elevacao-pelvica", 3, "12", 60, 75),
        item("b5", "ex-mesa-flexora", 3, "12", 30, 60),
        item("b6", "ex-panturrilha", 4, "15", 50, 45),
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
        item("f1", "ex-leg-press", 3, "12", 80, 75),
        item("f2", "ex-puxada-frente", 3, "12", 30, 60),
        item("f3", "ex-supino-inclinado", 3, "12", 10, 60),
        item("f4", "ex-elevacao-pelvica", 3, "12", 30, 60),
        item("f5", "ex-prancha", 3, "30 s", null, 45, "Contar o tempo, não repetições."),
        item("f6", "ex-bike", 1, "10 min", null, 0, "Intensidade moderada para finalizar."),
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
        item("m1", "ex-face-pull", 3, "15", 10, 45),
        item("m2", "ex-afundo", 3, "10 por perna", 6, 60),
        item("m3", "ex-abdominal-infra", 3, "12", null, 45),
        item("m4", "ex-prancha", 3, "40 s", null, 45),
      ],
      studentIds: ["al-elisa"],
      createdAt: created,
      updatedAt: created,
    },
  ]

  const exById = new Map(BASE_EXERCISES.map((e) => [e.id, e]))
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
            exerciseName: exById.get(it.exerciseId)?.name ?? "Exercício",
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
    exercises: BASE_EXERCISES.map((e) => ({ ...e })),
    workouts,
    sessions,
    contactRequests: [],
    activeStudentId: "al-ana",
  }
}
