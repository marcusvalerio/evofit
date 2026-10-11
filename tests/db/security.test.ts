import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb, errorOf, type TestDb } from './harness'

/**
 * Testes negativos de segurança. Cada teste tenta um ataque e confere que o banco o
 * bloqueia. Rodam em PostgreSQL real (PGlite) com as migrações reais.
 */

let db: TestDb
let trainerA: string
let trainerB: string
let studentA: string // aluno vinculado ao personal A
let studentB: string // aluno vinculado ao personal B
let outsider: string // aluno sem vínculo
let visitor: string // usuário logado qualquer

let planA: string
let planB: string
let workoutA: string // treino atribuído por A ao studentA
let exerciseA: string // exercício privado de A
let exerciseB: string // exercício privado de B
let globalExercise: string

async function link(trainer: string, student: string, name: string) {
  const inv = await db.as(trainer, (s) =>
    s.query<{ invite_token: string }>('select * from public.trainer_invite_student($1)', [name]),
  )
  await db.as(student, (s) => s.query('select public.accept_student_invite($1)', [inv.rows[0].invite_token]))
}

async function makePlan(trainer: string, name: string, exerciseId: string) {
  return db.as(trainer, async (s) => {
    const p = await s.query<{ id: string }>(
      `insert into public.workout_plans (name) values ($1) returning id`,
      [name],
    )
    await s.query(
      `insert into public.workout_plan_exercises (plan_id, exercise_id, position, sets, reps)
       values ($1, $2, 1, 3, '10')`,
      [p.rows[0].id, exerciseId],
    )
    await s.query(`update public.workout_plans set status = 'published' where id = $1`, [p.rows[0].id])
    return p.rows[0].id
  })
}

beforeAll(async () => {
  db = await createTestDb()
  trainerA = await db.signUp({ role: 'trainer', fullName: 'Personal A' })
  trainerB = await db.signUp({ role: 'trainer', fullName: 'Personal B' })
  studentA = await db.signUp({ role: 'student', fullName: 'Aluno A' })
  studentB = await db.signUp({ role: 'student', fullName: 'Aluno B' })
  outsider = await db.signUp({ role: 'student', fullName: 'Aluno Solto' })
  visitor = await db.signUp({ role: 'student', fullName: 'Visitante' })

  await link(trainerA, studentA, 'Aluno A')
  await link(trainerB, studentB, 'Aluno B')

  await db.admin.query(
    `insert into public.exercises (owner_id, name, muscle_group, equipment) values (null, 'Agachamento livre', 'quadriceps', 'barra')`,
  )
  globalExercise = (
    await db.admin.query<{ id: string }>(`select id from public.exercises where owner_id is null`)
  ).rows[0].id

  exerciseA = await db.as(trainerA, async (s) =>
    (
      await s.query<{ id: string }>(
        `insert into public.exercises (owner_id, name, muscle_group, equipment)
         values ($1, 'Remada do A', 'costas', 'cabo') returning id`,
        [trainerA],
      )
    ).rows[0].id,
  )
  exerciseB = await db.as(trainerB, async (s) =>
    (
      await s.query<{ id: string }>(
        `insert into public.exercises (owner_id, name, muscle_group, equipment)
         values ($1, 'Rosca do B', 'biceps', 'halteres') returning id`,
        [trainerB],
      )
    ).rows[0].id,
  )

  planA = await makePlan(trainerA, 'Plano A', exerciseA)
  planB = await makePlan(trainerB, 'Plano B', exerciseB)
  workoutA = await db.as(trainerA, async (s) =>
    (await s.query<{ assign_workout: string }>('select public.assign_workout($1, $2) as assign_workout', [planA, studentA])).rows[0]
      .assign_workout,
  )
})

afterAll(async () => {
  await db.close()
})

describe('papéis e perfis', () => {
  it('cadastro não permite escolher papel privilegiado inexistente (admin vira student)', async () => {
    const id = await db.signUp({ role: 'admin', fullName: 'Hacker' })
    const r = await db.as(id, (s) => s.query<{ role: string }>('select role from public.profiles'))
    expect(r.rows[0].role).toBe('student')
  })

  it('usuário não consegue trocar o próprio papel de student para trainer', async () => {
    const msg = await errorOf(
      db.as(outsider, (s) => s.query(`update public.profiles set role = 'trainer' where id = $1`, [outsider])),
    )
    expect(msg).toMatch(/permission denied|immutable/i)
  })

  it('trainer não consegue rebaixar nem alterar o próprio papel', async () => {
    const msg = await errorOf(
      db.as(trainerA, (s) => s.query(`update public.profiles set role = 'student' where id = $1`, [trainerA])),
    )
    expect(msg).toMatch(/permission denied|immutable/i)
  })

  it('usuário não vê o perfil de um desconhecido', async () => {
    const r = await db.as(visitor, (s) => s.query('select id from public.profiles where id = $1', [trainerA]))
    expect(r.rows).toHaveLength(0)
  })

  it('anônimo não lê perfis', async () => {
    const msg = await errorOf(db.anon((s) => s.query('select * from public.profiles')))
    expect(msg).toMatch(/permission denied/i)
  })
})

