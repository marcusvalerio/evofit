import { createHash } from "node:crypto"
import Stripe from "stripe"
import { PLANS, TRIAL_DAYS, isPlanId, type BillingStatus } from "../plans"
import type { Account } from "./auth"
import { getDb, type Db, type Queryable } from "./db"
import { HttpError } from "./workspace"
import { MSG, notifyAdmin } from "./whatsapp-bot"

/**
 * Cobrança com Stripe Checkout (assinaturas e pagamento único) e portal do cliente.
 * Os preços vêm de lib/plans.ts (price_data), então não é preciso cadastrar produtos no Stripe.
 * Variáveis: STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET.
 */

let client: Stripe | null = null
/** Os testes injetam um cliente falso. */
export function setStripe(s: Stripe | null) {
  client = s
}
export const stripeReady = () => !!client || !!process.env.STRIPE_SECRET_KEY
function stripe(): Stripe {
  if (client) return client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new HttpError(503, "Pagamentos ainda não estão configurados.")
  client = new Stripe(key)
  return client
}

export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "")
export const hashCode = (c: string) => createHash("sha256").update(normalizeCode(c)).digest("hex")

type Row = Record<string, unknown>
const asIso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)

function requireTrainer(a: Account) {
  if (a.role !== "trainer") throw new HttpError(403, "Só o personal assina o EVOFIT.")
}

/* ---------- Status ---------- */

export async function billingStatus(a: Account, db: Db = getDb()): Promise<BillingStatus> {
  requireTrainer(a)
  return db.tx((q) => statusFor(q, a.trainerId))
}

/** Situação de cobrança de um personal (usada também pelo admin e pelo bloqueio de acesso). */
export async function statusFor(q: Queryable, trainerId: string): Promise<BillingStatus> {
  const b = (await q.query<Row>("select * from billing where trainer_id = $1", [trainerId])).rows[0]
  const u = (await q.query<Row>("select min(created_at) as created_at from users where trainer_id = $1 and role = 'trainer'", [trainerId])).rows[0]
  return computeStatus(b, u?.created_at)
}

/** Regra de acesso a partir da linha de billing e da data de cadastro (sem consultar o banco). */
export function computeStatus(b: Row | undefined, createdAt: unknown, now = Date.now()): BillingStatus {
  const extra = Number(b?.trial_extra_days ?? 0)
  const trialEnd = createdAt ? new Date(new Date(createdAt as string).getTime() + (TRIAL_DAYS + extra) * 86400_000) : null
  const status = (b?.status as BillingStatus["status"]) ?? "none"
  const lifetime = !!b?.lifetime
  const periodEnd = asIso(b?.current_period_end)
  const manualUntil = asIso(b?.manual_until)
  const inTrial = !!trialEnd && trialEnd.getTime() > now
  const manual = b?.source === "manual" && !!manualUntil && Date.parse(manualUntil) > now
  const paid = lifetime || manual || status === "active" || status === "past_due" || (status === "canceled" && !!periodEnd && Date.parse(periodEnd) > now)
  return {
    plan: isPlanId(b?.plan) ? b.plan : null,
    status,
    lifetime,
    source: b?.source === "manual" ? "manual" : "stripe",
    currentPeriodEnd: b?.source === "manual" ? manualUntil : periodEnd,
    trialEndsAt: trialEnd?.toISOString() ?? null,
    inTrial,
    hasAccess: paid || inTrial,
    stripeReady: stripeReady(),
  }
}

/** O personal pode usar o Studio? Admins sempre podem. */
export async function trainerHasAccess(trainerId: string, db: Db = getDb()) {
  return db.tx(async (q) => (await statusFor(q, trainerId)).hasAccess)
}

/* ---------- Checkout ---------- */

async function customerFor(q: Queryable, a: Account): Promise<string> {
  const row = (await q.query<Row>("select stripe_customer_id from billing where trainer_id = $1", [a.trainerId])).rows[0]
  if (row?.stripe_customer_id) return String(row.stripe_customer_id)
  const c = await stripe().customers.create({ email: a.email.includes("@") ? a.email : undefined, metadata: { app: "evofit", trainer_id: a.trainerId } })
  await q.query(
    `insert into billing (trainer_id, stripe_customer_id) values ($1, $2)
     on conflict (trainer_id) do update set stripe_customer_id = coalesce(billing.stripe_customer_id, excluded.stripe_customer_id), updated_at = now()`,
    [a.trainerId, c.id],
  )
  return c.id
}

