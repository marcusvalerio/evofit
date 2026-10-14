# Fase 4 — Inteligência acionável

## Implementado na branch de preview

- Studio: indicador de alunos cujo ritmo semanal está abaixo do esperado para o ponto atual da semana, calculado pela meta individual e pelo número de dias transcorridos.
- Central de ações: nova linha de acompanhamento das metas semanais em risco, com contagem e acesso à lista de alunos.
- Aluno: bloco “Leitura da sua evolução” no histórico, com contexto da meta semanal e comparação das duas últimas cargas registradas para o exercício selecionado.
- As mensagens evitam prescrever mudanças automáticas de treino; uma queda de carga é apresentada como sinal para considerar o contexto, não como diagnóstico.

## Validação pendente

- [ ] Confirmar que o indicador muda corretamente ao avançar a semana e concluir sessões.
- [ ] Validar aluno sem histórico, com uma única carga e com duas ou mais cargas registradas.
- [ ] Conferir visualização mobile, acessibilidade e links para o aluno.
- [ ] Aguardar deploy da Vercel e executar teste ponta a ponta antes de considerar a fase concluída.

Esta fase está implementada no código de preview; não declarar validação funcional completa até os testes acima serem realizados.