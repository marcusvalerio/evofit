# EVOFIT

Plataforma para personal trainers autônomos — **versão de demonstração pública (MVP)**.

Três experiências conectadas, todas acessíveis sem login:

| Experiência | Rota | O que faz |
|---|---|---|
| **EVOFIT Studio** (personal) | `/studio` | Painel com indicadores calculados dos dados, alunos (cadastro, edição, arquivamento, histórico, frequência, evolução de carga), biblioteca com 876 exercícios demonstrados (vídeo e dica próprios por exercício), editor de fichas (séries, repetições, carga, descanso, instruções, ordem) e atribuição a alunos, perfil profissional e caixa de solicitações de contato. |
| **EVOFIT Aluno** | `/aluno` | Mobile-first. Escolha de aluno fictício, treinos atribuídos, execução série a série (reps e kg editáveis, cronômetro de descanso), “Como fazer” em cada exercício (demonstração animada, vídeo do personal, dica e passo a passo com leitura em voz alta), conclusão com observação, histórico e gráficos de frequência e carga. |
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

**Nenhuma.** A demonstração não usa backend, chaves ou serviços externos. Por isso não há `.env.example`. Variáveis só serão necessárias quando houver backend real (ver “Próximos passos”).

## Validação

```bash
npm run lint        # ESLint (eslint-config-next, regras do React Compiler)
npm run typecheck   # tsc --noEmit (strict)
npm test            # Vitest — regras de dados, validação, métricas, diretório
npm run build       # build de produção
npm run test:e2e    # Playwright — gera o build e testa desktop (1440px) e mobile (375px)
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
   - **Environment Variables:** nenhuma
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
- **Exercícios próprios:** o personal pode criar exercícios que não existem no catálogo (nome repetido do catálogo é bloqueado); cada linha das instruções vira um passo numerado.
- **Ouvir:** o passo a passo pode ser lido em voz alta pela síntese de voz do próprio navegador (sem serviço externo), quando disponível.
- As imagens do catálogo mostram execuções de referência; não substituem a orientação do profissional. O guia sempre exibe o aviso para interromper o exercício em caso de dor.

## Movimento e interface

Entradas em cascata em listas e cards, números que contam até o valor, anéis de progresso (meta semanal e descanso), confirmação animada de série com vibração curta no celular, rolagem automática para o próximo exercício, comemoração ao concluir o treino, cards que elevam no hover e uma prévia animada do app na página inicial. Tudo em CSS/SVG, sem bibliotecas novas, e desligado com `prefers-reduced-motion`.

## Arquitetura

- **Next.js 16 (App Router, Turbopack)**, React 19, TypeScript strict, Tailwind CSS 4, `lucide-react`, fonte **Geist** (pacote `geist`, licença OFL, servida localmente — o build não depende da internet).
- `lib/types.ts` — modelo de dados · `lib/seed.ts` — dados demonstrativos (PRNG determinístico, datas relativas ao primeiro acesso) · `lib/actions.ts` — operações puras e validações · `lib/metrics.ts` — indicadores · `lib/store.ts` — persistência (`useSyncExternalStore` + `localStorage`) · `lib/directory.ts` — perfis fictícios e filtros · `lib/catalog.ts` — catálogo de exercícios, busca e passo a passo sob demanda · `lib/video.ts` — validação de links de vídeo · `lib/migrate.ts` — migração dos dados salvos.
- `components/exercise.tsx` — demonstração animada, miniatura, player de vídeo, passo a passo e guia completo · `components/motion.tsx` — contagem animada, anel de progresso, confete, vibração.
- `components/ui.tsx` — primitivas (Field, Modal com `<dialog>` nativo, ConfirmDialog, EmptyState, Stat, Progress, Avatar…) · `components/charts.tsx` — gráficos SVG com tooltip e tabela acessível.
- Rotas dinâmicas (`/studio/alunos/[id]`, `/studio/treinos/[id]`, `/studio/exercicios/[id]`, `/aluno/treino/[id]`, `/personais/[slug]`) são renderizadas sob demanda; as demais são estáticas.

## Design system

Paleta oficial centralizada em tokens semânticos em `app/globals.css` (componentes não usam hexadecimais). Temas claro/escuro seguem o sistema, com alternância manual (automático → claro → escuro) salva no navegador.

Contraste (WCAG 2.x) avaliado antes da aplicação:

| Combinação | Razão | Decisão |
|---|---|---|
| Cobblestone sobre Bright Sandstone | 10,49 | texto principal (claro) |
| Midnight Smoke sobre Sandstone | 5,99 | texto secundário (claro) |
| Branco sobre Ōtan Red | 3,30 ✗ | **rejeitado** |
| Cobblestone sobre Ōtan Red | 4,54 ✓ | botão primário (claro) |
| Ōtan Red sobre Sandstone | 2,31 ✗ | Ōtan não é usado como texto no claro |
| `#9E2B0E` (Red Gravy escurecido) sobre Sandstone | 5,24 | texto/realce de destaque (claro) |
| Dusty Cotton sobre Cobblestone | 11,65 | texto principal (escuro) |
| Dusty Cotton sobre Red Gravy | 4,64 ✓ | botão primário (escuro) |
| Red Gravy sobre Cobblestone | 2,51 ✗ | Red Gravy não é usado como texto no escuro |
| `#FF7A52` (Ōtan clareado) sobre superfície `#2A343B` | 4,94 | texto/realce de destaque (escuro) |

