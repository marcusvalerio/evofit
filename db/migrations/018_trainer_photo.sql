-- Foto de perfil do personal: data URL pequena (JPEG 320x320 gerado no navegador).
alter table trainers add column photo text
  constraint trainers_photo_check check (photo is null or (length(photo) <= 300000 and photo ~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$'));
