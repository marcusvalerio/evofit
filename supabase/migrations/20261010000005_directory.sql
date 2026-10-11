-- EVOFIT 0005 — Perfil profissional e diretório "Encontrar Personal".
--
-- Privacidade por construção:
--   * professional_profiles só tem colunas seguras para publicação. Um visitante anônimo
--     só lê linhas com is_public = true e só as colunas listadas no GRANT (allow-list).
--   * O WhatsApp fica numa tabela privada (professional_private_contact) e só sai pela
--     função get_professional_whatsapp: exige login e o consentimento whatsapp_public.
--   * Nada de endereço residencial: áreas de atendimento são bairro/região/município/CEP
--     (apenas os 5 primeiros dígitos, que identificam uma zona, não um endereço).
--   * Desativar is_public tira o perfil da busca e bloqueia novas solicitações (0006).

-- ---------------------------------------------------------------------------
-- Catálogo de especialidades
-- ---------------------------------------------------------------------------

create table public.specialty_catalog (
  slug  text primary key check (slug ~ '^[a-z_]{2,40}$'),
  label text not null check (char_length(label) between 2 and 60)
);

insert into public.specialty_catalog (slug, label) values
  ('hipertrofia', 'Hipertrofia'),
  ('emagrecimento', 'Emagrecimento'),
  ('condicionamento', 'Condicionamento físico'),
  ('funcional', 'Treino funcional'),
  ('reabilitacao', 'Reabilitação e prevenção'),
  ('terceira_idade', 'Terceira idade'),
  ('gestantes', 'Gestantes e pós-parto'),
  ('esportes', 'Preparação esportiva'),
  ('corrida', 'Corrida'),
  ('mobilidade', 'Mobilidade e flexibilidade'),
  ('calistenia', 'Calistenia');

-- ---------------------------------------------------------------------------
-- Perfil profissional (somente campos publicáveis)
-- ---------------------------------------------------------------------------