No tema escuro, Midnight Smoke é usado em estrutura e campos; os cards usam um tom intermediário (`#2A343B`) para manter o texto de destaque acima de 4,5:1. Botões: Primary, Outline, Inverse, Ghost e Danger, tamanhos sm/md/lg e variação pill, com hover, `focus-visible`, active e disabled. Animações discretas, desligadas com `prefers-reduced-motion`. Translucidez (`.glass`) apenas em barras fixas de navegação.

Tipografia: Geist (UI). **Switzer não está disponível/licenciada no repositório**; a marca usa Geist Black com itálico sintetizado (Geist não possui itálico real).

## Limitações conhecidas

- **Dados não sincronizam entre dispositivos ou navegadores** — cada navegador tem sua própria cópia da demonstração.
- **Solicitações de contato não são enviadas a ninguém.** Ficam salvas no navegador; as do perfil do próprio Studio aparecem em Studio → Perfil. O formulário avisa isso explicitamente.
- Não há autenticação, multiusuário, upload de foto, pagamentos ou notificações.
- Exercícios do catálogo são somente leitura (o personal adiciona vídeo/dica); exercícios próprios podem ser editados/excluídos (exclusão bloqueada se estiverem em uso).
- O app não hospeda vídeos: o personal usa um link do YouTube, Vimeo, Google Drive ou um arquivo já publicado. Vídeos privados não tocam para o aluno.
- A tradução do catálogo foi feita para este projeto; termos técnicos podem variar de região para região.
- O aplicativo antigo deste repositório (rastreador de dieta com checklist de refeições e peso, herdado do EVODIETA) foi substituído, pois não fazia parte do escopo do EVOFIT; ele continua disponível no histórico do Git (commit `ebeda05`). Os dados antigos no navegador (`evo_ch`, `evo_wt`) não são lidos nem apagados.
- `npm audit` aponta `braces` (dependência apenas de desenvolvimento do ESLint, sem correção publicada); as dependências de produção não têm vulnerabilidades conhecidas.

## Próximos passos para dados reais

1. Backend com autenticação (ex.: Supabase/Postgres) e **RLS por personal**: cada linha de aluno, ficha e sessão vinculada ao `trainer_id`; aluno acessa apenas as próprias sessões.
2. Mover `lib/actions.ts` para Server Actions/rotas com validação no servidor (as validações já estão isoladas e testadas).
3. Diretório servido do banco filtrando `directory_visible = true` no servidor; envio de contato com rate limit e anti-spam.
4. Variáveis de ambiente: apenas a URL e a chave pública (anon) no cliente; chaves privilegiadas somente no servidor.