export async function startCheckout(a: Account, input: { plan: unknown; code?: unknown }, origin: string, db: Db = getDb()) {
  requireTrainer(a)
  if (!isPlanId(input.plan) || input.plan === "mensal") throw new HttpError(400, "Plano inválido.")
  const plan = PLANS[input.plan]
  const s = stripe()
  return db.tx(async (q) => {
    const cur = (await q.query<Row>("select * from billing where trainer_id = $1 for update", [a.trainerId])).rows[0]
    if (cur?.lifetime) throw new HttpError(409, "Você já tem o plano Vitalício.")
    if (plan.interval && (cur?.status === "active" || cur?.status === "past_due") && cur?.stripe_subscription_id)
      throw new HttpError(409, "Você já tem uma assinatura. Use “Gerenciar assinatura” para trocar de plano.")

    let codeHash: string | null = null
    if (plan.needsCode) {
      if (typeof input.code !== "string" || !normalizeCode(input.code)) throw Object.assign(new HttpError(400, "Informe o código Fundador."), { fields: { code: "Informe o código Fundador." } })
      codeHash = hashCode(input.code)
      const c = (await q.query<Row>("select * from founder_codes where code_hash = $1 for update", [codeHash])).rows[0]
      if (!c || (c.used_by && c.used_by !== a.trainerId)) throw Object.assign(new HttpError(400, "Código Fundador inválido ou já usado."), { fields: { code: "Código inválido ou já usado." } })
      if (c.reserved_by && c.reserved_by !== a.trainerId) throw Object.assign(new HttpError(400, "Código Fundador inválido ou já usado."), { fields: { code: "Código inválido ou já usado." } })
      await q.query("update founder_codes set reserved_by = $2 where code_hash = $1", [codeHash, a.trainerId])
    }

    const customer = await customerFor(q, a)
    const metadata: Record<string, string> = { app: "evofit", trainer_id: a.trainerId, plan: plan.id }
    if (codeHash) metadata.code_hash = codeHash
    const product_data = { name: `EVOFIT ${plan.name}` }
    const base = {
      customer,
      client_reference_id: a.trainerId,
      metadata,
      locale: "pt-BR" as const,
      success_url: `${origin}/studio/plano?status=ok`,
      cancel_url: `${origin}/studio/plano?status=cancelado`,
    }
    const session = plan.interval
      ? await s.checkout.sessions.create({
          ...base,
          mode: "subscription",
          line_items: [{ quantity: 1, price_data: { currency: "brl", unit_amount: plan.amount, recurring: { interval: plan.interval }, product_data } }],
          subscription_data: { metadata },
        })
      : await s.checkout.sessions.create({
          ...base,
          mode: "payment",
          line_items: [{ quantity: 1, price_data: { currency: "brl", unit_amount: plan.amount, product_data } }],
          payment_intent_data: { metadata, statement_descriptor_suffix: "EVOFIT" },
        })
    if (!session.url) throw new HttpError(502, "Não foi possível abrir o pagamento.")
    return session.url
  })
}

export async function portalUrl(a: Account, origin: string, db: Db = getDb()) {
  requireTrainer(a)
  const row = await db.tx(async (q) => (await q.query<Row>("select stripe_customer_id from billing where trainer_id = $1", [a.trainerId])).rows[0])
  if (!row?.stripe_customer_id) throw new HttpError(404, "Nenhuma assinatura encontrada.")
  const p = await stripe().billingPortal.sessions.create({
    customer: String(row.stripe_customer_id),
    return_url: `${origin}/studio/plano`,
    // configuração própria do EVOFIT (a conta Stripe é compartilhada com outro produto)
    ...(process.env.STRIPE_PORTAL_CONFIG ? { configuration: process.env.STRIPE_PORTAL_CONFIG } : {}),
  })
  return p.url
}

/* ---------- Webhook ---------- */

export function parseEvent(body: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new HttpError(503, "Webhook do Stripe não configurado.")
  if (!signature) throw new HttpError(400, "Assinatura ausente.")
  try {
    return stripe().webhooks.constructEvent(body, signature, secret)
  } catch {
    throw new HttpError(400, "Assinatura inválida.")
  }
}

const mapStatus = (s: Stripe.Subscription.Status): BillingStatus["status"] | null =>
  s === "active" || s === "trialing" ? "active" : s === "past_due" || s === "unpaid" ? "past_due" : s === "canceled" || s === "incomplete_expired" ? "canceled" : null

