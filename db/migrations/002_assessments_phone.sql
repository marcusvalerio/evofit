-- EVOFIT — telefone do aluno (WhatsApp) e avaliações físicas.

alter table students add column phone text not null default '' check (phone ~ '^([0-9]{10,13})?$');

create table assessments (
  trainer_id uuid not null,
  id text not null check (length(id) between 1 and 64),
  student_id text not null,
  date date not null,
  sex text not null check (sex in ('F', 'M')),
  age int check (age between 5 and 110),
  weight_kg numeric(5, 1) check (weight_kg between 20 and 350),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  skinfolds jsonb not null default '{}' check (jsonb_typeof(skinfolds) = 'object'),
  circumferences jsonb not null default '{}' check (jsonb_typeof(circumferences) = 'object'),
  notes text not null default '' check (length(notes) <= 500),
  created_at timestamptz not null,
  primary key (trainer_id, id),
  foreign key (trainer_id, student_id) references students (trainer_id, id) on delete cascade
);
create index assessments_student on assessments (trainer_id, student_id, date);

alter table assessments enable row level security;
alter table assessments force row level security;

-- Personal: tudo do próprio tenant. Aluno: só lê as próprias avaliações.
create policy assessments_trainer on assessments for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer') with check (trainer_id = app_trainer_id() and app_role() = 'trainer');
create policy assessments_student on assessments for select to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id());

grant select, insert, update, delete on assessments to evofit_app;
