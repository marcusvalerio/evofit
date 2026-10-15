# EVOFIT

Plataforma para personal trainers autônomos — **versão de demonstração pública (MVP)**.

Três experiências conectadas, todas acessíveis sem login:

| Experiência | Rota | O que faz |
|---|---|---|
| **EVOFIT Studio** (personal) | `/studio` | Painel com indicadores calculados dos dados, alunos (cadastro, edição, arquivamento, histórico, frequência, evolução de carga), biblioteca com 876 exercícios demonstrados (vídeo e dica próprios por exercício), editor de fichas (séries, repetições, carga, descanso, instruções, ordem) e atribuição a alunos, perfil profissional e caixa de solicitações de contato. |
| **Avaliações** (no Studio) | `/studio/avaliacoes` | Peso, altura, 7 dobras cutâneas, 11 circunferências e % de gordura informado (bioimpedância). Calcula % de gordura (Jackson & Pollock 3 ou 7 dobras + Siri), massa magra/gorda, IMC e cintura/quadril **só a partir do que foi medido**. Gráficos por medida, comparativo entre duas datas e histórico editável. |
| **EVOFIT Aluno** | `/aluno` | Mobile-first. Escolha de aluno fictício, treinos atribuídos, execução série a série (reps e kg editáveis, cronômetro de descanso), “Como fazer” em cada exercício (demonstração animada, vídeo do personal, dica e passo a passo com leitura em voz alta), conclusão com observação, histórico e gráficos de frequência e carga. |
| **Biblioteca EVOFIT** | `/biblioteca` | Pública. 876 exercícios com GIF animado com a marca EVOFIT, busca e filtros, passo a passo em português, baixar GIF, compartilhar (menu do celular/WhatsApp) e copiar link. |
| **Encontrar personal** | `/personais` | Diretório público com busca (sem acento), filtros por estado, modalidade e especialidade, URL compartilhável, perfil público e formulário de solicitação de contato. |

## Como a demonstração funciona

- **Sem login.** Nenhuma tela exige autenticação. No app do aluno, o visitante escolhe qual aluno fictício quer “ser”.
- **Dados fictícios e locais.** Todo o estado (alunos, fichas, sessões, perfil, solicitações) fica no `localStorage` do navegador, na chave `evofit:demo:v1`. Nada é enviado a servidores, não há banco de dados e nenhum segredo é necessário.
- **Identificação.** Uma faixa fixa no topo de todas as telas indica “Modo demonstração”. Perfis do diretório são rotulados como fictícios.
- **Restaurar.** O botão **Restaurar** na faixa superior (com confirmação) recria os dados iniciais. A tela de erro também oferece restauração.
- **Robustez.** Os dados lidos são validados (`lib/validate.ts`); dados da versão 1 (biblioteca fixa de 30 exercícios) são migrados automaticamente para o catálogo sem perder fichas, histórico ou exercícios próprios (`lib/migrate.ts`); formato desconhecido/corrompido é substituído pela demonstração inicial com aviso. Se o navegador bloquear a gravação (modo privado, cota), um aviso informa que as alterações valem só até recarregar. Abas abertas se sincronizam pelo evento `storage`.
- **Fluxo conectado.** Ficha atribuída no Studio aparece no app do aluno; o treino concluído entra no histórico e nos indicadores do Studio. Opt-in do perfil no Studio controla a presença no diretório (inclusive acesso direto pela URL).

## Executar localmente

Requisitos: Node.js ≥ 20.9 (testado com 22) e npm.

```bash
npm ci          # instala exatamente o package-lock.json
npm run dev     # http://localhost:3000
```

### Variáveis de ambiente

Veja `.env.example`. **Sem nenhuma variável o app roda no modo demonstração** (como antes). Para contas reais:

| Variável | Onde | Para quê |
|---|---|---|
| `DATABASE_URL` | servidor (Vercel e `.env.local`) | Conexão com o Neon (URL *pooled*, com `-pooler` no host). Nunca vai para o navegador. |
| `ADMIN_EMAILS` | servidor (Vercel) | E-mails (separados por vírgula) de contas de personal que veem o painel `/admin`. Sem ela, ninguém é admin. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | opcional | E-mail de suporte mostrado em “Esqueci minha senha”. |
| `DATABASE_URL_MIGRATIONS` | opcional, só para `npm run db:migrate` | URL direta (sem `-pooler`). |
| `DB_POOL_MAX` | opcional | Conexões por instância (padrão 5). |