describe('isolamento entre profissionais e alunos', () => {
  it('personal B não enxerga o aluno vinculado ao personal A', async () => {
    const r = await db.as(trainerB, (s) => s.query('select id from public.profiles where id = $1', [studentA]))
    expect(r.rows).toHaveLength(0)
  })

  it('personal B não lê vínculos do personal A', async () => {
    const r = await db.as(trainerB, (s) => s.query('select id from public.trainer_students where trainer_id = $1', [trainerA]))
    expect(r.rows).toHaveLength(0)
  })

  it('o hash do token de convite não é legível pela API', async () => {
    const msg = await errorOf(db.as(trainerA, (s) => s.query('select invite_token_hash from public.trainer_students')))
    expect(msg).toMatch(/permission denied/i)
  })

  it('personal não consegue se auto-vincular a um aluno por UPDATE/INSERT direto', async () => {
    const ins = await errorOf(
      db.as(trainerB, (s) =>
        s.query(
          `insert into public.trainer_students (trainer_id, student_id, student_name, status, accepted_at)
           values ($1, $2, 'x', 'active', now())`,
          [trainerB, outsider],
        ),
      ),
    )
    expect(ins).toMatch(/permission denied/i)

    const upd = await errorOf(
      db.as(trainerB, (s) =>
        s.query(`update public.trainer_students set student_id = $1, status = 'active' where trainer_id = $2`, [
          outsider,
          trainerB,
        ]),
      ),
    )
    expect(upd).toMatch(/permission denied|immutable|invalid/i)
  })

  it('personal sem vínculo não vê treinos nem sessões do aluno', async () => {
    const w = await db.as(trainerB, (s) => s.query('select id from public.student_workouts where student_id = $1', [studentA]))
    expect(w.rows).toHaveLength(0)
    const sess = await db.as(trainerB, (s) => s.query('select id from public.workout_sessions where student_id = $1', [studentA]))
    expect(sess.rows).toHaveLength(0)
  })

  it('aluno sem vínculo não consegue aceitar convite inválido ou reaproveitar um token usado', async () => {
    const fake = await errorOf(db.as(outsider, (s) => s.query(`select public.accept_student_invite('token-inventado')`)))
    expect(fake).toMatch(/invalid or expired/i)

    const inv = await db.as(trainerA, (s) =>
      s.query<{ invite_token: string }>(`select * from public.trainer_invite_student('Outro')`),
    )
    const token = inv.rows[0].invite_token
    // Usuário descartável: `outsider` precisa continuar sem vínculo nos testes seguintes.
    const joiner = await db.signUp({ role: 'student', fullName: 'Aluno Entrante' })
    await db.as(joiner, (s) => s.query('select public.accept_student_invite($1)', [token]))
    const reuse = await errorOf(db.as(visitor, (s) => s.query('select public.accept_student_invite($1)', [token])))
    expect(reuse).toMatch(/invalid or expired/i)
  })

  it('personal não aceita convite (apenas alunos aceitam)', async () => {
    const inv = await db.as(trainerA, (s) =>
      s.query<{ invite_token: string }>(`select * from public.trainer_invite_student('Convite X')`),
    )
    const msg = await errorOf(db.as(trainerB, (s) => s.query('select public.accept_student_invite($1)', [inv.rows[0].invite_token])))
    expect(msg).toMatch(/only students/i)
  })

  it('aluno não pode convidar nem criar vínculo como personal', async () => {
    const msg = await errorOf(db.as(outsider, (s) => s.query(`select * from public.trainer_invite_student('x')`)))
    expect(msg).toMatch(/only trainers/i)
  })

  it('desvincular remove o acesso do personal aos dados do aluno', async () => {
    const t = await db.signUp({ role: 'trainer', fullName: 'Temp' })
    const st = await db.signUp({ role: 'student', fullName: 'Temp Aluno' })
    await link(t, st, 'Temp Aluno')
    const before = await db.as(t, (s) => s.query('select id from public.profiles where id = $1', [st]))
    expect(before.rows).toHaveLength(1)

    const linkId = (
      await db.as(t, (s) => s.query<{ id: string }>(`select id from public.trainer_students where student_id = $1`, [st]))
    ).rows[0].id
    await db.as(t, (s) => s.query(`update public.trainer_students set status = 'ended' where id = $1`, [linkId]))

    const after = await db.as(t, (s) => s.query('select id from public.profiles where id = $1', [st]))
    expect(after.rows).toHaveLength(0)

    const reopen = await errorOf(
      db.as(t, (s) => s.query(`update public.trainer_students set status = 'active' where id = $1`, [linkId])),
    )
    expect(reopen).toMatch(/invalid|ended|permission/i)
  })
})

describe('exercícios', () => {
  it('personal B não vê exercício privado do personal A', async () => {
    const r = await db.as(trainerB, (s) => s.query('select id from public.exercises where id = $1', [exerciseA]))
    expect(r.rows).toHaveLength(0)
  })

  it('todos veem o catálogo global', async () => {
    const r = await db.as(trainerB, (s) => s.query('select id from public.exercises where id = $1', [globalExercise]))
    expect(r.rows).toHaveLength(1)
  })

  it('personal não edita exercício global nem de outro personal', async () => {
    const g = await db.as(trainerA, (s) => s.query(`update public.exercises set name = 'Pwned' where id = $1`, [globalExercise]))
    expect(g.affectedRows).toBe(0)
    const o = await db.as(trainerB, (s) => s.query(`update public.exercises set name = 'Pwned' where id = $1`, [exerciseA]))
    expect(o.affectedRows).toBe(0)
  })

  it('personal não cria exercício global nem em nome de outro', async () => {
    const asGlobal = await errorOf(
      db.as(trainerA, (s) =>
        s.query(`insert into public.exercises (owner_id, name, muscle_group, equipment) values (null, 'Falso global', 'peito', 'nenhum')`),
      ),
    )
    expect(asGlobal).toMatch(/row-level security/i)
    const asOther = await errorOf(
      db.as(trainerA, (s) =>
        s.query(
          `insert into public.exercises (owner_id, name, muscle_group, equipment) values ($1, 'No nome do B', 'peito', 'nenhum')`,
          [trainerB],
        ),
      ),
    )
    expect(asOther).toMatch(/row-level security/i)
  })

  it('aluno não cria exercício', async () => {
    const msg = await errorOf(
      db.as(studentA, (s) =>
        s.query(
          `insert into public.exercises (owner_id, name, muscle_group, equipment) values ($1, 'Do aluno', 'peito', 'nenhum')`,
          [studentA],
        ),
      ),
    )
    expect(msg).toMatch(/row-level security|violates/i)
  })

  it('mídia só aceita URL https', async () => {
    const msg = await errorOf(
      db.as(trainerA, (s) =>
        s.query(
          `insert into public.exercises (owner_id, name, muscle_group, equipment, media_url, media_type)
           values ($1, 'Com mídia ruim', 'peito', 'nenhum', 'javascript:alert(1)', 'gif')`,
          [trainerA],
        ),
      ),
    )
    expect(msg).toMatch(/check constraint|media_url/i)
  })

  it('a API não apaga exercícios (apenas arquiva)', async () => {
    const msg = await errorOf(db.as(trainerA, (s) => s.query('delete from public.exercises where id = $1', [exerciseA])))
    expect(msg).toMatch(/permission denied/i)
  })
})

