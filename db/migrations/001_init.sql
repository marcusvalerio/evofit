-- EVOFIT — schema inicial.
--
-- Isolamento por personal (tenant) com Row Level Security:
--   * O app acessa os dados de treino sempre como o papel `evofit_app` (SET LOCAL ROLE dentro da
--     transação), que não ignora RLS. Políticas usam as variáveis de transação:
--       app.trainer_id  — personal dono dos dados (sempre definido)
--       app.role        — 'trainer' ou 'student'
--       app.student_id  — aluno logado (somente quando app.role = 'student')
--   * Tabelas de autenticação não são acessíveis a `evofit_app`.

-- Papel sem login usado pelo app para acessar dados de treino.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'evofit_app') then
    create role evofit_app nologin nobypassrls;
  end if;
end $$;
grant evofit_app to current_user;

create or replace function app_trainer_id() returns uuid language sql stable as
  $$ select nullif(current_setting('app.trainer_id', true), '')::uuid $$;
create or replace function app_role() returns text language sql stable as
  $$ select coalesce(nullif(current_setting('app.role', true), ''), 'none') $$;
create or replace function app_student_id() returns text language sql stable as
  $$ select nullif(current_setting('app.student_id', true), '') $$;

-- ---------- Autenticação ----------

create table users (
  id uuid primary key,
  email text not null,
  password_hash text not null,
  role text not null check (role in ('trainer', 'student')),
  trainer_id uuid not null,
  student_id text,
  created_at timestamptz not null default now(),
  check ((role = 'student') = (student_id is not null))
);
create unique index users_email_key on users (lower(email));
create unique index users_student_key on users (trainer_id, student_id) where student_id is not null;

create table auth_sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index auth_sessions_user on auth_sessions (user_id);

