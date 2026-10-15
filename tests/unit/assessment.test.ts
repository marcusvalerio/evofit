import { describe, expect, it } from "vitest"
import { bmi, bodyFat, composition, waistHip } from "@/lib/assessment"
import { validateAssessment } from "@/lib/actions"
import { migrate } from "@/lib/migrate"
import { createSeed as seed } from "@/lib/seed"
import { isDemoData } from "@/lib/validate"
import type { Assessment } from "@/lib/types"

const base: Assessment = {
  id: "av",
  studentId: "al",
  date: "2026-09-01",
  sex: "M",
  age: 30,
  weightKg: 80,
  heightCm: 180,
  skinfolds: {},
  circumferences: {},
  bodyFatPct: null,
  notes: "",
  createdAt: "2026-09-01T10:00:00.000Z",
}

describe("avaliação física", () => {
  it("Pollock 3 dobras (homem): soma 50 mm aos 30 anos ≈ 15,1%", () => {
    // D = 1.10938 − 0.0008267·50 + 0.0000016·2500 − 0.0002574·30 = 1,06432; Siri: 495/D − 450 = 15,08
    expect(bodyFat({ ...base, skinfolds: { peitoral: 15, abdominal: 20, coxa: 15 } })).toEqual({ pct: 15.1, source: "pollock3" })
  })

  it("prefere 7 dobras quando completas e não estima sem dados", () => {
    const seven = { peitoral: 10, axilar: 12, triceps: 10, subescapular: 14, abdominal: 20, suprailiaca: 14, coxa: 15 }
    expect(bodyFat({ ...base, skinfolds: seven })?.source).toBe("pollock7")
    expect(bodyFat({ ...base, skinfolds: { peitoral: 10 } })).toBeNull()
    expect(bodyFat({ ...base, age: null, skinfolds: seven })).toBeNull()
    expect(bodyFat({ ...base, bodyFatPct: 22.4 })).toEqual({ pct: 22.4, source: "informado" })
  })

  it("IMC, RCQ e composição", () => {
    expect(bmi(base)).toBe(24.7)
    expect(bmi({ ...base, heightCm: null })).toBeNull()
    expect(waistHip({ ...base, circumferences: { cintura: 80, quadril: 100 } })).toBe(0.8)
    expect(composition({ ...base, bodyFatPct: 20 })).toEqual({ fatKg: 16, leanKg: 64 })
  })

  it("validação recusa faixas absurdas e avaliação vazia", () => {
    const input = { ...base } as Partial<Assessment>
    delete input.id
    delete input.studentId
    delete input.createdAt
    const ok = input as Parameters<typeof validateAssessment>[0]
    expect(validateAssessment(ok)).toEqual({})
    expect(validateAssessment({ ...ok, weightKg: 900 }).weightKg).toBeTruthy()
    expect(validateAssessment({ ...ok, weightKg: null }).measures).toBeTruthy()
    expect(validateAssessment({ ...ok, skinfolds: { coxa: 300 } }).measures).toBeTruthy()
    expect(validateAssessment({ ...ok, date: "2999-01-01" }).date).toBeTruthy()
  })

  it("migra dados v2 salvos no navegador para v3 sem perder nada", () => {
    const v3 = seed()
    const { assessments: _drop, ...rest } = v3
    void _drop
    const v2 = { ...rest, version: 2, students: v3.students.map(({ phone: _p, ...s }) => (void _p, s)) }
    const out = migrate(v2)
    expect(out && isDemoData(out)).toBe(true)
    expect(out?.assessments).toEqual([])
    expect(out?.students.every((s) => s.phone === "")).toBe(true)
    expect(out?.workouts).toEqual(v3.workouts)
  })

  it("migra v3 → v4: mensalidade, Pix, pagamentos e check-in vazios", () => {
    const v4 = seed()
    const { payments: _p, ...rest } = v4
    void _p
    const v3 = {
      ...rest,
      version: 3,
      profile: (({ pixKey: _k, ...p }) => (void _k, p))(v4.profile),
      students: v4.students.map(({ monthlyFee: _f, dueDay: _d, ...s }) => (void _f, void _d, s)),
      sessions: v4.sessions.map(({ checkin: _c, ...s }) => (void _c, s)),
    }
    const out = migrate(v3)
    expect(out && isDemoData(out)).toBe(true)
    expect(out?.payments).toEqual([])
    expect(out?.profile.pixKey).toBe("")
    expect(out?.students.every((s) => s.monthlyFee === null && s.dueDay === null)).toBe(true)
    expect(out?.sessions.every((s) => s.checkin === null)).toBe(true)
  })

  it("migra v4 → v5: WhatsApp e Instagram do perfil vazios", () => {
    const v5 = seed()
    const v4 = { ...v5, version: 4, profile: (({ whatsapp: _w, instagram: _i, ...p }) => (void _w, void _i, p))(v5.profile) }
    const out = migrate(v4)
    expect(out?.version).toBe(5)
    expect(out?.profile).toMatchObject({ whatsapp: "", instagram: "" })
  })

  it("seed tem avaliações válidas com % de gordura calculável", () => {
    const d = seed()
    expect(isDemoData(d)).toBe(true)
    const ana = d.assessments.filter((a) => a.studentId === "al-ana")
    expect(ana).toHaveLength(3)
    expect(ana.every((a) => bodyFat(a)?.source === "pollock3")).toBe(true)
  })
})

