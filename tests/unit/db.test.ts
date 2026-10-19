import { beforeAll, describe, expect, it } from "vitest"
import { PGlite } from "@electric-sql/pglite"
import type { Db } from "@/lib/server/db"
import { withTenant } from "@/lib/server/db"
import { migrate } from "@/lib/server/migrate"
import * as Auth from "@/lib/server/auth"
import * as Admin from "@/lib/server/admin"
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
  expect(await migrate(db)).toEqual(["001_init.sql", "002_assessments_phone.sql", "003_student_credentials.sql", "0042_exercise_illustrations.sql", "004_fees_checkin.sql", "005_admin.sql", "006_contacts_admin_flag.sql", "007_workout_dates.sql"])
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
    await expectStatus(run({ sessions: { upsert: [{ id: "s1", studentId: "al-carlos", workoutId: "tr-a", workoutName: "x", startedAt: new Date().toISOString(), finishedAt: null, status: "em_andamento", sets: [], note: "", checkin: null }], delete: [] } }), 403)
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
    const base = { id: "se-x", workoutName: "x", startedAt: new Date().toISOString(), finishedAt: null, status: "em_andamento" as const, sets: [], note: "", checkin: null }
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

  it("mensalidade, pagamentos e check-in: personal controla, aluno registra o check-in e não vê valores", async () => {
    let d = await act(ana, (x) => A.updateStudent(x, "al-carlos", { ...x.students.find((s) => s.id === "al-carlos")!, monthlyFee: 350, dueDay: 10 }))
    d = await act(ana, (x) => A.saveProfile(x, { ...x.profile, pixKey: "ana@pix.com" }))
    d = await act(ana, (x) => A.markPaid(x, "al-carlos", "2026-09", 350, "pg-1"))
    expect(d.students.find((s) => s.id === "al-carlos")).toMatchObject({ monthlyFee: 350, dueDay: 10 })
    expect(d.profile.pixKey).toBe("ana@pix.com")
    // vencimento no dia 31 é aceito (nos meses curtos cai no último dia)
    d = await act(ana, (x) => A.updateStudent(x, "al-carlos", { ...x.students.find((s) => s.id === "al-carlos")!, dueDay: 31 }))
    expect(d.students.find((s) => s.id === "al-carlos")?.dueDay).toBe(31)
    d = await act(ana, (x) => A.updateStudent(x, "al-carlos", { ...x.students.find((s) => s.id === "al-carlos")!, dueDay: 10 }))
    // início e troca prevista da ficha vão e voltam do banco como AAAA-MM-DD
    const w0 = d.workouts[0]
    d = await act(ana, (x) => A.saveWorkout(x, A.withStartDate(w0, "2026-11-30")))
    expect(d.workouts.find((w) => w.id === w0.id)).toMatchObject({ startDate: "2026-11-30", changeDate: "2027-02-28" })
    expect(d.payments).toEqual([expect.objectContaining({ id: "pg-1", month: "2026-09", amount: 350 })])
    expect(diff(d, await load(ana))).toEqual({})
    // mesmo mês duas vezes: a ação ignora e o banco recusa
    expect(A.markPaid(d, "al-carlos", "2026-09", 350, "pg-2")).toBe(d)
    await expectStatus(withTenant(tenant(ana), (q) => applyChanges(q, tenant(ana), { payments: { upsert: [{ ...d.payments[0], id: "pg-dup" }], delete: [] } }), db), 409)

    // aluno não vê mensalidade, pagamentos nem Pix, e não grava pagamentos
    const c = await load(carlos)
    expect(c.payments).toEqual([])
    expect(c.profile.pixKey).toBe("")
    expect(c.students[0]).toMatchObject({ monthlyFee: null, dueDay: null })
    await expectStatus(withTenant(tenant(carlos), (q) => applyChanges(q, tenant(carlos), { payments: { upsert: [{ ...d.payments[0], id: "pg-x" }], delete: [] } }), db), 403)

    // check-in do aluno ao concluir
    let s = await act(carlos, (x) => A.startSession(x, "al-carlos", "tr-a", "se-ck"))
    s = await act(carlos, (x) => A.finishSession(x, "se-ck", "", { effort: 8, pain: "leve", sleep: "ok" }))
    expect(s.sessions.find((x) => x.id === "se-ck")?.checkin).toEqual({ effort: 8, pain: "leve", sleep: "ok" })
    expect((await load(ana)).sessions.find((x) => x.id === "se-ck")?.checkin).toEqual({ effort: 8, pain: "leve", sleep: "ok" })

    d = await act(ana, (x) => A.unmarkPaid(x, "al-carlos", "2026-09"))
    expect(d.payments).toEqual([])
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

describe("administração", () => {
  const ENV = " Bia@Exemplo.com , outra@exemplo.com"
  let caio: Acc

  beforeAll(async () => {
    caio = await signup("Caio Personal", "caio@exemplo.com")
    await act(caio, (x) =>
      A.addStudent(
        x,
        {
          name: "Aluna Secreta",
          goal: "",
          level: "iniciante",
          weeklyTarget: 3,
          notes: "",
        },
        "al-secreta",
      ),
    )
    await act(caio, (x) =>
      A.saveProfile(x, {
        ...x.profile,
        city: "Natal",
        state: "RN",
        specialties: ["Força"],
        directoryVisible: true,
      }),
    )
  })

  it("só e-mails em ADMIN_EMAILS (contas de personal) são admin", async () => {
    expect(Admin.isAdmin(bia, ENV)).toBe(true)
    expect(Admin.isAdmin(caio, ENV)).toBe(false)
    expect(Admin.isAdmin(null, ENV)).toBe(false)
    expect(Admin.isAdmin(bia, "")).toBe(false)
    expect(Admin.isAdmin({ ...bia, role: "student" }, ENV)).toBe(false)
    expect(() => Admin.assertAdmin(caio, ENV)).toThrow(expect.objectContaining({ status: 404 }))
  })

  it("visão geral e lista mostram números, nunca dados de alunos", async () => {
    const o = await Admin.overview(db)
    expect(o.trainers).toBeGreaterThanOrEqual(2)
    expect(o.students).toBeGreaterThanOrEqual(3)
    expect(o.listed).toBeGreaterThanOrEqual(1)
    expect(o.signups).toHaveLength(8)
    expect(o.signups.at(-1)!.count).toBeGreaterThanOrEqual(2)
    const list = await Admin.listTrainers(db)
    const c = list.find((t) => t.id === caio.trainerId)!
    expect(c).toMatchObject({
      email: "caio@exemplo.com",
      students: 1,
      directoryVisible: true,
      suspended: false,
    })
    expect(JSON.stringify({ o, list })).not.toContain("Aluna Secreta")
  })

  it("o papel admin não altera dados dos personais", async () => {
    const r = await withTenant({ role: "admin", trainerId: null }, (q) => q.query("update students set name = 'Invasão' where trainer_id = $1", [caio.trainerId]), db)
    expect(r.affectedRows ?? r.rowCount).toBe(0)
    await expect(withTenant({ role: "admin", trainerId: null }, (q) => q.query("delete from sessions"), db)).resolves.toBeDefined()
    expect((await load(caio)).students[0].name).toBe("Aluna Secreta")
  })

  it("senha provisória para o personal: derruba sessões e exige troca", async () => {
    const before = await Auth.login({ email: "caio@exemplo.com", password: "senha-segura-1" }, db)
    const { login, password } = await Admin.resetTrainerPassword(bia, caio.trainerId, db)
    expect(login).toBe("caio@exemplo.com")
    expect(await Auth.accountFromToken(before!.token, db)).toBeNull()
    expect(await Auth.login({ email: "caio@exemplo.com", password: "senha-segura-1" }, db)).toBeNull()
    const r = await Auth.login({ email: "caio@exemplo.com", password }, db)
    expect(r).toMatchObject({ role: "trainer", mustChangePassword: true })
    const acc = (await Auth.accountFromToken(r!.token, db))!
    await Auth.changePassword(acc, { password: "nova-senha-caio" }, r!.token, db)
    expect(await Auth.login({ email: "caio@exemplo.com", password: "nova-senha-caio" }, db)).toMatchObject({ mustChangePassword: false })
    await expectStatus(Admin.resetTrainerPassword(bia, "nao-e-uuid", db), 400)
  })

  it("suspender bloqueia o personal e os alunos; reativar devolve o acesso", async () => {
    const student = await Auth.createStudentAccess({ ...caio, mustChangePassword: false }, "al-secreta", db)
    const live = await Auth.login({ email: "caio@exemplo.com", password: "nova-senha-caio" }, db)
    await expectStatus(Admin.suspendTrainer(bia, bia.trainerId, "teste", db), 409)
    await expectStatus(Admin.suspendTrainer(bia, caio.trainerId, "", db), 400)
    await Admin.suspendTrainer(bia, caio.trainerId, "Cobrança indevida", db)
    expect(await Auth.accountFromToken(live!.token, db)).toBeNull()
    await expectStatus(Auth.login({ email: "caio@exemplo.com", password: "nova-senha-caio" }, db), 403)
    await expectStatus(Auth.login({ email: student.login, password: student.password }, db), 403)
    // senha errada continua só "incorreta": não revela a suspensão
    expect(await Auth.login({ email: "caio@exemplo.com", password: "errada-123" }, db)).toBeNull()
    const c = (await Admin.listTrainers(db)).find((t) => t.id === caio.trainerId)!
    expect(c).toMatchObject({ suspended: true, directoryVisible: false })
    expect((await Admin.overview(db)).suspended).toBe(1)

    await Admin.reactivateTrainer(bia, caio.trainerId, db)
    expect(await Auth.login({ email: "caio@exemplo.com", password: "nova-senha-caio" }, db)).toMatchObject({ role: "trainer" })
    expect(await Auth.login({ email: student.login, password: student.password }, db)).toMatchObject({ role: "student" })
  })

  it("tirar do diretório, saúde e registro de ações", async () => {
    await act(caio, (x) =>
      A.saveProfile(x, {
        ...x.profile,
        city: "Natal",
        state: "RN",
        specialties: ["Força"],
        directoryVisible: true,
      }),
    )
    await Admin.hideFromDirectory(bia, caio.trainerId, db)
    expect((await load(caio)).profile.directoryVisible).toBe(false)
    const h = await Admin.health(db)
    expect(h.applied).toContain("005_admin.sql")
    expect(h.pending).toEqual([])
    const log = await Admin.auditLog(10, db)
    expect(log.map((e) => e.action)).toEqual(["tirar_do_diretorio", "reativar", "suspender", "senha_provisoria"])
    expect(log[2]).toMatchObject({
      admin: "bia@exemplo.com",
      detail: "Cobrança indevida",
    })
    expect(log[0].target).toContain("Caio Personal")
  })
})

describe("contato público e admin pelo banco", () => {
  it("WhatsApp e Instagram: normaliza, valida e aparece no diretório", async () => {
    let d = await act(bia, (x) => A.saveProfile(x, { ...x.profile, city: "Natal", state: "RN", specialties: ["Força"], directoryVisible: true, whatsapp: "(84) 99876-5432", instagram: "https://instagram.com/bia.treina/" }))
    expect(d.profile).toMatchObject({ whatsapp: "84998765432", instagram: "bia.treina" })
    const pub = (await publicProfiles(db)).find((p) => p.slug === d.profile.slug)!
    expect(pub).toMatchObject({ whatsapp: "84998765432", instagram: "bia.treina" })
    expect(pub).not.toHaveProperty("pixKey")
    expect(A.normalizeInstagram("instagram.com/bia.treina?igsh=x")).toBe("bia.treina")
    expect(A.validateProfile({ ...d.profile, whatsapp: "123", instagram: "nome com espaço" })).toMatchObject({ whatsapp: expect.any(String), instagram: expect.any(String) })
    await expectStatus(act(bia, (x) => ({ ...x, profile: { ...x.profile, instagram: "inválido!" } })), 400)
    d = await act(bia, (x) => A.saveProfile(x, { ...x.profile, whatsapp: "", instagram: "@" }))
    expect(d.profile).toMatchObject({ whatsapp: "", instagram: "" })
  })

  it("users.is_admin dá acesso ao painel sem ADMIN_EMAILS", async () => {
    const r = await Auth.login({ email: "bia@exemplo.com", password: "senha-segura-1" }, db)
    expect(Admin.isAdmin(await Auth.accountFromToken(r!.token, db), "")).toBe(false)
    await db.tx((q) => q.query("update users set is_admin = true where lower(email) = 'bia@exemplo.com'"))
    expect(Admin.isAdmin(await Auth.accountFromToken(r!.token, db), "")).toBe(true)
    await expect(db.tx((q) => q.query("update users set is_admin = true where role = 'student'"))).rejects.toThrow()
  })
})
