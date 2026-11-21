import fs from "node:fs"
import path from "node:path"
import { getDb, withTenant, type Db, type Queryable } from "./db"
import { hashPassword, temporaryPassword, type Account } from "./auth"
import { HttpError } from "./workspace"
import { computeStatus, statusFor } from "./billing"
import { PLANS, TRIAL_DAYS, isPlanId, type PlanId } from "../plans"

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

/* ---------- Acesso, planos e monitoramento ---------- */

export interface AccessInfo {
  plan: PlanId | null
  /** situação resumida para filtros e etiquetas */
  state: "teste" | "teste_vencido" | "ativo" | "pendente" | "cancelado" | "vitalicio" | "liberado"
  source: "stripe" | "manual"
  until: string | null
  trialEndsAt: string | null
  hasAccess: boolean
  pendingLifetime: boolean
}

function accessOf(st: ReturnType<typeof computeStatus>, pending: boolean): AccessInfo {
  const state: AccessInfo["state"] = st.lifetime
    ? "vitalicio"
    : st.source === "manual" && st.hasAccess && !st.inTrial
      ? "liberado"
      : st.status === "active"
        ? "ativo"
        : st.status === "past_due"
          ? "pendente"
          : st.status === "canceled" && st.hasAccess
            ? "cancelado"
            : st.inTrial
              ? "teste"
              : "teste_vencido"
  return { plan: st.plan, state, source: st.source, until: st.currentPeriodEnd, trialEndsAt: st.trialEndsAt, hasAccess: st.hasAccess, pendingLifetime: pending }
}

/** Situação de acesso de todos os personais (um mapa por id). */
export async function accessByTrainer(db: Db = getDb()): Promise<Record<string, AccessInfo>> {
  return db.tx(async (q) => {
    const rows = (
      await q.query<Record<string, unknown>>(`select u.trainer_id, u.created_at, to_jsonb(b) as b,
        exists (select 1 from lifetime_requests r where r.trainer_id = u.trainer_id and r.status = 'pendente') as pending
        from (select trainer_id, min(created_at) as created_at from users where role = 'trainer' group by trainer_id) u
        left join billing b on b.trainer_id = u.trainer_id`)
    ).rows
    return Object.fromEntries(rows.map((r) => [String(r.trainer_id), accessOf(computeStatus((r.b as Record<string, unknown>) ?? undefined, r.created_at), !!r.pending)]))
  })
}

export interface BillingOverview {
  inTrial: number
  trialExpired: number
  paying: number
  lifetime: number
  manual: number
  pastDue: number
  byPlan: Record<string, number>
  /** Receita recorrente mensal estimada (centavos): assinaturas ativas do Stripe, anuais divididas por 12. */
  mrr: number
  pendingLifetime: number
  logins24h: number
  logins7d: number
  activeTrainers7d: number
  activeStudents7d: number
}

export function billingOverview(access: Record<string, AccessInfo>, logins: { logins24h: number; logins7d: number; activeTrainers7d: number; activeStudents7d: number }): BillingOverview {
  const list = Object.values(access)
  const byPlan: Record<string, number> = {}
  let mrr = 0
  for (const a of list) {
    if (a.state === "ativo" || a.state === "pendente") {
      if (a.plan) {
        byPlan[a.plan] = (byPlan[a.plan] ?? 0) + 1
        const p = PLANS[a.plan]
        if (a.source === "stripe" && p.interval) mrr += p.interval === "year" ? Math.round(p.amount / 12) : p.amount
      }
    }
    if (a.state === "vitalicio") byPlan.vitalicio = (byPlan.vitalicio ?? 0) + 1
  }
  return {
    inTrial: list.filter((a) => a.state === "teste").length,
    trialExpired: list.filter((a) => a.state === "teste_vencido").length,
    paying: list.filter((a) => a.state === "ativo" || a.state === "pendente" || a.state === "cancelado").length,
    lifetime: list.filter((a) => a.state === "vitalicio").length,
    manual: list.filter((a) => a.state === "liberado").length,
    pastDue: list.filter((a) => a.state === "pendente").length,
    byPlan,
    mrr,
    pendingLifetime: list.filter((a) => a.pendingLifetime).length,
    ...logins,
  }
}

