---
name: banca
description: Banca de avaliação com 4 profissionais sênior (diretor de arte, designer de produto, designer de UX e motion designer). Use quando o usuário pedir para avaliar, criticar ou revisar um site, app, landing, design system ou telas, ou digitar /banca. Cada um avalia no seu foco, em paralelo, e o resultado vem lado a lado.
---
# Banca de avaliação

1. **Junte o material.** Descubra o que será avaliado: URL, pasta, arquivos HTML, telas do app ou design system. Se for uma página, tire prints em sequência de rolagem em 1440×900 e 390×844 (Playwright) e salve numa pasta. Se existir design system (README, tokens, componentes), anote o caminho.
2. **Chame os quatro agentes em paralelo**, em segundo plano: `diretor-de-arte`, `designer-de-produto`, `designer-ux` e `motion-designer`. Mande para cada um:
   - o que é o produto, em 2 ou 3 linhas;
   - o caminho dos prints, do design system e do código;
   - o lembrete de ignorar a opinião do dono e avaliar com sinceridade;
   - o formato de resposta do próprio agente, com o limite de palavras.
   O motion designer avalia movimento e transições. Se o material for estático, ele avalia o potencial e os problemas de movimento.
3. **Espere os quatro terminarem** e não antecipe resultados.
4. **Apresente lado a lado:**
   - uma seção por profissional, com nota, veredito, pontos fortes e problemas (resumidos, sem perder o que é concreto);
   - depois, uma seção "Leitura conjunta": onde os quatro concordam, onde discordam e as 5 correções prioritárias, separando as que não mudam a identidade das que são decisão do dono.
   - Diga quantos prints cada um realmente abriu, se avaliaram por amostra.
5. **Pergunte ao usuário** se quer aplicar as correções ou pedir a cada profissional uma proposta própria com liberdade criativa (cada um faz a sua, e não uma proposta conjunta).
