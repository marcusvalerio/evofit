-- EVOFIT — horário de atendimento do personal, comentário em série/treino no chat e notificações push.
-- Padrão: livre 24h (o personal pode limitar quando quiser).
alter table trainers add column if not exists chat_always boolean not null default true;
alter table trainers add column if not exists chat_from smallint not null default 360 check (chat_from between 0 and 1439);
alter table trainers add column if not exists chat_to smallint not null default 1320 check (chat_to between 0 and 1439);
alter table trainers add column if not exists chat_days smallint not null default 62 check (chat_days between 0 and 127);

alter table messages add column if not exists context text check (context is null or length(context) <= 160);

create table if not exists push_subscriptions (
  endpoint text primary key check (length(endpoint) <= 1000),
  user_id uuid not null references users (id) on delete cascade,
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;