describe("recordes pessoais", () => {
  it("só conta quando supera a maior carga anterior do exercício", async () => {
    const { personalRecords } = await import("@/lib/metrics")
    const set = (exerciseId: string, load: number | null, done = true) => ({ itemId: "i", exerciseId, exerciseName: exerciseId, setIndex: 0, reps: 8, load, done })
    const s = (id: string, day: string, sets: ReturnType<typeof set>[]) => ({ id, studentId: "al", workoutId: "w", workoutName: "W", startedAt: `${day}T10:00:00.000Z`, finishedAt: `${day}T11:00:00.000Z`, status: "concluida" as const, sets, note: "", checkin: null })
    const d = { ...seed(), sessions: [s("a", "2026-09-01", [set("sq", 50), set("bp", 40)]), s("b", "2026-09-08", [set("sq", 55), set("sq", 52.5), set("bp", 40), set("dl", 80), set("bp", 45, false)])] }
    expect(personalRecords(d, d.sessions[1])).toEqual([{ exerciseId: "sq", exerciseName: "sq", load: 55, previous: 50 }])
    expect(personalRecords(d, d.sessions[0])).toEqual([])
  })
})

describe("equilíbrio da ficha", () => {
  it("conta séries por músculo (secundário vale meia) e aponta pares desequilibrados", async () => {
    const { muscleVolume, volumeLevels, balanceNotes } = await import("@/lib/volume")
    const d = seed()
    // Agachamento com barra: Quadríceps principal; Glúteos, Posteriores, Lombar, Panturrilha… secundários
    const vol = muscleVolume(d, [{ exerciseId: "Barbell_Squat", sets: 4 }])
    expect(vol[0]).toEqual({ muscle: "Quadríceps", sets: 4 })
    expect(vol.find((v) => v.muscle === "Posteriores")?.sets).toBe(2)
    expect(volumeLevels(vol)).toMatchObject({ Quadríceps: 4, Posteriores: 2 })
    expect(balanceNotes(vol)).toEqual([]) // exatamente metade não é sinalizado
    const quadHeavy = muscleVolume(d, [{ exerciseId: "Barbell_Squat", sets: 4 }, { exerciseId: "Leg_Extensions", sets: 4 }])
    expect(balanceNotes(quadHeavy)).toEqual(["Posteriores com 2 séries, menos da metade de Quadríceps (8)."])
    expect(balanceNotes(muscleVolume(d, [{ exerciseId: "Barbell_Squat", sets: 4 }, { exerciseId: "Lying_Leg_Curls", sets: 4 }]))).toEqual([])
    expect(muscleVolume(d, [{ exerciseId: "nao-existe", sets: 3 }])).toEqual([])
  })
})
