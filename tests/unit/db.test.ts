import { beforeAll, describe, expect, it } from "vitest"
import { PGlite } from "@electric-sql/pglite"
import type { Db } from "@/lib/server/db"
import { withTenant } from "@/lib/server/db"
import { migrate } from "@/lib/server/migrate"
import * as Auth from "@/lib/server/auth"
import { applyChanges, loadWorkspace } from "@/lib/server/workspace"
import { diff } from "@/lib/sync"
import { publicProfiles, sendContact } from "@/lib/server/directory"
import * as A from "@/lib/actions"
import type { DemoData } from "@/lib/types"

let db: Db

async function pglite(): Promise<Db> {
  const pg = await PGlite.create()
  return {
    tx: (fn) =>
      pg.transaction((tx) =>
        fn({
          query: async (text: string, params?: unknown[]) => {
            if (!params?.length && text.includes(";")) {
              const rs = await tx.exec(text)
              return (rs.at(-1) ?? { rows: [] }) as never
            }
            return tx.query(text, params) as never
          },
        }),
      ),
  }
}

type Acc = Auth.Account
const tenant = (a: Acc) => (a.role === "trainer" ? { role: "trainer" as const, trainerId: a.trainerId } : { role: "student" as const, trainerId: a.trainerId, studentId: a.studentId! })
const load = (a: Acc) => withTenant(tenant(a), (q) => loadWorkspace(q, tenant(a)), db)
/** Aplica uma ação pura do app como o cliente faz: calcula o diff e envia. */
async function act(a: Acc, fn: (d: DemoData) => DemoData) {
  const prev = await load(a)
  const next = fn(prev)
  await withTenant(tenant(a), (q) => applyChanges(q, tenant(a), diff(prev, next)), db)
  return load(a)
}
const expectStatus = async (p: Promise<unknown>, status: number) => {
  await expect(p).rejects.toMatchObject({ status })
}

async function signup(name: string, email: string) {
  const { token } = await Auth.signupTrainer({ name, email, password: "senha-segura-1" }, db)
  return (await Auth.accountFromToken(token, db))!
}

let ana: Acc
let bia: Acc

beforeAll(async () => {
  db = await pglite()
  expect(await migrate(db)).toEqual(["001_init.sql", "002_assessments_phone.sql", "003_student_credentials.sql", "0042_exercise_illustrations.sql"])
  ana = await signup("Ana Personal", "ana@exemplo.com")
  bia = await signup("Bia Personal", "bia@exemplo.com")
}, 60_000)

describe("banco: migrações e contas", () => {
  it("migração é idempotente", async () => {
    expect(await migrate(db)).toEqual([])
  })

  it("senha com scrypt, login e e-mail único", async () => {
    const h = await Auth.hashPassword("abc12345")
    expect(h).toMatch(/^scrypt\$/)
    expect(await Auth.verifyPassword("abc12345", h)).toBe(true)
    expect(await Auth.verifyPassword("errada123", h)).toBe(false)
    expect(await Auth.login({ email: "ANA@exemplo.com", password: "senha-segura-1" }, db)).toMatchObject({ role: "trainer" })
    expect(await Auth.login({ email: "ana@exemplo.com", password: "outra-senha" }, db)).toBeNull()
    expect(await Auth.login({ email: "ninguem@exemplo.com", password: "senha-segura-1" }, db)).toBeNull()
    await expectStatus(Auth.signupTrainer({ name: "Outra", email: "Ana@Exemplo.com", password: "senha-segura-1" }, db), 409)
    await expectStatus(Auth.signupTrainer({ name: "X", email: "invalido", password: "123" }, db), 400)
  })

  it("sessão inválida ou após logout não autentica", async () => {
    expect(await Auth.accountFromToken("token-inventado", db)).toBeNull()
    const r = await Auth.login({ email: "bia@exemplo.com", password: "senha-segura-1" }, db)
    expect(await Auth.accountFromToken(r!.token, db)).toMatchObject({ email: "bia@exemplo.com" })
    await Auth.logout(r!.token, db)
    expect(await Auth.accountFromToken(r!.token, db)).toBeNull()
  })

  it("limita tentativas", async () => {
    const results = []
    for (let i = 0; i < 4; i++) results.push(await Auth.throttle("teste", 3, 15, db))
    expect(results).toEqual([true, true, true, false])
  })
})