describe('prescrição de treinos', () => {
  it('personal B não lê nem edita o plano do personal A', async () => {
    const r = await db.as(trainerB, (s) => s.query('select id from public.workout_plans where id = $1', [planA]))
    expect(r.rows).toHaveLength(0)
    const u = await db.as(trainerB, (s) => s.query(`update public.workout_plans set name = 'Pwned' where id = $1`, [planA]))
    expect(u.affectedRows).toBe(0)
    const d = await db.as(trainerB, (s) => s.query('delete from public.workout_plans where id = $1', [planA]))
    expect(d.affectedRows).toBe(0)
  })

  it('personal B não adiciona exercícios ao plano do personal A (IDOR)', async () => {
    const msg = await errorOf(
      db.as(trainerB, (s) =>
        s.query(
          `insert into public.workout_plan_exercises (plan_id, exercise_id, position, sets, reps) values ($1, $2, 9, 3, '10')`,
          [planA, globalExercise],
        ),
      ),
    )
    expect(msg).toMatch(/row-level security/i)
  })

  it('personal não usa exercício privado de outro personal no próprio plano', async () => {
    const draft = await db.as(trainerA, async (s) =>
      (await s.query<{ id: string }>(`insert into public.workout_plans (name) values ('Rascunho') returning id`)).rows[0].id,
    )
    const msg = await errorOf(
      db.as(trainerA, (s) =>
        s.query(
          `insert into public.workout_plan_exercises (plan_id, exercise_id, position, sets, reps) values ($1, $2, 1, 3, '10')`,
          [draft, exerciseB],
        ),
      ),
    )
    expect(msg).toMatch(/not available/i)
  })

  it('não é possível publicar plano vazio', async () => {
    const empty = await db.as(trainerA, async (s) =>
      (await s.query<{ id: string }>(`insert into public.workout_plans (name) values ('Vazio') returning id`)).rows[0].id,
    )
    const msg = await errorOf(
      db.as(trainerA, (s) => s.query(`update public.workout_plans set status = 'published' where id = $1`, [empty])),
    )
    expect(msg).toMatch(/at least one exercise/i)
  })

  it('plano não pode ser criado já publicado, nem em nome de outro personal', async () => {
    const pub = await errorOf(
      db.as(trainerA, (s) => s.query(`insert into public.workout_plans (name, status) values ('Já publicado', 'published')`)),
    )
    expect(pub).toMatch(/permission denied|draft/i)
    const other = await errorOf(
      db.as(trainerA, (s) => s.query(`insert into public.workout_plans (trainer_id, name) values ($1, 'Em nome do B')`, [trainerB])),
    )
    expect(other).toMatch(/permission denied|row-level security/i)
  })

  it('aluno não cria nem vê planos (apenas treinos atribuídos)', async () => {
    const ins = await errorOf(db.as(studentA, (s) => s.query(`insert into public.workout_plans (name) values ('Do aluno')`)))
    expect(ins).toMatch(/row-level security/i)
    const sel = await db.as(studentA, (s) => s.query('select id from public.workout_plans'))
    expect(sel.rows).toHaveLength(0)
  })

  it('duplicar plano alheio falha', async () => {
    const msg = await errorOf(db.as(trainerB, (s) => s.query('select public.duplicate_workout_plan($1)', [planA])))
    expect(msg).toMatch(/plan not found/i)
  })
})

describe('atribuição ao aluno correto', () => {
  it('não atribui a aluno sem vínculo, nem a aluno de outro personal', async () => {
    const solto = await errorOf(db.as(trainerA, (s) => s.query('select public.assign_workout($1, $2)', [planA, outsider])))
    expect(solto).toMatch(/not linked/i)
    const alheio = await errorOf(db.as(trainerA, (s) => s.query('select public.assign_workout($1, $2)', [planA, studentB])))
    expect(alheio).toMatch(/not linked/i)
  })

  it('não atribui o plano de outro personal', async () => {
    const msg = await errorOf(db.as(trainerA, (s) => s.query('select public.assign_workout($1, $2)', [planB, studentA])))
    expect(msg).toMatch(/plan not found/i)
  })

  it('não atribui plano em rascunho', async () => {
    const draft = await db.as(trainerA, async (s) => {
      const id = (await s.query<{ id: string }>(`insert into public.workout_plans (name) values ('Ainda rascunho') returning id`)).rows[0].id
      await s.query(
        `insert into public.workout_plan_exercises (plan_id, exercise_id, position, sets, reps) values ($1, $2, 1, 3, '10')`,
        [id, globalExercise],
      )
      return id
    })
    const msg = await errorOf(db.as(trainerA, (s) => s.query('select public.assign_workout($1, $2)', [draft, studentA])))
    expect(msg).toMatch(/must be published/i)
  })

  it('aluno não atribui treino a si mesmo por INSERT direto', async () => {
    const msg = await errorOf(
      db.as(studentA, (s) =>
        s.query(
          `insert into public.student_workouts (link_id, trainer_id, student_id, title, snapshot)
           values (gen_random_uuid(), $1, $2, 'x', '{"exercises":[{}]}')`,
          [trainerA, studentA],
        ),
      ),
    )
    expect(msg).toMatch(/permission denied/i)
  })

  it('aluno B não vê o treino atribuído ao aluno A', async () => {
    const r = await db.as(studentB, (s) => s.query('select id from public.student_workouts where id = $1', [workoutA]))
    expect(r.rows).toHaveLength(0)
  })

  it('o snapshot é imutável: nem personal nem aluno reescrevem a prescrição', async () => {
    const t = await errorOf(
      db.as(trainerA, (s) => s.query(`update public.student_workouts set snapshot = '{"exercises":[{}]}' where id = $1`, [workoutA])),
    )
    expect(t).toMatch(/permission denied|immutable/i)
    const a = await errorOf(
      db.as(studentA, (s) => s.query(`update public.student_workouts set title = 'Meu' where id = $1`, [workoutA])),
    )
    expect(a).toMatch(/permission denied|immutable/i)
  })

  it('editar o plano depois não altera o treino já atribuído', async () => {
    await db.as(trainerA, (s) =>
      s.query(`update public.workout_plan_exercises set sets = 9, reps = '99' where plan_id = $1`, [planA]),
    )
    await db.as(trainerA, (s) => s.query(`update public.workout_plans set name = 'Renomeado' where id = $1`, [planA]))
    const r = await db.as(studentA, (s) =>
      s.query<{ title: string; snapshot: { exercises: { sets: number; reps: string }[] } }>(
        'select title, snapshot from public.student_workouts where id = $1',
        [workoutA],
      ),
    )
    expect(r.rows[0].title).toBe('Plano A')
    expect(r.rows[0].snapshot.exercises[0]).toMatchObject({ sets: 3, reps: '10' })
  })
})

