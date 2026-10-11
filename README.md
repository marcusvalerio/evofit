# EVOFIT

Plataforma de gestão para personal trainers autônomos: **Studio** (painel do personal), **Student** (treino mobile-first do aluno) e **Encontrar Personal** (diretório público).

> Este repositório também contém o app **EVO** original (rastreador pessoal de dieta e peso), preservado em `/` dentro do route group `app/(legacy)`. Ele não foi alterado em comportamento; só mudou de pasta.

## Status do MVP

| Fase | Escopo | Estado |
| --- | --- | --- |
| 1 | Auditoria, tooling, tokens e componentes, modelo de dados com RLS, autenticação | **Concluída** (veja limitações) |
| 2 | Dashboard, alunos, biblioteca de exercícios, prescrição e atribuição | Não iniciada na interface (o banco já suporta) |
| 3 | Execução do treino pelo aluno, persistência e retomada | Não iniciada na interface (o banco já suporta) |
| 4 | Perfil profissional, diretório, solicitações, WhatsApp | Não iniciada na interface (o banco já suporta) |
| 5 | Progresso, responsividade, acessibilidade, E2E, deploy | Não iniciada |

O MVP **não está funcional ponta a ponta**: hoje existem contas, login/recuperação e um banco com isolamento testado. As telas de operação das fases 2–5 ainda não foram construídas.

## O que está implementado e verificado

- **Banco** (`supabase/migrations/`): 6 migrações versionadas. RLS em todas as tabelas, GRANTs por coluna, funções `SECURITY DEFINER` com `search_path` fixo e lista fechada, vínculo personal↔aluno aceito pelo próprio aluno, prescrição atribuída como *snapshot* imutável, sessões e séries com valores realizados, diretório público por *view* com campos explícitos, WhatsApp só por função com consentimento, solicitações com trilha de eventos e limite anti-spam.
- **Testes de banco** (`tests/db`): rodam as migrações em PostgreSQL real (PGlite) e tentam IDOR, troca de papel, edição de prescrição alheia, leitura de perfil privado, vazamento de WhatsApp, spam e duplicação.
- **Autenticação**: cadastro, login, logout, recuperação e redefinição de senha; sessão por cookie; `proxy.ts` (checagem otimista) e `requireRole` (autorização real no servidor); destino pós-login protegido contra *open redirect*; respostas genéricas (sem enumeração de contas).
- **Design system** (`components/ui`, `app/(evofit)/evofit.css`): tokens da identidade, componentes com estados, contraste verificado por teste. Veja `/styleguide`.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha com seu projeto Supabase
npm run dev
npm run check                # lint + tipos + testes + build
```

Variáveis (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`. O app **não usa** a chave `service_role`.
`NEXT_PUBLIC_*` é embutida no **build**: mudou o valor, faça novo build.

### Banco

Aplique as migrações em ordem em um projeto Supabase **novo ou de desenvolvimento** (`supabase db push` ou o editor SQL). Elas não contêm comandos destrutivos, mas não foram aplicadas em nenhum projeto Supabase real ainda (veja abaixo). No painel do Supabase, em *Authentication → URL Configuration*, cadastre `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_SITE_URL/auth/confirm` nas *Redirect URLs*.

## Limitações conhecidas (reais)

- **Nunca testado contra um Supabase real.** Cadastro, login, e-mails de confirmação/recuperação e o gatilho de criação de perfil só foram exercitados com stubs (PGlite) e com um projeto fictício (fluxos sem sessão). O comportamento exato do Supabase Auth, do PostgREST e do envio de e-mail precisa ser validado em um projeto de verdade antes de qualquer piloto.
- **Rate limiting de login/cadastro** depende dos limites nativos do Supabase Auth; não há limitador próprio no app. Para produção, avaliar regras no firewall da Vercel ou um limitador compartilhado (ex.: Upstash). Solicitações de contato têm limite no banco (5 por 24 h).
- **Sem testes de interface/E2E (Playwright) ainda**, nem verificação de responsividade e acessibilidade em dispositivo.
- **Wordmark**: a Switzer Black Italic não está no projeto (sem arquivo licenciado); usa Geist 900 inclinado. Trocar quando houver a licença.
- **Figma**: nenhum arquivo foi acessado; a interface segue só o briefing escrito.
- Avisos de lint (10) estão todos no código legado do EVO e foram mantidos para não reescrever módulo que funciona.
- Os links de e-mail do Supabase podem ser consumidos por *scanners* de e-mail antes do usuário clicar (comportamento conhecido de `verifyOtp` por link); se isso ocorrer, usar o fluxo por código de 6 dígitos.

## Decisões

- Stack preservada (Next 16, React 19, Tailwind 4, TypeScript); acrescentados Supabase, Zod, Vitest e PGlite.
- O app EVO legado fica isolado em route group para que o CSS global dele (reset em `*`, `outline: none`) não afete a acessibilidade do EVOFIT.
- Papéis: ser `trainer` **não concede acesso a dados de ninguém**; só um vínculo aceito pelo aluno concede.
