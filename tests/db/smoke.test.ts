import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb, type TestDb } from './harness'

describe('migrações aplicam em Postgres real', () => {
  let db: TestDb
  beforeAll(async () => { db = await createTestDb() })
  afterAll(async () => { await db.close() })

  it('cria perfil pelo gatilho de cadastro', async () => {
    const id = await db.signUp({ role: 'trainer', fullName: 'Ana Souza' })
    const r = await db.as(id, (s) => s.query<{ role: string; full_name: string }>('select role, full_name from public.profiles'))
    expect(r.rows).toEqual([{ role: 'trainer', full_name: 'Ana Souza' }])
  })
})
