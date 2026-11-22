-- EVOFIT — recuperação de senha por e-mail e aceite dos Termos de Uso / Política de Privacidade.
create table if not exists password_resets (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user on password_resets (user_id);

alter table users add column if not exists terms_accepted_at timestamptz;
alter table users add column if not exists terms_version text not null default '' check (length(terms_version) <= 20);