/** Fim do período atual (a API nova guarda nos itens; a antiga, na assinatura). */
function periodEnd(sub: Stripe.Subscription): number | null {
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  const end = item?.current_period_end ?? legacy
  return sub.trial_end && (!end || sub.trial_end > end) ? sub.trial_end : end ?? null
}

const addMonths = (unix: number, m: number) => {
  const d = new Date(unix * 1000)
  d.setUTCMonth(d.getUTCMonth() + m)
  return Math.floor(d.getTime() / 1000)
}

async function trainerFor(q: Queryable, meta: Stripe.Metadata | null | undefined, customer: unknown) {
  if (meta?.trainer_id) return meta.trainer_id
  const id = typeof customer === "string" ? customer : (customer as { id?: string } | null)?.id
  if (!id) return null
  const r = (await q.query<Row>("select trainer_id from billing where stripe_customer_id = $1", [id])).rows[0]
  return r ? String(r.trainer_id) : null
}

async function saveSubscription(q: Queryable, trainerId: string, sub: Stripe.Subscription, plan?: string) {
  const status = mapStatus(sub.status)
  if (!status) return
  const end = periodEnd(sub)
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  await q.query(
    `insert into billing (trainer_id, stripe_customer_id, plan, status, stripe_subscription_id, current_period_end)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (trainer_id) do update set
       stripe_customer_id = coalesce(billing.stripe_customer_id, excluded.stripe_customer_id),
       plan = case when billing.lifetime then billing.plan else coalesce(excluded.plan, billing.plan) end,
       status = case when billing.lifetime then 'active' else excluded.status end,
       stripe_subscription_id = excluded.stripe_subscription_id,
       source = case when billing.lifetime then billing.source else 'stripe' end,
       current_period_end = excluded.current_period_end,
       updated_at = now()`,
    [trainerId, customer, isPlanId(plan) ? plan : isPlanId(sub.metadata?.plan) ? sub.metadata.plan : null, status, sub.id, end ? new Date(end * 1000) : null],
  )
}

/** Processa um evento do Stripe. Idempotente: eventos repetidos são ignorados. */
export async function handleEvent(event: Stripe.Event, db: Db = getDb()) {
  const s = stripe()
  let notice: { kind: "nova_assinatura" | "pagamento_pendente"; trainerId: string; plan?: string; ref?: string } | null = null
  await db.tx(async (q) => {
    const fresh = await q.query("insert into stripe_events (id) values ($1) on conflict do nothing returning id", [event.id])
    if (!fresh.rows.length) return

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const cs = event.data.object as Stripe.Checkout.Session
      const trainerId = await trainerFor(q, cs.metadata, cs.customer)
      if (!trainerId) return
      if (cs.mode === "payment") {
        if (cs.payment_status !== "paid") return
        await q.query(
          `insert into billing (trainer_id, stripe_customer_id, plan, status, lifetime) values ($1, $2, 'vitalicio', 'active', true)
           on conflict (trainer_id) do update set plan = 'vitalicio', status = 'active', lifetime = true, updated_at = now()`,
          [trainerId, typeof cs.customer === "string" ? cs.customer : cs.customer?.id ?? null],
        )
        // quem tinha assinatura não deve continuar pagando
        const old = (await q.query<Row>("select stripe_subscription_id from billing where trainer_id = $1", [trainerId])).rows[0]
        if (old?.stripe_subscription_id) await s.subscriptions.cancel(String(old.stripe_subscription_id)).catch(() => {})
        notice = { kind: "nova_assinatura", trainerId, plan: "vitalicio" }
        return
      }
      if (cs.mode !== "subscription" || !cs.subscription) return
      let sub = await s.subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id)
      const plan = cs.metadata?.plan
      if (plan === "fundador" && cs.metadata?.code_hash) {
        await q.query("update founder_codes set used_by = $2, used_at = now() where code_hash = $1 and used_by is null", [cs.metadata.code_hash, trainerId])
        // bônus: empurra a próxima cobrança em 3 meses, sem cobrar a diferença
        const end = periodEnd(sub)
        if (end) sub = await s.subscriptions.update(sub.id, { trial_end: addMonths(end, PLANS.fundador.bonusMonths ?? 0), proration_behavior: "none" })
      }
      await saveSubscription(q, trainerId, sub, plan)
      notice = { kind: "nova_assinatura", trainerId, plan }
      return
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted" || event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription
      const trainerId = await trainerFor(q, sub.metadata, sub.customer)
      if (!trainerId) return
      // ignora eventos de uma assinatura antiga substituída por outra
      const cur = (await q.query<Row>("select stripe_subscription_id from billing where trainer_id = $1", [trainerId])).rows[0]
      if (cur?.stripe_subscription_id && cur.stripe_subscription_id !== sub.id && event.type !== "customer.subscription.created") return
      await saveSubscription(q, trainerId, sub)
      if (mapStatus(sub.status) === "past_due") notice = { kind: "pagamento_pendente", trainerId, ref: `${sub.id}:${periodEnd(sub) ?? ""}` }
    }
  })
  if (notice) {
    const n = notice as { kind: "nova_assinatura" | "pagamento_pendente"; trainerId: string; plan?: string; ref?: string }
    const u = await db.tx((q) => q.query<{ email: string | null }>("select email from users where trainer_id = $1 and role = 'trainer' limit 1", [n.trainerId]))
    const email = u.rows[0]?.email ?? n.trainerId
    if (n.kind === "nova_assinatura") await notifyAdmin(MSG.newSubscription(email, isPlanId(n.plan) ? PLANS[n.plan].name : "assinatura"), n.kind, "", db)
    else await notifyAdmin(MSG.paymentFailed(email), n.kind, n.ref ?? "", db)
  }
}