Para desenvolver sem o Neon: `npm run db:dev` sobe um Postgres em memória (PGlite) em `127.0.0.1:5433`; depois `DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres npm run db:migrate` e `npm run dev` com a mesma `DATABASE_URL`.

## Validação

```bash
npm run lint        # ESLint (eslint-config-next, regras do React Compiler)
npm run typecheck   # tsc --noEmit (strict)
npm test            # Vitest — regras de dados, catálogo, GIFs e banco (PGlite: RLS, permissões, convites)
npm run build       # build de produção
npm run test:e2e    # Playwright — sobe um Postgres local (PGlite), gera o build e testa desktop e mobile, incluindo contas reais
npm run check       # lint + typecheck + unitários + build
```

Os testes E2E falham automaticamente se houver erro de console ou exceção na página. Para testar uma URL publicada:

```bash
E2E_BASE_URL=https://seu-projeto.vercel.app npx playwright test
```

> Playwright precisa de um Chromium instalado (`npx playwright install chromium` fora deste ambiente).

## Publicar na Vercel

O projeto é um app Next.js padrão (App Router), sem configuração especial.

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
2. Configurações (detectadas automaticamente):
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (raiz do repositório)
   - **Install Command:** `npm ci` (padrão da Vercel ao detectar `package-lock.json`)
   - **Build Command:** `npm run build` · **Output:** padrão do Next.js
   - **Node.js Version:** 22.x (ou 20.x; `engines` exige ≥ 20.9)
   - **Environment Variables:** `DATABASE_URL` (Neon, URL *pooled*) para contas reais; sem ela, só demonstração
3. Clique em **Deploy**. Cada push no branch configurado gera um novo deploy; outros branches geram previews.

Pela CLI: `npm i -g vercel && vercel` (preview) e `vercel --prod` (produção).

### Testar a versão publicada

1. Abra a URL e confirme que `/`, `/studio`, `/aluno` e `/personais` abrem sem login.
2. No Studio, crie um aluno, recarregue a página e confirme que ele permanece.
3. Em `/aluno`, inicie um treino, marque séries, conclua e confira em Histórico e no painel do Studio.
4. Em `/personais`, busque “curitiba” e filtre por “Online”.
5. Clique em **Restaurar** e confirme que tudo volta ao estado inicial.
6. Opcional: `E2E_BASE_URL=<url> npx playwright test`.

## Biblioteca de exercícios

Pensada para os dias em que o personal não está junto do aluno.

