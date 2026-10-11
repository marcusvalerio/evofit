-- EVOFIT 0001 — Fundamentos: utilitários, perfis e papéis.
--
-- Princípios aplicados em todas as migrações:
--   * Nada é exposto sem GRANT explícito (revogamos o que o Supabase concede por padrão).
--   * RLS ligada em toda tabela; políticas por relacionamento (vínculo), não por "papel".
--   * Funções SECURITY DEFINER sempre com search_path vazio e EXECUTE só para quem precisa.
--   * Gatilhos "guard" restringem papéis de API (anon/authenticated); caminhos confiáveis
--     (funções definer, service_role, migrações) não são restringidos por eles.

-- Rede de segurança para objetos futuros criados por este papel.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normaliza texto para busca: minúsculas, sem acentos, espaços colapsados.
create or replace function public.norm_text(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(
      regexp_replace(
        translate(lower(coalesce(p, '')), 'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'),
        '\s+', ' ', 'g'
      )
    ),
    ''
  )
$$;

-- Escapa curingas de LIKE vindos da busca do usuário.
create or replace function public.like_escape(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select replace(replace(replace(coalesce(p, ''), '\', '\\'), '%', '\%'), '_', '\_')
$$;

grant execute on function public.norm_text(text) to anon, authenticated;
grant execute on function public.like_escape(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('trainer', 'student')),
  full_name   text not null check (char_length(btrim(full_name)) between 1 and 120),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- O papel nasce no cadastro e é imutável pela API. Só 'trainer' ou 'student' são
-- possíveis: qualquer outro valor enviado pelo cliente vira 'student'.
-- Observação: ser 'trainer' não concede acesso a dados de ninguém; o acesso a dados de
-- alunos depende de um vínculo aceito pelo próprio aluno (ver trainer_students).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_name text;
begin
  v_role := case when new.raw_user_meta_data ->> 'role' = 'trainer' then 'trainer' else 'student' end;
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuário'
  );

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, left(v_name, 120));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função de gatilho SECURITY DEFINER: ninguém da API precisa (nem deve) poder executá-la.
-- O EXECUTE só é verificado na criação do gatilho, então revogar não o afeta.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.role is distinct from old.role then
      raise exception 'role is immutable' using errcode = '42501';
    end if;
    if new.id is distinct from old.id then
      raise exception 'id is immutable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Funções auxiliares (sempre relativas ao usuário autenticado: não servem de oráculo
-- para consultar a situação de terceiros).
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'trainer'
  )
$$;

revoke all on function public.my_role() from public, anon, authenticated;
revoke all on function public.is_trainer() from public, anon, authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.is_trainer() to authenticated;

-- RLS: cada usuário lê e edita só o próprio perfil. Outras leituras (aluno vinculado,
-- solicitante de contato) são adicionadas nas migrações que criam essas relações.
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_path) on public.profiles to authenticated;
