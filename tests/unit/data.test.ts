import { describe, expect, it } from "vitest"
import { createSeed, DATA_VERSION } from "@/lib/seed"
import { isDemoData } from "@/lib/validate"
import * as A from "@/lib/actions"
import * as M from "@/lib/metrics"
import { DIRECTORY_PROFILES, directoryList, filterProfiles } from "@/lib/directory"

const NOW = new Date("2026-10-11T12:00:00")
const seed = () => createSeed(NOW)

describe("seed e validação", () => {
  it("gera dados válidos e determinísticos", () => {
    const a = seed()
    expect(isDemoData(a)).toBe(true)
    expect(a.version).toBe(DATA_VERSION)
    expect(JSON.stringify(createSeed(NOW).sessions)).toBe(JSON.stringify(a.sessions))
    expect(a.sessions.length).toBeGreaterThan(20)
    expect(a.sessions.every((s) => s.status === "concluida")).toBe(true)
  })

  it("rejeita formatos antigos ou corrompidos", () => {
    expect(isDemoData(null)).toBe(false)
    expect(isDemoData({})).toBe(false)
    expect(isDemoData({ ...seed(), version: 0 })).toBe(false)
    // formato do app de dieta anterior
    expect(isDemoData({ Segunda__Cafe__0: true })).toBe(false)
    const broken = seed() as unknown as { students: unknown[] }
    broken.students = [{ id: 1 }]
    expect(isDemoData(broken)).toBe(false)
  })

  it("sobrevive a um ciclo JSON (persistência)", () => {
    expect(isDemoData(JSON.parse(JSON.stringify(seed())))).toBe(true)
  })
})

describe("alunos", () => {
  it("valida campos obrigatórios", () => {
    expect(A.validateStudent({ name: "A", goal: "", level: "iniciante", weeklyTarget: 3, notes: "" }).name).toBeTruthy()
    expect(A.validateStudent({ name: "Ana", goal: "", level: "iniciante", weeklyTarget: 9, notes: "" }).weeklyTarget).toBeTruthy()
    expect(A.validateStudent({ name: "Ana", goal: "", level: "iniciante", weeklyTarget: 3, notes: "" })).toEqual({})
  })

  it("cria, edita, arquiva e reativa", () => {
    let d = A.addStudent(seed(), { name: " Novo Aluno ", goal: "Força", level: "avancado", weeklyTarget: 5, notes: "" }, "al-x")
    expect(d.students.find((s) => s.id === "al-x")?.name).toBe("Novo Aluno")
    d = A.updateStudent(d, "al-x", { name: "Nome Editado", goal: "Força", level: "avancado", weeklyTarget: 4, notes: "obs" })
    expect(d.students.find((s) => s.id === "al-x")).toMatchObject({ name: "Nome Editado", weeklyTarget: 4 })
    d = { ...d, activeStudentId: "al-x" }
    d = A.setStudentStatus(d, "al-x", "arquivado")
    expect(d.students.find((s) => s.id === "al-x")?.status).toBe("arquivado")
    expect(d.activeStudentId).toBeNull()
    d = A.setStudentStatus(d, "al-x", "ativo")
    expect(d.students.find((s) => s.id === "al-x")?.status).toBe("ativo")
    expect(isDemoData(d)).toBe(true)
  })
})

describe("exercícios", () => {
  it("impede nomes duplicados e exclusão de exercício em uso", () => {
    const d0 = seed()
    expect(A.validateExercise({ name: "supino reto com barra", muscleGroup: "Peito", equipment: "", instructions: "" }, d0).name).toBeTruthy()
    let d = A.addExercise(d0, { name: "Remada cavalinho", muscleGroup: "Costas", equipment: "Barra T", instructions: "" }, "ex-x")
    expect(d.exercises.find((e) => e.id === "ex-x")?.custom).toBe(true)
    // base não pode ser excluído
    expect(A.deleteExercise(d, "ex-supino-reto").exercises.length).toBe(d.exercises.length)
    // em uso não pode ser excluído
    d = A.createWorkout(d, "Teste", "tr-x")
    d = A.saveWorkout(d, { ...d.workouts.find((w) => w.id === "tr-x")!, items: [A.newWorkoutItem("ex-x")] })
    expect(A.deleteExercise(d, "ex-x").exercises.some((e) => e.id === "ex-x")).toBe(true)
    d = A.deleteWorkout(d, "tr-x")
    expect(A.deleteExercise(d, "ex-x").exercises.some((e) => e.id === "ex-x")).toBe(false)
  })
})

describe("fichas", () => {
  it("valida séries, reps e descanso", () => {
    const item = { ...A.newWorkoutItem("ex-agachamento"), id: "i1" }
    expect(A.isWorkoutValid(A.validateWorkout({ name: "Ficha", items: [item] }))).toBe(true)
    expect(A.validateWorkout({ name: "Ficha", items: [] }).items).toBeTruthy()
    expect(A.validateWorkout({ name: "Ficha", items: [{ ...item, sets: 0 }] }).itemErrors.i1).toBeTruthy()
    expect(A.validateWorkout({ name: "Ficha", items: [{ ...item, reps: " " }] }).itemErrors.i1).toBeTruthy()
    expect(A.validateWorkout({ name: "Ficha", items: [{ ...item, restSec: NaN }] }).itemErrors.i1).toBeTruthy()
  })

  it("atribui, duplica e exclui", () => {
    let d = A.toggleAssignment(seed(), "tr-full-body", "al-elisa")
    expect(d.workouts.find((w) => w.id === "tr-full-body")?.studentIds).toContain("al-elisa")
    d = A.toggleAssignment(d, "tr-full-body", "al-elisa")
    expect(d.workouts.find((w) => w.id === "tr-full-body")?.studentIds).not.toContain("al-elisa")
    d = A.duplicateWorkout(d, "tr-a-superiores", "tr-copy")
    const copy = d.workouts.find((w) => w.id === "tr-copy")!
    expect(copy.studentIds).toEqual([])
    expect(copy.items.length).toBe(6)
  })
})

