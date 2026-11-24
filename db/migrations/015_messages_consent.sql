-- EVOFIT — consentimento do aluno para receber mensagens e avisos do personal (Chat e Avisos, MVP item 1).
alter table users add column if not exists messages_consent_at timestamptz;