/** Gera códigos Fundador (mostra o texto só uma vez; o banco guarda o hash). */
export async function createFounderCodes(n: number, label = "", db: Db = getDb()) {
  const { randomBytes } = await import("node:crypto")
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const codes: string[] = []
  await db.tx(async (q) => {
    for (let i = 0; i < n; i++) {
      const raw = [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("")
      const code = `FUNDADOR-${raw}`
      await q.query("insert into founder_codes (code_hash, label) values ($1, $2)", [hashCode(code), label])
      codes.push(code)
    }
  })
  return codes
}

/* ---------- Vitalício por Pix (direto com a equipe) ---------- */

/**
 * Registra o pedido de Vitalício e devolve o link de WhatsApp da equipe (SALES_WHATSAPP, só dígitos
 * com DDI e DDD). O admin confirma o Pix no painel e libera o acesso.
 */
export async function requestLifetime(a: Account, db: Db = getDb()) {
  requireTrainer(a)
  const phone = (process.env.SALES_WHATSAPP ?? "").replace(/\D/g, "")
  await db.tx(async (q): Promise<boolean> => {
    const b = (await q.query<Row>("select lifetime from billing where trainer_id = $1", [a.trainerId])).rows[0]
    if (b?.lifetime) throw new HttpError(409, "Você já tem o plano Vitalício.")
    const open = await q.query("select 1 from lifetime_requests where trainer_id = $1 and status = 'pendente'", [a.trainerId])
    if (open.rows.length) return false
    await q.query("insert into lifetime_requests (trainer_id) values ($1)", [a.trainerId])
    return true
  }).then(async (isNew) => {
    if (isNew) await notifyAdmin(MSG.lifetimeRequest(a.email), "pedido_vitalicio", "", db)
  })
  const msg = `Olá! Quero o plano Vitalício do EVOFIT (${(PLANS.vitalicio.amount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) pagando por Pix. Minha conta: ${a.email}`
  return { whatsapp: phone.length >= 10 ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : null }
}

/**
 * Exclusão de conta: cancela na hora a assinatura do Stripe (se houver) para a pessoa não continuar
 * sendo cobrada. Se o cancelamento falhar, a exclusão é interrompida.
 */
export async function cancelBillingForDeletion(trainerId: string, db: Db = getDb()) {
  const b = (await db.tx((q) => q.query<Row>("select stripe_subscription_id, status from billing where trainer_id = $1", [trainerId]))).rows[0]
  const sub = b?.stripe_subscription_id ? String(b.stripe_subscription_id) : null
  if (sub && b?.status !== "canceled") {
    try {
      await stripe().subscriptions.cancel(sub)
    } catch (e) {
      // já cancelada no Stripe: segue
      const code = (e as { code?: string; statusCode?: number })?.code
      if (code !== "resource_missing") throw new HttpError(502, "Não foi possível cancelar sua assinatura agora. Tente de novo em alguns minutos ou fale com o suporte.")
    }
  }
  await db.tx((q) => q.query("delete from billing where trainer_id = $1", [trainerId]))
}
