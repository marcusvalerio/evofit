-- EVOFIT 0006 — Solicitações de contato (caixa de entrada do personal).
--
-- Regras no banco (valem mesmo que a aplicação falhe):
--   * Só usuário autenticado envia; só para perfil público; nunca para si mesmo.
--   * No máximo uma solicitação PENDENTE por par (solicitante, profissional).
--   * Limite de 5 solicitações por solicitante em 24 h (anti-spam).
--   * Transições: solicitante cancela (pending→cancelled); profissional responde ou
--     encerra (pending→responded|closed, responded→closed). Estados finais não reabrem.
--   * Toda mudança de status gera um evento (trilha mínima de alterações).

create table public.contact_requests (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  professional_id   uuid not null references public.profiles (id) on delete cascade,
  message           text check (message is null or char_length(btrim(message)) between 1 and 500),
  -- Contato que o próprio solicitante escolhe informar (ex.: seu WhatsApp). Opcional.
  requester_contact text check (requester_contact is null or char_length(btrim(requester_contact)) between 3 and 120),
  status            text not null default 'pending'
                      check (status in ('pending', 'responded', 'closed', 'cancelled')),
  responded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint cr_not_self check (requester_id <> professional_id)
);

create unique index cr_one_pending_per_pair
  on public.contact_requests (requester_id, professional_id)
  where status = 'pending';

create index cr_professional_idx on public.contact_requests (professional_id, status, created_at desc);
create index cr_requester_idx on public.contact_requests (requester_id, created_at desc);

create trigger cr_set_updated_at
  before update on public.contact_requests
  for each row execute function public.set_updated_at();

create table public.contact_request_events (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.contact_requests (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status   text not null check (to_status in ('pending', 'responded', 'closed', 'cancelled')),
  created_at  timestamptz not null default now()
);

create index cre_request_idx on public.contact_request_events (request_id, created_at);

-- Anti-spam (roda como quem envia: enxerga as próprias solicitações).
create or replace function public.contact_requests_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.contact_requests r
       where r.requester_id = new.requester_id
         and r.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  new.status := 'pending';
  new.responded_at := null;
  return new;
end;
$$;

create trigger cr_before_insert
  before insert on public.contact_requests
  for each row execute function public.contact_requests_before_insert();

create or replace function public.contact_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
       or new.requester_id is distinct from old.requester_id
       or new.professional_id is distinct from old.professional_id
       or new.message is distinct from old.message
       or new.requester_contact is distinct from old.requester_contact
       or new.created_at is distinct from old.created_at then
      raise exception 'immutable column' using errcode = '42501';
    end if;

    if new.status is distinct from old.status then
      if v_uid = old.requester_id and old.status = 'pending' and new.status = 'cancelled' then
        null;
      elsif v_uid = old.professional_id
            and ((old.status = 'pending' and new.status in ('responded', 'closed'))
                 or (old.status = 'responded' and new.status = 'closed')) then
        null;
      else
        raise exception 'invalid status transition' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.status = 'responded' and old.status is distinct from 'responded' then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

create trigger cr_guard
  before update on public.contact_requests
  for each row execute function public.contact_requests_guard();

-- A trilha é escrita só por gatilho (a API não tem INSERT em contact_request_events).
create or replace function public.contact_requests_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.contact_request_events (request_id, actor_id, from_status, to_status)
    values (new.id, new.requester_id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.contact_request_events (request_id, actor_id, from_status, to_status)
    values (new.id, (select auth.uid()), old.status, new.status);
  end if;
  return null;
end;
$$;

create trigger cr_log_event
  after insert or update on public.contact_requests
  for each row execute function public.contact_requests_log_event();

revoke all on function public.contact_requests_log_event() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.contact_requests enable row level security;
alter table public.contact_request_events enable row level security;

create policy cr_select_participants on public.contact_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or professional_id = (select auth.uid()));

-- Só para perfis públicos: desativar a listagem bloqueia novas solicitações.
create policy cr_insert_requester on public.contact_requests
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and exists (select 1 from public.professional_profiles p
                where p.trainer_id = professional_id and p.is_public)
  );

create policy cr_update_participants on public.contact_requests
  for update to authenticated
  using (requester_id = (select auth.uid()) or professional_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()) or professional_id = (select auth.uid()));

create policy cre_select_participants on public.contact_request_events
  for select to authenticated
  using (exists (select 1 from public.contact_requests r where r.id = request_id));

-- O profissional vê o nome de quem lhe escreveu.
create policy profiles_select_requester on public.profiles
  for select to authenticated
  using (exists (select 1 from public.contact_requests r
                 where r.requester_id = profiles.id
                   and r.professional_id = (select auth.uid())));

revoke all on public.contact_requests from anon, authenticated;
revoke all on public.contact_request_events from anon, authenticated;
grant select on public.contact_requests to authenticated;
grant insert (professional_id, message, requester_contact) on public.contact_requests to authenticated;
grant update (status) on public.contact_requests to authenticated;
grant select on public.contact_request_events to authenticated;