describe('execução e histórico', () => {
  let session: string

  it('aluno inicia sessão do próprio treino; reenvio é idempotente', async () => {
    const cid = '11111111-1111-4111-8111-111111111111'
    const first = await db.as(studentA, (s) =>
      s.query<{ id: string }>('select public.start_workout_session($1, $2) as id', [workoutA, cid]),
    )
    session = first.rows[0].id
    const again = await db.as(studentA, (s) =>
      s.query<{ id: string }>('select public.start_workout_session($1, $2) as id', [workoutA, cid]),
    )
    expect(again.rows[0].id).toBe(session)
    const other = await db.as(studentA, (s) =>
      s.query<{ id: string }>('select public.start_workout_session($1, $2) as id', [
        workoutA,
        '22222222-2222-4222-8222-222222222222',
      ]),
    )
    expect(other.rows[0].id).toBe(session) // retoma a sessão em andamento
  })

  it('outro aluno não inicia sessão com treino alheio', async () => {
    const msg = await errorOf(
      db.as(studentB, (s) =>
        s.query('select public.start_workout_session($1, $2)', [workoutA, '33333333-3333-4333-8333-333333333333']),
      ),
    )
    expect(msg).toMatch(/workout not found/i)
  })

  it('aluno não cria sessão por INSERT direto', async () => {
    const msg = await errorOf(
      db.as(studentA, (s) =>
        s.query(
          `insert into public.workout_sessions (student_workout_id, student_id, trainer_id, client_session_id)
           values ($1, $2, $3, gen_random_uuid())`,
          [workoutA, studentA, trainerA],
        ),
      ),
    )
    expect(msg).toMatch(/permission denied/i)
  })

  it('não registra série em sessão de outro aluno', async () => {
    const msg = await errorOf(
      db.as(studentB, (s) =>
        s.query(
          `insert into public.workout_sets (session_id, exercise_position, set_number, reps_done, load_kg, completed, client_set_id)
           values ($1, 1, 1, 10, 20, true, gen_random_uuid())`,
          [session],
        ),
      ),
    )
    expect(msg).toMatch(/row-level security|session not found/i)
  })

  it('exercício fora da prescrição é rejeitado; nome e dono vêm do servidor', async () => {
    const bad = await errorOf(
      db.as(studentA, (s) =>
        s.query(
          `insert into public.workout_sets (session_id, exercise_position, set_number, reps_done, load_kg, completed, client_set_id)
           values ($1, 7, 1, 10, 20, true, gen_random_uuid())`,
          [session],
        ),
      ),
    )
    expect(bad).toMatch(/not part of the prescription/i)

    await db.as(studentA, (s) =>
      s.query(
        `insert into public.workout_sets (session_id, exercise_position, set_number, reps_done, load_kg, completed, client_set_id)
         values ($1, 1, 1, 12, 30.5, true, '44444444-4444-4444-8444-444444444444')`,
        [session],
      ),
    )
    const r = await db.as(studentA, (s) =>
      s.query<{ exercise_name: string; student_id: string; trainer_id: string }>(
        'select exercise_name, student_id, trainer_id from public.workout_sets where session_id = $1',
        [session],
      ),
    )
    expect(r.rows[0]).toEqual({ exercise_name: 'Remada do A', student_id: studentA, trainer_id: trainerA })
  })

  it('série não pode ser registrada em nome de outro aluno (student_id forjado é ignorado/bloqueado)', async () => {
    const msg = await errorOf(
      db.as(studentA, (s) =>
        s.query(
          `insert into public.workout_sets (session_id, student_id, exercise_position, set_number, reps_done, completed, client_set_id)
           values ($1, $2, 1, 2, 10, true, gen_random_uuid())`,
          [session, studentB],
        ),
      ),
    )
    expect(msg).toMatch(/permission denied|row-level security/i)
  })

  it('persistência: reenviar a mesma série (mesmo client_set_id) não duplica', async () => {
    const msg = await errorOf(
      db.as(studentA, (s) =>
        s.query(
          `insert into public.workout_sets (session_id, exercise_position, set_number, reps_done, load_kg, completed, client_set_id)
           values ($1, 1, 1, 12, 30.5, true, '44444444-4444-4444-8444-444444444444')`,
          [session],
        ),
      ),
    )
    expect(msg).toMatch(/duplicate key|unique/i)
  })

  it('não conclui sessão sem nenhuma série concluída', async () => {
    const t2 = await db.signUp({ role: 'trainer', fullName: 'T2' })
    const s2 = await db.signUp({ role: 'student', fullName: 'S2' })
    await link(t2, s2, 'S2')
    const ex = await db.as(t2, async (s) =>
      (
        await s.query<{ id: string }>(
          `insert into public.exercises (owner_id, name, muscle_group, equipment) values ($1,'Ex T2','peito','nenhum') returning id`,
          [t2],
        )
      ).rows[0].id,
    )
    const plan = await makePlan(t2, 'Plano T2', ex)
    const w = await db.as(t2, async (s) =>
      (await s.query<{ id: string }>('select public.assign_workout($1,$2) as id', [plan, s2])).rows[0].id,
    )
    const sess = await db.as(s2, async (s) =>
      (await s.query<{ id: string }>('select public.start_workout_session($1, gen_random_uuid()) as id', [w])).rows[0].id,
    )
    const msg = await errorOf(db.as(s2, (s) => s.query('select public.finish_workout_session($1)', [sess])))
    expect(msg).toMatch(/at least one completed set/i)
  })

  it('outro aluno não conclui sessão alheia', async () => {
    const msg = await errorOf(db.as(studentB, (s) => s.query('select public.finish_workout_session($1)', [session])))
    expect(msg).toMatch(/not found/i)
  })

  it('conclusão: personal vinculado enxerga histórico; personal alheio não', async () => {
    await db.as(studentA, (s) => s.query('select public.finish_workout_session($1, $2)', [session, 'Foi bem']))

    const own = await db.as(trainerA, (s) =>
      s.query<{ status: string }>('select status from public.workout_sessions where id = $1', [session]),
    )
    expect(own.rows[0].status).toBe('completed')
    const sets = await db.as(trainerA, (s) => s.query('select id from public.workout_sets where session_id = $1', [session]))
    expect(sets.rows).toHaveLength(1)

    const alheio = await db.as(trainerB, (s) => s.query('select id from public.workout_sessions where id = $1', [session]))
    expect(alheio.rows).toHaveLength(0)
    const setsAlheio = await db.as(trainerB, (s) => s.query('select id from public.workout_sets where session_id = $1', [session]))
    expect(setsAlheio.rows).toHaveLength(0)
  })

  it('sessão concluída é imutável: não aceita novas séries nem edição', async () => {
    const add = await errorOf(
      db.as(studentA, (s) =>
        s.query(
          `insert into public.workout_sets (session_id, exercise_position, set_number, reps_done, completed, client_set_id)
           values ($1, 1, 5, 10, true, gen_random_uuid())`,
          [session],
        ),
      ),
    )
    expect(add).toMatch(/session is closed/i)
    const edit = await errorOf(
      db.as(studentA, (s) => s.query(`update public.workout_sets set reps_done = 99 where session_id = $1`, [session])),
    )
    expect(edit).toMatch(/session is closed/i)
    const del = await errorOf(db.as(studentA, (s) => s.query('delete from public.workout_sets where session_id = $1', [session])))
    expect(del).toMatch(/session is closed/i)
    const status = await errorOf(
      db.as(studentA, (s) => s.query(`update public.workout_sessions set status = 'in_progress' where id = $1`, [session])),
    )
    expect(status).toMatch(/permission denied/i)
  })

  it('desvincular preserva o histórico do aluno mas tira o acesso do personal', async () => {
    const t = await db.signUp({ role: 'trainer', fullName: 'T3' })
    const s3 = await db.signUp({ role: 'student', fullName: 'S3' })
    await link(t, s3, 'S3')
    const ex = await db.as(t, async (s) =>
      (
        await s.query<{ id: string }>(
          `insert into public.exercises (owner_id, name, muscle_group, equipment) values ($1,'Ex T3','peito','nenhum') returning id`,
          [t],
        )
      ).rows[0].id,
    )
    const plan = await makePlan(t, 'Plano T3', ex)
    const w = await db.as(t, async (s) =>
      (await s.query<{ id: string }>('select public.assign_workout($1,$2) as id', [plan, s3])).rows[0].id,
    )
    const sess = await db.as(s3, async (s) =>
      (await s.query<{ id: string }>('select public.start_workout_session($1, gen_random_uuid()) as id', [w])).rows[0].id,
    )
    await db.as(s3, (s) =>
      s.query(
        `insert into public.workout_sets (session_id, exercise_position, set_number, reps_done, completed, client_set_id)
         values ($1, 1, 1, 8, true, gen_random_uuid())`,
        [sess],
      ),
    )
    await db.as(s3, (s) => s.query('select public.finish_workout_session($1)', [sess]))

    const linkId = (
      await db.as(s3, (s) => s.query<{ id: string }>(`select id from public.trainer_students where student_id = $1`, [s3]))
    ).rows[0].id
    await db.as(s3, (s) => s.query('select public.end_student_link($1)', [linkId]))

    const trainerView = await db.as(t, (s) => s.query('select id from public.workout_sessions where id = $1', [sess]))
    expect(trainerView.rows).toHaveLength(0)
    const studentView = await db.as(s3, (s) => s.query('select id from public.workout_sessions where id = $1', [sess]))
    expect(studentView.rows).toHaveLength(1)
    const startAgain = await errorOf(
      db.as(s3, (s) => s.query('select public.start_workout_session($1, gen_random_uuid())', [w])),
    )
    expect(startAgain).toMatch(/no longer available/i)
  })
})

