import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { affected, getDb, withTenant, type Db, type Queryable } from "./db"
import { HttpError } from "./workspace"

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>

export interface Account {
  userId: string
  email: string
  role: "trainer" | "student"
  trainerId: string
  studentId: string | null
}

export const SESSION_DAYS = 30
const INVITE_DAYS = 7

/* ---------- Senhas e tokens ---------- */

const N = 16384
export async function hashPassword(pw: string) {
  const salt = randomBytes(16)
  const key = await scrypt(pw, salt, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt$${N}$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split("$")
  if (alg !== "scrypt" || !salt || !hash) return false
  const expected = Buffer.from(hash, "base64url")
  const key = await scrypt(pw, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 })
  return key.length === expected.length && timingSafeEqual(key, expected)
}

export const newToken = () => randomBytes(32).toString("base64url")
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex")

/* ---------- Validação de entrada ---------- */

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/

export function validateCredentials(email: unknown, password: unknown) {
  const errors: { email?: string; password?: string } = {}
  if (typeof email !== "string" || !EMAIL.test(email.trim()) || email.length > 254) errors.email = "Informe um e-mail válido."
  if (typeof password !== "string" || password.length < 8) errors.password = "A senha precisa ter pelo menos 8 caracteres."
  else if (password.length > 128) errors.password = "Use no máximo 128 caracteres."
  return errors
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "personal"

/* ---------- Limite de tentativas ---------- */

/** Até `max` tentativas por chave a cada `windowMin` minutos. */
export async function throttle(key: string, max = 10, windowMin = 15, db: Db = getDb()) {
  return db.tx(async (q) => {
    const r = await q.query<{ attempts: number }>(
      `insert into auth_throttle (key, attempts, window_start) values ($1, 1, now())
       on conflict (key) do update set
         attempts = case when auth_throttle.window_start < now() - make_interval(mins => $2) then 1 else auth_throttle.attempts + 1 end,
         window_start = case when auth_throttle.window_start < now() - make_interval(mins => $2) then now() else auth_throttle.window_start end
       returning attempts`,
      [key, windowMin],
    )
    return r.rows[0].attempts <= max
  })
}

/* ---------- Sessões ---------- */

async function createSession(q: Queryable, userId: string) {
  const token = newToken()
  await q.query(`insert into auth_sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))`, [hashToken(token), userId, SESSION_DAYS])
  return token
}

export async function accountFromToken(token: string | undefined, db: Db = getDb()): Promise<Account | null> {
  if (!token || token.length > 100) return null
  return db.tx(async (q) => {
    const r = await q.query<{ id: string; email: string; role: Account["role"]; trainer_id: string; student_id: string | null }>(
      `select u.id, u.email, u.role, u.trainer_id, u.student_id from auth_sessions s join users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now()`,
      [hashToken(token)],
    )
    const u = r.rows[0]
    return u ? { userId: u.id, email: u.email, role: u.role, trainerId: u.trainer_id, studentId: u.student_id } : null
  })
}

export async function logout(token: string | undefined, db: Db = getDb()) {
  if (!token) return
  await db.tx((q) => q.query("delete from auth_sessions where token_hash = $1", [hashToken(token)]))
}

/* ---------- Cadastro e login ---------- */

export async function signupTrainer(input: { name: unknown; email: unknown; password: unknown }, db: Db = getDb()) {
  const errors: Record<string, string> = { ...validateCredentials(input.email, input.password) }
  const name = typeof input.name === "string" ? input.name.trim() : ""
  if (name.length < 2 || name.length > 80) errors.name = "Informe seu nome (2 a 80 caracteres)."
  if (Object.keys(errors).length) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: errors })
  const email = String(input.email).trim().toLowerCase()
  const hash = await hashPassword(String(input.password))

  return db.tx(async (q) => {
    const exists = await q.query("select 1 from users where lower(email) = $1", [email])
    if (exists.rows.length) throw Object.assign(new HttpError(409, "Já existe uma conta com este e-mail."), { fields: { email: "Já existe uma conta com este e-mail. Tente entrar." } })
    const trainerId = randomUUID()
    const slug = `${slugify(name)}-${randomBytes(2).toString("hex")}`
    // o perfil do personal é criado com o papel restrito (RLS)
    await q.query("set local role evofit_app")
    await q.query("select set_config('app.role', 'trainer', true), set_config('app.trainer_id', $1, true)", [trainerId])
    await q.query("insert into trainers (id, slug, name) values ($1, $2, $3)", [trainerId, slug, name])
    await q.query("reset role")
    const userId = randomUUID()
    await q.query("insert into users (id, email, password_hash, role, trainer_id) values ($1, $2, $3, 'trainer', $4)", [userId, email, hash, trainerId])
    return { token: await createSession(q, userId), role: "trainer" as const }
  })
}

// hash fixo para gastar o mesmo tempo quando o e-mail não existe
const DUMMY = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