- **Catálogo aberto:** 876 exercícios do projeto [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (licença **Unlicense / domínio público**), com nomes, músculos, equipamento, nível e passo a passo **traduzidos para PT-BR**. Cada exercício tem dois quadros (posição inicial e final) que o app alterna como uma animação leve; com “reduzir movimento” ativo, os quadros aparecem lado a lado. 3 exercícios do catálogo não têm imagem e mostram um aviso.
- **Arquivos:** `data/exercises.pt-BR.json` é a fonte traduzida. `node scripts/build-exercises.mjs` gera `lib/exercise-index.json` (índice leve, ~25 KB gzip no bundle) e `public/exercises/data/<id>.json` (passo a passo, carregado sob demanda). As imagens ficam em `public/exercises/img/<id>-0|1.webp` (480 px, ~26 MB no total, servidas como estáticos com cache longo).
- **Material do personal:** em Studio → Exercícios → (exercício), o personal cola um link de vídeo próprio e/ou escreve uma dica. Links aceitos: YouTube (incorporado via `youtube-nocookie.com`), Vimeo, Google Drive (compartilhado “com qualquer pessoa com o link”) ou arquivo `.mp4/.webm` em HTTPS. Qualquer outro link é recusado (`lib/video.ts`) — o app nunca incorpora uma URL arbitrária. O player de terceiros só carrega quando o aluno toca em “Assistir”.
- **GIFs com a marca EVOFIT:** `GET /api/gif/<id>` gera, sob demanda, um GIF (ou WebP com `?f=webp`, usado na tela) a partir dos dois quadros do catálogo: posição inicial → transição → posição final, em loop, com barra EVOFIT e nome do exercício (`lib/gif.ts`, com `sharp` e a fonte Geist). `?download` devolve como anexo (`evofit-<nome>.gif`). Só ids do catálogo com imagem são aceitos (404 para o resto). A resposta é imutável e fica em cache na CDN; nenhum GIF é guardado no repositório. Primeira geração de cada GIF leva ~2–3 s; depois é instantânea. Cada GIF tem ~400–600 KB; o WebP, ~90 KB.
- **Exercícios próprios:** o personal pode criar exercícios que não existem no catálogo (nome repetido do catálogo é bloqueado); cada linha das instruções vira um passo numerado.
- **Ouvir:** o passo a passo pode ser lido em voz alta pela síntese de voz do próprio navegador (sem serviço externo), quando disponível.
- As imagens do catálogo mostram execuções de referência; não substituem a orientação do profissional. O guia sempre exibe o aviso para interromper o exercício em caso de dor.

## Movimento e interface

Entradas em cascata em listas e cards, números que contam até o valor, anéis de progresso (meta semanal e descanso), confirmação animada de série com vibração curta no celular, rolagem automática para o próximo exercício, comemoração ao concluir o treino e cards que elevam no hover. Tudo em CSS/SVG, sem bibliotecas novas, e desligado com `prefers-reduced-motion`.

## Arquitetura

- **Next.js 16 (App Router, Turbopack)**, React 19, TypeScript strict, Tailwind CSS 4, `lucide-react`, fontes Inter, Outfit e Archivo (`@fontsource-variable`, licença OFL, servidas localmente — o build não depende da internet).
- `lib/types.ts` — modelo de dados · `lib/seed.ts` — dados demonstrativos (PRNG determinístico, datas relativas ao primeiro acesso) · `lib/actions.ts` — operações puras e validações · `lib/metrics.ts` — indicadores · `lib/store.ts` — persistência (`useSyncExternalStore` + `localStorage`) · `lib/directory.ts` — perfis fictícios e filtros · `lib/catalog.ts` — catálogo de exercícios, busca e passo a passo sob demanda · `lib/video.ts` — validação de links de vídeo · `lib/migrate.ts` — migração dos dados salvos.
- `components/exercise.tsx` — demonstração animada, miniatura, player de vídeo, passo a passo e guia completo · `components/motion.tsx` — contagem animada, anel de progresso, confete, vibração.
- `components/ui.tsx` — primitivas (Field, Modal com `<dialog>` nativo, ConfirmDialog, EmptyState, Stat, Progress, Avatar…) · `components/charts.tsx` — gráficos SVG com tooltip e tabela acessível.
- Rotas dinâmicas (`/studio/alunos/[id]`, `/studio/treinos/[id]`, `/studio/exercicios/[id]`, `/aluno/treino/[id]`, `/personais/[slug]`) são renderizadas sob demanda; as demais são estáticas.

## Design system

Paleta **MP020** centralizada em tokens semânticos em `app/globals.css` (componentes não usam hexadecimais). Temas claro/escuro seguem o sistema, com alternância manual salva no navegador.

| Cor | Hex | Papel |
|---|---|---|
| Dusty Cotton | `#E4E3DC` | fundo claro |
| Bright Sandstone | `#DAD8CF` | superfícies secundárias, trilhos |
| Ōtan Red | `#FF4E20` | energia: CTA principal (sempre com texto Cobblestone), progresso, sequência semanal |
| Red Gravy | `#B83312` | texto e realce de marca no claro |
| Web Cobblestone | `#1F282E` | texto principal, superfícies escuras (`.ink`) |
| Midnight Smoke | `#414E58` | texto secundário |

Contraste (WCAG 2.x):

| Combinação | Razão | Uso |
|---|---|---|
| Cobblestone sobre Cotton | 11,65 | texto principal (claro) |
| Smoke sobre Cotton | 6,65 | texto secundário (claro) |
| Cobblestone sobre Ōtan | 4,54 ✓ | botão primário |
| Branco sobre Ōtan | 3,30 ✗ | **proibido** |
| Gravy sobre Cotton | 4,64 ✓ | palavra de destaque, links |
| Ōtan sobre Cotton | < 3 ✗ | Ōtan nunca é texto no claro |
| Cotton sobre Cobblestone | 11,65 | texto principal (escuro) |
| `#FF7A52` sobre `#1F282E` | 5,82 | realce no escuro |

**Símbolo:** pico facetado (face Gravy + face Ōtan), derivado do cartão da paleta MP020; logotipo "evofit" em minúsculas (Outfit 600). Ícones em `app/icon.svg` e `app/apple-icon.png`.

**Acervo de exercícios:** as fotos do catálogo recebem duotone Cobblestone → Cotton — em CSS nas telas (sem arquivos novos) e no servidor nos GIFs de marca (`lib/gif.ts`). A URL das animações leva `?v=` (`ANIM_VERSION` em `lib/catalog.ts`): aumente ao mudar o visual, porque as respostas são imutáveis na CDN.

**Motion (landing):** título palavra por palavra, pico que se ergue, telefone que entra e flutua (com leve inclinação seguindo o mouse), faixa infinita do acervo e revelação das seções na rolagem. Tudo em CSS + um `IntersectionObserver`; com "reduzir movimento" nada se move e nada fica escondido.

**Retenção:** meta semanal flexível no app do aluno (um círculo por treino da meta, 1x a 7x, e semanas seguidas batendo a meta); recordes de carga celebrados ao concluir o treino (só quando superam a melhor carga anterior); botão "Chamar no WhatsApp" com mensagem pronta para alunos sem treino recente.

**Receita do personal:**
- **Caixa** (`/studio/caixa`): mensalidade e vencimento por aluno, situação do mês (paga, a vencer, vencida há N dias), marcar como paga e lembrete no WhatsApp com a chave Pix do personal. O EVOFIT **não processa pagamentos** e a chave Pix nunca aparece no perfil público.
- **Radar de evasão** (painel): soma sinais dos registros — dias sem treinar vs. meta, queda de frequência, dor relatada no check-in, esforço no limite, mensalidade vencida, falta de ficha — e mostra o R$ em risco. Cada aluno exibe os motivos; nada de previsão opaca (`lib/radar.ts`).
- **Check-in pós-treino**: esforço (1–10), dor e sono, todos opcionais, visíveis ao personal no histórico e na atividade.

**Sem internet:** o app é instalável (manifesto + `public/sw.js`). Páginas, arquivos e imagens das fichas do aluno ficam no aparelho; no modo conta, a última cópia dos dados abre sem sinal e as alterações entram numa fila persistente, enviada em ordem quando a conexão volta (`lib/store.ts`). Sair da conta apaga a cópia e a fila.

**Acesso do aluno:** o personal gera usuário + senha provisória (troca obrigatória no primeiro acesso), gera nova senha (derruba as sessões) ou revoga. O convite por link continua disponível.

**Assinatura visual:** o gradiente *ember* (Gravy → Ōtan) aparece só onde existe progresso real — barras, anéis, o símbolo da marca e o "pico" do hero (motivo tirado do cartão da paleta MP020).

**Tipografia** (pacotes `@fontsource-variable`, servidos localmente):

- **Inter** — interface, dados, formulários (400–600).
- **Outfit** — títulos e métricas (500–600).
- **Archivo condensado** (`.t-athletic`, 800, caixa alta) — voz atlética, **só** em títulos de marca (landing, capas). Nunca em dados, formulários ou na execução do treino.
- Geist continua apenas na geração dos GIFs (`lib/gif.ts`).

**Princípios aplicados** ([Revenue-Centric Design](https://github.com/heliocosta-dev/revenue-centric-design)):

- Landing: Hero → Dor → Mecanismo → Experiências → Comparação → Objeções → CTA. O hero responde em 5 s o que é, para quem e por quê; CTA específico com gatilho de clique ("Sem cadastro · Sem cartão"); a prévia usa os **dados reais da demonstração**, não um mockup. Sem depoimentos ou números inventados.
- Studio: a Central de ações abre o painel (padrão F) e mostra nomes, não só contagens — o painel diz o que fazer.
- Aluno: sequência semanal (seg–dom) calculada das sessões registradas, próximo treino sugerido e um CTA dominante.

## Limitações conhecidas

- **Dados não sincronizam entre dispositivos ou navegadores** — cada navegador tem sua própria cópia da demonstração.
- **Solicitações de contato não são enviadas a ninguém.** Ficam salvas no navegador; as do perfil do próprio Studio aparecem em Studio → Perfil. O formulário avisa isso explicitamente.
- Sem `DATABASE_URL`, não há contas: tudo fica no navegador. Com ela, a recuperação de senha do personal é feita pelo admin (senha provisória); ainda não há envio automático por e-mail, verificação de e-mail, upload de foto, pagamentos ou notificações.
- Exercícios do catálogo são somente leitura (o personal adiciona vídeo/dica); exercícios próprios podem ser editados/excluídos (exclusão bloqueada se estiverem em uso).
- Os GIFs são feitos a partir de **dois quadros** (posição inicial e final) com transição suave — mostram claramente o início e o fim do movimento, mas não são um vídeo contínuo. Para o movimento completo, use o vídeo próprio do personal.
- O app não hospeda vídeos: o personal usa um link do YouTube, Vimeo, Google Drive ou um arquivo já publicado. Vídeos privados não tocam para o aluno.
- A tradução do catálogo foi feita para este projeto; termos técnicos podem variar de região para região.
- O aplicativo antigo deste repositório (rastreador de dieta com checklist de refeições e peso, herdado do EVODIETA) foi substituído, pois não fazia parte do escopo do EVOFIT; ele continua disponível no histórico do Git (commit `ebeda05`). Os dados antigos no navegador (`evo_ch`, `evo_wt`) não são lidos nem apagados.
- `npm audit` aponta `braces` (dependência apenas de desenvolvimento do ESLint, sem correção publicada); as dependências de produção não têm vulnerabilidades conhecidas.

## Contas reais (Neon)

A demonstração sem login continua igual. Com `DATABASE_URL` configurada, o app ganha contas:

- **Personal:** cria conta em `/criar-conta` (começa vazia) e entra em `/entrar`. Tudo o que faz no Studio (alunos, fichas, exercícios próprios, vídeos e dicas, perfil, solicitações) é gravado no banco.
- **Aluno:** o personal gera um **link de convite** na página do aluno (vale 7 dias, uso único; copiar ou enviar pelo WhatsApp). O aluno cria e-mail e senha pelo link e passa a ver só os próprios treinos, registrando séries e cargas que o personal acompanha.
- **Diretório:** perfis reais com opt-in aparecem em “Encontrar personal” junto aos fictícios (identificados); o pedido de contato de um visitante chega ao personal.
- **Excluir conta:** em Studio → Perfil (confirmando o e-mail). Apaga perfil, alunos, fichas, treinos, convites e os acessos dos alunos.

**Como funciona**

- `db/migrations/001_init.sql` — tabelas, restrições e **Row Level Security** em todas as tabelas de dados (`ENABLE` + `FORCE`). O app acessa os dados de treino sempre como o papel restrito `evofit_app` (`SET LOCAL ROLE` em cada transação) com o tenant em variáveis de transação: o personal só enxerga o que é dele; o aluno só lê o próprio cadastro, as fichas atribuídas a ele e as próprias sessões, e só grava as próprias sessões (treino concluído não volta a ser editado); o visitante só lê perfis com opt-in e só insere pedido de contato. Tabelas de login não são acessíveis a esse papel.
- No Neon, o papel dono do banco (`neondb_owner`) tem `BYPASSRLS` — por isso o app **nunca** consulta dados de treino como dono: cada transação troca para `evofit_app` (`NOBYPASSRLS`). Isso foi verificado no banco real: com `evofit_app`, um personal grava os próprios dados e outro personal enxerga 0 linhas.
- `lib/server/*` — conexão (`pg`), autenticação (senha com **scrypt**, sessão em cookie `httpOnly`/`SameSite=Lax`/`Secure`, token guardado só como hash SHA-256, 30 dias), limite de tentativas (login, cadastro, convite, contato), checagem de origem nas escritas, leitura/gravação do workspace.
- As telas não mudaram: continuam usando as ações puras de `lib/actions.ts`. No modo conta, `lib/store.ts` calcula **só o que mudou** (`lib/sync.ts`) e envia para `PATCH /api/workspace`; o servidor revalida formato, regras e permissões e grava numa transação. Se algo for recusado, a tela volta ao que está salvo e mostra o motivo. A faixa superior indica “Salvando…/Salvo”.
- Rotas: `/api/auth/{signup,login,logout}`, `/api/workspace`, `/api/invites`, `/api/invites/[code]`, `/api/account`, `/api/directory`, `/api/contact`.

**Colocar no ar com o Neon**

1. Projeto Neon: **`evofit`** (`quiet-heart-54557463`, região `aws-sa-east-1` / São Paulo, Postgres 17), com a migração `001_init.sql` já aplicada. Copie a string de conexão *pooled* em Neon → `evofit` → *Connect*.
2. Novas migrações: `DATABASE_URL_MIGRATIONS="<string direct>" npm run db:migrate` (o script pula as já aplicadas, registradas em `schema_migrations`).
3. Na Vercel, em *Settings → Environment Variables*, crie `DATABASE_URL` = string *pooled* (Production e Preview). Faça o redeploy.
4. Teste: criar conta, cadastrar aluno, gerar convite, entrar como aluno em outro navegador e registrar um treino.

**Limites atuais:** não há recuperação de senha por e-mail nem verificação de e-mail (exigem um serviço de e-mail); o personal pode gerar um novo convite se o aluno perder o acesso. Não há importação dos dados da demonstração para a conta.

## Administração (`/admin`)

Para quem opera o EVOFIT. Acesso: conta de personal marcada com `users.is_admin = true` no banco (migração 006) ou cujo e-mail está em `ADMIN_EMAILS`; para qualquer outra conta a página e a API (`/api/admin`) respondem como inexistentes (404).

- **Visão geral:** personais (novos em 7/30 dias), ativação (personal com aluno e ficha), alunos ativos e com login, treinos concluídos, personais ativos na semana, perfis no diretório, suspensos e cadastros por semana.
- **Personais:** busca e filtros (ativos, parados há 14 dias, suspensos) com cadastro, último acesso, alunos, fichas e treinos da semana.
- **Ações:** gerar senha provisória (o personal cria a nova no próximo acesso — é o “esqueci minha senha”), suspender com motivo (personal e alunos saem na hora e não entram; nada é apagado), reativar e tirar do diretório.
- **Saúde:** latência do banco, migrações aplicadas/pendentes e sessões abertas.
- **Registro de ações:** toda ação fica em `admin_audit` com quem fez, quando e o motivo.

Privacidade: o papel `admin` do banco só lê (contagens) via RLS e só altera a visibilidade no diretório; nunca vê nomes, medidas, treinos ou valores dos alunos. Migração: `005_admin.sql`.

## Landing: a pergunta que ela responde sem escrever

O personal que chega já viu outros sistemas e pensa “por que este e não outro?”. A página responde isso sem fazer a pergunta: hero (“Feito para você não perder aluno”) → seis coisas que o EVOFIT faz por você, com CTA → **O EVOFIT em movimento** (gravações reais do app no computador e no celular, em `public/media/*.mp4`, com capa `.jpg`) e CTA → “As perguntas que todo personal faz. Já respondidas.” → como funciona → perguntas → CTA final. Sem citar concorrentes e sem números inventados.

Os vídeos tocam só quando estão na tela; com “reduzir movimento” ficam parados, com controles. Para regravar depois de mudar telas: suba o app em modo demonstração (`npx next start -p 3400`, sem `DATABASE_URL`) e grave com Playwright (`recordVideo`), convertendo com `ffmpeg` para H.264 (`-crf 26–30 -movflags +faststart`).

## Diretório: WhatsApp e Instagram

No Studio → Perfil, o personal pode publicar WhatsApp e Instagram (opcionais). No perfil público aparecem os botões “Chamar no WhatsApp” (mensagem pronta) e “@usuario”. A chave Pix nunca é pública. Dados v5 (migração automática da demonstração) e migração `006_contacts_admin_flag.sql`.