describe('progresso do aluno (compartilhamento opt-in)', () => {
  it('personal só vê medidas marcadas como compartilhadas e de aluno vinculado', async () => {
    await db.as(studentA, async (s) => {
      await s.query(`insert into public.progress_entries (metric, value, shared_with_trainer) values ('body_weight_kg', 80, false)`)
      await s.query(`insert into public.progress_entries (metric, value, shared_with_trainer) values ('waist_cm', 90, true)`)
    })
    const own = await db.as(trainerA, (s) =>
      s.query<{ metric: string }>('select metric from public.progress_entries where student_id = $1', [studentA]),
    )
    expect(own.rows.map((r) => r.metric)).toEqual(['waist_cm'])
    const alheio = await db.as(trainerB, (s) => s.query('select id from public.progress_entries where student_id = $1', [studentA]))
    expect(alheio.rows).toHaveLength(0)
  })

  it('aluno não grava medida em nome de outro aluno', async () => {
    const msg = await errorOf(
      db.as(studentA, (s) =>
        s.query(`insert into public.progress_entries (student_id, metric, value) values ($1, 'body_weight_kg', 70)`, [studentB]),
      ),
    )
    expect(msg).toMatch(/permission denied|row-level security/i)
  })

  it('personal não altera nem apaga medidas do aluno', async () => {
    // A RLS não gera erro: as linhas simplesmente não existem para o personal (0 afetadas).
    const u = await db.as(trainerA, (s) => s.query(`update public.progress_entries set value = 1 where student_id = $1`, [studentA]))
    expect(u.affectedRows).toBe(0)
    const d = await db.as(trainerA, (s) => s.query('delete from public.progress_entries where student_id = $1', [studentA]))
    expect(d.affectedRows).toBe(0)

    // Prova de que nada mudou: o próprio aluno ainda vê as duas medidas com os valores originais.
    const after = await db.as(studentA, (s) =>
      s.query<{ metric: string; value: string }>(
        'select metric, value::text as value from public.progress_entries order by metric',
      ),
    )
    expect(after.rows).toEqual([
      { metric: 'body_weight_kg', value: '80.00' },
      { metric: 'waist_cm', value: '90.00' },
    ])
  })
})