export async function loginStats(db: Db = getDb()) {
  const r = (
    await db.tx((q) =>
      q.query<Record<string, unknown>>(`select
        count(*) filter (where at > now() - interval '24 hours')::int as l24,
        count(*) filter (where at > now() - interval '7 days')::int as l7,
        count(distinct trainer_id) filter (where at > now() - interval '7 days' and role = 'trainer')::int as t7,
        count(distinct user_id) filter (where at > now() - interval '7 days' and role = 'student')::int as s7
        from login_events where at > now() - interval '7 days'`),
    )
  ).rows[0]
  return { logins24h: num(r?.l24), logins7d: num(r?.l7), activeTrainers7d: num(r?.t7), activeStudents7d: num(r?.s7) }
}

export interface LoginEvent {
  at: string
  trainerId: string
  trainerName: string
  role: "trainer" | "student"
  who: string
  device: string
}

/** Acessos recentes (de toda a plataforma ou de um personal). Do aluno mostra só o login, nunca o nome. */
export async function recentLogins(trainerId: string | null, limit = 50, db: Db = getDb()): Promise<LoginEvent[]> {
  const rows = (
    await db.tx((q) =>
      q.query<Record<string, unknown>>(
        `select e.at, e.trainer_id, e.role, e.device, coalesce(u.email, u.username, '') as who
         from login_events e left join users u on u.id = e.user_id
         where ($1::uuid is null or e.trainer_id = $1::uuid) order by e.at desc limit $2`,
        [trainerId, Math.min(200, Math.max(1, limit))],
      ),
    )
  ).rows
  const ids = [...new Set(rows.map((r) => String(r.trainer_id)))]
  const names = ids.length
    ? new Map((await withTenant(ADMIN, (q) => q.query<{ id: string; name: string }>("select id, name from trainers where id = any($1::uuid[])", [ids]), db)).rows.map((t) => [t.id, t.name]))
    : new Map<string, string>()
  return rows.map((r) => ({
    at: iso(r.at)!,
    trainerId: String(r.trainer_id),
    trainerName: names.get(String(r.trainer_id)) ?? "—",
    role: r.role === "student" ? "student" : "trainer",
    who: String(r.who ?? ""),
    device: String(r.device ?? ""),
  }))
}

export interface LifetimeRequest {
  id: number
  trainerId: string
  trainerName: string
  email: string
  status: "pendente" | "pago" | "cancelado"
  createdAt: string
  handledAt: string | null
  handledBy: string | null
}

export async function lifetimeRequests(db: Db = getDb()): Promise<LifetimeRequest[]> {
  const rows = (
    await db.tx((q) =>
      q.query<Record<string, unknown>>(`select r.*, (select email from users u where u.trainer_id = r.trainer_id and u.role = 'trainer' limit 1) as email
        from lifetime_requests r order by (r.status = 'pendente') desc, r.created_at desc limit 100`),
    )
  ).rows
  const ids = [...new Set(rows.map((r) => String(r.trainer_id)))]
  const names = ids.length
    ? new Map((await withTenant(ADMIN, (q) => q.query<{ id: string; name: string }>("select id, name from trainers where id = any($1::uuid[])", [ids]), db)).rows.map((t) => [t.id, t.name]))
    : new Map<string, string>()
  return rows.map((r) => ({
    id: Number(r.id),
    trainerId: String(r.trainer_id),
    trainerName: names.get(String(r.trainer_id)) ?? "—",
    email: String(r.email ?? ""),
    status: r.status as LifetimeRequest["status"],
    createdAt: iso(r.created_at)!,
    handledAt: iso(r.handled_at),
    handledBy: (r.handled_by as string | null) ?? null,
  }))
}

