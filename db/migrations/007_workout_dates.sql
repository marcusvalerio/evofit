-- EVOFIT — vencimento da mensalidade em qualquer dia de 1 a 31 (nos meses curtos cai no último dia)
-- e datas de início e de troca prevista da ficha.

alter table students drop constraint if exists students_due_day_check;
alter table students add constraint students_due_day_check check (due_day between 1 and 31);

alter table workouts add column start_date date;
alter table workouts add column change_date date;
alter table workouts add constraint workouts_change_after_start check (change_date is null or start_date is null or change_date > start_date);
