-- EVOFIT 0004 — Prescrição, atribuição, execução e progresso.
--
-- Decisões de integridade:
--   * Atribuir um treino grava um SNAPSHOT imutável da prescrição em student_workouts.
--     O aluno lê só o snapshot; editar o plano depois não altera atribuições nem sessões.
--   * Sessões e séries guardam os valores efetivamente realizados e referenciam o
--     student_workout (a prescrição usada). Sessão concluída é imutável pela API.
--   * Colunas denormalizadas (trainer_id/student_id) são protegidas por chaves
--     estrangeiras compostas: nunca divergem do vínculo real.
--   * Aluno não cria/edita sessões diretamente: só via RPC (validam vínculo e dono).

-- ---------------------------------------------------------------------------
-- Planos de treino
-- ---------------------------------------------------------------------------

create table public.workout_plans (
  id             uuid primary key default gen_random_uuid(),
  trainer_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 2 and 120),
  description    text check (description is null or char_length(description) <= 1000),
  status         text not null default 'draft' check (status in ('draft', 'published')),
  source_plan_id uuid references public.workout_plans (id) on delete set null,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index workout_plans_trainer_idx on public.workout_plans (trainer_id, status);

create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

create table public.workout_plan_exercises (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references public.workout_plans (id) on delete cascade,
  exercise_id       uuid not null references public.exercises (id),
  position          integer not null check (position >= 1),
  sets              integer not null check (sets between 1 and 20),
  reps              text not null check (reps ~ '^[0-9]{1,3}(-[0-9]{1,3})?$'),
  rest_seconds      integer check (rest_seconds is null or rest_seconds between 0 and 1800),
  suggested_load_kg numeric(6, 2) check (suggested_load_kg is null or suggested_load_kg >= 0),
  notes             text check (notes is null or char_length(notes) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Adiada para permitir reordenação dentro de uma única transação.
  constraint wpe_position_uq unique (plan_id, position) deferrable initially deferred
);

create index wpe_exercise_idx on public.workout_plan_exercises (exercise_id);

create trigger wpe_set_updated_at
  before update on public.workout_plan_exercises
  for each row execute function public.set_updated_at();

create or replace function public.workout_plans_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'plans are created as draft' using errcode = '23514';
    end if;
    new.published_at := null;
    return new;
  end if;

  if current_user in ('anon', 'authenticated') then
    if new.trainer_id is distinct from old.trainer_id
       or new.source_plan_id is distinct from old.source_plan_id then
      raise exception 'immutable column' using errcode = '42501';
    end if;
  end if;

  if new.status = 'published' and old.status <> 'published' then
    if not exists (select 1 from public.workout_plan_exercises e where e.plan_id = new.id) then
      raise exception 'a plan needs at least one exercise to be published' using errcode = '23514';
    end if;
    new.published_at := now();
  elsif new.status = 'draft' and old.status = 'published' then
    new.published_at := null;
  end if;

  return new;
end;
$$;

create trigger workout_plans_guard
  before insert or update on public.workout_plans
  for each row execute function public.workout_plans_guard();

-- Um exercício só entra num plano se for global ou do próprio personal.
create or replace function public.wpe_check_exercise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_owner uuid;
begin
  select p.trainer_id into v_plan_owner from public.workout_plans p where p.id = new.plan_id;
  if v_plan_owner is null then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.exercises e
    where e.id = new.exercise_id and (e.owner_id is null or e.owner_id = v_plan_owner)
  ) then
    raise exception 'exercise not available for this trainer' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger wpe_check_exercise
  before insert or update of exercise_id, plan_id on public.workout_plan_exercises
  for each row execute function public.wpe_check_exercise();

revoke all on function public.wpe_check_exercise() from public, anon, authenticated;