export interface TrainerDetail {
  access: AccessInfo
  note: string
  logins: LoginEvent[]
  logins30: number
  studentLogins30: number
  requests: LifetimeRequest[]
  audit: AuditEntry[]
}

export async function trainerDetail(trainerId: unknown, db: Db = getDb()): Promise<TrainerDetail> {
  const t = await trainerTarget(trainerId, db)
  const access = await db.tx(async (q) => {
    const st = await statusFor(q, t.id)
    const b = (await q.query<Record<string, unknown>>("select note from billing where trainer_id = $1", [t.id])).rows[0]
    const p = await q.query("select 1 from lifetime_requests where trainer_id = $1 and status = 'pendente'", [t.id])
    return { info: accessOf(st, p.rows.length > 0), note: String(b?.note ?? "") }
  })
  const logins = await recentLogins(t.id, 30, db)
  const reqs = await lifetimeRequests(db)
  const auditRows = await db.tx((q) => q.query<Record<string, unknown>>("select at, admin_email, action, target, detail from admin_audit where target like $1 order by at desc limit 30", [`%(${t.id.slice(0, 8)})`]))
  const counts = await db.tx((q) =>
    q.query<Record<string, unknown>>(
      `select count(*) filter (where role = 'trainer')::int as t, count(*) filter (where role = 'student')::int as s from login_events where trainer_id = $1 and at > now() - interval '30 days'`,
      [t.id],
    ),
  )
  return {
    access: access.info,
    note: access.note,
    logins,
    logins30: num(counts.rows[0]?.t),
    studentLogins30: num(counts.rows[0]?.s),
    requests: reqs.filter((r) => r.trainerId === t.id),
    audit: auditRows.rows.map((x) => ({ at: iso(x.at)!, admin: String(x.admin_email), action: String(x.action), target: String(x.target), detail: String(x.detail) })),
  }
}

/**
 * Libera acesso manualmente (ex.: Vitalício pago por Pix, cortesia, parceria).
 * kind: "vitalicio" = para sempre; "dias" = N dias a partir de hoje (ou do fim da liberação atual).
 */
export async function grantAccess(admin: Account, trainerId: unknown, input: { kind: unknown; days?: unknown; plan?: unknown; note?: unknown }, db: Db = getDb()) {
  const t = await trainerTarget(trainerId, db)
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 300) : ""
  if (input.kind === "vitalicio") {
    await db.tx(async (q) => {
      await q.query(
        `insert into billing (trainer_id, plan, status, lifetime, source, note) values ($1, 'vitalicio', 'active', true, 'manual', $2)
         on conflict (trainer_id) do update set plan = 'vitalicio', status = 'active', lifetime = true, source = 'manual', note = $2, updated_at = now()`,
        [t.id, note],
      )
      await q.query("update lifetime_requests set status = 'pago', handled_at = now(), handled_by = $2 where trainer_id = $1 and status = 'pendente'", [t.id, admin.email.toLowerCase()])
      await audit(q, admin, "liberar_vitalicio", label(t), note)
    })
    return
  }
  if (input.kind !== "dias") throw new HttpError(400, "Tipo de liberação inválido.")
  const days = Number(input.days)
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { days: "Use de 1 a 3650 dias." } })
  const plan = isPlanId(input.plan) && input.plan !== "vitalicio" ? input.plan : "mensal"
  await db.tx(async (q) => {
    await q.query(
      `insert into billing (trainer_id, plan, status, source, manual_until, note) values ($1, $2, 'none', 'manual', now() + make_interval(days => $3), $4)
       on conflict (trainer_id) do update set plan = $2, source = 'manual', note = $4, updated_at = now(),
         manual_until = greatest(coalesce(billing.manual_until, now()), now()) + make_interval(days => $3)`,
      [t.id, plan, days, note],
    )
    await audit(q, admin, "liberar_acesso", label(t), `${days} dias (${PLANS[plan].name})${note ? ` · ${note}` : ""}`)
  })
}

