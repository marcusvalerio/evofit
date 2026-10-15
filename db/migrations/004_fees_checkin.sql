-- EVOFIT — mensalidade por aluno, chave Pix do personal, pagamentos marcados e check-in pós-treino.
-- O EVOFIT não processa pagamentos: o personal só registra o que recebeu.

alter table students add column monthly_fee numeric(10, 2) check (monthly_fee > 0 and monthly_fee <= 100000);
alter table students add column due_day int check (due_day between 1 and 28);
alter table trainers add column pix_key text not null default '' check (length(pix_key) <= 140);
alter table sessions add column checkin jsonb check (checkin is null or jsonb_typeof(checkin) = 'object');

create table payments (
  trainer_id uuid not null,
  id text not null check (length(id) between 1 and 64),
  student_id text not null,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 100000),
  paid_at timestamptz not null,
  primary key (trainer_id, id),
  unique (trainer_id, student_id, month),
  foreign key (trainer_id, student_id) references students (trainer_id, id) on delete cascade
);

alter table payments enable row level security;
alter table payments force row level security;

-- Só o personal vê e registra pagamentos.
create policy payments_trainer on payments for all to evofit_app
  using (trainer_id = app_trainer_id() and app_role() = 'trainer') with check (trainer_id = app_trainer_id() and app_role() = 'trainer');

grant select, insert, update, delete on payments to evofit_app;
