import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { PGlite } from "@electric-sql/pglite"
import type Stripe from "stripe"
import type { Db } from "@/lib/server/db"
import { migrate } from "@/lib/server/migrate"
import * as Auth from "@/lib/server/auth"
import * as Billing from "@/lib/server/billing"
import * as Admin from "@/lib/server/admin"
import * as Bot from "@/lib/server/whatsapp-bot"
import * as Sales from "@/lib/server/sales-bot"
import * as Email from "@/lib/server/email"
import { withTenant } from "@/lib/server/db"
import { PLANS } from "@/lib/plans"

let db: Db
async function pglite(): Promise<Db> {
  const pg = await PGlite.create()
  return {
    tx: (fn) =>
      pg.transaction((tx) =>
        fn({
          query: async (text: string, params?: unknown[]) => {
            if (!params?.length && text.includes(";")) {
              const rs = await tx.exec(text)
              return (rs.at(-1) ?? { rows: [] }) as never
            }
            return tx.query(text, params) as never
          },
        }),
      ),
  }
}

/* Stripe falso: guarda o que foi pedido e devolve objetos mínimos. */
const PERIOD_END = Math.floor(Date.UTC(2027, 10, 21) / 1000)
let calls: { sessions: Record<string, unknown>[]; updates: [string, Record<string, unknown>][]; cancels: string[] }
const subs = new Map<string, Record<string, unknown>>()
const fake = {
  customers: { create: async () => ({ id: `cus_${Math.random().toString(36).slice(2, 8)}` }) },
  checkout: { sessions: { create: async (p: Record<string, unknown>) => (calls.sessions.push(p), { url: "https://checkout.stripe.test/s" }) } },
  billingPortal: { sessions: { create: async () => ({ url: "https://billing.stripe.test/p" }) } },
  subscriptions: {
    retrieve: async (id: string) => subs.get(id),
    update: async (id: string, p: Record<string, unknown>) => {
      calls.updates.push([id, p])
      const s = { ...subs.get(id)!, trial_end: p.trial_end, status: "trialing" }
      subs.set(id, s)
      return s
    },
    cancel: async (id: string) => (calls.cancels.push(id), {}),
  },
} as unknown as Stripe

let n = 0
const event = (type: string, object: unknown) => ({ id: `evt_${++n}`, type, data: { object } }) as unknown as Stripe.Event
async function trainer(email: string) {
  const { token } = await Auth.signupTrainer({ name: "Personal Teste", email, password: "senha-segura-1" }, db)
  return (await Auth.accountFromToken(token, db))!
}
const sub = (id: string, customer: string, meta: Record<string, string>) =>
  subs.set(id, { id, customer, status: "active", metadata: meta, items: { data: [{ current_period_end: PERIOD_END }] }, trial_end: null })

beforeAll(async () => {
  db = await pglite()
  await migrate(db)
  Billing.setStripe(fake)
})
beforeEach(() => {
  calls = { sessions: [], updates: [], cancels: [] }
})