/** Dá dias extras de teste grátis. */
export async function extendTrial(admin: Account, trainerId: unknown, days: unknown, db: Db = getDb()) {
  const t = await trainerTarget(trainerId, db)
  const n = Number(days)
  if (!Number.isInteger(n) || n < 1 || n > 365) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { days: "Use de 1 a 365 dias." } })
  await db.tx(async (q) => {
    // conta a partir de hoje se o teste já venceu
    const u = (await q.query<{ created_at: string }>("select min(created_at) as created_at from users where trainer_id = $1 and role = 'trainer'", [t.id])).rows[0]
    const b = (await q.query<{ trial_extra_days: number }>("select trial_extra_days from billing where trainer_id = $1", [t.id])).rows[0]
    const elapsed = u?.created_at ? Math.ceil((Date.now() - Date.parse(String(u.created_at))) / 86400_000) : 0
    const current = TRIAL_DAYS + (b?.trial_extra_days ?? 0)
    const extra = Math.min(3650, Math.max(current, elapsed) + n - TRIAL_DAYS)
    await q.query(
      `insert into billing (trainer_id, trial_extra_days) values ($1, $2)
       on conflict (trainer_id) do update set trial_extra_days = $2, updated_at = now()`,
      [t.id, extra],
    )
    await audit(q, admin, "estender_teste", label(t), `+${n} dias`)
  })
}

/** Remove a liberação manual (não mexe em assinatura paga pelo Stripe). */
export async function revokeAccess(admin: Account, trainerId: unknown, db: Db = getDb()) {
  const t = await trainerTarget(trainerId, db)
  await db.tx(async (q) => {
    const b = (await q.query<{ source: string; stripe_subscription_id: string | null }>("select source, stripe_subscription_id from billing where trainer_id = $1", [t.id])).rows[0]
    if (!b || b.source !== "manual") throw new HttpError(409, "Este personal não tem liberação manual. Assinaturas do Stripe são canceladas pelo painel do Stripe.")
    await q.query(
      `update billing set lifetime = false, manual_until = null, source = 'stripe',
         plan = case when stripe_subscription_id is null then null else plan end, updated_at = now() where trainer_id = $1`,
      [t.id],
    )
    await audit(q, admin, "remover_liberacao", label(t))
  })
}

export async function setLifetimeRequest(admin: Account, id: unknown, status: unknown, db: Db = getDb()) {
  const n = Number(id)
  if (!Number.isInteger(n) || (status !== "pago" && status !== "cancelado")) throw new HttpError(400, "Pedido inválido.")
  const r = (await db.tx((q) => q.query<{ trainer_id: string }>("select trainer_id from lifetime_requests where id = $1 and status = 'pendente'", [n]))).rows[0]
  if (!r) throw new HttpError(404, "Pedido não encontrado ou já resolvido.")
  if (status === "pago") return grantAccess(admin, r.trainer_id, { kind: "vitalicio", note: "Pix confirmado" }, db)
  const t = await trainerTarget(r.trainer_id, db)
  await db.tx(async (q) => {
    await q.query("update lifetime_requests set status = 'cancelado', handled_at = now(), handled_by = $2 where id = $1", [n, admin.email.toLowerCase()])
    await audit(q, admin, "cancelar_pedido_vitalicio", label(t))
  })
}

/* ---------- Equipe de admins ---------- */

export interface AdminMember {
  email: string
  name: string
  /** Definido em ADMIN_EMAILS (só sai pela configuração do servidor). */
  fromEnv: boolean
  lastLoginAt: string | null
}

