-- EVOFIT — assinaturas (Stripe).
-- Uma linha por personal. Só o servidor acessa (o papel evofit_app não tem permissão).

create table if not exists billing (
  trainer_id uuid primary key,
  stripe_customer_id text unique,
  plan text check (plan in ('inicial', 'mensal', 'anual', 'fundador', 'vitalicio')),
  status text not null default 'none' check (status in ('none', 'active', 'past_due', 'canceled')),
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  lifetime boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Códigos Fundador: individuais e de uso único. Guardamos só o hash.
create table if not exists founder_codes (
  code_hash text primary key,
  label text not null default '',
  reserved_by uuid,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Eventos do Stripe já processados (o webhook pode chegar repetido).
create table if not exists stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);