describe("cobrança (Stripe)", () => {
  it("conta nova começa no teste grátis de 7 dias", async () => {
    const a = await trainer("teste1@evofit.app")
    const s = await Billing.billingStatus(a, db)
    expect(s.plan).toBeNull()
    expect(s.hasAccess).toBe(true)
    const days = (Date.parse(s.trialEndsAt!) - Date.now()) / 86400_000
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThanOrEqual(7)
  })

  it("abre checkout de assinatura com o preço do plano e ativa pelo webhook", async () => {
    const a = await trainer("mensal@evofit.app")
    const url = await Billing.startCheckout(a, { plan: "inicial" }, "https://app.test", db)
    expect(url).toContain("checkout.stripe.test")
    const p = calls.sessions[0] as { mode: string; customer: string; line_items: { price_data: { unit_amount: number; currency: string; recurring: { interval: string } } }[] }
    expect(p.mode).toBe("subscription")
    expect(p.line_items[0].price_data).toMatchObject({ unit_amount: PLANS.inicial.amount, currency: "brl", recurring: { interval: "month" } })

    sub("sub_m", p.customer, { trainer_id: a.trainerId, plan: "inicial" })
    const done = event("checkout.session.completed", { mode: "subscription", subscription: "sub_m", customer: p.customer, metadata: { trainer_id: a.trainerId, plan: "inicial" } })
    await Billing.handleEvent(done, db)
    await Billing.handleEvent(done, db) // repetido: ignorado
    const s = await Billing.billingStatus(a, db)
    expect(s).toMatchObject({ plan: "inicial", status: "active", hasAccess: true, lifetime: false })
    expect(s.currentPeriodEnd).toBe(new Date(PERIOD_END * 1000).toISOString())

    await expect(Billing.startCheckout(a, { plan: "anual" }, "https://app.test", db)).rejects.toMatchObject({ status: 409 })

    // cancelamento chega pelo webhook
    subs.set("sub_m", { ...subs.get("sub_m")!, status: "canceled" })
    await Billing.handleEvent(event("customer.subscription.deleted", subs.get("sub_m")), db)
    expect((await Billing.billingStatus(a, db)).status).toBe("canceled")
  })

  it("Fundador exige código válido, de uso único, e ganha 3 meses de bônus", async () => {
    const a = await trainer("fundador@evofit.app")
    const b = await trainer("outro@evofit.app")
    await expect(Billing.startCheckout(a, { plan: "fundador" }, "https://app.test", db)).rejects.toMatchObject({ status: 400 })
    await expect(Billing.startCheckout(a, { plan: "fundador", code: "FUNDADOR-NAOEXISTE" }, "https://app.test", db)).rejects.toMatchObject({ status: 400 })

    const [code] = await Billing.createFounderCodes(1, "teste", db)
    expect(code).toMatch(/^FUNDADOR-[A-Z2-9]{6}$/)
    await Billing.startCheckout(a, { plan: "fundador", code: ` ${code.toLowerCase()} ` }, "https://app.test", db)
    const p = calls.sessions[0] as { customer: string; metadata: Record<string, string>; line_items: { price_data: { unit_amount: number; recurring: { interval: string } } }[] }
    expect(p.line_items[0].price_data).toMatchObject({ unit_amount: 39990, recurring: { interval: "year" } })
    // código reservado: outra pessoa não usa
    await expect(Billing.startCheckout(b, { plan: "fundador", code }, "https://app.test", db)).rejects.toMatchObject({ status: 400 })

    sub("sub_f", p.customer, p.metadata)
    await Billing.handleEvent(event("checkout.session.completed", { mode: "subscription", subscription: "sub_f", customer: p.customer, metadata: p.metadata }), db)
    const bonus = new Date(PERIOD_END * 1000)
    bonus.setUTCMonth(bonus.getUTCMonth() + 3)
    expect(calls.updates[0]).toEqual(["sub_f", { trial_end: bonus.getTime() / 1000, proration_behavior: "none" }])
    const s = await Billing.billingStatus(a, db)
    expect(s).toMatchObject({ plan: "fundador", status: "active" })
    expect(s.currentPeriodEnd).toBe(bonus.toISOString())
  })

  it("Vitalício: pagamento único, acesso para sempre e cancela assinatura antiga", async () => {
    const a = await trainer("vitalicio@evofit.app")
    await Billing.startCheckout(a, { plan: "inicial" }, "https://app.test", db)
    const p0 = calls.sessions[0] as { customer: string }
    sub("sub_i", p0.customer, { trainer_id: a.trainerId, plan: "inicial" })
    await Billing.handleEvent(event("checkout.session.completed", { mode: "subscription", subscription: "sub_i", customer: p0.customer, metadata: { trainer_id: a.trainerId, plan: "inicial" } }), db)

    await Billing.startCheckout(a, { plan: "vitalicio" }, "https://app.test", db)
    const p = calls.sessions[1] as { mode: string; line_items: { price_data: { unit_amount: number; recurring?: unknown } }[] }
    expect(p.mode).toBe("payment")
    expect(p.line_items[0].price_data.unit_amount).toBe(89990)
    expect(p.line_items[0].price_data.recurring).toBeUndefined()

    const unpaid = { mode: "payment", payment_status: "unpaid", customer: p0.customer, metadata: { trainer_id: a.trainerId, plan: "vitalicio" } }
    await Billing.handleEvent(event("checkout.session.completed", unpaid), db)
    expect((await Billing.billingStatus(a, db)).lifetime).toBe(false)
    await Billing.handleEvent(event("checkout.session.async_payment_succeeded", { ...unpaid, payment_status: "paid" }), db)
    const s = await Billing.billingStatus(a, db)
    expect(s).toMatchObject({ plan: "vitalicio", lifetime: true, hasAccess: true })
    expect(calls.cancels).toEqual(["sub_i"])
    // evento tardio da assinatura antiga não tira o vitalício
    subs.set("sub_i", { ...subs.get("sub_i")!, status: "canceled" })
    await Billing.handleEvent(event("customer.subscription.deleted", subs.get("sub_i")), db)
    expect(await Billing.billingStatus(a, db)).toMatchObject({ plan: "vitalicio", lifetime: true, status: "active" })
    await expect(Billing.startCheckout(a, { plan: "inicial" }, "https://app.test", db)).rejects.toMatchObject({ status: 409 })
  })

  it("aluno não assina e plano inválido é recusado", async () => {
    const a = await trainer("regras@evofit.app")
    await expect(Billing.startCheckout(a, { plan: "mensal" }, "https://app.test", db)).rejects.toMatchObject({ status: 400 })
    await expect(Billing.startCheckout(a, { plan: "gratis" }, "https://app.test", db)).rejects.toMatchObject({ status: 400 })
    await expect(Billing.billingStatus({ ...a, role: "student", studentId: "x" }, db)).rejects.toMatchObject({ status: 403 })
    await expect(Billing.portalUrl({ ...a, trainerId: "00000000-0000-4000-8000-000000000000" }, "https://app.test", db)).rejects.toMatchObject({ status: 404 })
  })
})