describe("dados do personal no banco", () => {
  it("conta nova começa vazia e grava/relê o que as telas fazem", async () => {
    const d0 = await load(ana)
    expect(d0.students).toEqual([])
    expect(d0.profile.name).toBe("Ana Personal")
    let d = await act(ana, (x) => A.addStudent(x, { name: "Carlos Aluno", goal: "Força", level: "iniciante", weeklyTarget: 3, notes: "" }, "al-carlos"))
    d = await act(ana, (x) => A.addStudent(x, { name: "Duda Aluna", goal: "", level: "avancado", weeklyTarget: 4, notes: "" }, "al-duda"))
    d = await act(ana, (x) => A.addExercise(x, { name: "Remada cavalinho", muscleGroup: "Costas", equipment: "Barra T", instructions: "" }, "ex-own"))
    d = await act(ana, (x) => A.createWorkout(x, "Treino A", "tr-a"))
    d = await act(ana, (x) => A.saveWorkout(x, { ...x.workouts[0], items: [{ ...A.newWorkoutItem("Barbell_Squat"), id: "i1" }, { ...A.newWorkoutItem("ex-own"), id: "i2" }] }))
    d = await act(ana, (x) => A.toggleAssignment(x, "tr-a", "al-carlos"))
    d = await act(ana, (x) => A.setExerciseMedia(x, "Barbell_Squat", { videoUrl: "https://youtu.be/dQw4w9WgXcQ", tip: "Desça devagar" }))
    d = await act(ana, (x) => A.saveProfile(x, { ...x.profile, city: "Recife", state: "pe", specialties: ["Força"], directoryVisible: true }))
    expect(d.students.map((s) => s.name)).toEqual(["Carlos Aluno", "Duda Aluna"])
    expect(d.workouts[0]).toMatchObject({ name: "Treino A", studentIds: ["al-carlos"] })
    expect(d.workouts[0].items.map((i) => i.exerciseId)).toEqual(["Barbell_Squat", "ex-own"])
    expect(d.exerciseMedia.Barbell_Squat).toEqual({ videoUrl: "https://youtu.be/dQw4w9WgXcQ", tip: "Desça devagar" })
    expect(d.profile).toMatchObject({ city: "Recife", state: "PE", directoryVisible: true })
    // o reenvio do mesmo estado não gera mudanças (formato estável ida e volta)
    expect(diff(d, await load(ana))).toEqual({})
  })

  it("isolamento: outro personal não vê nem altera os dados", async () => {
    const d = await load(bia)
    expect(d.students).toEqual([])
    expect(d.workouts).toEqual([])
    // mesmo com SQL direto, a RLS filtra
    const rows = await withTenant({ role: "trainer", trainerId: bia.trainerId }, async (q) => {
      const r = await q.query("select * from students")
      const u = await q.query("update students set name = 'Hackeado' where trainer_id = $1", [ana.trainerId])
      return { r: r.rows.length, u: u.affectedRows }
    }, db)
    expect(rows).toEqual({ r: 0, u: 0 })
    // inserir com o tenant de outro personal é bloqueado pela política
    await expect(
      withTenant({ role: "trainer", trainerId: bia.trainerId }, (q) =>
        q.query("insert into students (trainer_id, id, name, level, weekly_target, status, created_at) values ($1, 'x', 'Intruso', 'iniciante', 3, 'ativo', now())", [ana.trainerId]),
      db),
    ).rejects.toMatchObject({ code: "42501" })
    // mesmo id de aluno em outro personal não colide
    await act(bia, (x) => A.addStudent(x, { name: "Aluno da Bia", goal: "", level: "iniciante", weeklyTarget: 2, notes: "" }, "al-carlos"))
    expect((await load(ana)).students.find((s) => s.id === "al-carlos")?.name).toBe("Carlos Aluno")
  })

  it("regras do servidor: dados inválidos e operações não permitidas", async () => {
    const d = await load(ana)
    const run = (c: Parameters<typeof applyChanges>[2]) => withTenant(tenant(ana), (q) => applyChanges(q, tenant(ana), c), db)
    await expectStatus(run({ students: { upsert: [{ ...d.students[0], weeklyTarget: 12 }], delete: [] } }), 400)
    await expectStatus(run({ students: { upsert: [], delete: ["al-carlos"] } }), 403)
    await expectStatus(run({ media: { upsert: [{ exerciseId: "Leg_Press", videoUrl: "https://evil.com/x", tip: "" }], delete: [] } }), 400)
    await expectStatus(run({ exercises: { upsert: [], delete: ["ex-own"] } }), 400) // em uso
    await expectStatus(run({ workouts: { upsert: [{ ...d.workouts[0], studentIds: ["nao-existe"] }], delete: [] } }), 400)
    await expectStatus(run({ sessions: { upsert: [{ id: "s1", studentId: "al-carlos", workoutId: "tr-a", workoutName: "x", startedAt: new Date().toISOString(), finishedAt: null, status: "em_andamento", sets: [], note: "" }], delete: [] } }), 403)
    // nada foi gravado pelas tentativas recusadas
    expect(await load(ana)).toEqual(d)
  })
})

