# EVOFIT — Fase 3: execução mobile do aluno

Status: **melhorias de navegação e feedback implementadas no preview; validação ponta a ponta pendente**.

## Mudanças nesta etapa

- Navegação horizontal para saltar diretamente para qualquer exercício da sessão.
- Indicador de conclusão em cada item de navegação.
- Contagem de séries concluídas no cartão do exercício.
- Estado visual explícito quando todas as séries de um exercício foram concluídas.
- Ajustes responsivos nos cabeçalhos dos exercícios e nos alvos de interação para telas pequenas.
- Preservados o registro de repetições e cargas, o temporizador de descanso, a ajuda de execução, a conclusão da sessão, o histórico e a confirmação de descarte.

## Testes de aceite

- [ ] Publicação mais recente termina como READY.
- [ ] A navegação rápida leva ao exercício correto, inclusive com nomes longos e em celular.
- [ ] O estado dos chips acompanha séries concluídas e desmarcadas.
- [ ] Alterar repetições e carga mantém os valores depois de navegar para outro exercício.
- [ ] Temporizador de descanso continua funcionando e permite pular ou acrescentar 15 segundos.
- [ ] A barra inferior não cobre os últimos campos nem os controles do último exercício.
- [ ] Concluir uma sessão atualiza histórico e resumo sem duplicar sessão.
- [ ] Retomar sessão em andamento mantém as séries registradas.
- [ ] Sair e descartar exige confirmação e segue o comportamento atual.
- [ ] Testar em largura móvel e desktop, incluindo acessibilidade por teclado.
- [ ] Confirmar que as alterações estão apenas na branch de preview.

## Critério de conclusão

Não marcar a Fase 3 como concluída até testar uma sessão completa no preview publicado, do início à conclusão e conferência do histórico.