describe("admin central: acesso, Pix e monitoramento", () => {
  const admin = async () => ({ ...(await trainer(`admin${Math.random()}@evofit.app`)), isAdmin: true })

  it("onboarding: conta nova começa sem boas-vindas concluídas", async () => {
    const a = await trainer("onb@evofit.app")
    expect(a.onboarded).toBe(false)
    await Auth.finishOnboarding(a, db)
    const { token } = (await Auth.login({ email: "onb@evofit.app", password: "senha-segura-1" }, db, "iPhone · Safari"))!
    expect((await Auth.accountFromToken(token, db))!.onboarded).toBe(true)
  })

  it("login fica no histórico com o aparelho", async () => {
    const a = await trainer("log@evofit.app")
    await Auth.login({ email: "log@evofit.app", password: "senha-segura-1" }, db, Auth.deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1"))
    const logs = await Admin.recentLogins(a.trainerId, 10, db)
    expect(logs[0]).toMatchObject({ role: "trainer", device: "iPhone · Safari", who: "log@evofit.app" })
    expect(logs.length).toBe(2) // cadastro + login
  })

  it("pedido de Vitalício por Pix: admin confirma e libera para sempre", async () => {
    const a = await trainer("pix@evofit.app")
    const adm = await admin()
    process.env.SALES_WHATSAPP = "55 (21) 99999-0000"
    const r = await Billing.requestLifetime(a, db)
    expect(r.whatsapp).toMatch(/^https:\/\/wa\.me\/5521999990000\?text=/)
    await Billing.requestLifetime(a, db) // não duplica
    const reqs = (await Admin.lifetimeRequests(db)).filter((x) => x.trainerId === a.trainerId)
    expect(reqs).toHaveLength(1)
    await Admin.setLifetimeRequest(adm, reqs[0].id, "pago", db)
    expect(await Billing.billingStatus(a, db)).toMatchObject({ lifetime: true, hasAccess: true, source: "manual" })
    expect((await Admin.lifetimeRequests(db)).find((x) => x.id === reqs[0].id)?.status).toBe("pago")
    await expect(Billing.requestLifetime(a, db)).rejects.toMatchObject({ status: 409 })
    const access = await Admin.accessByTrainer(db)
    expect(access[a.trainerId].state).toBe("vitalicio")
    await Admin.revokeAccess(adm, a.trainerId, db)
    expect((await Billing.billingStatus(a, db)).lifetime).toBe(false)
  })

  it("teste vencido bloqueia; admin estende teste ou libera por dias", async () => {
    const a = await trainer("venceu@evofit.app")
    const adm = await admin()
    await db.tx((q) => q.query("update users set created_at = now() - interval '30 days' where trainer_id = $1", [a.trainerId]))
    expect(await Billing.trainerHasAccess(a.trainerId, db)).toBe(false)
    await Admin.extendTrial(adm, a.trainerId, 5, db)
    const s = await Billing.billingStatus(a, db)
    expect(s.inTrial).toBe(true)
    expect((Date.parse(s.trialEndsAt!) - Date.now()) / 86400_000).toBeGreaterThan(4)
    await db.tx((q) => q.query("update billing set trial_extra_days = 0 where trainer_id = $1", [a.trainerId]))
    expect(await Billing.trainerHasAccess(a.trainerId, db)).toBe(false)
    await Admin.grantAccess(adm, a.trainerId, { kind: "dias", days: 30, plan: "anual", note: "cortesia" }, db)
    const g = await Billing.billingStatus(a, db)
    expect(g).toMatchObject({ hasAccess: true, plan: "anual", source: "manual" })
    expect((await Admin.trainerDetail(a.trainerId, db)).access.state).toBe("liberado")
    await expect(Admin.grantAccess(adm, a.trainerId, { kind: "dias", days: 0 }, db)).rejects.toMatchObject({ status: 400 })
    const stats = Admin.billingOverview(await Admin.accessByTrainer(db), await Admin.loginStats(db))
    expect(stats.manual).toBeGreaterThanOrEqual(1)
  })
})

describe("admin central: equipe e ideias", () => {
  it("adiciona e remove admin; não remove a si mesmo", async () => {
    const me = { ...(await trainer("chefe@evofit.app")), isAdmin: true }
    await db.tx((q) => q.query("update users set is_admin = true where lower(email) = 'chefe@evofit.app'"))
    await trainer("socio@evofit.app")
    await expect(Admin.setAdmin(me, "ninguem@evofit.app", true, db)).rejects.toMatchObject({ status: 404 })
    await Admin.setAdmin(me, "Socio@evofit.app", true, db)
    expect((await Admin.listAdmins(db)).map((a) => a.email)).toEqual(expect.arrayContaining(["chefe@evofit.app", "socio@evofit.app"]))
    await expect(Admin.setAdmin(me, "chefe@evofit.app", false, db)).rejects.toMatchObject({ status: 409 })
    await Admin.setAdmin(me, "socio@evofit.app", false, db)
    expect((await Admin.listAdmins(db)).map((a) => a.email)).not.toContain("socio@evofit.app")
  })

  it("bloco de ideias já vem com ideias de marketing e aceita novas", async () => {
    const me = await trainer("ideias@evofit.app")
    const before = await Admin.listNotes(db)
    expect(before.filter((n) => n.category === "marketing").length).toBeGreaterThanOrEqual(8)
    await Admin.noteAction(me, { op: "add", text: "Live semanal com dicas", category: "marketing" }, db)
    const n = (await Admin.listNotes(db)).find((x) => x.text === "Live semanal com dicas")!
    await Admin.noteAction(me, { op: "toggle", id: n.id }, db)
    expect((await Admin.listNotes(db)).find((x) => x.id === n.id)?.done).toBe(true)
    await Admin.noteAction(me, { op: "delete", id: n.id }, db)
    expect((await Admin.listNotes(db)).find((x) => x.id === n.id)).toBeUndefined()
    await expect(Admin.noteAction(me, { op: "add", text: "" }, db)).rejects.toMatchObject({ status: 400 })
  })
})

describe("robô de WhatsApp (Evolution API)", () => {
  const sent: { url: string; body: { number: string; text: string } }[] = []
  beforeAll(() => {
    Bot.setBotFetch((async (url: string, init: RequestInit) => (sent.push({ url, body: JSON.parse(String(init.body)) }), new Response("{}", { status: 201 }))) as unknown as typeof fetch)
  })

  it("desligado: não envia e não quebra o fluxo", async () => {
    delete process.env.EVOLUTION_API_URL
    expect(await Bot.sendWhatsApp("(21) 99999-0000", "oi", "teste", "", db)).toBe("desligado")
    expect(sent).toHaveLength(0)
    expect(Bot.toE164("21999990000")).toBe("5521999990000")
    expect(Bot.toE164("123")).toBe("")
  })

  it("configurado: envia, registra e não repete lembretes", async () => {
    Object.assign(process.env, { EVOLUTION_API_URL: "https://bot.test/", EVOLUTION_API_KEY: "k", EVOLUTION_INSTANCE: "evofit", ADMIN_WHATSAPP: "21988887777" })
    expect(await Bot.sendWhatsApp("21999990000", "olá", "teste", "x1", db)).toBe("enviado")
    expect(await Bot.sendWhatsApp("21999990000", "olá", "teste", "x1", db)).toBe("repetido")
    expect(sent.at(-1)).toMatchObject({ url: "https://bot.test/message/sendText/evofit", body: { number: "5521999990000", text: "olá" } })
    // novo cadastro avisa a equipe
    await trainer("zap@evofit.app")
    expect(sent.at(-1)?.body.number).toBe("5521988887777")
    expect(sent.at(-1)?.body.text).toContain("zap@evofit.app")
    expect((await Bot.botLog(5, db))[0].to).toBe("•••7777")
  })

  it("lembrete de fim do teste vai uma vez para quem tem WhatsApp no perfil", async () => {
    const a = await trainer("lembrete@evofit.app")
    await withTenant({ role: "trainer", trainerId: a.trainerId }, (q) => q.query("update trainers set whatsapp = '21977776666' where id = $1", [a.trainerId]), db)
    await db.tx((q) => q.query("update users set created_at = now() - interval '6 days' where trainer_id = $1", [a.trainerId]))
    const before = sent.length
    await Bot.trialReminders(db)
    const mine = sent.slice(before).filter((m) => m.body.number === "5521977776666")
    expect(mine).toHaveLength(1)
    expect(mine[0].body.text).toContain("acaba em 1 dia")
    await Bot.trialReminders(db)
    expect(sent.filter((m) => m.body.number === "5521977776666")).toHaveLength(1)
  })
})

describe("vendedor automático no WhatsApp", () => {
  const out: { number: string; text: string }[] = []
  beforeAll(() => {
    Object.assign(process.env, { EVOLUTION_API_URL: "https://bot.test", EVOLUTION_API_KEY: "k", EVOLUTION_INSTANCE: "evofit", ADMIN_WHATSAPP: "21988887777", SITE_URL: "https://evofit.test" })
    Bot.setBotFetch((async (_u: string, init: RequestInit) => (out.push(JSON.parse(String(init.body))), new Response("{}", { status: 201 }))) as unknown as typeof fetch)
  })
  const last = (n: string) => (out.filter((m) => m.number === n).at(-1)?.text ?? "").replace(/\u00a0/g, " ")

  it("entende o que a pessoa quer", () => {
    expect(Sales.intentOf("Quanto custa?")).toBe("planos")
    expect(Sales.intentOf("2")).toBe("planos")
    expect(Sales.intentOf("quero testar")).toBe("teste")
    expect(Sales.intentOf("tem vitalício no pix?")).toBe("vitalicio")
    expect(Sales.intentOf("uso o MFIT hoje")).toBe("migrar")
    expect(Sales.intentOf("quero falar com atendente")).toBe("humano")
    expect(Sales.intentOf("Olá, bom dia")).toBe("menu")
    expect(Sales.intentOf("asdfgh")).toBe("desconhecido")
  })

  it("conversa: apresenta, mostra planos, leva ao cadastro e avisa a equipe no Vitalício", async () => {
    const n = "5521911112222"
    expect(await Sales.handleIncoming({ number: n, name: "Carla Souza", text: "oi, vi o evofit", fromMe: false }, db)).toBe("respondida")
    expect(last(n)).toContain("Oi, Carla")
    expect(last(n)).toContain("1️⃣")
    await db.tx((q) => q.query("update whatsapp_leads set last_out_at = now() - interval '1 minute' where number = $1", [n]))
    await Sales.handleIncoming({ number: n, name: "Carla Souza", text: "2", fromMe: false }, db)
    expect(last(n)).toContain("R$ 49,90")
    expect(last(n)).toContain("https://evofit.test/criar-conta")
    await db.tx((q) => q.query("update whatsapp_leads set last_out_at = now() - interval '1 minute' where number = $1", [n]))
    await Sales.handleIncoming({ number: n, name: "Carla Souza", text: "quero o vitalicio", fromMe: false }, db)
    expect(last(n)).toContain("R$ 899,90")
    expect(last("5521988887777")).toContain("Lead quer o *Vitalício*")
    expect((await Sales.listLeads(10, db)).find((l) => l.number === n)).toMatchObject({ stage: "vitalicio", messages: 3 })
  })

  it("para de responder quando a equipe assume, e o eco do robô não conta", async () => {
    const n = "5521933334444"
    await Sales.handleIncoming({ number: n, name: "Leo", text: "oi", fromMe: false }, db)
    const bot = last(n)
    expect(await Sales.handleIncoming({ number: n, name: "", text: bot, fromMe: true }, db)).toBe("ignorada")
    expect(await Sales.handleIncoming({ number: n, name: "", text: "Fala Leo, aqui é o Marcus!", fromMe: true }, db)).toBe("humano_assumiu")
    expect(await Sales.handleIncoming({ number: n, name: "Leo", text: "2", fromMe: false }, db)).toBe("pausado")
    await Sales.setLeadPaused(n, false, db)
    await db.tx((q) => q.query("update whatsapp_leads set last_out_at = now() - interval '1 minute' where number = $1", [n]))
    expect(await Sales.handleIncoming({ number: n, name: "Leo", text: "2", fromMe: false }, db)).toBe("respondida")
  })

  it("lê o webhook da Evolution API e ignora grupos e mensagens antigas", () => {
    const m = Sales.parseEvolution({ event: "messages.upsert", data: { key: { remoteJid: "5521955556666@s.whatsapp.net", fromMe: false }, pushName: "Ana", message: { conversation: "preço?" }, messageTimestamp: 1 } })
    expect(m).toMatchObject({ number: "5521955556666", name: "Ana", text: "preço?", fromMe: false })
    expect(Sales.parseEvolution({ event: "messages.upsert", data: { key: { remoteJid: "123@g.us" }, message: { conversation: "x" } } })).toBeNull()
    expect(Sales.parseEvolution({ event: "connection.update", data: {} })).toBeNull()
  })
})

describe("exclusão de conta com assinatura", () => {
  it("cancela a assinatura no Stripe antes de apagar a conta", async () => {
    const a = await trainer("apagar@evofit.app")
    await Billing.startCheckout(a, { plan: "inicial" }, "https://app.test", db)
    const p = calls.sessions.at(-1) as { customer: string }
    sub("sub_del", p.customer, { trainer_id: a.trainerId, plan: "inicial" })
    await Billing.handleEvent(event("checkout.session.completed", { mode: "subscription", subscription: "sub_del", customer: p.customer, metadata: { trainer_id: a.trainerId, plan: "inicial" } }), db)
    calls.cancels = []
    await Auth.deleteAccount(a, db)
    expect(calls.cancels).toEqual(["sub_del"])
    expect((await db.tx((q) => q.query("select 1 from billing where trainer_id = $1", [a.trainerId]))).rows).toHaveLength(0)
    expect(await Auth.accountFromToken("x", db)).toBeNull()
  })
})

describe("esqueci minha senha (e-mail)", () => {
  const mails: { to: string[]; text: string }[] = []
  it("sem e-mail configurado, orienta o suporte", async () => {
    delete process.env.RESEND_API_KEY
    expect(await Auth.requestPasswordReset("x@y.com", "https://app.test", db)).toEqual({ emailEnabled: false })
  })
  it("manda o link, cria a nova senha uma vez e derruba as sessões antigas", async () => {
    Object.assign(process.env, { RESEND_API_KEY: "re_x", EMAIL_FROM: "EVOFIT <a@evofit.test>" })
    Email.setEmailFetch((async (_u: string, init: RequestInit) => (mails.push(JSON.parse(String(init.body))), new Response("{}"))) as unknown as typeof fetch)
    await trainer("reset@evofit.app")
    const old = (await Auth.login({ email: "reset@evofit.app", password: "senha-segura-1" }, db))!.token
    expect(await Auth.requestPasswordReset("ninguem@evofit.app", "https://app.test", db)).toEqual({ emailEnabled: true })
    expect(mails).toHaveLength(0)
    await Auth.requestPasswordReset("Reset@evofit.app", "https://app.test", db)
    expect(mails[0].to).toEqual(["reset@evofit.app"])
    const token = decodeURIComponent(mails[0].text.match(/token=([^\s]+)/)![1])
    await expect(Auth.resetPassword(token, "curta", db)).rejects.toMatchObject({ status: 400 })
    const r = await Auth.resetPassword(token, "nova-senha-123", db)
    expect(await Auth.accountFromToken(r.token, db)).not.toBeNull()
    expect(await Auth.accountFromToken(old, db)).toBeNull()
    expect(await Auth.login({ email: "reset@evofit.app", password: "nova-senha-123" }, db)).not.toBeNull()
    await expect(Auth.resetPassword(token, "outra-senha-123", db)).rejects.toMatchObject({ status: 400 })
  })
})