describe("diretório público", () => {
  it("só mostra e só aceita contato de quem optou por aparecer", async () => {
    const names = (await publicProfiles(db)).map((p) => p.name)
    expect(names).toContain("Ana Personal") // optou no teste anterior
    expect(names).not.toContain("Bia Personal")
    const bSlug = (await load(bia)).profile.slug
    await expectStatus(sendContact({ slug: bSlug, name: "Visitante", contact: "v@exemplo.com", message: "", consent: true }, db), 404)
    await expectStatus(sendContact({ slug: (await load(ana)).profile.slug, name: "Visitante", contact: "v@exemplo.com", message: "" }, db), 400) // sem consentimento
    await sendContact({ slug: (await load(ana)).profile.slug, name: "Visitante", contact: "v@exemplo.com", message: "Quero treinar", consent: true }, db)
    expect((await load(ana)).contactRequests.map((c) => c.message)).toEqual(["Quero treinar"])
    // o papel público não lê nada além dos perfis visíveis
    const leak = await withTenant({ role: "public", trainerId: ana.trainerId }, async (q) => {
      const tables = ["students", "workouts", "sessions", "exercise_media", "contact_requests"]
      let n = 0
      for (const t of tables) n += (await q.query(`select * from ${t}`)).rows.length
      return n
    }, db)
    expect(leak).toBe(0)
  })
})

