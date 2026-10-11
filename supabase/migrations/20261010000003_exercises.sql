-- EVOFIT 0003 — Biblioteca de exercícios.
--
-- owner_id NULL = exercício global (catálogo, gerenciado só por service_role/migrações).
-- owner_id preenchido = exercício privado do personal. Exercícios não são apagados pela
-- API: são arquivados (is_archived), para não quebrar prescrições antigas.
-- Mídia: somente URLs https de fontes autorizadas; nada é copiado/raspado.

create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.profiles (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 2 and 120),
  muscle_group text not null check (muscle_group in (
    'peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco', 'abdomen', 'lombar',
    'gluteos', 'quadriceps', 'posterior', 'panturrilha', 'corpo_inteiro', 'cardio', 'mobilidade'
  )),
  equipment    text not null check (equipment in (
    'nenhum', 'halteres', 'barra', 'maquina', 'cabo', 'kettlebell', 'elastico',
    'banco', 'paralelas', 'cardio', 'outro'
  )),
  instructions text check (instructions is null or char_length(instructions) <= 2000),
  media_url    text check (media_url is null or (media_url ~* '^https://[^\s]+$' and char_length(media_url) <= 500)),
  media_type   text check (media_type is null or media_type in ('gif', 'video', 'image')),
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint exercises_media_pair check ((media_url is null) = (media_type is null))
);

-- Nomes únicos (sem acento/caixa) dentro do catálogo global e dentro de cada personal.
create unique index exercises_global_name_uq
  on public.exercises (public.norm_text(name))
  where owner_id is null;

create unique index exercises_owner_name_uq
  on public.exercises (owner_id, public.norm_text(name))
  where owner_id is not null and not is_archived;

create index exercises_owner_idx on public.exercises (owner_id);
create index exercises_group_idx on public.exercises (muscle_group);

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

-- Catálogo global + exercícios próprios.
create policy exercises_select on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

-- Só personais criam, e só em nome próprio (nunca "global").
create policy exercises_insert_own on public.exercises
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_trainer());

create policy exercises_update_own on public.exercises
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.exercises from anon, authenticated;
grant select on public.exercises to authenticated;
grant insert (owner_id, name, muscle_group, equipment, instructions, media_url, media_type)
  on public.exercises to authenticated;
grant update (name, muscle_group, equipment, instructions, media_url, media_type, is_archived)
  on public.exercises to authenticated;
