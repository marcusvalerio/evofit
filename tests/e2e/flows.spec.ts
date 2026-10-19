import { test, expect } from "./fixtures"
import { LEGACY_EXERCISE_IDS } from "../../lib/seed"

test.describe("acesso público sem login", () => {
  test("início abre sem login e identifica o modo demonstração", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("perder")
    await expect(page.getByText("Modo demonstração")).toBeVisible()
    await expect(page.getByRole("button", { name: /Restaurar/ })).toBeVisible()
  })

  const routes: [string, RegExp][] = [
    ["/studio", /Olá, Camila/],
    ["/studio/alunos", /Alunos/],
    ["/studio/treinos", /Fichas de treino/],
    ["/studio/exercicios", /Exercícios/],
    ["/studio/exercicios/Barbell_Squat", /Agachamento com barra/],
    ["/studio/perfil", /Perfil profissional/],
    ["/aluno", /Bora treinar/],
    ["/aluno/historico", /Histórico/],
    ["/biblioteca", /Veja como se faz/],
    ["/biblioteca/Barbell_Squat", /Agachamento com barra/],
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
  test("cadastro de aluno aceita mensalidade digitada de qualquer jeito e mostra o erro na tela", async ({ page }) => {
    await page.goto("/studio/alunos")
    await page.getByRole("button", { name: "Novo aluno" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo aluno" })
    await dialog.getByLabel("Nome").fill("Rita Valor")
    // erro em campo lá embaixo: a tela vai até ele e o foca
    await dialog.getByLabel("WhatsApp (opcional)").fill("98765")
    await dialog.getByRole("button", { name: "Adicionar aluno" }).click()
    await expect(dialog.getByLabel("WhatsApp (opcional)")).toBeFocused()
    await expect(dialog.getByText("Informe o WhatsApp com DDD (10 a 13 dígitos).")).toBeInViewport()
    await dialog.getByLabel("WhatsApp (opcional)").fill("(11) 98765-4321")
    // "R$ 300" sem vencimento: aceito, vencimento assume o dia de hoje
    await dialog.getByLabel("Mensalidade (R$, opcional)").fill("R$ 300")
    await dialog.getByRole("button", { name: "Adicionar aluno" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Rita Valor" })).toBeVisible()
    await page.goto("/studio/caixa")
    await expect(page.getByText("Rita Valor").first()).toBeVisible()
  })

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
    await picker.getByRole("button", { name: /^Rosca martelo Bíceps/ }).click()
    await expect(picker.getByRole("button", { name: /^Rosca martelo Bíceps/ })).toContainText("na ficha")
    await picker.getByRole("button", { name: /Concluir/ }).click()
    await expect(page.getByText("Alterações não salvas")).toBeVisible()
    await page.getByLabel("Elisa Prado").check()
    await page.getByRole("button", { name: "Salvar ficha" }).filter({ visible: true }).click()
    await expect(page.getByText("Salvo", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText("Rosca martelo", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Elisa Prado")).toBeChecked()

    // validação: séries inválidas bloqueiam o salvamento
    // (o primeiro "Séries" é o do ajuste em lote; o do exercício fica no card da lista)
    await page.locator("li.card").first().getByLabel("Séries").fill("0")
    await page.getByRole("button", { name: "Salvar ficha" }).filter({ visible: true }).click()
    await expect(page.getByText("Séries devem ficar entre 1 e 20.")).toBeVisible()
  })

  test("datas da ficha: início sugere a troca em 3 meses respeitando o mês e persiste", async ({ page }) => {
    await page.goto("/studio/treinos/tr-full-body")
    await page.getByLabel("Início do treino").fill("2026-11-30")
    await expect(page.getByLabel("Troca prevista")).toHaveValue("2027-02-28")
    await page.getByLabel("Troca prevista").fill("2026-11-01")
    await page.getByRole("button", { name: "Salvar ficha" }).filter({ visible: true }).click()
    await expect(page.getByText("A troca deve ser depois do início.")).toBeVisible()
    await page.getByLabel("Troca prevista").fill("2027-03-10")
    await page.getByRole("button", { name: "Salvar ficha" }).filter({ visible: true }).click()
    await expect(page.getByText("Salvo", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Início do treino")).toHaveValue("2026-11-30")
    await expect(page.getByLabel("Troca prevista")).toHaveValue("2027-03-10")
  })

  test("cria nova ficha a partir da lista", async ({ page }) => {
    await page.goto("/studio/treinos")
    await page.getByRole("button", { name: "Nova ficha" }).click()
    await page.getByRole("dialog").getByLabel("Nome da ficha").fill("Treino C — Teste")
    await page.getByRole("button", { name: "Criar e editar" }).click()
    await expect(page).toHaveURL(/\/studio\/treinos\/tr-/)
    await expect(page.getByLabel("Nome da ficha")).toHaveValue("Treino C — Teste")
  })

  test("cria exercício próprio na biblioteca", async ({ page }) => {
    await page.goto("/studio/exercicios")
    await page.getByRole("button", { name: "Exercício próprio" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Nome").fill("Cadeira extensora")
    await dialog.getByLabel("Grupo muscular").selectOption("Costas")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(dialog.getByText(/já existe no catálogo/)).toBeVisible()
    await dialog.getByLabel("Nome").fill("Remada cavalinho")
    await dialog.getByLabel(/Instruções/).fill("Pegue a barra T.\nPuxe até o abdômen.")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Remada cavalinho" })).toBeVisible()
    await expect(page.getByRole("listitem").filter({ hasText: "Puxe até o abdômen." })).toBeVisible()
    await page.goto("/studio/exercicios")
    await page.getByRole("tab", { name: /Meus/ }).click()
    await expect(page.getByRole("link", { name: /Remada cavalinho/ })).toContainText("Próprio")
  })

  test("biblioteca: busca, demonstração, passo a passo e vídeo do personal", async ({ page }) => {
    await page.goto("/studio/exercicios")
    await expect(page.getByText(/^\d{3} exercícios$/)).toBeVisible()
    await page.getByLabel("Buscar exercício").fill("agachamento com barra")
    await page.getByRole("link", { name: /^Agachamento com barra Quadríceps/ }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Agachamento com barra" })).toBeVisible()

    // demonstração com os dois quadros carregados
    const frames = page.locator("figure.demo img")
    await expect(frames).toHaveCount(2)
    for (const img of await frames.all()) await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
    // passo a passo em português carregado sob demanda
    await expect(page.getByRole("heading", { name: "Passo a passo" })).toBeVisible()
    expect(await page.locator("ol.steps > li").count()).toBeGreaterThan(2)
    // dica de demonstração do seed
    await expect(page.getByText("Dica do seu personal")).toBeVisible()

    // link inválido é rejeitado; válido é salvo
    const video = page.getByLabel("Link do vídeo")
    await video.fill("https://site-qualquer.com/video")
    await expect(page.getByText(/Link não reconhecido/)).toBeVisible()
    await video.fill("https://youtu.be/dQw4w9WgXcQ")
    await expect(page.getByText("Link reconhecido: YouTube")).toBeVisible()
    await page.getByRole("button", { name: "Salvar material" }).click()
    await expect(page.getByRole("button", { name: "Assistir vídeo do personal" })).toBeVisible()

    // o aluno vê o material durante o treino
    await page.goto("/aluno/treino/tr-b-inferiores")
    await page.getByRole("button", { name: "Como fazer: Agachamento com barra" }).click()
    const sheet = page.getByRole("dialog", { name: "Agachamento com barra" })
    await expect(sheet.getByRole("button", { name: "Assistir vídeo do personal" })).toBeVisible()
    await expect(sheet.getByText("Dica do seu personal")).toBeVisible()
    await expect(sheet.locator("ol.steps > li").first()).toBeVisible()
    await page.keyboard.press("Escape")
    await page.getByRole("button", { name: "Iniciar treino" }).click()
    await page.getByRole("button", { name: "Como fazer" }).first().click()
    await expect(page.getByRole("dialog", { name: "Agachamento com barra" })).toBeVisible()
  })

  test("com movimento reduzido a demonstração mostra os quadros lado a lado", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/studio/exercicios/Leg_Press")
    const [a, b] = await page.locator("figure.demo img").all()
    await expect(a).toBeVisible()
    await expect(b).toBeVisible()
    const ba = (await a.boundingBox())!
    const bb = (await b.boundingBox())!
    expect(bb.x).toBeGreaterThanOrEqual(ba.x + ba.width - 1)
    await expect(page.getByRole("button", { name: "Pausar animação" })).toBeHidden()
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
    await page.getByRole("dialog").getByRole("radio", { name: /^Esforço 7/ }).click()
    await page.getByRole("dialog").getByRole("radiogroup", { name: "Sentiu dor?" }).getByRole("radio", { name: "Leve" }).click()
    await page.getByRole("dialog").getByLabel(/Quer contar algo ao seu personal/).fill("Treino de teste")
    await page.getByRole("dialog").getByRole("button", { name: "Concluir" }).click()
    await expect(page.getByText("Treino concluído", { exact: true })).toBeVisible()

    await page.getByRole("link", { name: "Ver histórico" }).click()
    await page.getByText("Treino A — Superiores").first().click()
    await expect(page.getByText("“Treino de teste”")).toBeVisible()

    await page.goto("/studio")
    await expect(page.getByText(/Ana Ribeiro concluiu Treino A — Superiores/).first()).toBeVisible()
    await expect(page.getByText("hoje ·").first()).toBeVisible()
    // o check-in chega ao personal
    await expect(page.getByText("esforço 7/10").first()).toBeVisible()
    await expect(page.getByText("dor leve").first()).toBeVisible()
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

  test("dados da versão anterior são migrados sem perder fichas", async ({ page }) => {
    await page.goto("/studio/treinos")
    const reverse = Object.fromEntries(Object.entries(LEGACY_EXERCISE_IDS).map(([a, b]) => [b, a]))
    await page.evaluate((rev) => {
      const d = JSON.parse(localStorage.getItem("evofit:demo:v1")!)
      d.version = 1
      delete d.exerciseMedia
      d.exercises = [{ id: "ex-supino-reto", name: "Supino reto com barra", muscleGroup: "Peito", equipment: "Barra", instructions: "", custom: false }]
      d.workouts[0].name = "Ficha antiga"
      for (const w of d.workouts) for (const i of w.items) i.exerciseId = rev[i.exerciseId] ?? i.exerciseId
      for (const s of d.sessions) for (const x of s.sets) x.exerciseId = rev[x.exerciseId] ?? x.exerciseId
      localStorage.setItem("evofit:demo:v1", JSON.stringify(d))
    }, reverse)
    await page.goto("/aluno/treino/tr-a-superiores")
    await expect(page.getByRole("heading", { level: 1, name: "Ficha antiga" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Como fazer: Supino reto com barra/ })).toBeVisible()
    await expect(page.getByRole("alert").filter({ hasText: "dados salvos" })).toHaveCount(0)
  })

  test("dados corrompidos são substituídos com aviso", async ({ page }) => {
    await page.goto("/")
    // espera a demonstração iniciar nesta página; senão ela mesma detecta e restaura os dados corrompidos
    await expect(page.getByText("Modo demonstração")).toBeVisible()
    await page.evaluate(() => localStorage.setItem("evofit:demo:v1", '{"version":0,"lixo":true}'))
    await page.goto("/studio")
    await expect(page.getByRole("alert").filter({ hasText: "dados salvos" })).toContainText("formato antigo ou inválido")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Olá/)
  })
})

test.describe("sem internet", () => {
  test("treino atribuído abre e roda offline depois de visto uma vez", async ({ page, context }) => {
    await page.goto("/aluno")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Bora treinar/)
    // espera o service worker assumir e guardar as fichas do aluno
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }))
      void reg
    })
    await page.reload()
    await page.waitForFunction(async () => {
      const c = await caches.open("evofit-pages-v1")
      return !!(await c.match("/aluno/treino/tr-a-superiores"))
    }, undefined, { timeout: 20_000 })
    await context.setOffline(true)
    await page.goto("/aluno/treino/tr-a-superiores")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Treino A/)
    await page.getByRole("button", { name: "Iniciar treino" }).click()
    await page.getByRole("button", { name: /^Marcar série 1 de/ }).first().click()
    await expect(page.getByRole("button", { name: /^Desmarcar série 1 de/ }).first()).toBeVisible()
    await context.setOffline(false)
  })
})

test.describe("Biblioteca EVOFIT", () => {
  test("busca, abre o exercício e o GIF com a marca carrega", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /Biblioteca EVOFIT: \d+ exercícios em GIF/ }).click()
    await expect(page).toHaveURL("/biblioteca")
    await page.getByLabel("Buscar exercício").fill("prancha")
    await page.getByRole("link", { name: /^Prancha Abdômen/ }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Prancha" })).toBeVisible()
    const gif = page.getByRole("img", { name: /Animação EVOFIT: Prancha/ })
    await expect.poll(() => gif.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 15_000 }).toBe(480)
    await expect(page.getByRole("link", { name: "Baixar GIF" })).toHaveAttribute("href", "/api/gif/Plank?v=3&download")
    await expect(page.locator("ol.steps > li").first()).toBeVisible()
  })

  test("rota de GIF responde só para exercícios do catálogo", async ({ request }) => {
    const ok = await request.get("/api/gif/Plank")
    expect(ok.status()).toBe(200)
    expect(ok.headers()["content-type"]).toBe("image/gif")
    expect(ok.headers()["cache-control"]).toContain("immutable")
    expect((await ok.body()).subarray(0, 6).toString()).toBe("GIF89a")
    const dl = await request.get("/api/gif/Plank?download")
    expect(dl.headers()["content-disposition"]).toBe('attachment; filename="evofit-prancha.gif"')
    for (const bad of ["nao-existe", "Kettlebell_Halo", "..%2F..%2Fpackage.json"]) expect((await request.get(`/api/gif/${bad}`)).status()).toBe(404)
  })

  test("Studio oferece baixar e compartilhar o GIF", async ({ page }) => {
    await page.goto("/studio/exercicios/Leg_Press")
    await expect(page.getByRole("link", { name: "Baixar GIF" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible()
  })
})

test.describe("diretório", () => {
  test("busca, filtros e URL compartilhável", async ({ page }) => {
    await page.goto("/personais")
    await expect(page.getByText(/\d+ profissionais encontrados/)).toBeVisible()
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
    await page.goto("/personais?q=camila%20rocha")
    await expect(page.getByText("1 profissional encontrado")).toBeVisible()
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
    await page.goto("/personais?q=camila%20rocha")
    await expect(page.getByText("Nenhum profissional com esses filtros")).toBeVisible()
    await page.goto("/personais/camila-rocha-demo")
    await expect(page.getByRole("heading", { name: "Perfil indisponível" })).toBeVisible()
  })

  test("WhatsApp e Instagram do perfil viram botões no perfil público", async ({ page }) => {
    await page.goto("/studio/perfil")
    await page.getByLabel("WhatsApp (opcional)").fill("(11) 9876-5432")
    await page.getByLabel("Instagram (opcional)").fill("instagram.com/camila.treina")
    await page.getByRole("button", { name: "Salvar perfil" }).click()
    await expect(page.getByLabel("Instagram (opcional)")).toHaveValue("camila.treina")
    await page.goto("/personais/camila-rocha-demo")
    await expect(page.getByRole("link", { name: "Chamar no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/551198765432\?text=/)
    await expect(page.getByRole("link", { name: "@camila.treina" })).toHaveAttribute("href", "https://instagram.com/camila.treina")
    // valor inválido não salva
    await page.goto("/studio/perfil")
    await page.getByLabel("WhatsApp (opcional)").fill("123")
    await page.getByRole("button", { name: "Salvar perfil" }).click()
    await expect(page.getByText("Informe o WhatsApp com DDD (10 a 13 dígitos).")).toBeVisible()
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
    await page.getByRole("button", { name: "Exercício próprio" }).click()
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