describe("aluno com convite", () => {
  let carlos: Acc

  it("convite cria login do aluno e só uma vez", async () => {
    await expectStatus(Auth.createInvite(ana, "nao-existe", db), 404)
    await expectStatus(Auth.createInvite(bia, "al-duda", db), 404) // aluno de outro personal
    const { code } = await Auth.createInvite(ana, "al-carlos", db)
    expect(await Auth.inviteInfo(code, db)).toEqual({ trainerName: "Ana Personal", studentName: "Carlos Aluno" })
    const { token } = await Auth.acceptInvite(code, { email: "carlos@exemplo.com", password: "senha-do-aluno" }, db)
    carlos = (await Auth.accountFromToken(token, db))!
    expect(carlos).toMatchObject({ role: "student", studentId: "al-carlos", trainerId: ana.trainerId })
    await expectStatus(Auth.acceptInvite(code, { email: "outro@exemplo.com", password: "senha-do-aluno" }, db), 410)
    await expectStatus(Auth.createInvite(ana, "al-carlos", db), 409)
    expect(await Auth.inviteInfo("codigo-falso", db)).toBeNull()
  })

  it("aluno vê só o que é dele", async () => {
    await act(ana, (x) => A.createWorkout(x, "Treino da Duda", "tr-duda"))
    const d = await load(carlos)
    expect(d.students.map((s) => s.id)).toEqual(["al-carlos"])
    expect(d.workouts.map((w) => w.id)).toEqual(["tr-a"])
    expect(d.contactRequests).toEqual([])
    expect(d.activeStudentId).toBe("al-carlos")
    expect(d.exerciseMedia.Barbell_Squat?.tip).toBe("Desça devagar")
  })

  it("aluno registra o treino; personal acompanha", async () => {
    let d = await act(carlos, (x) => A.startSession(x, "al-carlos", "tr-a", "se-1"))
    expect(d.sessions).toHaveLength(1)
    d = await act(carlos, (x) => A.updateSet(x, "se-1", "i1", 0, { done: true, reps: 9, load: 40 }))
    d = await act(carlos, (x) => A.finishSession(x, "se-1", "Pesado!"))
    expect(d.sessions[0]).toMatchObject({ status: "concluida", note: "Pesado!" })
    const t = await load(ana)
    expect(t.sessions.find((s) => s.id === "se-1")?.sets[0]).toMatchObject({ done: true, reps: 9, load: 40 })
  })

  it("aluno não altera o que não é dele", async () => {
    const d = await load(carlos)
    const run = (c: Parameters<typeof applyChanges>[2]) => withTenant(tenant(carlos), (q) => applyChanges(q, tenant(carlos), c), db)
    await expectStatus(run({ profile: { ...d.profile, name: "Hackeado" } }), 403)
    await expectStatus(run({ students: { upsert: [{ ...d.students[0], weeklyTarget: 7 }], delete: [] } }), 403)
    // treino concluído não volta a ser editado
    await expectStatus(run({ sessions: { upsert: [{ ...d.sessions[0], note: "editado" }], delete: [] } }), 403)
    await expectStatus(run({ sessions: { upsert: [], delete: ["se-1"] } }), 403)
    // sessão em nome de outro aluno ou em ficha não liberada
    const base = { id: "se-x", workoutName: "x", startedAt: new Date().toISOString(), finishedAt: null, status: "em_andamento" as const, sets: [], note: "" }
    await expectStatus(run({ sessions: { upsert: [{ ...base, studentId: "al-duda", workoutId: "tr-a" }], delete: [] } }), 403)
    await expectStatus(run({ sessions: { upsert: [{ ...base, studentId: "al-carlos", workoutId: "tr-duda" }], delete: [] } }), 403)
    // personal não pode apagar treino concluído
    await expectStatus(withTenant(tenant(ana), (q) => applyChanges(q, tenant(ana), { sessions: { upsert: [], delete: ["se-1"] } }), db), 403)
  })

  it("avaliações e telefone: personal grava, aluno só lê as próprias", async () => {
    const base = { date: "2026-09-01", sex: "M" as const, age: 30, weightKg: 80, heightCm: 178, skinfolds: { peitoral: 12, abdominal: 20, coxa: 15 }, circumferences: { cintura: 84 }, bodyFatPct: null, notes: "" }
    let d = await act(ana, (x) => A.updateStudent(x, "al-carlos", { ...x.students.find((s) => s.id === "al-carlos")!, phone: "(11) 98765-4321" }))
    expect(d.students.find((s) => s.id === "al-carlos")?.phone).toBe("11987654321")
    d = await act(ana, (x) => A.saveAssessment(x, "al-carlos", base, "av-c1"))
    d = await act(ana, (x) => A.saveAssessment(x, "al-duda", { ...base, sex: "F" }, "av-d1"))
    expect(d.assessments.map((a) => a.id)).toEqual(["av-c1", "av-d1"])
    expect(d.assessments[0]).toMatchObject({ weightKg: 80, skinfolds: { peitoral: 12 }, circumferences: { cintura: 84 } })
    expect(diff(d, await load(ana))).toEqual({})
    // aluno vê só a própria avaliação e não escreve
    const c = await load(carlos)
    expect(c.assessments.map((a) => a.id)).toEqual(["av-c1"])
    const run = (ch: Parameters<typeof applyChanges>[2]) => withTenant(tenant(carlos), (q) => applyChanges(q, tenant(carlos), ch), db)
    await expectStatus(run({ assessments: { upsert: [{ ...c.assessments[0], weightKg: 60 }], delete: [] } }), 403)
    // medidas fora da faixa são recusadas pelo servidor
    const bad = { ...d.assessments[0], id: "av-bad", weightKg: 900 }
    await expectStatus(withTenant(tenant(ana), (q) => applyChanges(q, tenant(ana), { assessments: { upsert: [bad], delete: [] } }), db), 400)
    d = await act(ana, (x) => A.deleteAssessment(x, "av-d1"))
    expect(d.assessments.map((a) => a.id)).toEqual(["av-c1"])
  })

  it("acesso gerado pelo personal: senha provisória, troca obrigatória, nova senha e revogação", async () => {
    await expectStatus(Auth.createStudentAccess(ana, "al-carlos", db), 409) // já tem login (convite)
    await expectStatus(Auth.createStudentAccess(bia, "al-duda", db), 404) // aluno de outro personal
    await expectStatus(Auth.createStudentAccess(carlos, "al-duda", db), 403) // aluno não gerencia acesso
    expect(await Auth.studentAccess(ana, "al-duda", db)).toEqual({ status: "none", login: null, lastLoginAt: null })

    const { login, password } = await Auth.createStudentAccess(ana, "al-duda", db)
    expect(login).toBe("duda.aluna")
    expect(password).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect((await Auth.studentAccess(ana, "al-duda", db)).status).toBe("pending")

    // entra com o usuário (sem diferenciar maiúsculas) e precisa trocar a senha
    const first = await Auth.login({ email: "DUDA.Aluna", password }, db)
    expect(first).toMatchObject({ role: "student", mustChangePassword: true })
    const second = await Auth.login({ email: "duda.aluna", password }, db)
    let duda = (await Auth.accountFromToken(first!.token, db))!
    expect(duda).toMatchObject({ studentId: "al-duda", mustChangePassword: true, email: "duda.aluna" })
    await expectStatus(Auth.changePassword(duda, { password: "curta" }, first!.token, db), 400)
    await expectStatus(Auth.changePassword(duda, { password }, first!.token, db), 400) // igual à provisória
    await Auth.changePassword(duda, { password: "minha-senha-nova" }, first!.token, db)
    duda = (await Auth.accountFromToken(first!.token, db))!
    expect(duda.mustChangePassword).toBe(false)
    expect(await Auth.accountFromToken(second!.token, db)).toBeNull() // outras sessões encerradas
    expect(await Auth.login({ email: "duda.aluna", password }, db)).toBeNull()
    expect(await Auth.login({ email: "duda.aluna", password: "minha-senha-nova" }, db)).toMatchObject({ mustChangePassword: false })
    const st = await Auth.studentAccess(ana, "al-duda", db)
    expect(st.status).toBe("active")
    expect(st.lastLoginAt).not.toBeNull()
    // fora do primeiro acesso, trocar a senha exige a atual
    await expectStatus(Auth.changePassword(duda, { password: "outra-senha-123" }, first!.token, db), 400)

    // nova senha: a anterior para de funcionar e todas as sessões caem
    const reset = await Auth.resetStudentPassword(ana, "al-duda", db)
    expect(reset.login).toBe("duda.aluna")
    expect(await Auth.accountFromToken(first!.token, db)).toBeNull()
    expect(await Auth.login({ email: "duda.aluna", password: "minha-senha-nova" }, db)).toBeNull()
    expect(await Auth.login({ email: "duda.aluna", password: reset.password }, db)).toMatchObject({ mustChangePassword: true })

    // nome repetido em outro personal ganha um sufixo
    await act(bia, (x) => A.addStudent(x, { name: "Duda Aluna", goal: "", level: "iniciante", weeklyTarget: 2, notes: "" }, "al-duda-b"))
    expect((await Auth.createStudentAccess(bia, "al-duda-b", db)).login).toMatch(/^duda\.aluna\.\d{3}$/)

    // revogar: login removido, dados continuam com o personal
    await Auth.revokeStudentAccess(ana, "al-duda", db)
    expect(await Auth.login({ email: "duda.aluna", password: reset.password }, db)).toBeNull()
    expect((await Auth.studentAccess(ana, "al-duda", db)).status).toBe("none")
    expect((await load(ana)).students.some((s) => s.id === "al-duda")).toBe(true)
  })

  it("excluir conta do personal apaga tudo, inclusive o login do aluno", async () => {
    await Auth.deleteAccount(ana, db)
    expect(await Auth.login({ email: "ana@exemplo.com", password: "senha-segura-1" }, db)).toBeNull()
    expect(await Auth.login({ email: "carlos@exemplo.com", password: "senha-do-aluno" }, db)).toBeNull()
    const left = await db.tx(async (q) => {
      await q.query("reset role")
      return (await q.query<{ n: number }>("select (select count(*) from users where trainer_id = $1)::int as n", [ana.trainerId])).rows[0].n
    })
    expect(left).toBe(0)
    // os dados da outra personal continuam
    expect((await load(bia)).students).toHaveLength(2)
  })
})
