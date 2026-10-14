# EVOFIT — Fase 1: fundação e critérios de aceite

Status: **implementação parcial; validação de ponta a ponta pendente**  
Branch de trabalho: `feat/evofit-mvp-preview`  
Escopo: dashboard do personal, gestão de alunos, biblioteca de fichas e experiência mobile do aluno.

## Decisões de produto

1. O dashboard deve priorizar ações, não apenas apresentar números.
2. O personal deve conseguir localizar uma ficha por nome ou descrição sem sair da biblioteca.
3. A ficha do aluno deve reunir contexto de acompanhamento e facilitar o acesso ao histórico.
4. A execução mobile precisa privilegiar leitura, registro de séries, salvamento e retomada do treino.
5. Dados, ações existentes e biblioteca original de exercícios devem ser preservados.
6. Não introduzir métricas calculadas a partir de dados ausentes nem afirmar progresso sem histórico suficiente.

## Mudanças já implementadas nesta branch

- Central de ações no dashboard com links para alunos, fichas, solicitações e sessões em andamento.
- Contagem de prioridades ajustada para contar cada aluno uma única vez quando ele aparece em mais de uma categoria.
- Busca por nome e descrição na biblioteca de fichas, com filtragem imediata e contador de resultados.
- Revisão visual dos cartões de alunos e fichas, mantendo os dados e controles já existentes.
- Estilos responsivos para a central de ações e a busca de fichas.

## Critérios de aceite para encerrar a Fase 1

### Dashboard do personal
- [ ] Verificar em viewport móvel e desktop que os títulos, descrições, contadores e ícones não se sobrepõem.
- [ ] Abrir cada item da central e confirmar que chega à área correta.
- [ ] Conferir os números com dados de demonstração: aluno sem ficha, aluno sem sessão recente, solicitação e sessão ativa.
- [ ] Conferir o estado sem pendências e o estado com múltiplas pendências para o mesmo aluno.

### Gestão de alunos
- [ ] Abrir o perfil a partir da lista.
- [ ] Confirmar que nome, objetivo, meta semanal, fichas e última sessão correspondem aos dados armazenados.
- [ ] Testar busca/filtros e cadastro sem perder os dados existentes.

### Biblioteca de fichas
- [ ] Pesquisar por nome e descrição, inclusive busca sem resultados.
- [ ] Limpar a busca e recuperar a lista completa.
- [ ] Abrir, duplicar e excluir uma ficha, confirmando os diálogos e mensagens.
- [ ] Confirmar que os alunos atribuídos e o número de exercícios/séries continuam corretos.

### Execução mobile do aluno
- [ ] Abrir o treino atribuído.
- [ ] Registrar séries e confirmar que o progresso é preservado.
- [ ] Sair e retomar uma sessão em andamento.
- [ ] Concluir uma sessão e verificar o histórico do aluno e os indicadores do personal.
- [ ] Testar em largura de celular sem rolagem horizontal involuntária nem controles cortados.

### Publicação e regressão
- [ ] Confirmar o deployment mais recente como READY.
- [ ] Executar build/testes disponíveis no repositório ou CI.
- [ ] Repetir os fluxos acima no preview publicado.
- [ ] Confirmar que nenhuma mudança foi aplicada à branch `main` ou ao ambiente de produção.

## Definição de concluído

A Fase 1 só será considerada encerrada depois de executar e registrar os testes acima. Publicação READY comprova que a Vercel concluiu a publicação, mas não comprova por si só a correção funcional ou visual das telas.

## Próxima etapa

Após o aceite da Fase 1, priorizar o editor de treinos: biblioteca de exercícios, montagem rápida, edição de séries/repetições/carga/descanso, reutilização de fichas e pré-visualização do treino do aluno.
