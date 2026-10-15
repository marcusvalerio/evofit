-- EVOFIT — painel administrativo da plataforma.
-- O admin (definido por ADMIN_EMAILS no servidor) vê números agregados e gerencia contas de personal.
-- As políticas abaixo permitem ao papel 'admin' LER para contar; o código só consulta agregados,
-- nunca nomes de alunos, treinos ou avaliações.

alter table users add column disabled_at timestamptz;

create table admin_audit (
  id bigserial primary key,
  admin_email text not null,
  action text not null check (length(action) <= 40),
  target text not null default '' check (length(target) <= 120),
  detail text not null default '' check (length(detail) <= 300),
  at timestamptz not null default now()
);
alter table admin_audit enable row level security;

create policy trainers_admin_read on trainers for select to evofit_app using (app_role() = 'admin');
create policy trainers_admin_directory on trainers for update to evofit_app using (app_role() = 'admin') with check (app_role() = 'admin');
create policy students_admin_count on students for select to evofit_app using (app_role() = 'admin');
create policy workouts_admin_count on workouts for select to evofit_app using (app_role() = 'admin');
create policy sessions_admin_count on sessions for select to evofit_app using (app_role() = 'admin');