describe("execução do treino", () => {
  it("inicia, registra séries e conclui uma sessão", () => {
    const d0 = seed()
    let d = A.startSession(d0, "al-ana", "tr-a-superiores", "se-x")
    const s = d.sessions.find((x) => x.id === "se-x")!
    expect(s.status).toBe("em_andamento")
    expect(s.sets.length).toBe(4 + 4 + 3 + 3 + 3 + 3)
    // carga pré-preenchida com a última registrada
    expect(s.sets[0].load).toBe(A.lastLoad(d0, "al-ana", "ex-supino-reto"))
    // não permite duas sessões simultâneas
    expect(A.startSession(d, "al-ana", "tr-b-inferiores", "se-y").sessions.length).toBe(d.sessions.length)
    d = A.updateSet(d, "se-x", s.sets[0].itemId, 0, { done: true, reps: 9, load: 42.5 })
    expect(M.sessionProgress(d.sessions.find((x) => x.id === "se-x")!).done).toBe(1)
    d = A.finishSession(d, "se-x", "  bom treino ")
    const done = d.sessions.find((x) => x.id === "se-x")!
    expect(done.status).toBe("concluida")
    expect(done.finishedAt).not.toBeNull()
    expect(done.note).toBe("bom treino")
    expect(A.lastLoad(d, "al-ana", "ex-supino-reto")).toBe(42.5)
    expect(isDemoData(d)).toBe(true)
  })

  it("não inicia ficha não atribuída e descarta sessão em andamento", () => {
    const d0 = seed()
    expect(A.startSession(d0, "al-carla", "tr-a-superiores").sessions.length).toBe(d0.sessions.length)
    const d = A.startSession(d0, "al-carla", "tr-full-body", "se-c")
    expect(A.discardSession(d, "se-c").sessions.length).toBe(d0.sessions.length)
  })
})

describe("métricas", () => {
  it("calcula série semanal, aderência e alunos sem treinar a partir dos dados", () => {
    const d = seed()
    const series = M.weeklySeries(d.sessions, 8, NOW)
    expect(series).toHaveLength(8)
    expect(series.reduce((a, w) => a + w.count, 0)).toBeLessThanOrEqual(d.sessions.length)
    const adh = M.weekAdherence(d, NOW)
    expect(adh).not.toBeNull()
    expect(adh!).toBeGreaterThanOrEqual(0)
    expect(adh!).toBeLessThanOrEqual(100)
    // Diego parou de treinar há 10 dias no seed
    expect(M.needsAttention(d, 7, NOW).map((x) => x.student.id)).toContain("al-diego")
    // arquivados não entram
    expect(M.needsAttention(d, 7, NOW).map((x) => x.student.id)).not.toContain("al-fabio")
  })

  it("aderência é nula sem alunos ativos", () => {
    const d = seed()
    expect(M.weekAdherence({ ...d, students: [] }, NOW)).toBeNull()
  })

  it("evolução de carga é crescente no histórico demonstrativo", () => {
    const pts = M.loadProgression(seed(), "al-ana", "ex-agachamento")
    expect(pts.length).toBeGreaterThan(2)
    expect(pts[pts.length - 1].value).toBeGreaterThanOrEqual(pts[0].value)
  })
})

describe("diretório", () => {
  const all = DIRECTORY_PROFILES
  const f = { q: "", state: "", modality: "", specialty: "" }

  it("filtra por busca sem acento, estado, modalidade e especialidade", () => {
    expect(filterProfiles(all, { ...f, q: "sao paulo" }).every((p) => p.city === "São Paulo")).toBe(true)
    expect(filterProfiles(all, { ...f, state: "RJ" }).map((p) => p.state)).toEqual(["RJ"])
    expect(filterProfiles(all, { ...f, specialty: "Corrida" }).every((p) => p.specialties.includes("Corrida"))).toBe(true)
    const online = filterProfiles(all, { ...f, modality: "online" })
    expect(online.every((p) => p.modality === "online" || p.modality === "hibrido")).toBe(true)
    expect(filterProfiles(all, { ...f, modality: "hibrido" }).every((p) => p.modality === "hibrido")).toBe(true)
    expect(filterProfiles(all, { ...f, q: "xyz inexistente" })).toEqual([])
  })

  it("só inclui o perfil do Studio com opt-in", () => {
    const d = seed()
    expect(directoryList(d.profile).some((p) => p.slug === d.profile.slug)).toBe(true)
    expect(directoryList({ ...d.profile, directoryVisible: false }).some((p) => p.slug === d.profile.slug)).toBe(false)
  })

  it("perfis fictícios não expõem contato privado", () => {
    for (const p of all) {
      expect(JSON.stringify(p)).not.toMatch(/@|\(\d{2}\)|\d{4}-\d{4}/)
      expect(p.fictional).toBe(true)
    }
  })

  it("valida solicitação de contato", () => {
    expect(A.validateContact({ name: "", contact: "", message: "" })).toHaveProperty("name")
    const d = A.addContactRequest(seed(), "camila-rocha-demo", { name: "Visitante", contact: "visitante@exemplo.com", message: "" })
    expect(d.contactRequests).toHaveLength(1)
    expect(A.removeContactRequest(d, d.contactRequests[0].id).contactRequests).toHaveLength(0)
  })
})