describe('diretório público e privacidade', () => {
  let slugA: string

  beforeAll(async () => {
    slugA = 'personal-a-rio'
    await db.as(trainerA, async (s) => {
      await s.query(
        `insert into public.professional_profiles (display_name, slug, headline, modality)
         values ('Personal A', $1, 'Hipertrofia na Barra', 'hybrid')`,
        [slugA],
      )
      await s.query(
        `insert into public.professional_service_areas (city, state, neighborhood, cep_prefix)
         values ('Rio de Janeiro', 'RJ', 'Guaratiba', '23020')`,
      )
      await s.query(`insert into public.professional_specialties (specialty) values ('hipertrofia')`)
      await s.query(`insert into public.professional_private_contact (whatsapp_number) values ('5521999998888')`)
    })
  })

  it('perfil nasce privado: visitante anônimo não o encontra', async () => {
    const r = await db.anon((s) => s.query('select slug from public.directory_professionals'))
    expect(r.rows).toHaveLength(0)
    const fn = await db.anon((s) => s.query('select slug from public.search_professionals()'))
    expect(fn.rows).toHaveLength(0)
  })

  it('só aparece depois que o profissional habilita explicitamente', async () => {
    await db.as(trainerA, (s) => s.query(`update public.professional_profiles set is_public = true where trainer_id = $1`, [trainerA]))
    const r = await db.anon((s) => s.query<{ slug: string }>('select slug from public.directory_professionals'))
    expect(r.rows.map((x) => x.slug)).toEqual([slugA])
  })

  it('exige área de atendimento para publicar perfil presencial/híbrido', async () => {
    const t = await db.signUp({ role: 'trainer', fullName: 'Sem Area' })
    const msg = await errorOf(
      db.as(t, (s) =>
        s.query(
          `insert into public.professional_profiles (display_name, slug, modality, is_public) values ('Sem Area', 'sem-area', 'in_person', true)`,
        ),
      ),
    )
    expect(msg).toMatch(/service area/i)
  })

  it('o diretório não expõe colunas sensíveis nem o registro completo do usuário', async () => {
    const r = await db.anon((s) => s.query<Record<string, unknown>>('select * from public.directory_professionals limit 1'))
    const cols = Object.keys(r.rows[0]).sort()
    expect(cols).toEqual(
      ['areas', 'bio', 'display_name', 'headline', 'logo_path', 'modality', 'palette', 'slug', 'specialties', 'trainer_id', 'whatsapp_available'].sort(),
    )
    for (const forbidden of ['whatsapp_number', 'email', 'role', 'full_name', 'avatar_path', 'cep_prefix']) {
      expect(cols).not.toContain(forbidden)
    }
    // as áreas públicas também não carregam o CEP
    const areas = (r.rows[0].areas as Record<string, unknown>[])[0]
    expect(Object.keys(areas).sort()).toEqual(['city', 'neighborhood', 'region', 'state'])
  })

  it('anônimo não lê tabelas-base além das colunas permitidas (nem o número de WhatsApp)', async () => {
    const priv = await errorOf(db.anon((s) => s.query('select * from public.professional_private_contact')))
    expect(priv).toMatch(/permission denied/i)
    const cols = await errorOf(db.anon((s) => s.query('select created_at, updated_at from public.professional_profiles')))
    expect(cols).toMatch(/permission denied/i)
    const profiles = await errorOf(db.anon((s) => s.query('select * from public.profiles')))
    expect(profiles).toMatch(/permission denied/i)
    const reqs = await errorOf(db.anon((s) => s.query('select * from public.contact_requests')))
    expect(reqs).toMatch(/permission denied/i)
  })

  it('número de WhatsApp de terceiros não é legível por usuários logados', async () => {
    const r = await db.as(trainerB, (s) => s.query('select * from public.professional_private_contact'))
    expect(r.rows).toHaveLength(0)
    const v = await db.as(visitor, (s) => s.query('select * from public.professional_private_contact'))
    expect(v.rows).toHaveLength(0)
  })

  it('WhatsApp: sem autorização devolve nulo; anônimo é barrado', async () => {
    const off = await db.as(visitor, (s) =>
      s.query<{ n: string | null }>('select public.get_professional_whatsapp($1) as n', [slugA]),
    )
    expect(off.rows[0].n).toBeNull()
    const anon = await errorOf(db.anon((s) => s.query('select public.get_professional_whatsapp($1)', [slugA])))
    expect(anon).toMatch(/permission denied/i)
  })

  it('WhatsApp: com autorização explícita, só usuário logado recebe o número', async () => {
    await db.as(trainerA, (s) => s.query(`update public.professional_profiles set whatsapp_public = true where trainer_id = $1`, [trainerA]))
    const on = await db.as(visitor, (s) =>
      s.query<{ n: string | null }>('select public.get_professional_whatsapp($1) as n', [slugA]),
    )
    expect(on.rows[0].n).toBe('5521999998888')
    const flag = await db.anon((s) => s.query<{ whatsapp_available: boolean }>('select whatsapp_available from public.directory_professionals'))
    expect(flag.rows[0].whatsapp_available).toBe(true)
  })

  it('não autoriza WhatsApp sem número cadastrado', async () => {
    const t = await db.signUp({ role: 'trainer', fullName: 'Sem Zap' })
    await db.as(t, async (s) => {
      await s.query(`insert into public.professional_profiles (display_name, slug, modality) values ('Sem Zap', 'sem-zap', 'online')`)
    })
    const msg = await errorOf(
      db.as(t, (s) => s.query(`update public.professional_profiles set whatsapp_public = true where trainer_id = $1`, [t])),
    )
    expect(msg).toMatch(/register a WhatsApp number/i)
  })

  it('apagar o número desliga a autorização de exibição', async () => {
    await db.as(trainerA, (s) => s.query('delete from public.professional_private_contact'))
    const r = await db.as(trainerA, (s) =>
      s.query<{ whatsapp_public: boolean }>('select whatsapp_public from public.professional_profiles where trainer_id = $1', [trainerA]),
    )
    expect(r.rows[0].whatsapp_public).toBe(false)
    const n = await db.as(visitor, (s) => s.query<{ n: string | null }>('select public.get_professional_whatsapp($1) as n', [slugA]))
    expect(n.rows[0].n).toBeNull()
  })

  it('personal B não edita nem apaga o perfil do personal A', async () => {
    const u = await db.as(trainerB, (s) => s.query(`update public.professional_profiles set display_name = 'Pwned' where trainer_id = $1`, [trainerA]))
    expect(u.affectedRows).toBe(0)
    const d = await db.as(trainerB, (s) => s.query('delete from public.professional_profiles where trainer_id = $1', [trainerA]))
    expect(d.affectedRows).toBe(0)
    const ins = await errorOf(
      db.as(trainerB, (s) =>
        s.query(`insert into public.professional_profiles (trainer_id, display_name, slug) values ($1, 'Falso', 'falso-a')`, [trainerA]),
      ),
    )
    expect(ins).toMatch(/permission denied|row-level security/i)
  })

  it('aluno não cria perfil profissional', async () => {
    const msg = await errorOf(
      db.as(outsider, (s) =>
        s.query(`insert into public.professional_profiles (display_name, slug) values ('Aluno Fake', 'aluno-fake')`),
      ),
    )
    expect(msg).toMatch(/row-level security/i)
  })

  it('não é possível se passar por outro profissional alterando trainer_id', async () => {
    const msg = await errorOf(
      db.as(trainerA, (s) => s.query(`update public.professional_profiles set trainer_id = $1 where trainer_id = $2`, [trainerB, trainerA])),
    )
    expect(msg).toMatch(/permission denied|immutable/i)
  })

  it('busca: acentos, bairro, município, CEP, modalidade e especialidade', async () => {
    const slugs = async (...args: unknown[]) =>
      (
        await db.anon((s) =>
          s.query<{ slug: string }>('select slug from public.search_professionals($1, $2, $3)', args),
        )
      ).rows.map((r) => r.slug)

    expect(await slugs('guaratiba', null, null)).toEqual([slugA])
    expect(await slugs('GUARATIBÁ', null, null)).toEqual([slugA])
    expect(await slugs('rio de janeiro', null, null)).toEqual([slugA])
    expect(await slugs('23020-123', null, null)).toEqual([slugA]) // CEP completo → prefixo
    expect(await slugs('copacabana', null, null)).toEqual([])
    expect(await slugs(null, 'online', null)).toEqual([slugA]) // híbrido atende online
    expect(await slugs(null, 'in_person', null)).toEqual([slugA])
    expect(await slugs(null, null, 'hipertrofia')).toEqual([slugA])
    expect(await slugs(null, null, 'corrida')).toEqual([])
  })

  it('busca: curingas de LIKE e injeção são tratados como texto', async () => {
    const wild = await db.anon((s) => s.query('select slug from public.search_professionals($1)', ['%']))
    expect(wild.rows).toHaveLength(0)
    const underscore = await db.anon((s) => s.query('select slug from public.search_professionals($1)', ['g_aratiba']))
    expect(underscore.rows).toHaveLength(0)
    const inj = await db.anon((s) => s.query('select slug from public.search_professionals($1)', [`'; drop table public.profiles; --`]))
    expect(inj.rows).toHaveLength(0)
    const still = await db.admin.query('select count(*)::int as n from public.profiles')
    expect((still.rows[0] as { n: number }).n).toBeGreaterThan(0)
  })

  it('busca: limite de paginação é respeitado (máx. 50)', async () => {
    const r = await db.anon((s) => s.query('select slug from public.search_professionals(null, null, null, 100000, 0)'))
    expect(r.rows.length).toBeLessThanOrEqual(50)
  })

  it('desativar o perfil retira dos resultados públicos e bloqueia novas solicitações', async () => {
    await db.as(trainerA, (s) => s.query(`update public.professional_profiles set is_public = false where trainer_id = $1`, [trainerA]))
    const dir = await db.anon((s) => s.query('select slug from public.directory_professionals'))
    expect(dir.rows).toHaveLength(0)
    const search = await db.anon((s) => s.query('select slug from public.search_professionals($1)', ['guaratiba']))
    expect(search.rows).toHaveLength(0)
    const areas = await db.anon((s) => s.query('select id from public.professional_service_areas'))
    expect(areas.rows).toHaveLength(0)
    const msg = await errorOf(
      db.as(visitor, (s) => s.query(`insert into public.contact_requests (professional_id, message) values ($1, 'Oi')`, [trainerA])),
    )
    expect(msg).toMatch(/row-level security/i)
    const zap = await db.as(visitor, (s) => s.query<{ n: string | null }>('select public.get_professional_whatsapp($1) as n', [slugA]))
    expect(zap.rows[0].n).toBeNull()

    // reativa para os testes seguintes
    await db.as(trainerA, (s) => s.query(`update public.professional_profiles set is_public = true where trainer_id = $1`, [trainerA]))
  })
})

