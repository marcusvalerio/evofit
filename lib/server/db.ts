import { Pool } from "pg"

/**
 * Acesso ao Postgres (Neon em produção). O servidor usa DATABASE_URL; sem ela, o app fica só no modo
 * demonstração. Os testes injetam um banco PGlite com setDb().
 */
export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[]; affectedRows?: number; rowCount?: number | null }>
}

export interface Db {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>
}

let injected: Db | null = null
let pool: Pool | null = null

export function setDb(db: Db | null) {
  injected = db
}

export function dbConfigured() {
  return !!injected || !!process.env.DATABASE_URL
}

function pgDb(): Db {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    })
  }
  const p = pool
  return {
    async tx(fn) {
      const c = await p.connect()
      try {
        await c.query("begin")
        const out = await fn(c as unknown as Queryable)
        await c.query("commit")
        return out
      } catch (e) {
        await c.query("rollback").catch(() => {})
        throw e
      } finally {
        c.release()
      }
    },
  }
}

export function getDb(): Db {
  if (injected) return injected
  if (!process.env.DATABASE_URL) throw new DbNotConfigured()
  return pgDb()
}

export class DbNotConfigured extends Error {
  constructor() {
    super("DATABASE_URL não configurada")
  }
}

export type Tenant =
  | { role: "trainer"; trainerId: string }
  | { role: "student"; trainerId: string; studentId: string }
  | { role: "public"; trainerId: string | null }

/** Transação com o papel restrito `evofit_app` e o contexto de tenant que as políticas de RLS usam. */
export function withTenant<T>(t: Tenant, fn: (q: Queryable) => Promise<T>, db = getDb()) {
  return db.tx(async (q) => {
    await q.query("set local role evofit_app")
    await q.query("select set_config('app.role', $1, true), set_config('app.trainer_id', $2, true), set_config('app.student_id', $3, true)", [
      t.role,
      t.trainerId ?? "",
      t.role === "student" ? t.studentId : "",
    ])
    return fn(q)
  })
}

export const affected = (r: { affectedRows?: number; rowCount?: number | null }) => r.rowCount ?? r.affectedRows ?? 0
