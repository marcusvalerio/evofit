import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { affected, getDb, withTenant, type Db, type Queryable } from "./db"
import { HttpError } from "./workspace"

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>

export interface Account {
  userId: string
  /** E-mail ou, para acessos gerados pelo personal, o nome de usuário. */
  email: string
  role: "trainer" | "student"
  trainerId: string
  studentId: string | null
  /** Senha provisória: o aluno precisa criar a própria antes de usar o app. */
  mustChangePassword: boolean
  /** Equipe do EVOFIT (users.is_admin): vê o painel de administração. */
  isAdmin?: boolean
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
    const r = await q.query<{ id: string; email: string | null; username: string | null; role: Account["role"]; trainer_id: string; student_id: string | null; must_change_password: boolean; is_admin: boolean }>(
      `select u.id, u.email, u.username, u.role, u.trainer_id, u.student_id, u.must_change_password, u.is_admin from auth_sessions s join users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now() and u.disabled_at is null`,
      [hashToken(token)],
    )
    const u = r.rows[0]
    return u
      ? { userId: u.id, email: u.email ?? u.username ?? "", role: u.role, trainerId: u.trainer_id, studentId: u.student_id, mustChangePassword: u.must_change_password, isAdmin: !!u.is_admin }
      : null
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

/** Entra com e-mail ou, para acessos gerados pelo personal, com o nome de usuário. */
export async function login(input: { email: unknown; password: unknown }, db: Db = getDb()) {
  if (typeof input.email !== "string" || typeof input.password !== "string" || input.password.length > 128) return null
  const id = input.email.trim().toLowerCase()
  const column = id.includes("@") ? "email" : "username"
  const u = await db.tx(
    async (q) =>
      (await q.query<{ id: string; password_hash: string; role: Account["role"]; must_change_password: boolean; disabled_at: unknown }>(`select id, password_hash, role, must_change_password, disabled_at from users where lower(${column}) = $1`, [id])).rows[0],
  )
  const ok = await verifyPassword(input.password, u?.password_hash ?? DUMMY)
  if (!u || !ok) return null
  // conta suspensa: só avisa depois de a senha conferir (não revela quais contas existem)
  if (u.disabled_at) throw new HttpError(403, "Conta suspensa. Fale com o suporte do EVOFIT.")
  const token = await db.tx(async (q) => {
    await q.query("update users set last_login_at = now() where id = $1", [u.id])
    return createSession(q, u.id)
  })
  return { token, role: u.role, mustChangePassword: u.must_change_password }
}

/* ---------- Acesso do aluno gerado pelo personal ---------- */

// sem caracteres ambíguos (0/O, 1/I/L) para ditar ou digitar no celular
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
/** Senha provisória legível: XXXX-XXXX-XXXX (~60 bits). */
export function temporaryPassword() {
  const bytes = randomBytes(12)
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length])
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`
}

export interface StudentAccess {
  status: "none" | "pending" | "active"
  login: string | null
  lastLoginAt: string | null
}

async function trainerStudent(account: Account, studentId: unknown, db: Db) {
  if (account.role !== "trainer") throw new HttpError(403, "Somente o personal gerencia o acesso dos alunos.")
  if (typeof studentId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(studentId)) throw new HttpError(400, "Aluno inválido.")
  const r = await withTenant({ role: "trainer", trainerId: account.trainerId }, (q) => q.query<{ id: string; name: string; status: string }>("select id, name, status from students where id = $1", [studentId]), db)
  const s = r.rows[0]
  if (!s) throw new HttpError(404, "Aluno não encontrado.")
  return s
}

export async function studentAccess(account: Account, studentId: unknown, db: Db = getDb()): Promise<StudentAccess> {
  const s = await trainerStudent(account, studentId, db)
  const u = (
    await db.tx((q) =>
      q.query<{ email: string | null; username: string | null; must_change_password: boolean; last_login_at: Date | string | null }>(
        "select email, username, must_change_password, last_login_at from users where trainer_id = $1 and student_id = $2",
        [account.trainerId, s.id],
      ),
    )
  ).rows[0]
  if (!u) return { status: "none", login: null, lastLoginAt: null }
  const last = u.last_login_at ? new Date(u.last_login_at).toISOString() : null
  return { status: u.must_change_password ? "pending" : "active", login: u.username ?? u.email, lastLoginAt: last }
}

const usernameBase = (name: string) => {
  const parts = slugify(name).split("-").filter(Boolean)
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : (parts[0] ?? "aluno")).slice(0, 32)
  return base.length >= 3 ? base : `${base}.aluno`
}

/** Cria usuário + senha provisória para o aluno. A senha só é mostrada nesta resposta. */
export async function createStudentAccess(account: Account, studentId: unknown, db: Db = getDb()) {
  const s = await trainerStudent(account, studentId, db)
  if (s.status !== "ativo") throw new HttpError(409, "Reative o aluno antes de liberar o acesso.")
  const password = temporaryPassword()
  const hash = await hashPassword(password)
  const base = usernameBase(s.name)
  return db.tx(async (q) => {
    const has = await q.query("select 1 from users where trainer_id = $1 and student_id = $2", [account.trainerId, s.id])
    if (has.rows.length) throw new HttpError(409, "Este aluno já tem acesso. Gere uma nova senha ou revogue o acesso.")
    let username = base
    for (let i = 0; (await q.query("select 1 from users where lower(username) = $1", [username])).rows.length; i++) {
      if (i > 20) throw new HttpError(500, "Não foi possível gerar um usuário. Tente de novo.")
      username = `${base}.${randomBytes(2).readUInt16BE() % 900 + 100}`
    }
    await q.query("delete from invites where trainer_id = $1 and student_id = $2 and used_at is null", [account.trainerId, s.id])
    await q.query("insert into users (id, username, password_hash, role, trainer_id, student_id, must_change_password) values ($1, $2, $3, 'student', $4, $5, true)", [
      randomUUID(),
      username,
      hash,
      account.trainerId,
      s.id,
    ])
    return { login: username, password }
  })
}

/** Nova senha provisória: encerra todas as sessões do aluno e exige troca no próximo acesso. */
export async function resetStudentPassword(account: Account, studentId: unknown, db: Db = getDb()) {
  const s = await trainerStudent(account, studentId, db)
  const password = temporaryPassword()
  const hash = await hashPassword(password)
  return db.tx(async (q) => {
    const u = (await q.query<{ id: string; username: string | null; email: string | null }>("select id, username, email from users where trainer_id = $1 and student_id = $2", [account.trainerId, s.id])).rows[0]
    if (!u) throw new HttpError(404, "Este aluno ainda não tem acesso.")
    await q.query("update users set password_hash = $2, must_change_password = true where id = $1", [u.id, hash])
    await q.query("delete from auth_sessions where user_id = $1", [u.id])
    return { login: u.username ?? u.email, password }
  })
}

/** Remove o login do aluno (e todas as sessões). Os treinos e o histórico continuam com o personal. */
export async function revokeStudentAccess(account: Account, studentId: unknown, db: Db = getDb()) {
  const s = await trainerStudent(account, studentId, db)
  await db.tx(async (q) => {
    await q.query("delete from users where trainer_id = $1 and student_id = $2 and role = 'student'", [account.trainerId, s.id])
    await q.query("delete from invites where trainer_id = $1 and student_id = $2", [account.trainerId, s.id])
  })
}

/**
 * Troca de senha pelo próprio usuário. Com senha provisória (primeiro acesso), basta a sessão;
 * fora disso, exige a senha atual. Encerra as outras sessões.
 */
export async function changePassword(account: Account, input: { current?: unknown; password: unknown }, token: string, db: Db = getDb()) {
  const pw = input.password
  if (typeof pw !== "string" || pw.length < 8) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { password: "A senha precisa ter pelo menos 8 caracteres." } })
  if (pw.length > 128) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { password: "Use no máximo 128 caracteres." } })
  const u = (await db.tx((q) => q.query<{ password_hash: string }>("select password_hash from users where id = $1", [account.userId]))).rows[0]
  if (!u) throw new HttpError(401, "Faça login para continuar.")
  if (await verifyPassword(pw, u.password_hash)) throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { password: "Escolha uma senha diferente da atual." } })
  if (!account.mustChangePassword && !(typeof input.current === "string" && (await verifyPassword(input.current, u.password_hash))))
    throw Object.assign(new HttpError(400, "Verifique os campos."), { fields: { current: "Senha atual incorreta." } })
  const hash = await hashPassword(pw)
  await db.tx(async (q) => {
    await q.query("update users set password_hash = $2, must_change_password = false where id = $1", [account.userId, hash])
    await q.query("delete from auth_sessions where user_id = $1 and token_hash <> $2", [account.userId, hashToken(token)])
  })
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