describe('solicitações de contato', () => {
  let requestId: string

  it('exige autenticação para enviar', async () => {
    const msg = await errorOf(db.anon((s) => s.query(`insert into public.contact_requests (professional_id) values ($1)`, [trainerA])))
    expect(msg).toMatch(/permission denied/i)
  })

  it('usuário autenticado envia solicitação a perfil público', async () => {
    const r = await db.as(visitor, (s) =>
      s.query<{ id: string; status: string }>(
        `insert into public.contact_requests (professional_id, message) values ($1, 'Quero treinar') returning id, status`,
        [trainerA],
      ),
    )
    requestId = r.rows[0].id
    expect(r.rows[0].status).toBe('pending')
  })

  it('não envia solicitação a si mesmo nem a quem não tem perfil público', async () => {
    const self = await errorOf(
      db.as(trainerA, (s) => s.query(`insert into public.contact_requests (professional_id) values ($1)`, [trainerA])),
    )
    expect(self).toMatch(/violates|row-level security/i)
    const priv = await errorOf(
      db.as(visitor, (s) => s.query(`insert into public.contact_requests (professional_id) values ($1)`, [trainerB])),
    )
    expect(priv).toMatch(/row-level security/i)
  })

  it('previne duplicação: segunda solicitação pendente ao mesmo profissional é barrada', async () => {
    const msg = await errorOf(
      db.as(visitor, (s) => s.query(`insert into public.contact_requests (professional_id, message) values ($1, 'De novo')`, [trainerA])),
    )
    expect(msg).toMatch(/duplicate key|unique/i)
  })

  it('não é possível forjar solicitante, status ou data de resposta', async () => {
    const forged = await errorOf(
      db.as(outsider, (s) =>
        s.query(`insert into public.contact_requests (requester_id, professional_id) values ($1, $2)`, [visitor, trainerA]),
      ),
    )
    expect(forged).toMatch(/permission denied|row-level security/i)
    const status = await errorOf(
      db.as(outsider, (s) =>
        s.query(`insert into public.contact_requests (professional_id, status) values ($1, 'responded')`, [trainerA]),
      ),
    )
    expect(status).toMatch(/permission denied/i)
  })

  it('valida mensagem no servidor (tamanho máximo e vazio)', async () => {
    const big = await errorOf(
      db.as(outsider, (s) =>
        s.query(`insert into public.contact_requests (professional_id, message) values ($1, $2)`, [trainerA, 'x'.repeat(501)]),
      ),
    )
    expect(big).toMatch(/check constraint/i)
    const empty = await errorOf(
      db.as(outsider, (s) => s.query(`insert into public.contact_requests (professional_id, message) values ($1, '   ')`, [trainerA])),
    )
    expect(empty).toMatch(/check constraint/i)
  })

  it('limita spam: no máximo 5 solicitações por solicitante em 24h', async () => {
    const spammer = await db.signUp({ role: 'student', fullName: 'Spammer' })
    const targets: string[] = []
    for (let i = 0; i < 6; i++) {
      const t = await db.signUp({ role: 'trainer', fullName: `Alvo ${i}` })
      await db.as(t, (s) =>
        s.query(`insert into public.professional_profiles (display_name, slug, modality, is_public) values ($1, $2, 'online', true)`, [
          `Alvo ${i}`,
          `alvo-${i}`,
        ]),
      )
      targets.push(t)
    }
    for (let i = 0; i < 5; i++) {
      await db.as(spammer, (s) => s.query(`insert into public.contact_requests (professional_id) values ($1)`, [targets[i]]))
    }
    const msg = await errorOf(
      db.as(spammer, (s) => s.query(`insert into public.contact_requests (professional_id) values ($1)`, [targets[5]])),
    )
    expect(msg).toMatch(/rate_limited/i)
  })

  it('só os participantes veem a solicitação; terceiros e anônimos não', async () => {
    const mine = await db.as(trainerA, (s) => s.query('select id from public.contact_requests where id = $1', [requestId]))
    expect(mine.rows).toHaveLength(1)
    const requester = await db.as(visitor, (s) => s.query('select id from public.contact_requests where id = $1', [requestId]))
    expect(requester.rows).toHaveLength(1)
    const other = await db.as(trainerB, (s) => s.query('select id from public.contact_requests where id = $1', [requestId]))
    expect(other.rows).toHaveLength(0)
    const stranger = await db.as(outsider, (s) => s.query('select id from public.contact_requests where id = $1', [requestId]))
    expect(stranger.rows).toHaveLength(0)
  })

  it('o profissional vê o nome do solicitante, mas terceiros não', async () => {
    const ok = await db.as(trainerA, (s) =>
      s.query<{ full_name: string }>('select full_name from public.profiles where id = $1', [visitor]),
    )
    expect(ok.rows[0].full_name).toBe('Visitante')
    const no = await db.as(trainerB, (s) => s.query('select full_name from public.profiles where id = $1', [visitor]))
    expect(no.rows).toHaveLength(0)
  })

  it('profissional alheio não altera o status da solicitação', async () => {
    const r = await db.as(trainerB, (s) => s.query(`update public.contact_requests set status = 'closed' where id = $1`, [requestId]))
    expect(r.affectedRows).toBe(0)
  })

  it('solicitante não consegue marcar como respondida; só cancelar', async () => {
    const msg = await errorOf(
      db.as(visitor, (s) => s.query(`update public.contact_requests set status = 'responded' where id = $1`, [requestId])),
    )
    expect(msg).toMatch(/invalid status transition/i)
  })

  it('campos imutáveis: não reatribui a solicitação nem edita a mensagem', async () => {
    const a = await errorOf(
      db.as(trainerA, (s) => s.query(`update public.contact_requests set professional_id = $1 where id = $2`, [trainerB, requestId])),
    )
    expect(a).toMatch(/permission denied/i)
    const b = await errorOf(
      db.as(visitor, (s) => s.query(`update public.contact_requests set message = 'outra' where id = $1`, [requestId])),
    )
    expect(b).toMatch(/permission denied/i)
  })

  it('profissional responde e encerra; trilha registra cada mudança; estados finais não reabrem', async () => {
    await db.as(trainerA, (s) => s.query(`update public.contact_requests set status = 'responded' where id = $1`, [requestId]))
    const responded = await db.as(trainerA, (s) =>
      s.query<{ responded_at: string | null }>('select responded_at from public.contact_requests where id = $1', [requestId]),
    )
    expect(responded.rows[0].responded_at).not.toBeNull()

    await db.as(trainerA, (s) => s.query(`update public.contact_requests set status = 'closed' where id = $1`, [requestId]))

    const events = await db.as(trainerA, (s) =>
      s.query<{ from_status: string | null; to_status: string }>(
        'select from_status, to_status from public.contact_request_events where request_id = $1 order by id',
        [requestId],
      ),
    )
    expect(events.rows).toEqual([
      { from_status: null, to_status: 'pending' },
      { from_status: 'pending', to_status: 'responded' },
      { from_status: 'responded', to_status: 'closed' },
    ])

    const reopen = await errorOf(
      db.as(trainerA, (s) => s.query(`update public.contact_requests set status = 'pending' where id = $1`, [requestId])),
    )
    expect(reopen).toMatch(/invalid status transition/i)
  })

  it('trilha de eventos: terceiros não leem e ninguém escreve pela API', async () => {
    const other = await db.as(trainerB, (s) => s.query('select id from public.contact_request_events where request_id = $1', [requestId]))
    expect(other.rows).toHaveLength(0)
    const write = await errorOf(
      db.as(trainerA, (s) =>
        s.query(`insert into public.contact_request_events (request_id, to_status) values ($1, 'closed')`, [requestId]),
      ),
    )
    expect(write).toMatch(/permission denied/i)
  })

  it('solicitante cancela a própria solicitação pendente e pode reenviar depois', async () => {
    const req = await db.as(outsider, (s) =>
      s.query<{ id: string }>(`insert into public.contact_requests (professional_id) values ($1) returning id`, [trainerA]),
    )
    await db.as(outsider, (s) => s.query(`update public.contact_requests set status = 'cancelled' where id = $1`, [req.rows[0].id]))
    await db.as(outsider, (s) => s.query(`insert into public.contact_requests (professional_id) values ($1)`, [trainerA]))
  })
})

