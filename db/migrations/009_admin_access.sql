-- EVOFIT — admin central: liberação manual de acesso, histórico de logins, pedidos de Vitalício (Pix)
-- e onboarding do personal.

-- Acesso liberado pelo admin (ex.: Vitalício pago por Pix) e dias extras de teste.
alter table billing add column if not exists source text not null default 'stripe' check (source in ('stripe', 'manual'));
alter table billing add column if not exists manual_until timestamptz;
alter table billing add column if not exists trial_extra_days int not null default 0 check (trial_extra_days between 0 and 3650);
alter table billing add column if not exists note text not null default '' check (length(note) <= 300);

-- Onboarding: contas que já existiam não precisam passar por ele.
alter table users add column if not exists onboarded_at timestamptz;
update users set onboarded_at = coalesce(onboarded_at, created_at) where role = 'trainer';

-- Histórico de acessos (login). Guardamos só o navegador resumido, sem IP.
create table if not exists login_events (
  id bigserial primary key,
  user_id uuid not null references users (id) on delete cascade,
  trainer_id uuid not null,
  role text not null,
  device text not null default '' check (length(device) <= 60),
  at timestamptz not null default now()
);
create index if not exists login_events_trainer on login_events (trainer_id, at desc);
create index if not exists login_events_at on login_events (at desc);

-- Pedidos de Vitalício: pago por Pix direto com a equipe; o admin confirma e libera.
create table if not exists lifetime_requests (
  id bigserial primary key,
  trainer_id uuid not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by text
);
create index if not exists lifetime_requests_status on lifetime_requests (status, created_at desc);
