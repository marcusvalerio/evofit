-- EVOFIT — monitoramento de erros (servidor e navegador) e registro de e-mails automáticos.
create table if not exists app_errors (
  fingerprint text primary key,
  source text not null check (source in ('servidor', 'navegador')),
  route text not null default '' check (length(route) <= 200),
  message text not null check (length(message) <= 500),
  stack text not null default '' check (length(stack) <= 2000),
  count int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
create index if not exists app_errors_last on app_errors (last_at desc);

create table if not exists email_log (
  id bigserial primary key,
  to_email text not null,
  kind text not null check (length(kind) <= 40),
  ref text not null default '' check (length(ref) <= 80),
  status text not null check (status in ('enviado', 'erro', 'desligado')),
  created_at timestamptz not null default now()
);
create unique index if not exists email_log_once on email_log (kind, ref) where status = 'enviado' and ref <> '';
