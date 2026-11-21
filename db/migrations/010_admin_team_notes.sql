-- EVOFIT — admin central: bloco de ideias/anotações da equipe.
create table if not exists admin_notes (
  id bigserial primary key,
  category text not null default 'geral' check (category in ('marketing', 'produto', 'vendas', 'geral')),
  text text not null check (length(text) between 1 and 500),
  done boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now()
);

insert into admin_notes (category, text, created_by) values
  ('marketing', 'Indique e ganhe: personal que indicar outro personal ganha 1 mês grátis.', 'sistema'),
  ('marketing', 'E-mails automáticos: boas-vindas, dia 5 do teste ("faltam 2 dias") e teste vencido.', 'sistema'),
  ('marketing', 'Cupons de desconto por campanha (Black Friday, volta às aulas, janeiro).', 'sistema'),
  ('marketing', 'Página de vendas com depoimentos de personais e vídeo de como funciona.', 'sistema'),
  ('marketing', 'Campanha "veio do MFIT?" com importação dos alunos e meses grátis.', 'sistema'),
  ('marketing', 'Disparo de WhatsApp para personais com teste vencido oferecendo o Fundador.', 'sistema'),
  ('marketing', 'Pixel do Meta e Google Analytics para medir anúncios e conversão.', 'sistema'),
  ('marketing', 'Card de "treino concluído" para o aluno compartilhar no Instagram com a marca do personal.', 'sistema');
