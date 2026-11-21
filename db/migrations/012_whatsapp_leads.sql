-- EVOFIT — vendedor automático no WhatsApp: conversas com interessados (leads).
create table if not exists whatsapp_leads (
  number text primary key check (number ~ '^[0-9]{10,15}$'),
  name text not null default '' check (length(name) <= 80),
  stage text not null default 'novo' check (stage in ('novo', 'conhecendo', 'planos', 'teste', 'vitalicio', 'humano')),
  messages int not null default 0,
  last_text text not null default '' check (length(last_text) <= 300),
  last_in_at timestamptz,
  last_bot_text text not null default '' check (length(last_bot_text) <= 1500),
  last_out_at timestamptz,
  -- robô pausado (a equipe assumiu a conversa) até esta data
  paused_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_leads_recent on whatsapp_leads (last_in_at desc);
