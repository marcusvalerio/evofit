import fs from "node:fs"
import path from "node:path"
import { getDb, withTenant, type Db, type Queryable } from "./db"
import { hashPassword, temporaryPassword, type Account } from "./auth"
import { HttpError } from "./workspace"

/**
 * Painel de administração do EVOFIT: quem opera a plataforma acompanha crescimento, uso e saúde,
 * e age sobre contas de personal (senha provisória, suspensão, saída do diretório).
 *
 * Privacidade: o admin vê números agregados e dados da conta do personal (nome, e-mail, datas).
 * Nunca vê nomes, medidas, treinos ou valores dos alunos.
 */

/**
 * Admin = conta de personal marcada no banco (users.is_admin) ou cujo e-mail está em ADMIN_EMAILS
 * (lista separada por vírgula).
 */
export function adminEmails(env = process.env.ADMIN_EMAILS) {
  return (env ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"))
}

export function isAdmin(account: Account | null, env?: string) {
  return !!account && account.role === "trainer" && !account.mustChangePassword && (!!account.isAdmin || adminEmails(env).includes(account.email.toLowerCase()))
}

/** Para quem não é admin a área simplesmente não existe (404). */
export function assertAdmin(account: Account | null, env?: string): asserts account is Account {
  if (!isAdmin(account, env)) throw new HttpError(404, "Página não encontrada.")
}

const ADMIN = { role: "admin" as const, trainerId: null }
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)
const num = (v: unknown) => Number(v ?? 0)

/* ---------- Visão geral ---------- */

export interface Overview {
  trainers: number
  trainersNew7: number
  trainersNew30: number
  /** Personais com ao menos um aluno e uma ficha: já usam o produto de verdade. */
  activated: number
  listed: number
  suspended: number
  students: number
  studentLogins: number
  studentsActive7: number
  trainersActive7: number
  workouts: number
  sessions7: number
  sessions30: number
  /** Cadastros de personal por semana (8 semanas, a mais antiga primeiro). */
  signups: { week: string; count: number }[]
}

export async function overview(db: Db = getDb()): Promise<Overview> {
  const data = await withTenant(
    ADMIN,
    async (q) => {
      const r = (
        await q.query(`select
          (select count(*)::int from trainers) as trainers,
          (select count(*)::int from trainers where created_at > now() - interval '7 days') as new7,
          (select count(*)::int from trainers where created_at > now() - interval '30 days') as new30,
          (select count(*)::int from trainers t where exists (select 1 from students s where s.trainer_id = t.id)
             and exists (select 1 from workouts w where w.trainer_id = t.id)) as activated,
          (select count(*)::int from trainers where directory_visible) as listed,
          (select count(*)::int from students where status = 'ativo') as students,
          (select count(*)::int from workouts) as workouts,
          (select count(*)::int from sessions where status = 'concluida' and finished_at > now() - interval '7 days') as s7,
          (select count(*)::int from sessions where status = 'concluida' and finished_at > now() - interval '30 days') as s30`)
      ).rows[0] as Record<string, unknown>
      const weeks = (
        await q.query<{ week: Date | string; count: number }>(
          `select date_trunc('week', created_at) as week, count(*)::int as count from trainers
           where created_at >= date_trunc('week', now()) - interval '7 weeks' group by 1`,
        )
      ).rows
      return { r, weeks }
    },
    db,
  )
  const u = (
    await db.tx((q) =>
      q.query(`select
        count(*) filter (where role = 'student')::int as student_logins,
        count(*) filter (where role = 'student' and last_login_at > now() - interval '7 days')::int as students7,
        count(*) filter (where role = 'trainer' and last_login_at > now() - interval '7 days')::int as trainers7,
        count(*) filter (where role = 'trainer' and disabled_at is not null)::int as suspended
        from users`),
    )
  ).rows[0] as Record<string, unknown>

  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - 7 * 7) // segunda-feira, 7 semanas atrás
  const byWeek = new Map(data.weeks.map((w) => [new Date(w.week).toISOString().slice(0, 10), num(w.count)]))
  const signups = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i * 7)
    const week = d.toISOString().slice(0, 10)
    return { week, count: byWeek.get(week) ?? 0 }
  })

  return {
    trainers: num(data.r.trainers),
    trainersNew7: num(data.r.new7),
    trainersNew30: num(data.r.new30),
    activated: num(data.r.activated),
    listed: num(data.r.listed),
    suspended: num(u.suspended),
    students: num(data.r.students),
    studentLogins: num(u.student_logins),
    studentsActive7: num(u.students7),
    trainersActive7: num(u.trainers7),
    workouts: num(data.r.workouts),
    sessions7: num(data.r.s7),
    sessions30: num(data.r.s30),
    signups,
  }
}

