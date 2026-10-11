import { test, expect } from "./fixtures"

test.describe("acesso público sem login", () => {
  test("início abre sem login e identifica o modo demonstração", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("evolua")
    await expect(page.getByText("Modo demonstração")).toBeVisible()
    await expect(page.getByRole("button", { name: /Restaurar/ })).toBeVisible()
  })

  const routes: [string, RegExp][] = [
    ["/studio", /Olá, Camila/],
    ["/studio/alunos", /Alunos/],
    ["/studio/treinos", /Fichas de treino/],
    ["/studio/exercicios", /Exercícios/],
    ["/studio/perfil", /Perfil profissional/],
    ["/aluno", /Bora treinar/],
    ["/aluno/historico", /Histórico/],
    ["/personais", /Encontre um personal/],
    ["/personais/lucas-andrade-demo", /Lucas Andrade/],
  ]
  for (const [path, heading] of routes) {
    test(`rota pública ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(path)
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, "sem rolagem horizontal").toBeLessThanOrEqual(0)
    })
  }

  test("rotas inexistentes mostram estados explicativos", async ({ page }) => {
    const res = await page.goto("/rota-que-nao-existe")
    expect(res?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible()
    await page.goto("/studio/alunos/nao-existe")
    await expect(page.getByRole("heading", { name: "Aluno não encontrado" })).toBeVisible()
    await page.goto("/aluno/treino/tr-full-body") // não atribuído à Ana
    await expect(page.getByRole("heading", { name: "Treino indisponível" })).toBeVisible()
  })

  test("navegação entre as experiências pelos links", async ({ page, viewport }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /Começar pelo Studio/ }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Olá/)
    const nav = page.getByRole("navigation", { name: "Studio" }).filter({ visible: true })
    for (const [label, heading] of [["Alunos", "Alunos"], ["Treinos", "Fichas de treino"], ["Exercícios", "Exercícios"], ["Perfil", "Perfil profissional"], ["Painel", /Olá/]] as const) {
      await nav.getByRole("link", { name: label }).click()
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading)
    }
    await page.goto("/aluno")
    await page.getByRole("link", { name: "Histórico" }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Histórico")
    expect(viewport).toBeTruthy()
  })
})

test.describe("Studio", () => {
  test("cria aluno com validação e persiste após recarregar", async ({ page }) => {
    await page.goto("/studio/alunos")
    await page.getByRole("button", { name: "Novo aluno" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo aluno" })
    await dialog.getByRole("button", { name: "Adicionar aluno" }).click()
    await expect(dialog.getByText(/Informe o nome do aluno/)).toBeVisible()
    await dialog.getByLabel("Nome").fill("Paula Teste")
    await dialog.getByLabel("Objetivo").fill("Força geral")
    await dialog.getByLabel("Meta semanal (sessões)").fill("2")
    await dialog.getByRole("button", { name: "Adicionar aluno" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Paula Teste" })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("heading", { level: 1, name: "Paula Teste" })).toBeVisible()

    // edição
    await page.getByRole("button", { name: "Editar" }).click()
    await page.getByRole("dialog").getByLabel("Nome").fill("Paula Editada")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Paula Editada" })).toBeVisible()

    // arquivamento
    await page.getByRole("button", { name: "Arquivar" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Arquivar aluno" }).click()
    await expect(page.getByText("Arquivado", { exact: true })).toBeVisible()
  })

  test("edita ficha, adiciona exercício, atribui aluno e persiste", async ({ page }) => {
    await page.goto("/studio/treinos/tr-full-body")
    await expect(page.getByText("Salvo", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    const picker = page.getByRole("dialog", { name: "Adicionar exercícios" })
    await picker.getByLabel("Buscar exercício").fill("rosca martelo")
    await picker.getByRole("button", { name: /Rosca martelo/ }).click()
    await picker.getByRole("button", { name: /Concluir/ }).click()
    await expect(page.getByText("Alterações não salvas")).toBeVisible()
    await page.getByLabel("Elisa Prado").check()
    await page.getByRole("button", { name: "Salvar ficha" }).filter({ visible: true }).click()
    await expect(page.getByText("Salvo", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText("Rosca martelo")).toBeVisible()
    await expect(page.getByLabel("Elisa Prado")).toBeChecked()

    // validação: séries inválidas bloqueiam o salvamento
    await page.getByLabel("Séries").first().fill("0")
    await page.getByRole("button", { name: "Salvar ficha" }).filter({ visible: true }).click()
    await expect(page.getByText("Séries devem ficar entre 1 e 20.")).toBeVisible()
  })

  test("cria nova ficha a partir da lista", async ({ page }) => {
    await page.goto("/studio/treinos")
    await page.getByRole("button", { name: "Nova ficha" }).click()
    await page.getByRole("dialog").getByLabel("Nome da ficha").fill("Treino C — Teste")
    await page.getByRole("button", { name: "Criar e editar" }).click()
    await expect(page).toHaveURL(/\/studio\/treinos\/tr-/)
    await expect(page.getByLabel("Nome da ficha")).toHaveValue("Treino C — Teste")
  })

  test("cria exercício personalizado na biblioteca", async ({ page }) => {
    await page.goto("/studio/exercicios")
    await page.getByRole("button", { name: "Novo exercício" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Nome").fill("Remada cavalinho")
    await dialog.getByLabel("Grupo muscular").selectOption("Costas")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await page.getByLabel("Buscar exercício").fill("cavalinho")
    await expect(page.getByText("Remada cavalinho")).toBeVisible()
    await expect(page.getByText("Seu", { exact: true })).toBeVisible()
  })
})

test.describe("Aluno", () => {
  test("registra e conclui uma sessão; o Studio reflete o resultado", async ({ page }) => {
    await page.goto("/aluno")
    await page.getByRole("link", { name: /Treino A — Superiores/ }).click()
    await page.getByRole("button", { name: "Iniciar treino" }).click()
    await expect(page.getByText("0/20 séries")).toBeVisible()

    await page.getByLabel("Repetições da série 1 de Supino reto com barra").fill("9")
    await page.getByRole("button", { name: "Marcar série 1 de Supino reto com barra" }).click()
    await expect(page.getByRole("timer")).toBeVisible()
    await page.getByRole("button", { name: "Pular" }).click()
    await page.getByRole("button", { name: "Marcar série 2 de Supino reto com barra" }).click()
    await page.getByRole("button", { name: "Pular" }).click()
    await expect(page.getByText("2/20 séries")).toBeVisible()

    // progresso persiste ao recarregar
    await page.reload()
    await expect(page.getByText("2/20 séries")).toBeVisible()

    await page.getByRole("button", { name: "Concluir treino" }).click()
    await page.getByRole("dialog").getByLabel(/Como foi o treino/).fill("Treino de teste")
    await page.getByRole("dialog").getByRole("button", { name: "Concluir" }).click()
    await expect(page.getByText("Treino concluído", { exact: true })).toBeVisible()

    await page.getByRole("link", { name: "Ver histórico" }).click()
    await page.getByText("Treino A — Superiores").first().click()
    await expect(page.getByText("“Treino de teste”")).toBeVisible()

    await page.goto("/studio")
    await expect(page.getByText(/Ana Ribeiro concluiu Treino A — Superiores/).first()).toBeVisible()
    await expect(page.getByText("hoje ·").first()).toBeVisible()
  })

  test("troca de aluno e treino sem ficha mostra estado vazio", async ({ page }) => {
    await page.goto("/aluno")
    await page.getByRole("button", { name: /Aluno atual: Ana Ribeiro/ }).click()
    await page.getByRole("dialog").getByRole("button", { name: /Diego Faria/ }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bora treinar, Diego")
    await expect(page.getByRole("link", { name: /Full body — Base/ })).toBeVisible()
  })

  test("descartar sessão em andamento", async ({ page }) => {
    await page.goto("/aluno/treino/tr-b-inferiores")
    await page.getByRole("button", { name: "Iniciar treino" }).click()
    await page.getByRole("button", { name: "Sair" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Descartar treino" }).click()
    await expect(page).toHaveURL("/aluno")
    await expect(page.getByText("Treino em andamento")).toHaveCount(0)
  })
})

test.describe("persistência", () => {
  test("restaurar demonstração volta ao estado inicial", async ({ page }) => {
    await page.goto("/studio/alunos?novo=1")
    await page.getByRole("dialog").getByLabel("Nome").fill("Temporário")
    await page.getByRole("button", { name: "Adicionar aluno" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Temporário" })).toBeVisible()
    await page.getByRole("button", { name: /Restaurar/ }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Restaurar dados" }).click()
    await expect(page.getByRole("heading", { name: "Aluno não encontrado" })).toBeVisible()
    await page.goto("/studio/alunos")
    await expect(page.getByText("Temporário")).toHaveCount(0)
  })

  test("dados corrompidos são substituídos com aviso", async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => localStorage.setItem("evofit:demo:v1", '{"version":0,"lixo":true}'))
    await page.goto("/studio")
    await expect(page.getByRole("alert").filter({ hasText: "dados salvos" })).toContainText("formato antigo ou inválido")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Olá/)
  })
})

test.describe("diretório", () => {
  test("busca, filtros e URL compartilhável", async ({ page }) => {
    await page.goto("/personais")
    await expect(page.getByText(/9 profissionais encontrados/)).toBeVisible()
    await page.getByLabel(/Buscar por nome/).fill("curitiba")
    await expect(page.getByText("1 profissional encontrado")).toBeVisible()
    await expect(page.getByRole("link", { name: /Júlia Martins/ })).toBeVisible()
    await expect(page).toHaveURL(/q=curitiba/)
    await page.getByRole("button", { name: "Limpar filtros" }).first().click()
    await expect(page.getByLabel(/Buscar por nome/)).toHaveValue("")

    await page.getByRole("group", { name: "Modalidade" }).getByRole("button", { name: "Online" }).click()
    await expect(page).toHaveURL(/modalidade=online/)
    const cards = page.getByRole("main").getByRole("listitem")
    for (const t of await cards.allInnerTexts()) expect(t).toMatch(/Online|Híbrido/)

    await page.goto("/personais?especialidade=Corrida")
    await expect(page.getByRole("link", { name: /Pedro Almeida/ })).toBeVisible()
    await expect(page.getByText("1 profissional encontrado")).toBeVisible()

    await page.goto("/personais?q=nada-assim")
    await expect(page.getByText("Nenhum profissional com esses filtros")).toBeVisible()
  })

  test("solicitação de contato chega ao Studio e opt-out oculta o perfil", async ({ page }) => {
    await page.goto("/personais/camila-rocha-demo")
    await page.getByLabel("Seu nome").fill("Visitante")
    await page.getByLabel("Como prefere ser contatado").fill("visitante@exemplo.com")
    await page.getByRole("button", { name: "Registrar solicitação" }).click()
    await expect(page.getByText("Confirme a autorização para continuar.")).toBeVisible()
    await page.getByLabel(/autorizo o registro/).check()
    await page.getByRole("button", { name: "Registrar solicitação" }).click()
    await expect(page.getByText("Solicitação registrada na demonstração")).toBeVisible()
    await page.getByRole("link", { name: "Ver no Studio" }).click()
    await expect(page.locator("#solicitacoes").getByText("Visitante")).toBeVisible()

    await page.getByLabel(/Aparecer em “Encontrar personal”/).uncheck()
    await page.getByRole("button", { name: "Salvar perfil" }).click()
    await expect(page.getByText("Oculto do diretório")).toBeVisible()
    await page.goto("/personais")
    await expect(page.getByText(/8 profissionais encontrados/)).toBeVisible()
    await page.goto("/personais/camila-rocha-demo")
    await expect(page.getByRole("heading", { name: "Perfil indisponível" })).toBeVisible()
  })
})

test.describe("interface", () => {
  test("atalho do painel abre o cadastro e leva ao aluno criado", async ({ page }) => {
    await page.goto("/studio")
    await page.getByRole("link", { name: "Novo aluno" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo aluno" })
    await dialog.getByLabel("Nome").fill("Atalho Teste")
    await dialog.getByRole("button", { name: "Adicionar aluno" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Atalho Teste" })).toBeVisible()
    await expect(page).toHaveURL(/\/studio\/alunos\/al-/)
  })

  test("Esc fecha modal e tema escuro persiste após recarregar", async ({ page }) => {
    await page.goto("/studio/exercicios")
    await page.getByRole("button", { name: "Novo exercício" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)

    const toggle = page.getByRole("button", { name: /Alternar tema/ }).filter({ visible: true })
    await toggle.click() // automático → claro
    await toggle.click() // claro → escuro
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  })
})
