# EVOFIT — Fase 2: prescrição e montagem de fichas

Status: **funcionalidades implementadas no preview; validação de publicação pendente**.

## Entregas nesta etapa

- Ajuste em lote de séries, repetições e descanso em todos os exercícios da ficha.
- Preservação das cargas e instruções individuais durante o ajuste em lote.
- Busca de alunos ativos na lista de atribuição de fichas.
- Prévia do aluno com nome, descrição, exercícios na ordem definida, séries, repetições, carga, descanso e instruções.
- A prévia usa o rascunho atual, sem exigir salvar antes de conferir.
- Mantidos os controles de adicionar vários exercícios, filtrar a biblioteca, reordenar/remover exercícios, duplicar fichas, atribuir alunos e salvar.

## Validação obrigatória antes de marcar concluída

- [ ] O deployment mais recente termina como READY.
- [ ] Editor abre em desktop e celular sem erro de renderização.
- [ ] Ajuste em lote atualiza séries, repetições e descanso sem alterar carga/notas individuais.
- [ ] Valores inválidos são rejeitados com mensagem clara.
- [ ] Busca de aluno filtra a lista e mantém as seleções já feitas.
- [ ] Prévia reflete imediatamente alterações não salvas.
- [ ] Ficha salva mantém exercícios, ordem, campos e alunos atribuídos após recarregar.
- [ ] Duplicar uma ficha cria uma cópia sem alunos atribuídos, conforme o comportamento existente.
- [ ] Biblioteca original, filtros e navegação continuam funcionando.
- [ ] Testar estado vazio, nomes longos, nenhuma correspondência na busca e viewport móvel.
- [ ] Confirmar que nenhuma alteração foi aplicada à main/produção.

## Limites

A prévia é uma representação de revisão da ficha, não uma réplica completa do fluxo de execução do aluno. A persistência depende do modo atual da aplicação (demonstração local ou conta sincronizada) e deve ser validada nos dois cenários quando disponíveis.