/* ---------- Personais ---------- */

export interface TrainerRow {
  id: string
  name: string
  slug: string
  email: string | null
  createdAt: string
  lastLoginAt: string | null
  lastActivityAt: string | null
  students: number
  studentLogins: number
  workouts: number
  sessions7: number
  directoryVisible: boolean
  suspended: boolean
  mustChangePassword: boolean
}

export async function listTrainers(db: Db = getDb()): Promise<TrainerRow[]> {
  const rows = await withTenant(
    ADMIN,
    (q) =>
      q.query<Record<string, unknown>>(`select t.id, t.name, t.slug, t.created_at, t.directory_visible,
        (select count(*)::int from students s where s.trainer_id = t.id and s.status = 'ativo') as students,
        (select count(*)::int from workouts w where w.trainer_id = t.id) as workouts,
        (select count(*)::int from sessions x where x.trainer_id = t.id and x.status = 'concluida' and x.finished_at > now() - interval '7 days') as s7,
        (select max(x.finished_at) from sessions x where x.trainer_id = t.id and x.status = 'concluida') as last_session
        from trainers t order by t.created_at desc limit 500`),
    db,
  )
  const users = (
    await db.tx((q) =>
      q.query<Record<string, unknown>>(`select trainer_id,
        max(email) filter (where role = 'trainer') as email,
        max(last_login_at) filter (where role = 'trainer') as last_login,
        bool_or(disabled_at is not null) filter (where role = 'trainer') as suspended,
        bool_or(must_change_password) filter (where role = 'trainer') as must_change,
        count(*) filter (where role = 'student')::int as student_logins,
        max(last_login_at) as any_login
        from users group by trainer_id`),
    )
  ).rows
  const byTrainer = new Map(users.map((u) => [String(u.trainer_id), u]))
  return rows.rows.map((t) => {
    const u = byTrainer.get(String(t.id))
    const activity = [iso(t.last_session), iso(u?.any_login)].filter(Boolean).sort().at(-1) ?? null
    return {
      id: String(t.id),
      name: String(t.name),
      slug: String(t.slug),
      email: (u?.email as string | null) ?? null,
      createdAt: iso(t.created_at)!,
      lastLoginAt: iso(u?.last_login),
      lastActivityAt: activity,
      students: num(t.students),
      studentLogins: num(u?.student_logins),
      workouts: num(t.workouts),
      sessions7: num(t.s7),
      directoryVisible: !!t.directory_visible,
      suspended: !!u?.suspended,
      mustChangePassword: !!u?.must_change,
    }
  })
}

/* ---------- Saúde ---------- */

export interface Health {
  dbLatencyMs: number
  applied: string[]
  /** Migrações presentes no código e ainda não aplicadas (null se a pasta não está disponível). */
  pending: string[] | null
  liveSessions: number
  adminsConfigured: number
}

export async function health(db: Db = getDb(), dir = path.join(process.cwd(), "db/migrations")): Promise<Health> {
  const t0 = performance.now()
  await db.tx((q) => q.query("select 1"))
  const dbLatencyMs = Math.round(performance.now() - t0)
  const { tracked, applied, live } = await db.tx(async (q) => {
    // bancos criados sem o script de migração (ex.: banco local de testes) não têm o controle
    const tracked = !!(await q.query<{ t: string | null }>("select to_regclass('schema_migrations')::text as t")).rows[0]?.t
    return {
      tracked,
      applied: tracked ? (await q.query<{ name: string }>("select name from schema_migrations order by name")).rows.map((r) => r.name) : [],
      live: num((await q.query<{ n: number }>("select count(*)::int as n from auth_sessions where expires_at > now()")).rows[0]?.n),
    }
  })
  let pending: string[] | null = null
  if (tracked)
    try {
      pending = fs
        .readdirSync(dir)
        .filter((f) => /^\d+_.+\.sql$/.test(f))
        .sort()
        .filter((f) => !applied.includes(f))
    } catch {
      pending = null
    }
  return {
    dbLatencyMs,
    applied,
    pending,
    liveSessions: live,
    adminsConfigured: adminEmails().length,
  }
}

