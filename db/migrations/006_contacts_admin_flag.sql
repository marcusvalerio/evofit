-- EVOFIT — WhatsApp e Instagram no perfil público do diretório; marcação de admin no próprio banco
-- (alternativa à variável ADMIN_EMAILS).

alter table trainers add column whatsapp text not null default '' check (whatsapp ~ '^([0-9]{10,13})?$');
alter table trainers add column instagram text not null default '' check (instagram ~ '^([A-Za-z0-9._]{1,30})?$');
alter table users add column is_admin boolean not null default false;
alter table users add constraint users_admin_trainer check (not is_admin or role = 'trainer');