create table public.professional_profiles (
  trainer_id      uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  display_name    text not null check (char_length(btrim(display_name)) between 2 and 80),
  slug            text not null unique
                    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  headline        text check (headline is null or char_length(headline) <= 120),
  bio             text check (bio is null or char_length(bio) <= 1500),
  modality        text not null default 'hybrid' check (modality in ('in_person', 'online', 'hybrid')),
  is_public       boolean not null default false,
  whatsapp_public boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index professional_profiles_public_idx on public.professional_profiles (is_public, display_name);

create trigger professional_profiles_set_updated_at
  before update on public.professional_profiles
  for each row execute function public.set_updated_at();

-- Dado privado: número de WhatsApp (somente dígitos com DDI, ex.: 5521999998888).
create table public.professional_private_contact (
  trainer_id      uuid primary key default auth.uid()
                    references public.professional_profiles (trainer_id) on delete cascade,
  whatsapp_number text not null check (whatsapp_number ~ '^[0-9]{10,15}$'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger ppc_set_updated_at
  before update on public.professional_private_contact
  for each row execute function public.set_updated_at();

-- Apagar o número desliga automaticamente a autorização de exibição.
create or replace function public.ppc_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.professional_profiles set whatsapp_public = false where trainer_id = old.trainer_id;
  return old;
end;
$$;

create trigger ppc_after_delete
  after delete on public.professional_private_contact
  for each row execute function public.ppc_after_delete();

revoke all on function public.ppc_after_delete() from public, anon, authenticated;

create table public.professional_service_areas (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null default auth.uid()
                 references public.professional_profiles (trainer_id) on delete cascade,
  city         text not null check (char_length(btrim(city)) between 2 and 80),
  state        text not null check (state ~ '^[A-Z]{2}$'),
  neighborhood text check (neighborhood is null or char_length(btrim(neighborhood)) between 2 and 80),
  region       text check (region is null or char_length(btrim(region)) between 2 and 80),
  cep_prefix   text check (cep_prefix is null or cep_prefix ~ '^[0-9]{5}$'),
  search_text  text generated always as (
    public.norm_text(coalesce(neighborhood, '') || ' ' || coalesce(region, '') || ' ' || city || ' ' || state)
  ) stored,
  created_at   timestamptz not null default now()
);

create unique index psa_unique
  on public.professional_service_areas (
    trainer_id, state, public.norm_text(city),
    coalesce(public.norm_text(neighborhood), ''), coalesce(cep_prefix, '')
  );
create index psa_trainer_idx on public.professional_service_areas (trainer_id);

create table public.professional_specialties (
  trainer_id uuid not null default auth.uid()
               references public.professional_profiles (trainer_id) on delete cascade,
  specialty  text not null references public.specialty_catalog (slug),
  primary key (trainer_id, specialty)
);

create table public.brand_settings (
  trainer_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  palette    text not null default 'evofit'
               check (palette in ('evofit', 'oceano', 'grafite', 'floresta', 'por_do_sol')),
  logo_path  text check (logo_path is null or char_length(logo_path) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger brand_settings_set_updated_at
  before update on public.brand_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Regras de consistência
-- ---------------------------------------------------------------------------

create or replace function public.professional_profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and current_user in ('anon', 'authenticated')
     and new.trainer_id is distinct from old.trainer_id then
    raise exception 'immutable column' using errcode = '42501';
  end if;

  -- Para aparecer na busca, quem atende presencialmente precisa informar onde.
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then
    if new.modality in ('in_person', 'hybrid') and not exists (
      select 1 from public.professional_service_areas a where a.trainer_id = new.trainer_id
    ) then
      raise exception 'add at least one service area before publishing' using errcode = '23514';
    end if;
    new.published_at := now();
  elsif not new.is_public then
    new.published_at := null;
  end if;

  -- Só se pode autorizar a exibição do WhatsApp se houver um número cadastrado.
  if new.whatsapp_public and not exists (
    select 1 from public.professional_private_contact c where c.trainer_id = new.trainer_id
  ) then
    raise exception 'register a WhatsApp number before authorizing its display' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger professional_profiles_guard
  before insert or update on public.professional_profiles
  for each row execute function public.professional_profiles_guard();

create or replace function public.limit_areas_per_trainer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.professional_service_areas a where a.trainer_id = new.trainer_id) >= 30 then
    raise exception 'service area limit reached' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

create trigger psa_limit
  before insert on public.professional_service_areas
  for each row execute function public.limit_areas_per_trainer();

create or replace function public.limit_specialties_per_trainer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.professional_specialties s where s.trainer_id = new.trainer_id) >= 8 then
    raise exception 'specialty limit reached' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

create trigger pspec_limit
  before insert on public.professional_specialties
  for each row execute function public.limit_specialties_per_trainer();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.specialty_catalog enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.professional_private_contact enable row level security;
alter table public.professional_service_areas enable row level security;
alter table public.professional_specialties enable row level security;
alter table public.brand_settings enable row level security;

create policy specialty_catalog_select on public.specialty_catalog
  for select to anon, authenticated using (true);

-- professional_profiles
create policy pp_select_public on public.professional_profiles
  for select to anon, authenticated using (is_public);
create policy pp_select_own on public.professional_profiles
  for select to authenticated using (trainer_id = (select auth.uid()));
create policy pp_insert_own on public.professional_profiles
  for insert to authenticated
  with check (trainer_id = (select auth.uid()) and public.is_trainer());
create policy pp_update_own on public.professional_profiles
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy pp_delete_own on public.professional_profiles
  for delete to authenticated using (trainer_id = (select auth.uid()));

-- professional_private_contact: somente o dono. Nunca visível a terceiros.
create policy ppc_select_own on public.professional_private_contact
  for select to authenticated using (trainer_id = (select auth.uid()));
create policy ppc_insert_own on public.professional_private_contact
  for insert to authenticated
  with check (trainer_id = (select auth.uid()) and public.is_trainer());
create policy ppc_update_own on public.professional_private_contact
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy ppc_delete_own on public.professional_private_contact
  for delete to authenticated using (trainer_id = (select auth.uid()));

-- professional_service_areas: público só se o perfil for público.
create policy psa_select_public on public.professional_service_areas
  for select to anon, authenticated
  using (exists (select 1 from public.professional_profiles p
                 where p.trainer_id = professional_service_areas.trainer_id and p.is_public));
create policy psa_select_own on public.professional_service_areas
  for select to authenticated using (trainer_id = (select auth.uid()));
create policy psa_insert_own on public.professional_service_areas
  for insert to authenticated with check (trainer_id = (select auth.uid()));
create policy psa_update_own on public.professional_service_areas
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy psa_delete_own on public.professional_service_areas
  for delete to authenticated using (trainer_id = (select auth.uid()));

-- professional_specialties
create policy pspec_select_public on public.professional_specialties
  for select to anon, authenticated
  using (exists (select 1 from public.professional_profiles p
                 where p.trainer_id = professional_specialties.trainer_id and p.is_public));
create policy pspec_select_own on public.professional_specialties
  for select to authenticated using (trainer_id = (select auth.uid()));
create policy pspec_insert_own on public.professional_specialties
  for insert to authenticated with check (trainer_id = (select auth.uid()));
create policy pspec_delete_own on public.professional_specialties
  for delete to authenticated using (trainer_id = (select auth.uid()));

-- brand_settings: dono, alunos vinculados (para o app do aluno) e público se o perfil for público.
create policy brand_select_own on public.brand_settings
  for select to authenticated using (trainer_id = (select auth.uid()));
create policy brand_select_linked on public.brand_settings
  for select to authenticated using (public.is_my_trainer(trainer_id));
create policy brand_select_public on public.brand_settings
  for select to anon, authenticated
  using (exists (select 1 from public.professional_profiles p
                 where p.trainer_id = brand_settings.trainer_id and p.is_public));
create policy brand_insert_own on public.brand_settings
  for insert to authenticated
  with check (trainer_id = (select auth.uid()) and public.is_trainer());
create policy brand_update_own on public.brand_settings
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- GRANTs: allow-list explícita de colunas para visitantes
-- ---------------------------------------------------------------------------

revoke all on public.specialty_catalog from anon, authenticated;
revoke all on public.professional_profiles from anon, authenticated;
revoke all on public.professional_private_contact from anon, authenticated;
revoke all on public.professional_service_areas from anon, authenticated;
revoke all on public.professional_specialties from anon, authenticated;
revoke all on public.brand_settings from anon, authenticated;

grant select on public.specialty_catalog to anon, authenticated;

grant select (trainer_id, display_name, slug, headline, bio, modality, is_public, whatsapp_public, published_at)
  on public.professional_profiles to anon;
grant select on public.professional_profiles to authenticated;
grant insert (display_name, slug, headline, bio, modality, is_public, whatsapp_public)
  on public.professional_profiles to authenticated;
grant update (display_name, slug, headline, bio, modality, is_public, whatsapp_public)
  on public.professional_profiles to authenticated;
grant delete on public.professional_profiles to authenticated;

grant select, delete on public.professional_private_contact to authenticated;
grant insert (whatsapp_number) on public.professional_private_contact to authenticated;
grant update (whatsapp_number) on public.professional_private_contact to authenticated;

grant select (id, trainer_id, city, state, neighborhood, region, cep_prefix, search_text)
  on public.professional_service_areas to anon;
grant select, delete on public.professional_service_areas to authenticated;
grant insert (city, state, neighborhood, region, cep_prefix) on public.professional_service_areas to authenticated;
grant update (city, state, neighborhood, region, cep_prefix) on public.professional_service_areas to authenticated;

grant select (trainer_id, specialty) on public.professional_specialties to anon;
grant select, delete on public.professional_specialties to authenticated;
grant insert (specialty) on public.professional_specialties to authenticated;

grant select (trainer_id, palette, logo_path) on public.brand_settings to anon;
grant select on public.brand_settings to authenticated;
grant insert (palette, logo_path) on public.brand_settings to authenticated;
grant update (palette, logo_path) on public.brand_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Diretório público (security_invoker: RLS e GRANTs do chamador continuam valendo)
-- ---------------------------------------------------------------------------

create view public.directory_professionals
  with (security_invoker = true)
as
select
  p.trainer_id,
  p.display_name,
  p.slug,
  p.headline,
  p.bio,
  p.modality,
  p.whatsapp_public as whatsapp_available,
  coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'city', a.city, 'state', a.state,
               'neighborhood', a.neighborhood, 'region', a.region
             )
             order by a.state, a.city, a.neighborhood
           )
      from public.professional_service_areas a
     where a.trainer_id = p.trainer_id
  ), '[]'::jsonb) as areas,
  coalesce((
    select jsonb_agg(s.specialty order by s.specialty)
      from public.professional_specialties s
     where s.trainer_id = p.trainer_id
  ), '[]'::jsonb) as specialties,
  b.palette,
  b.logo_path