/* ---------- Auditoria ---------- */

export interface AuditEntry {
  at: string
  admin: string
  action: string
  target: string
  detail: string
}

async function audit(q: Queryable, admin: Account, action: string, target: string, detail = "") {
  await q.query("insert into admin_audit (admin_email, action, target, detail) values ($1, $2, $3, $4)", [admin.email.toLowerCase(), action, target.slice(0, 120), detail.slice(0, 300)])
}

export async function auditLog(limit = 50, db: Db = getDb()): Promise<AuditEntry[]> {
  const r = await db.tx((q) =>
    q.query<{
      at: Date | string
      admin_email: string
      action: string
      target: string
      detail: string
    }>("select at, admin_email, action, target, detail from admin_audit order by at desc, id desc limit $1", [Math.min(200, Math.max(1, limit))]),
  )
  return r.rows.map((x) => ({
    at: iso(x.at)!,
    admin: x.admin_email,
    action: x.action,
    target: x.target,
    detail: x.detail,
  }))
}

/* ---------- Ações sobre a conta do personal ---------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function trainerTarget(trainerId: unknown, db: Db) {
  if (typeof trainerId !== "string" || !UUID.test(trainerId)) throw new HttpError(400, "Personal inválido.")
  const t = (await withTenant(ADMIN, (q) => q.query<{ id: string; name: string }>("select id, name from trainers where id = $1", [trainerId]), db)).rows[0]
  if (!t) throw new HttpError(404, "Personal não encontrado.")
  return t
}

const label = (t: { id: string; name: string }) => `${t.name} (${t.id.slice(0, 8)})`

/**
 * "Esqueci minha senha" do personal: o admin gera uma senha provisória (mostrada só nesta resposta),
 * encerra as sessões e o personal cria uma nova senha no próximo acesso.
 */
export async function resetTrainerPassword(admin: Account, trainerId: unknown, db: Db = getDb()) {
  const t = await trainerTarget(trainerId, db)
  const password = temporaryPassword()
  const hash = await hashPassword(password)
  return db.tx(async (q) => {
    const u = (await q.query<{ id: string; email: string | null }>("select id, email from users where trainer_id = $1 and role = 'trainer'", [t.id])).rows[0]
    if (!u) throw new HttpError(404, "Este personal não tem login.")
    await q.query("update users set password_hash = $2, must_change_password = true where id = $1", [u.id, hash])
    await q.query("delete from auth_sessions where user_id = $1", [u.id])
    await audit(q, admin, "senha_provisoria", label(t))
    return { login: u.email ?? "", password }
  })
}

/** Suspende o personal e os logins dos alunos dele, encerra as sessões e tira o perfil do diretório. */
export async function suspendTrainer(admin: Account, trainerId: unknown, reason: unknown, db: Db = getDb()) {
  const t = await trainerTarget(trainerId, db)
  if (t.id === admin.trainerId) throw new HttpError(409, "Você não pode suspender a própria conta.")
  const why = typeof reason === "string" ? reason.trim().slice(0, 300) : ""
  if (why.length < 3)
    throw Object.assign(new HttpError(400, "Verifique os campos."), {
      fields: { reason: "Explique o motivo (fica no registro)." },
    })
  await withTenant(ADMIN, (q) => q.query("update trainers set directory_visible = false where id = $1", [t.id]), db)
  await db.tx(async (q) => {
    await q.query("update users set disabled_at = now() where trainer_id = $1 and disabled_at is null", [t.id])
    await q.query("delete from auth_sessions where user_id in (select id from users where trainer_id = $1)", [t.id])
    await audit(q, admin, "suspender", label(t), why)
  })
}

export async function reactivateTrainer(admin: Account, trainerId: unknown, db: Db = getDb()) {
  const t = await trainerTarget(trainerId, db)
  await db.tx(async (q) => {
    await q.query("update users set disabled_at = null where trainer_id = $1", [t.id])
    await audit(q, admin, "reativar", label(t))
  })
}

/** Tira o perfil do diretório público (o personal pode voltar a aparecer pelo próprio perfil). */
export async function hideFromDirectory(admin: Account, trainerId: unknown, db: Db = getDb()) {
  const t = await trainerTarget(trainerId, db)
  await withTenant(ADMIN, (q) => q.query("update trainers set directory_visible = false where id = $1", [t.id]), db)
  await db.tx((q) => audit(q, admin, "tirar_do_diretorio", label(t)))
}
