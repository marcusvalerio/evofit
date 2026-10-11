import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Harness de testes de banco: PostgreSQL real (PGlite) + stubs mínimos do Supabase.
 *
 * - Papéis anon/authenticated/service_role e schema auth (users, uid()) são recriados.
 * - Replicamos os GRANTs padrão permissivos do Supabase ANTES das migrações, para que os
 *   testes provem que as migrações fecham o acesso (pior caso).
 * - Todas as migrações de supabase/migrations são aplicadas em ordem, sem alterações.
 *
 * Limitações conhecidas: não há PostgREST, storage nem JWT reais; "ser o usuário X" é
 * simulado com SET ROLE + request.jwt.claim.sub, que é o que auth.uid() lê no Supabase.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  -- Defaults permissivos do Supabase (as migrações precisam revogá-los).
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`

export type Role = 'anon' | 'authenticated' | 'service_role'
export type Params = unknown[]

export interface Session {
  query<T = Record<string, unknown>>(sql: string, params?: Params): Promise<{ rows: T[]; affectedRows: number }>
}

export interface TestDb {
  pg: PGlite
  /** Cria um usuário em auth.users (o gatilho cria o perfil). Roda como superusuário. */
  signUp(opts: { email?: string; role?: string; fullName?: string; meta?: Record<string, unknown> }): Promise<string>
  /** Executa fn como o usuário autenticado `userId`. */
  as<T>(userId: string, fn: (s: Session) => Promise<T>): Promise<T>
  /** Executa fn como visitante anônimo. */
  anon<T>(fn: (s: Session) => Promise<T>): Promise<T>
  /** Executa fn como service_role (bypassrls). */
  service<T>(fn: (s: Session) => Promise<T>): Promise<T>
  /** Executa fn como superusuário (para preparar fixtures). */
  admin: Session
  close(): Promise<void>
}

let counter = 0

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite()
  await pg.exec(SUPABASE_STUBS)

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    try {
      await pg.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    } catch (err) {
      throw new Error(`Falha ao aplicar migração ${file}: ${(err as Error).message}`)
    }
  }

  const raw: Session = {
    async query(sql, params) {
      const r = await pg.query(sql, params as unknown[])
      return { rows: r.rows as never[], affectedRows: r.affectedRows ?? 0 }
    },
  }

  async function withRole<T>(role: Role, uid: string | null, fn: (s: Session) => Promise<T>): Promise<T> {
    await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
    await pg.exec(`set role ${role}`)
    try {
      return await fn(raw)
    } finally {
      await pg.exec('reset role')
      await pg.query(`select set_config('request.jwt.claim.sub', '', false)`)
    }
  }

  return {
    pg,
    admin: raw,
    async signUp({ email, role, fullName, meta }) {
      counter += 1
      const metadata: Record<string, unknown> = { ...(meta ?? {}) }
      if (role !== undefined) metadata.role = role
      if (fullName !== undefined) metadata.full_name = fullName
      const r = await pg.query<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
        [email ?? `user${counter}@example.test`, JSON.stringify(metadata)],
      )
      return r.rows[0].id
    },
    as: (userId, fn) => withRole('authenticated', userId, fn),
    anon: (fn) => withRole('anon', null, fn),
    service: (fn) => withRole('service_role', null, fn),
    close: () => pg.close(),
  }
}

/** Mensagem de erro de uma promessa que deve falhar (ou lança se ela der certo). */
export async function errorOf(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return (e as Error).message
  }
  throw new Error('esperava erro, mas a operação teve sucesso')
}
