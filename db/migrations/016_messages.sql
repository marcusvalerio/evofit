-- EVOFIT — chat 1 a 1 entre personal e aluno (proposta de Chat e Avisos, MVP item 3). Só texto.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null,
  student_id text not null,
  sender text not null check (sender in ('trainer', 'student')),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  foreign key (trainer_id, student_id) references students (trainer_id, id) on delete cascade
);
create index if not exists messages_thread on messages (trainer_id, student_id, created_at);

alter table messages enable row level security;
alter table messages force row level security;

drop policy if exists messages_trainer on messages;
create policy messages_trainer on messages for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer')
  with check (trainer_id = app_trainer_id() and app_role() = 'trainer' and sender = 'trainer');
drop policy if exists messages_student_read on messages;
create policy messages_student_read on messages for select to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id());
drop policy if exists messages_student_send on messages;
create policy messages_student_send on messages for insert to evofit_app
  with check (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id() and sender = 'student');
drop policy if exists messages_student_mark on messages;
create policy messages_student_mark on messages for update to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id())
  with check (trainer_id = app_trainer_id() and app_role() = 'student' and student_id = app_student_id());

grant select, insert on messages to evofit_app;
grant update (read_at) on messages to evofit_app;