create table invites (
  code_hash text primary key,
  trainer_id uuid not null,
  student_id text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table auth_throttle (
  key text primary key,
  attempts int not null,
  window_start timestamptz not null
);

-- ---------- Dados do personal ----------

create table trainers (
  id uuid primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (length(name) between 2 and 80),
  headline text not null default '' check (length(headline) <= 100),
  bio text not null default '' check (length(bio) <= 600),
  city text not null default '' check (length(city) <= 80),
  state text not null default '' check (length(state) <= 2),
  region text not null default '' check (length(region) <= 80),
  modality text not null default 'presencial' check (modality in ('presencial', 'online', 'hibrido')),
  specialties text[] not null default '{}',
  registry text not null default '' check (length(registry) <= 40),
  accent text not null default 'otan' check (accent in ('otan', 'gravy', 'cobblestone', 'smoke')),
  directory_visible boolean not null default false,
  created_at timestamptz not null default now()
);

alter table users add constraint users_trainer_fk foreign key (trainer_id) references trainers (id) on delete cascade;
alter table invites add constraint invites_trainer_fk foreign key (trainer_id) references trainers (id) on delete cascade;

create table students (
  trainer_id uuid not null references trainers (id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  name text not null check (length(name) between 2 and 80),
  goal text not null default '' check (length(goal) <= 120),
  level text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  weekly_target int not null check (weekly_target between 1 and 7),
  notes text not null default '' check (length(notes) <= 500),
  status text not null check (status in ('ativo', 'arquivado')),
  created_at timestamptz not null,
  primary key (trainer_id, id)
);

create table exercises (
  trainer_id uuid not null references trainers (id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  name text not null check (length(name) between 2 and 80),
  muscle_group text not null check (length(muscle_group) <= 40),
  equipment text not null default '' check (length(equipment) <= 60),
  instructions text not null default '' check (length(instructions) <= 600),
  primary key (trainer_id, id)
);

create table exercise_media (
  trainer_id uuid not null references trainers (id) on delete cascade,
  exercise_id text not null check (length(exercise_id) between 1 and 120),
  video_url text not null default '' check (length(video_url) <= 500),
  tip text not null default '' check (length(tip) <= 300),
  primary key (trainer_id, exercise_id)
);

create table workouts (
  trainer_id uuid not null references trainers (id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  name text not null check (length(name) between 2 and 80),
  description text not null default '' check (length(description) <= 300),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (trainer_id, id)
);

create table workout_assignments (
  trainer_id uuid not null,
  workout_id text not null,
  student_id text not null,
  primary key (trainer_id, workout_id, student_id),
  foreign key (trainer_id, workout_id) references workouts (trainer_id, id) on delete cascade,
  foreign key (trainer_id, student_id) references students (trainer_id, id) on delete cascade
);

create table sessions (
  trainer_id uuid not null,
  id text not null check (length(id) between 1 and 64),
  student_id text not null,
  workout_id text not null,
  workout_name text not null check (length(workout_name) <= 80),
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null check (status in ('em_andamento', 'concluida')),
  sets jsonb not null check (jsonb_typeof(sets) = 'array'),
  note text not null default '' check (length(note) <= 300),
  primary key (trainer_id, id),
  foreign key (trainer_id, student_id) references students (trainer_id, id) on delete cascade
);
create index sessions_student on sessions (trainer_id, student_id, started_at);
-- no máximo uma sessão em andamento por aluno
create unique index sessions_one_live on sessions (trainer_id, student_id) where status = 'em_andamento';

create table contact_requests (
  trainer_id uuid not null references trainers (id) on delete cascade,
  id text not null,
  name text not null check (length(name) between 2 and 80),
  contact text not null check (length(contact) between 5 and 120),
  message text not null default '' check (length(message) <= 500),
  created_at timestamptz not null default now(),
  primary key (trainer_id, id)
);

-- ---------- Row Level Security ----------

alter table trainers enable row level security;
alter table trainers force row level security;
alter table students enable row level security;
alter table students force row level security;
alter table exercises enable row level security;
alter table exercises force row level security;
alter table exercise_media enable row level security;
alter table exercise_media force row level security;
alter table workouts enable row level security;
alter table workouts force row level security;
alter table workout_assignments enable row level security;
alter table workout_assignments force row level security;
alter table sessions enable row level security;
alter table sessions force row level security;
alter table contact_requests enable row level security;
alter table contact_requests force row level security;
alter table users enable row level security;
alter table auth_sessions enable row level security;
alter table invites enable row level security;
alter table auth_throttle enable row level security;

-- Personal: tudo do próprio tenant. Aluno: somente leitura do necessário + as próprias sessões.
create policy trainers_read on trainers for select to evofit_app using (id = app_trainer_id());
create policy trainers_create on trainers for insert to evofit_app with check (id = app_trainer_id() and app_role() = 'trainer');
create policy trainers_delete on trainers for delete to evofit_app using (id = app_trainer_id() and app_role() = 'trainer');
create policy trainers_write on trainers for update to evofit_app using (id = app_trainer_id() and app_role() = 'trainer') with check (id = app_trainer_id());

create policy students_trainer on students for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer') with check (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy students_self on students for select to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and id = app_student_id());

create policy exercises_trainer on exercises for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer') with check (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy exercises_student on exercises for select to evofit_app using (trainer_id = app_trainer_id() and app_role() = 'student');

create policy media_trainer on exercise_media for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer') with check (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy media_student on exercise_media for select to evofit_app using (trainer_id = app_trainer_id() and app_role() = 'student');

create policy workouts_trainer on workouts for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer') with check (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy workouts_student on workouts for select to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and exists (
    select 1 from workout_assignments a where a.trainer_id = workouts.trainer_id and a.workout_id = workouts.id and a.student_id = app_student_id()));

create policy assignments_trainer on workout_assignments for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer') with check (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy assignments_student on workout_assignments for select to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id());

-- Personal lê todas as sessões e só pode descartar as que estão em andamento.
create policy sessions_trainer_read on sessions for select to evofit_app using (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy sessions_trainer_discard on sessions for delete to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer' and status = 'em_andamento');
-- Aluno: as próprias sessões; concluída não volta a ser editada.
create policy sessions_student_read on sessions for select to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id());
create policy sessions_student_insert on sessions for insert to evofit_app
  with check (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id());
create policy sessions_student_update on sessions for update to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id() and status = 'em_andamento')
  with check (trainer_id = app_trainer_id() and student_id = app_student_id());
create policy sessions_student_delete on sessions for delete to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id() and status = 'em_andamento');

create policy contacts_trainer on contact_requests for select to evofit_app using (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy contacts_trainer_delete on contact_requests for delete to evofit_app using (trainer_id = app_trainer_id() and app_role() = 'trainer');
-- Visitante do diretório: só insere, e só para personal visível no diretório.
create policy contacts_public_insert on contact_requests for insert to evofit_app
  with check (app_role() = 'public' and trainer_id = app_trainer_id()
    and exists (select 1 from trainers t where t.id = contact_requests.trainer_id and t.directory_visible));
create policy trainers_public_read on trainers for select to evofit_app using (app_role() = 'public' and directory_visible);

grant usage on schema public to evofit_app;
grant select, insert, update, delete on trainers to evofit_app;
grant select, insert, update, delete on students, exercises, exercise_media, workouts, workout_assignments, sessions, contact_requests to evofit_app;
grant execute on function app_trainer_id(), app_role(), app_student_id() to evofit_app;
