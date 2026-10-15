-- EVOFIT — acesso do aluno gerado pelo personal: usuário + senha provisória, troca obrigatória no
-- primeiro acesso, nova senha e revogação. O convite por link continua funcionando.

alter table users alter column email drop not null;
alter table users add column username text check (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$');
create unique index users_username_key on users (lower(username)) where username is not null;
alter table users add column must_change_password boolean not null default false;
alter table users add column last_login_at timestamptz;
alter table users add constraint users_identifier check (email is not null or username is not null);
