import type { Page } from "@playwright/test"
import { test, expect } from "./fixtures"

/* Fluxos com conta real: banco Postgres (PGlite local nos testes, Neon em produção). */

const PASSWORD = "senha-de-teste-1"
const unique = (label: string, project: string) => `${label}-${project}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`

/** Espera o app enviar as alterações ao servidor. */
const saved = (page: Page) => page.waitForResponse((r) => r.url().endsWith("/api/workspace") && r.request().method() === "PATCH" && r.ok())

async function signup(page: Page, name: string, email: string) {
  await page.goto("/criar-conta")
  await page.getByLabel("Seu nome profissional").fill(name)
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
  await page.getByLabel(/Sou responsável pelos dados/).check()
  await page.getByRole("button", { name: "Criar conta" }).click()
  await expect(page).toHaveURL("/studio")
  await expect(page.getByText("Conta de personal")).toBeVisible()
}

test.describe("conta real", () => {
  test("personal cria conta, cadastra, convida o aluno e acompanha o treino dele", async ({ page, browser }, info) => {
    const id = unique("p", info.project.name)
    const email = `${id}@exemplo.com`
    await signup(page, "Paula Personal", email)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Olá, Paula/)

    // aluno
    await page.goto("/studio/alunos")
    await page.getByRole("button", { name: "Novo aluno" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo aluno" })
    await dialog.getByLabel("Nome").fill("Rafa Aluno")
    let wait = saved(page)
    await dialog.getByRole("button", { name: "Adicionar aluno" }).click()
    await wait
    await expect(page.getByRole("heading", { level: 1, name: "Rafa Aluno" })).toBeVisible()
    const studentUrl = page.url()

    // ficha com exercício do catálogo, atribuída ao aluno
    await page.goto("/studio/treinos")
    await page.getByRole("button", { name: "Nova ficha" }).click()
    await page.getByRole("dialog").getByLabel("Nome da ficha").fill("Treino Real")
    wait = saved(page)
    await page.getByRole("button", { name: "Criar e editar" }).click()
    await wait
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    const picker = page.getByRole("dialog", { name: "Adicionar exercícios" })
    await picker.getByLabel("Buscar exercício").fill("leg press 45")
    await picker.getByRole("button", { name: /^Leg press 45°/ }).click()
    await picker.getByRole("button", { name: /Concluir/ }).click()
    await page.getByLabel("Rafa Aluno").check()
    wait = saved(page)
    await page.getByRole("button", { name: "Salvar ficha" }).filter({ visible: true }).click()
    await wait

    // os dados estão no servidor: outro navegador logado vê o mesmo
    await page.reload()
    await expect(page.getByText("Leg press 45°", { exact: true })).toBeVisible()

    // acesso gerado pelo personal: usuário + senha provisória
    await page.goto(studentUrl)
    await page.getByRole("button", { name: "Acesso ao app" }).click()
    const access = page.getByRole("dialog", { name: /Acesso de Rafa/ })
    await expect(access.getByText("Sem acesso ao app")).toBeVisible()
    await access.getByRole("button", { name: "Gerar acesso" }).click()
    const creds = access.locator(".evo-access-cred dd")
    const login = (await creds.nth(0).textContent())!.trim()
    const temp = (await creds.nth(1).textContent())!.trim()
    expect(login).toMatch(/^rafa\.aluno/)
    expect(temp).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    await expect(access.getByText("Aguardando o primeiro acesso")).toBeVisible()

    // aluno entra em outro navegador e é obrigado a criar a própria senha
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const st = await ctx.newPage()
    await st.goto("/entrar")
    await st.getByLabel("E-mail ou usuário").fill(login.toUpperCase())
    await st.getByLabel("Senha", { exact: true }).fill(temp)
    await st.getByRole("button", { name: "Entrar" }).click()
    await expect(st.getByRole("heading", { level: 1 })).toHaveText("Crie sua senha")
    await expect(st.getByRole("navigation", { name: "Aluno" })).toHaveCount(0)
    await st.getByLabel("Nova senha", { exact: true }).fill(PASSWORD)
    await st.getByLabel("Repita a nova senha").fill(PASSWORD)
    await st.getByRole("button", { name: "Salvar senha e entrar" }).click()
    await expect(st.getByRole("heading", { level: 1 })).toHaveText("Bora treinar, Rafa")
    await expect(st.getByText("Conta de aluno")).toBeVisible()
    // o personal vê o acesso como ativo
    await page.reload()
    await page.getByRole("button", { name: "Acesso ao app" }).click()
    await expect(page.getByRole("dialog", { name: /Acesso de Rafa/ }).getByText("Acesso ativo")).toBeVisible()
    await page.keyboard.press("Escape")

    // aluno treina
    await st.getByRole("link", { name: /Treino Real/ }).click()
    wait = saved(st)
    await st.getByRole("button", { name: "Iniciar treino" }).click()
    await wait
    wait = saved(st)
    await st.getByRole("button", { name: "Marcar série 1 de Leg press 45°" }).click()
    await wait
    await st.getByRole("button", { name: "Pular" }).click()
    await st.getByRole("button", { name: "Concluir treino" }).click()
    wait = saved(st)
    await st.getByRole("dialog").getByRole("button", { name: "Concluir" }).click()
    await wait
    await expect(st.getByText("Treino concluído", { exact: true })).toBeVisible()

    // aluno não entra na área do personal
    await st.goto("/studio")
    await expect(st.getByRole("heading", { name: "Esta é a área do personal" })).toBeVisible()
    await ctx.close()

    // personal vê o treino do aluno
    await page.goto("/studio")
    await expect(page.getByText(/Rafa Aluno concluiu Treino Real/).first()).toBeVisible()

    // personal na área do aluno vê orientação
    await page.goto("/aluno")
    await expect(page.getByRole("heading", { name: "Esta é a área do aluno" })).toBeVisible()

    // excluir conta apaga tudo, inclusive o acesso do aluno
    await page.goto("/studio/perfil")
    await page.getByRole("button", { name: "Excluir conta" }).click()
    const del = page.getByRole("dialog", { name: "Excluir conta definitivamente?" })
    await del.getByLabel(/Digite .* para confirmar/).fill(email)
    await del.getByRole("button", { name: "Excluir tudo" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Modo demonstração")).toBeVisible()
    const r = await page.request.post("/api/auth/login", { data: { email: `aluno-${email}`, password: PASSWORD } })
    expect(r.status()).toBe(401)
  })

  test("entrar, sair e senha errada", async ({ page }, info) => {
    const email = `${unique("l", info.project.name)}@exemplo.com`
    await signup(page, "Lia Personal", email)
    await page.getByRole("button", { name: "Sair" }).first().click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Modo demonstração")).toBeVisible()

    await page.goto("/entrar")
    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-000")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Usuário, e-mail ou senha incorretos." })).toBeVisible()
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL("/studio")
    await expect(page.getByText(email)).toBeVisible()
    // conta nova começa vazia (sem dados da demonstração)
    await page.goto("/studio/alunos")
    await expect(page.getByText("Ana Ribeiro")).toHaveCount(0)
  })

  test("perfil real no diretório recebe pedido de contato de visitante", async ({ page, browser }, info) => {
    const id = unique("d", info.project.name)
    const name = `Personal ${id.replace(/[^a-z0-9]/gi, "")}`
    await signup(page, name, `${id}@exemplo.com`)
    await page.goto("/studio/perfil")
    await page.getByLabel("Cidade", { exact: true }).fill("Natal")
    await page.getByLabel("UF", { exact: true }).fill("RN")
    await page.getByRole("button", { name: "Força", exact: true }).click()
    await page.getByLabel(/Aparecer em “Encontrar personal”/).check()
    const wait = saved(page)
    await page.getByRole("button", { name: "Salvar perfil" }).click()
    await wait

    const ctx = await browser.newContext()
    const v = await ctx.newPage()
    await v.goto(`/personais?q=${encodeURIComponent(name)}`)
    const card = v.getByRole("link", { name: new RegExp(name) })
    await expect(card).toContainText("Profissional cadastrado no EVOFIT")
    await card.click()
    await v.getByLabel("Seu nome").fill("Visitante Real")
    await v.getByLabel("Como prefere ser contatado").fill("visitante@exemplo.com")
    await v.getByLabel(/Autorizo o envio/).check()
    await v.getByRole("button", { name: "Enviar solicitação" }).click()
    await expect(v.getByRole("heading", { name: "Solicitação enviada" })).toBeVisible()
    await ctx.close()

    await page.reload()
    await expect(page.locator("#solicitacoes").getByText("Visitante Real")).toBeVisible()
  })

  test("API recusa acesso sem login e de outra origem", async ({ request }) => {
    expect((await request.get("/api/workspace")).status()).toBe(401)
    expect((await request.patch("/api/workspace", { data: { changes: {} } })).status()).toBe(401)
    expect((await request.post("/api/invites", { data: { studentId: "x" } })).status()).toBe(401)
    const evil = await request.post("/api/auth/login", { data: { email: "a@b.co", password: "12345678" }, headers: { origin: "https://site-malicioso.com" } })
    expect(evil.status()).toBe(403)
    expect((await request.get("/api/invites/codigo-falso")).status()).toBe(404)
  })
})