export async function listAdmins(db: Db = getDb()): Promise<AdminMember[]> {
  const env = adminEmails()
  const rows = (
    await db.tx((q) =>
      q.query<{ email: string; trainer_id: string; last_login_at: unknown; is_admin: boolean }>(
        "select email, trainer_id, last_login_at, is_admin from users where role = 'trainer' and email is not null and (is_admin or lower(email) = any($1::text[]))",
        [env],
      ),
    )
  ).rows
  const ids = rows.map((r) => r.trainer_id)
  const names = ids.length ? new Map((await withTenant(ADMIN, (q) => q.query<{ id: string; name: string }>("select id, name from trainers where id = any($1::uuid[])", [ids]), db)).rows.map((t) => [t.id, t.name])) : new Map()
  return rows
    .map((r) => ({ email: r.email, name: names.get(r.trainer_id) ?? "", fromEnv: env.includes(r.email.toLowerCase()), lastLoginAt: iso(r.last_login_at) }))
    .sort((a, b) => a.email.localeCompare(b.email))
}

/** Dá ou tira acesso ao admin. A pessoa precisa ter conta de personal no EVOFIT. */
export async function setAdmin(admin: Account, email: unknown, on: boolean, db: Db = getDb()) {
  const e = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!e.includes("@") || e.length > 254) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { email: "Informe um e-mail válido." } })
  if (!on && e === admin.email.toLowerCase()) throw new HttpError(409, "Você não pode tirar o próprio acesso de admin.")
  if (!on && adminEmails().includes(e)) throw new HttpError(409, "Este admin vem da configuração do servidor (ADMIN_EMAILS).")
  await db.tx(async (q) => {
    const u = (await q.query<{ id: string; role: string }>("select id, role from users where lower(email) = $1", [e])).rows[0]
    if (!u) throw Object.assign(new HttpError(404, "Não existe conta com este e-mail."), { fields: { email: "Peça para a pessoa criar uma conta de personal no EVOFIT primeiro." } })
    if (u.role !== "trainer") throw Object.assign(new HttpError(400, "Só contas de personal podem ser admin."), { fields: { email: "Este e-mail é de um aluno." } })
    await q.query("update users set is_admin = $2 where id = $1", [u.id, on])
    await audit(q, admin, on ? "adicionar_admin" : "remover_admin", e)
  })
}

/* ---------- Bloco de ideias ---------- */

export interface AdminNote {
  id: number
  category: "marketing" | "produto" | "vendas" | "geral"
  text: string
  done: boolean
  createdBy: string
  createdAt: string
}
const CATS = ["marketing", "produto", "vendas", "geral"]

export async function listNotes(db: Db = getDb()): Promise<AdminNote[]> {
  const rows = (await db.tx((q) => q.query<Record<string, unknown>>("select * from admin_notes order by done, created_at desc limit 300"))).rows
  return rows.map((r) => ({ id: Number(r.id), category: r.category as AdminNote["category"], text: String(r.text), done: !!r.done, createdBy: String(r.created_by), createdAt: iso(r.created_at)! }))
}

export async function noteAction(admin: Account, body: Record<string, unknown>, db: Db = getDb()) {
  await db.tx(async (q) => {
    if (body.op === "add") {
      const text = typeof body.text === "string" ? body.text.trim() : ""
      if (!text || text.length > 500) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { text: "Escreva a ideia (até 500 caracteres)." } })
      const cat = CATS.includes(String(body.category)) ? String(body.category) : "geral"
      await q.query("insert into admin_notes (category, text, created_by) values ($1, $2, $3)", [cat, text, admin.email.toLowerCase()])
      return
    }
    const id = Number(body.id)
    if (!Number.isInteger(id)) throw new HttpError(400, "Ideia inválida.")
    if (body.op === "toggle") await q.query("update admin_notes set done = not done where id = $1", [id])
    else if (body.op === "delete") await q.query("delete from admin_notes where id = $1", [id])
    else throw new HttpError(400, "Ação inválida.")
  })
}
