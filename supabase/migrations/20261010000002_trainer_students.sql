-- EVOFIT 0002 — Vínculo personal ↔ aluno.
--
-- Fluxo: o personal convida (RPC) → recebe um token de uso único → compartilha o link →
-- o aluno, já logado, aceita (RPC). Só o hash do token é armazenado. O vínculo só vira
-- 'active' pelo aceite do próprio aluno; é isso que autoriza o personal a ver dados dele.
-- Inserções/atualizações diretas de vínculo pela API não existem (apenas RPC).

create table public.trainer_students (
  id                uuid primary key default gen_random_uuid(),
  trainer_id        uuid not null references public.profiles (id) on delete cascade,
  student_id        uuid references public.profiles (id) on delete cascade,
  student_name      text not null check (char_length(btrim(student_name)) between 1 and 120),
  status            text not null default 'invited' check (status in ('invited', 'active', 'ended')),
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  accepted_at       timestamptz,
  ended_at          timestamptz,
  ended_by          uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint ts_not_self check (student_id is null or student_id <> trainer_id),
  constraint ts_state check (
    (status = 'invited'
      and student_id is null
      and invite_token_hash is not null
      and invite_expires_at is not null
      and ended_at is null)
    or
    (status = 'active'
      and student_id is not null
      and accepted_at is not null
      and invite_token_hash is null
      and ended_at is null)
    or
    (status = 'ended' and ended_at is not null and invite_token_hash is null)
  ),
  -- Permite chaves estrangeiras compostas nas tabelas que denormalizam trainer/student.
  constraint ts_id_pair_uq unique (id, trainer_id, student_id)
);

create unique index trainer_students_one_active_pair
  on public.trainer_students (trainer_id, student_id)
  where status = 'active';

create index trainer_students_trainer_idx on public.trainer_students (trainer_id, status);
create index trainer_students_student_idx on public.trainer_students (student_id, status);

create trigger trainer_students_set_updated_at
  before update on public.trainer_students
  for each row execute function public.set_updated_at();

-- Guard: a API só pode renomear o aluno e encerrar o vínculo. Transições para 'active'
-- acontecem exclusivamente pela RPC de aceite (caminho confiável).
create or replace function public.trainer_students_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
       or new.trainer_id is distinct from old.trainer_id
       or new.student_id is distinct from old.student_id
       or new.invite_token_hash is distinct from old.invite_token_hash
       or new.invite_expires_at is distinct from old.invite_expires_at
       or new.accepted_at is distinct from old.accepted_at then
      raise exception 'immutable column' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and new.status <> 'ended' then
      raise exception 'invalid status transition' using errcode = '42501';
    end if;
  end if;

  if old.status = 'ended' and new.status <> 'ended' then
    raise exception 'ended links cannot be reopened' using errcode = '42501';
  end if;

  if new.status = 'ended' and old.status <> 'ended' then
    new.ended_at := now();
    new.ended_by := (select auth.uid());
    new.invite_token_hash := null;
    new.invite_expires_at := null;
  end if;

  return new;
end;
$$;

create trigger trainer_students_guard
  before update on public.trainer_students
  for each row execute function public.trainer_students_guard();

-- Auxiliares relativos a auth.uid() (sem oráculo sobre terceiros).
create or replace function public.is_my_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trainer_students ts
    where ts.trainer_id = (select auth.uid())
      and ts.student_id = p_student
      and ts.status = 'active'
  )
$$;

create or replace function public.is_my_trainer(p_trainer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trainer_students ts
    where ts.student_id = (select auth.uid())
      and ts.trainer_id = p_trainer
      and ts.status = 'active'
  )
$$;

revoke all on function public.is_my_student(uuid) from public, anon, authenticated;
revoke all on function public.is_my_trainer(uuid) from public, anon, authenticated;
grant execute on function public.is_my_student(uuid) to authenticated;
grant execute on function public.is_my_trainer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.trainer_invite_student(p_student_name text)
returns table (link_id uuid, invite_token text, invite_expires timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_token   text;
  v_id      uuid;
  v_expires timestamptz := now() + interval '14 days';
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_trainer() then
    raise exception 'only trainers can invite students' using errcode = '42501';
  end if;
  if (select count(*) from public.trainer_students t
      where t.trainer_id = v_uid and t.status = 'invited') >= 100 then
    raise exception 'too many pending invitations' using errcode = 'P0429';
  end if;

  -- 244 bits de entropia (dois UUIDv4 de CSPRNG). Só o hash é gravado.
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.trainer_students (trainer_id, student_name, status, invite_token_hash, invite_expires_at)
  values (
    v_uid,
    btrim(p_student_name),
    'invited',
    encode(sha256(convert_to(v_token, 'utf8')), 'hex'),
    v_expires
  )
  returning id into v_id;

  return query select v_id, v_token, v_expires;
end;
$$;

create or replace function public.accept_student_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if public.my_role() is distinct from 'student' then
    raise exception 'only students can accept invitations' using errcode = '42501';
  end if;

  select ts.id into v_id
  from public.trainer_students ts
  where ts.invite_token_hash = encode(sha256(convert_to(btrim(coalesce(p_token, '')), 'utf8')), 'hex')
    and ts.status = 'invited'
    and ts.invite_expires_at > now()
  for update;

  if v_id is null then
    raise exception 'invalid or expired invitation' using errcode = 'P0002';
  end if;

  update public.trainer_students
     set student_id        = v_uid,
         status            = 'active',
         accepted_at       = now(),
         invite_token_hash = null,
         invite_expires_at = null
   where id = v_id;

  return v_id;
end;
$$;

create or replace function public.end_student_link(p_link_id uuid)
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

  update public.trainer_students
     set status = 'ended'
   where id = p_link_id
     and student_id = v_uid
     and status = 'active';

  if not found then
    raise exception 'link not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.trainer_invite_student(text) from public, anon, authenticated;
revoke all on function public.accept_student_invite(text) from public, anon, authenticated;
revoke all on function public.end_student_link(uuid) from public, anon, authenticated;
grant execute on function public.trainer_invite_student(text) to authenticated;
grant execute on function public.accept_student_invite(text) to authenticated;
grant execute on function public.end_student_link(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.trainer_students enable row level security;

create policy trainer_students_select on public.trainer_students
  for select to authenticated
  using (trainer_id = (select auth.uid()) or student_id = (select auth.uid()));

-- Só o personal dono pode renomear/encerrar pela API (o aluno encerra via RPC).
create policy trainer_students_update_trainer on public.trainer_students
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

revoke all on public.trainer_students from anon, authenticated;
-- O hash do token nunca é legível pela API.
grant select (id, trainer_id, student_id, student_name, status, invite_expires_at,
              accepted_at, ended_at, ended_by, created_at, updated_at)
  on public.trainer_students to authenticated;
grant update (student_name, status) on public.trainer_students to authenticated;

-- Perfis de pessoas vinculadas ficam visíveis entre si (apenas nome/papel/avatar).
create policy profiles_select_linked_student on public.profiles
  for select to authenticated
  using (public.is_my_student(id));

create policy profiles_select_linked_trainer on public.profiles
  for select to authenticated
  using (public.is_my_trainer(id));