from public.professional_profiles p
left join public.brand_settings b on b.trainer_id = p.trainer_id
where p.is_public;

revoke all on public.directory_professionals from anon, authenticated;
grant select on public.directory_professionals to anon, authenticated;

-- Busca por bairro, região, município, UF ou CEP (5 primeiros dígitos), com filtros.
-- Modalidade: "presencial" e "online" também incluem quem atende de forma híbrida.
create or replace function public.search_professionals(
  p_query     text default null,
  p_modality  text default null,
  p_specialty text default null,
  p_limit     integer default 20,
  p_offset    integer default 0
)
returns setof public.directory_professionals
language sql
stable
set search_path = ''
as $$
  with params as (
    select
      public.norm_text(left(p_query, 80)) as q,
      regexp_replace(coalesce(left(p_query, 80), ''), '\D', '', 'g') as digits
  )
  select d.*
    from public.directory_professionals d
   cross join params
   where (p_modality is null
          or d.modality = p_modality
          or (d.modality = 'hybrid' and p_modality in ('in_person', 'online')))
     and (p_specialty is null or d.specialties ? p_specialty)
     and (
       params.q is null
       or public.norm_text(d.display_name) like '%' || public.like_escape(params.q) || '%'
       or exists (
         select 1
           from public.professional_service_areas a
          where a.trainer_id = d.trainer_id
            and (
              a.search_text like '%' || public.like_escape(params.q) || '%'
              or (a.cep_prefix is not null
                  and params.digits ~ '^[0-9]{5,8}$'
                  and a.cep_prefix = left(params.digits, 5))
            )
       )
     )
   order by d.display_name, d.slug
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke all on function public.search_professionals(text, text, text, integer, integer) from public;
grant execute on function public.search_professionals(text, text, text, integer, integer) to anon, authenticated;

-- WhatsApp: só para usuário logado, só se o perfil é público E o profissional autorizou.
-- Em qualquer outro caso devolve NULL (sem revelar o motivo).
create or replace function public.get_professional_whatsapp(p_slug text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_number text;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select c.whatsapp_number
    into v_number
    from public.professional_profiles p
    join public.professional_private_contact c on c.trainer_id = p.trainer_id
   where p.slug = p_slug and p.is_public and p.whatsapp_public;

  return v_number;
end;
$$;

revoke all on function public.get_professional_whatsapp(text) from public, anon, authenticated;
grant execute on function public.get_professional_whatsapp(text) to authenticated;
