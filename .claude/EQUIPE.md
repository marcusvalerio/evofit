# Equipe sênior do Claude Code

Quatro agentes (diretor de arte, designer de produto, designer de UX e motion designer) e a skill `/banca`, que chama os quatro de uma vez.

## Já instalado neste repositório
Os arquivos estão em `.claude/agents/` e `.claude/skills/banca/`. Qualquer sessão do Claude Code neste projeto, inclusive pelo celular, já carrega a equipe e o `/banca`. Para usar em outro projeto, copie essas duas pastas para o `.claude/` dele.

## Instalar na sua pasta pessoal (vale para todos os seus projetos no computador)

No seu computador, copie as pastas para dentro de `~/.claude/`:

```bash
mkdir -p ~/.claude/agents ~/.claude/skills
cp agents/*.md ~/.claude/agents/
cp -r skills/banca ~/.claude/skills/
```

No Windows a pasta é `%USERPROFILE%\.claude\` (crie `agents` e `skills` dentro dela).

Depois abra o Claude Code em qualquer projeto e confira com `/agents` se os quatro aparecem.

## Usar
- `/banca` (ou "chama a banca para avaliar esta landing"): os quatro avaliam em paralelo e o resultado vem lado a lado.
- Um só: "pede para o diretor de arte avaliar o logo", "chama o designer de UX para revisar o onboarding", "o motion designer faz a landing".
- Liberdade criativa: "cada um da banca faz a sua proposta para esta tela".

Para ajustar o perfil de alguém, edite o arquivo `.md` dele. O texto abaixo dos `---` é o que ele recebe como instrução.