export async function login(input: { email: unknown; password: unknown }, db: Db = getDb()) {
  if (typeof input.email !== "string" || typeof input.password !== "string" || input.password.length > 128) return null
  const email = input.email.trim().toLowerCase()
  const u = await db.tx(async (q) => (await q.query<{ id: string; password_hash: string; role: Account["role"] }>("select id, password_hash, role from users where lower(email) = $1", [email])).rows[0])
  const ok = await verifyPassword(input.password, u?.password_hash ?? DUMMY)
  if (!u || !ok) return null
  const token = await db.tx((q) => createSession(q, u.id))
  return { token, role: u.role }
}

/* ---------- Convites de aluno ---------- */

export async function createInvite(account: Account, studentId: unknown, db: Db = getDb()) {
  if (account.role !== "trainer") throw new HttpError(403, "Somente o personal convida alunos.")
  if (typeof studentId !== "string") throw new HttpError(400, "Aluno inválido.")
  const student = await withTenant({ role: "trainer", trainerId: account.trainerId }, (q) => q.query<{ id: string }>("select id from students where id = $1 and status = 'ativo'", [studentId]), db)
  if (!student.rows.length) throw new HttpError(404, "Aluno não encontrado ou arquivado.")
  const hasAccount = await db.tx((q) => q.query("select 1 from users where trainer_id = $1 and student_id = $2", [account.trainerId, studentId]))
  if (hasAccount.rows.length) throw new HttpError(409, "Este aluno já tem acesso ao app.")
  const code = newToken()
  await db.tx(async (q) => {
    await q.query("delete from invites where trainer_id = $1 and student_id = $2 and used_at is null", [account.trainerId, studentId])
    await q.query(`insert into invites (code_hash, trainer_id, student_id, expires_at) values ($1, $2, $3, now() + make_interval(days => $4))`, [hashToken(code), account.trainerId, studentId, INVITE_DAYS])
  })
  return { code, days: INVITE_DAYS }
}

async function findInvite(q: Queryable, code: string) {
  return (
    await q.query<{ code_hash: string; trainer_id: string; student_id: string }>(
      "select code_hash, trainer_id, student_id from invites where code_hash = $1 and used_at is null and expires_at > now()",
      [hashToken(code)],
    )
  ).rows[0]
}

export async function inviteInfo(code: string, db: Db = getDb()) {
  if (!code || code.length > 100) return null
  const inv = await db.tx((q) => findInvite(q, code))
  if (!inv) return null
  return withTenant(
    { role: "trainer", trainerId: inv.trainer_id },
    async (q) => {
      const t = (await q.query<{ name: string }>("select name from trainers where id = $1", [inv.trainer_id])).rows[0]
      const s = (await q.query<{ name: string }>("select name from students where id = $1", [inv.student_id])).rows[0]
      return t && s ? { trainerName: t.name, studentName: s.name } : null
    },
    db,
  )
}

export async function acceptInvite(code: string, input: { email: unknown; password: unknown }, db: Db = getDb()) {
  const errors = validateCredentials(input.email, input.password)
  if (Object.keys(errors).length) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: errors })
  const email = String(input.email).trim().toLowerCase()
  const hash = await hashPassword(String(input.password))
  return db.tx(async (q) => {
    const inv = await findInvite(q, code)
    if (!inv) throw new HttpError(410, "Convite inválido ou expirado. Peça um novo ao seu personal.")
    const exists = await q.query("select 1 from users where lower(email) = $1", [email])
    if (exists.rows.length) throw Object.assign(new HttpError(409, "Já existe uma conta com este e-mail."), { fields: { email: "Já existe uma conta com este e-mail." } })
    const used = await q.query("update invites set used_at = now() where code_hash = $1 and used_at is null", [inv.code_hash])
    if (!affected(used)) throw new HttpError(410, "Convite já utilizado.")
    const userId = randomUUID()
    await q.query("insert into users (id, email, password_hash, role, trainer_id, student_id) values ($1, $2, $3, 'student', $4, $5)", [userId, email, hash, inv.trainer_id, inv.student_id]).catch((e) => {
      if ((e as { code?: string }).code === "23505") throw new HttpError(409, "Este aluno já tem acesso ao app.")
      throw e
    })
    return { token: await createSession(q, userId), role: "student" as const }
  })
}

/* ---------- Exclusão de conta (LGPD) ---------- */

export async function deleteAccount(account: Account, db: Db = getDb()) {
  if (account.role === "trainer") {
    // apaga o personal e, em cascata, alunos, fichas, sessões, convites e todos os logins vinculados
    await withTenant({ role: "trainer", trainerId: account.trainerId }, (q) => q.query("delete from trainers where id = $1", [account.trainerId]), db)
    await db.tx((q) => q.query("delete from users where trainer_id = $1", [account.trainerId]))
  } else {
    await db.tx((q) => q.query("delete from users where id = $1", [account.userId]))
  }
}