describe('postura geral de privilégios', () => {
  it('anon não tem acesso a nenhuma tabela interna', async () => {
    const tables = [
      'trainer_students',
      'exercises',
      'workout_plans',
      'workout_plan_exercises',
      'student_workouts',
      'workout_sessions',
      'workout_sets',
      'progress_entries',
      'contact_requests',
      'contact_request_events',
      'professional_private_contact',
    ]
    for (const t of tables) {
      const msg = await errorOf(db.anon((s) => s.query(`select 1 from public.${t} limit 1`)))
      expect(msg, t).toMatch(/permission denied/i)
    }
  })

  it('toda tabela do schema public tem RLS ligada', async () => {
    const r = await db.admin.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity order by 1`,
    )
    expect(r.rows).toEqual([])
  })

  it('nenhuma função SECURITY DEFINER do schema public é executável por anon', async () => {
    const r = await db.admin.query<{ proname: string }>(
      `select p.proname
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and has_function_privilege('anon', p.oid, 'execute')
        order by 1`,
    )
    expect(r.rows).toEqual([])
  })

  it('as únicas funções SECURITY DEFINER executáveis por usuários logados são as previstas (lista fechada)', async () => {
    const r = await db.admin.query<{ proname: string }>(
      `select p.proname
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and has_function_privilege('authenticated', p.oid, 'execute')
        order by 1`,
    )
    // Qualquer função nova que apareça aqui exige decisão consciente: atualize esta lista
    // somente depois de revisar o que ela faz com o privilégio elevado.
    expect(r.rows.map((x) => x.proname)).toEqual(
      [
        'abandon_workout_session',
        'accept_student_invite',
        'assign_workout',
        'duplicate_workout_plan',
        'end_student_link',
        'finish_workout_session',
        'get_professional_whatsapp',
        'is_my_student',
        'is_my_trainer',
        'is_trainer',
        'my_role',
        'start_workout_session',
        'trainer_invite_student',
      ].sort(),
    )
  })

  it('toda função SECURITY DEFINER fixa search_path', async () => {
    const r = await db.admin.query<{ proname: string }>(
      `select p.proname
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
        order by 1`,
    )
    expect(r.rows).toEqual([])
  })
})