-- Reordena os exercícios do plano numa única transação (a ordem recebida vira posição 1..n).
create or replace function public.reorder_plan_exercises(p_plan_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_expected integer;
begin
  select count(*) into v_expected from public.workout_plan_exercises e where e.plan_id = p_plan_id;
  if v_expected = 0
     or coalesce(array_length(p_ordered_ids, 1), 0) <> v_expected
     or (select count(distinct x) from unnest(p_ordered_ids) as x) <> v_expected then
    raise exception 'ordered ids must list every exercise of the plan exactly once' using errcode = '22023';
  end if;

  update public.workout_plan_exercises e
     set position = o.ord::integer
    from unnest(p_ordered_ids) with ordinality as o(id, ord)
   where e.id = o.id and e.plan_id = p_plan_id;
end;
$$;

-- Duplica um plano (sempre como rascunho). Só o dono do plano consegue.
create or replace function public.duplicate_workout_plan(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_trainer() then
    raise exception 'only trainers can duplicate plans' using errcode = '42501';
  end if;

  insert into public.workout_plans (trainer_id, name, description, status, source_plan_id)
  select v_uid, left(p.name || ' (cópia)', 120), p.description, 'draft', p.id
    from public.workout_plans p
   where p.id = p_plan_id and p.trainer_id = v_uid
  returning id into v_new;

  if v_new is null then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;

  insert into public.workout_plan_exercises
    (plan_id, exercise_id, position, sets, reps, rest_seconds, suggested_load_kg, notes)
  select v_new, e.exercise_id, e.position, e.sets, e.reps, e.rest_seconds, e.suggested_load_kg, e.notes
    from public.workout_plan_exercises e
   where e.plan_id = p_plan_id;

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Atribuição (snapshot imutável)
-- ---------------------------------------------------------------------------

create table public.student_workouts (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null,
  trainer_id  uuid not null,
  student_id  uuid not null,
  plan_id     uuid references public.workout_plans (id) on delete set null,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  snapshot    jsonb not null,
  status      text not null default 'active' check (status in ('active', 'archived')),
  assigned_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint sw_link_fk foreign key (link_id, trainer_id, student_id)
    references public.trainer_students (id, trainer_id, student_id) on delete cascade,
  constraint sw_snapshot_shape check (
    jsonb_typeof(snapshot -> 'exercises') = 'array'
    and jsonb_array_length(snapshot -> 'exercises') between 1 and 100
  ),
  constraint sw_archived_pair check ((status = 'archived') = (archived_at is not null)),
  constraint sw_id_pair_uq unique (id, student_id, trainer_id)
);

create index sw_student_idx on public.student_workouts (student_id, status);
create index sw_trainer_idx on public.student_workouts (trainer_id, status);

create trigger sw_set_updated_at
  before update on public.student_workouts
  for each row execute function public.set_updated_at();

create or replace function public.student_workouts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
       or new.link_id is distinct from old.link_id
       or new.trainer_id is distinct from old.trainer_id
       or new.student_id is distinct from old.student_id
       or new.plan_id is distinct from old.plan_id
       or new.title is distinct from old.title
       or new.snapshot is distinct from old.snapshot
       or new.assigned_at is distinct from old.assigned_at then
      raise exception 'student workouts are immutable (archive only)' using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'active' and new.status = 'archived' then
      new.archived_at := now();
    else
      raise exception 'invalid status transition' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger student_workouts_guard
  before update on public.student_workouts
  for each row execute function public.student_workouts_guard();

-- Atribui um plano PUBLICADO do próprio personal a um aluno COM VÍNCULO ATIVO.
create or replace function public.assign_workout(p_plan_id uuid, p_student_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_plan      public.workout_plans%rowtype;
  v_link      uuid;
  v_exercises jsonb;
  v_id        uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_trainer() then
    raise exception 'only trainers can assign workouts' using errcode = '42501';
  end if;

  select * into v_plan from public.workout_plans p where p.id = p_plan_id and p.trainer_id = v_uid;
  if not found then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
  if v_plan.status <> 'published' then
    raise exception 'plan must be published before assignment' using errcode = '23514';
  end if;

  select ts.id into v_link
    from public.trainer_students ts
   where ts.trainer_id = v_uid and ts.student_id = p_student_id and ts.status = 'active';
  if v_link is null then
    raise exception 'student is not linked to this trainer' using errcode = '42501';
  end if;

  select jsonb_agg(
           jsonb_build_object(
             'position', pe.position,
             'exercise_id', pe.exercise_id,
             'name', e.name,
             'muscle_group', e.muscle_group,
             'equipment', e.equipment,
             'instructions', e.instructions,
             'media_url', e.media_url,
             'media_type', e.media_type,
             'sets', pe.sets,
             'reps', pe.reps,
             'rest_seconds', pe.rest_seconds,
             'suggested_load_kg', pe.suggested_load_kg,
             'notes', pe.notes
           )
           order by pe.position
         )
    into v_exercises
    from public.workout_plan_exercises pe
    join public.exercises e on e.id = pe.exercise_id and (e.owner_id is null or e.owner_id = v_uid)
   where pe.plan_id = p_plan_id;

  if v_exercises is null then
    raise exception 'plan has no usable exercises' using errcode = '23514';
  end if;

  insert into public.student_workouts (link_id, trainer_id, student_id, plan_id, title, snapshot)
  values (
    v_link, v_uid, p_student_id, p_plan_id, v_plan.name,
    jsonb_build_object(
      'plan', jsonb_build_object('id', v_plan.id, 'name', v_plan.name, 'description', v_plan.description),
      'exercises', v_exercises,
      'assigned_from_published_at', v_plan.published_at
    )
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sessões de treino (execução pelo aluno)
-- ---------------------------------------------------------------------------

create table public.workout_sessions (
  id                 uuid primary key default gen_random_uuid(),
  student_workout_id uuid not null,
  student_id         uuid not null,
  trainer_id         uuid not null,
  client_session_id  uuid not null,
  status             text not null default 'in_progress'
                       check (status in ('in_progress', 'completed', 'abandoned')),
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  notes              text check (notes is null or char_length(notes) <= 1000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint ws_workout_fk foreign key (student_workout_id, student_id, trainer_id)
    references public.student_workouts (id, student_id, trainer_id) on delete cascade,
  constraint ws_client_uq unique (student_id, client_session_id),
  constraint ws_finished_pair check (
    (status = 'in_progress' and finished_at is null)
    or (status <> 'in_progress' and finished_at is not null)
  ),
  constraint ws_id_pair_uq unique (id, student_id, trainer_id)
);

-- No máximo uma sessão em andamento por treino atribuído (permite "retomar").
create unique index ws_one_in_progress
  on public.workout_sessions (student_workout_id)
  where status = 'in_progress';

create index ws_student_idx on public.workout_sessions (student_id, started_at desc);
create index ws_trainer_idx on public.workout_sessions (trainer_id, started_at desc);

create trigger ws_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

-- Inicia (ou retoma) a sessão. Idempotente por client_session_id e por treino em andamento.
create or replace function public.start_workout_session(p_student_workout_id uuid, p_client_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sw  record;
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_client_session_id is null then
    raise exception 'client session id is required' using errcode = '22023';
  end if;

  select sw.id, sw.trainer_id, sw.status, ts.status as link_status
    into v_sw
    from public.student_workouts sw
    join public.trainer_students ts on ts.id = sw.link_id
   where sw.id = p_student_workout_id and sw.student_id = v_uid;
  if not found then
    raise exception 'workout not found' using errcode = 'P0002';
  end if;
  if v_sw.status <> 'active' or v_sw.link_status <> 'active' then
    raise exception 'workout is no longer available' using errcode = 'P0001';
  end if;

  select s.id into v_id
    from public.workout_sessions s
   where s.student_id = v_uid
     and (s.client_session_id = p_client_session_id
          or (s.student_workout_id = p_student_workout_id and s.status = 'in_progress'))
   order by (s.client_session_id = p_client_session_id) desc
   limit 1;
  if v_id is not null then
    return v_id;
  end if;

  begin
    insert into public.workout_sessions (student_workout_id, student_id, trainer_id, client_session_id)
    values (p_student_workout_id, v_uid, v_sw.trainer_id, p_client_session_id)
    returning id into v_id;
  exception when unique_violation then
    select s.id into v_id
      from public.workout_sessions s
     where s.student_workout_id = p_student_workout_id and s.status = 'in_progress';
  end;

  return v_id;
end;
$$;

-- Conclui a sessão. Exige ao menos uma série concluída (não inventamos treino).
create or replace function public.finish_workout_session(p_session_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform 1 from public.workout_sessions s
   where s.id = p_session_id and s.student_id = v_uid and s.status = 'in_progress'
   for update;
  if not found then
    raise exception 'session not found or already closed' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.workout_sets w where w.session_id = p_session_id and w.completed
  ) then
    raise exception 'register at least one completed set before finishing' using errcode = '23514';
  end if;

  update public.workout_sessions
     set status = 'completed', finished_at = now(), notes = nullif(btrim(p_notes), '')
   where id = p_session_id;
end;
$$;

create or replace function public.abandon_workout_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.workout_sessions
     set status = 'abandoned', finished_at = now()
   where id = p_session_id and student_id = v_uid and status = 'in_progress';

  if not found then
    raise exception 'session not found or already closed' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Séries realizadas
-- ---------------------------------------------------------------------------

create table public.workout_sets (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null,
  student_id        uuid not null,
  trainer_id        uuid not null,
  exercise_position integer not null check (exercise_position between 1 and 100),
  exercise_name     text not null,
  set_number        integer not null check (set_number between 1 and 50),
  reps_done         integer check (reps_done is null or reps_done between 0 and 1000),
  load_kg           numeric(6, 2) check (load_kg is null or load_kg between 0 and 1000),
  completed         boolean not null default false,
  client_set_id     uuid not null,
  recorded_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint wset_session_fk foreign key (session_id, student_id, trainer_id)
    references public.workout_sessions (id, student_id, trainer_id) on delete cascade,
  -- Idempotência de reenvio (fila offline) e uma linha por série.
  constraint wset_client_uq unique (session_id, client_set_id),
  constraint wset_slot_uq unique (session_id, exercise_position, set_number)
);

create index wset_student_idx on public.workout_sets (student_id, recorded_at desc);
create index wset_trainer_idx on public.workout_sets (trainer_id, recorded_at desc);

create trigger wset_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

-- Roda com os privilégios de quem escreve (RLS vale): o aluno só enxerga as próprias
-- sessões, então não consegue apontar uma série para sessão alheia.
create or replace function public.workout_sets_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session record;
  v_exercise jsonb;
begin
  if tg_op = 'DELETE' then
    if current_user in ('anon', 'authenticated') then
      select s.status into v_session from public.workout_sessions s where s.id = old.session_id;
      if found and v_session.status <> 'in_progress' then
        raise exception 'session is closed' using errcode = '42501';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.session_id is distinct from old.session_id
       or new.student_id is distinct from old.student_id
       or new.trainer_id is distinct from old.trainer_id
       or new.exercise_position is distinct from old.exercise_position
       or new.exercise_name is distinct from old.exercise_name
       or new.set_number is distinct from old.set_number
       or new.client_set_id is distinct from old.client_set_id then
      raise exception 'immutable column' using errcode = '42501';
    end if;
    select s.status into v_session from public.workout_sessions s where s.id = old.session_id;
    if not found or v_session.status <> 'in_progress' then
      raise exception 'session is closed' using errcode = '42501';
    end if;
    return new;
  end if;

  -- INSERT
  select s.student_id, s.trainer_id, s.status, s.student_workout_id
    into v_session
    from public.workout_sessions s
   where s.id = new.session_id;
  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'session is closed' using errcode = '42501';
  end if;

  select x.value into v_exercise
    from public.student_workouts sw
   cross join lateral jsonb_array_elements(sw.snapshot -> 'exercises') as x(value)
   where sw.id = v_session.student_workout_id
     and (x.value ->> 'position')::integer = new.exercise_position;
  if v_exercise is null then
    raise exception 'exercise position is not part of the prescription' using errcode = '23514';
  end if;

  -- Campos derivados vêm sempre do servidor, nunca do cliente.
  new.student_id := v_session.student_id;
  new.trainer_id := v_session.trainer_id;
  new.exercise_name := v_exercise ->> 'name';
  return new;
end;
$$;

create trigger workout_sets_guard
  before insert or update or delete on public.workout_sets
  for each row execute function public.workout_sets_guard();

-- ---------------------------------------------------------------------------
-- Medidas registradas pelo aluno (compartilhamento com o personal é opt-in)
-- ---------------------------------------------------------------------------

create table public.progress_entries (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_date          date not null default current_date,
  metric              text not null check (metric in ('body_weight_kg', 'waist_cm', 'body_fat_pct')),
  value               numeric(7, 2) not null check (value > 0 and value < 1000),
  note                text check (note is null or char_length(note) <= 300),
  shared_with_trainer boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint pe_one_per_day unique (student_id, entry_date, metric)
);

create trigger pe_set_updated_at
  before update on public.progress_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Funções: privilégios
-- ---------------------------------------------------------------------------

revoke all on function public.reorder_plan_exercises(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.duplicate_workout_plan(uuid) from public, anon, authenticated;
revoke all on function public.assign_workout(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_workout_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_workout_session(uuid, text) from public, anon, authenticated;
revoke all on function public.abandon_workout_session(uuid) from public, anon, authenticated;
grant execute on function public.reorder_plan_exercises(uuid, uuid[]) to authenticated;
grant execute on function public.duplicate_workout_plan(uuid) to authenticated;
grant execute on function public.assign_workout(uuid, uuid) to authenticated;
grant execute on function public.start_workout_session(uuid, uuid) to authenticated;
grant execute on function public.finish_workout_session(uuid, text) to authenticated;
grant execute on function public.abandon_workout_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.workout_plans enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.student_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.progress_entries enable row level security;

-- workout_plans: só o personal dono.
create policy workout_plans_select_own on public.workout_plans
  for select to authenticated using (trainer_id = (select auth.uid()));
create policy workout_plans_insert_own on public.workout_plans
  for insert to authenticated
  with check (trainer_id = (select auth.uid()) and public.is_trainer());
create policy workout_plans_update_own on public.workout_plans
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy workout_plans_delete_own on public.workout_plans
  for delete to authenticated using (trainer_id = (select auth.uid()));

-- workout_plan_exercises: via dono do plano.
create policy wpe_select_own on public.workout_plan_exercises
  for select to authenticated
  using (exists (select 1 from public.workout_plans p
                 where p.id = plan_id and p.trainer_id = (select auth.uid())));
create policy wpe_insert_own on public.workout_plan_exercises
  for insert to authenticated
  with check (exists (select 1 from public.workout_plans p
                      where p.id = plan_id and p.trainer_id = (select auth.uid())));
create policy wpe_update_own on public.workout_plan_exercises
  for update to authenticated
  using (exists (select 1 from public.workout_plans p
                 where p.id = plan_id and p.trainer_id = (select auth.uid())))
  with check (exists (select 1 from public.workout_plans p
                      where p.id = plan_id and p.trainer_id = (select auth.uid())));
create policy wpe_delete_own on public.workout_plan_exercises
  for delete to authenticated
  using (exists (select 1 from public.workout_plans p
                 where p.id = plan_id and p.trainer_id = (select auth.uid())));

-- student_workouts: personal que prescreveu e aluno que recebeu. Sem INSERT pela API.
create policy sw_select on public.student_workouts
  for select to authenticated
  using (trainer_id = (select auth.uid()) or student_id = (select auth.uid()));
create policy sw_update_trainer on public.student_workouts
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

-- workout_sessions: aluno vê as suas; personal vê as de alunos com vínculo ATIVO.
create policy ws_select_student on public.workout_sessions
  for select to authenticated using (student_id = (select auth.uid()));
create policy ws_select_trainer on public.workout_sessions
  for select to authenticated
  using (trainer_id = (select auth.uid()) and public.is_my_student(student_id));

-- workout_sets: idem; escrita só do aluno dono (sessão em andamento, validado no gatilho).
create policy wset_select_student on public.workout_sets
  for select to authenticated using (student_id = (select auth.uid()));
create policy wset_select_trainer on public.workout_sets
  for select to authenticated
  using (trainer_id = (select auth.uid()) and public.is_my_student(student_id));
create policy wset_insert_student on public.workout_sets
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy wset_update_student on public.workout_sets
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
create policy wset_delete_student on public.workout_sets
  for delete to authenticated using (student_id = (select auth.uid()));

-- progress_entries: o aluno controla; o personal só vê o que foi compartilhado.
create policy pe_select_student on public.progress_entries
  for select to authenticated using (student_id = (select auth.uid()));
create policy pe_select_trainer on public.progress_entries
  for select to authenticated
  using (shared_with_trainer and public.is_my_student(student_id));
create policy pe_insert_student on public.progress_entries
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy pe_update_student on public.progress_entries
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
create policy pe_delete_student on public.progress_entries
  for delete to authenticated using (student_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- GRANTs (mínimos, por coluna onde importa)
-- ---------------------------------------------------------------------------

revoke all on public.workout_plans from anon, authenticated;
revoke all on public.workout_plan_exercises from anon, authenticated;
revoke all on public.student_workouts from anon, authenticated;
revoke all on public.workout_sessions from anon, authenticated;
revoke all on public.workout_sets from anon, authenticated;
revoke all on public.progress_entries from anon, authenticated;

grant select, delete on public.workout_plans to authenticated;
grant insert (name, description) on public.workout_plans to authenticated;
grant update (name, description, status) on public.workout_plans to authenticated;

grant select, delete on public.workout_plan_exercises to authenticated;
grant insert (plan_id, exercise_id, position, sets, reps, rest_seconds, suggested_load_kg, notes)
  on public.workout_plan_exercises to authenticated;
grant update (exercise_id, position, sets, reps, rest_seconds, suggested_load_kg, notes)
  on public.workout_plan_exercises to authenticated;

grant select on public.student_workouts to authenticated;
grant update (status) on public.student_workouts to authenticated;

grant select on public.workout_sessions to authenticated;

grant select, delete on public.workout_sets to authenticated;
grant insert (session_id, exercise_position, set_number, reps_done, load_kg, completed, client_set_id)
  on public.workout_sets to authenticated;
grant update (reps_done, load_kg, completed) on public.workout_sets to authenticated;

grant select, delete on public.progress_entries to authenticated;
grant insert (entry_date, metric, value, note, shared_with_trainer)
  on public.progress_entries to authenticated;
grant update (value, note, shared_with_trainer) on public.progress_entries to authenticated;
