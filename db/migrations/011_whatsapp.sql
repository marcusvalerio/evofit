-- EVOFIT — mensagens automáticas de WhatsApp (Evolution API): registro do que foi enviado.
create table if not exists whatsapp_log (
  id bigserial primary key,
  to_number text not null,
  kind text not null check (length(kind) <= 40),
  ref text not null default '' check (length(ref) <= 80),
  status text not null check (status in ('enviado', 'erro', 'desligado')),
  error text not null default '' check (length(error) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_log_at on whatsapp_log (created_at desc);
-- lembretes únicos (ex.: "teste acaba em 2 dias" só uma vez por personal)
create unique index if not exists whatsapp_log_once on whatsapp_log (kind, ref) where status = 'enviado' and ref <> '';
