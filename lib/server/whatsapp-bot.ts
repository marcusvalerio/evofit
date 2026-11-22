import { getDb, withTenant, type Db } from "./db"
import { computeStatus } from "./billing"
import { EMAILS, sendLifecycleEmail } from "./email"

/**
 * Mensagens automáticas de WhatsApp pela Evolution API (código aberto, roda num servidor seu).
 * Variáveis: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE.
 * Para quem recebe os avisos da equipe: ADMIN_WHATSAPP (se vazio, usa SALES_WHATSAPP).
 *
 * Sem as variáveis, nada é enviado e nada quebra: o registro mostra "desligado".
 * Atenção: conectar um WhatsApp comum por QR Code não é oficial; o número pode ser bloqueado pelo WhatsApp.
 */

export const botConfigured = () => !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE)
export const adminNumber = () => (process.env.ADMIN_WHATSAPP || process.env.SALES_WHATSAPP || "").replace(/\D/g, "")

/** Só dígitos, com 55. Aceita "(21) 99999-0000" e "5521999990000". */
export function toE164(raw: string) {
  const d = raw.replace(/\D/g, "")
  if (d.length === 10 || d.length === 11) return `55${d}`
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d
  return ""
}

type Fetch = typeof fetch
let fetcher: Fetch = (...a) => fetch(...a)
/** Os testes injetam um fetch falso. */
export function setBotFetch(f: Fetch | null) {
  fetcher = f ?? ((...a) => fetch(...a))
}

/**
 * Envia uma mensagem. Nunca lança erro (o fluxo principal não pode parar por causa do WhatsApp).
 * Com `ref`, a mesma mensagem (kind + ref) só é enviada uma vez.
 */
export async function sendWhatsApp(to: string, text: string, kind: string, ref = "", db: Db = getDb()): Promise<"enviado" | "erro" | "desligado" | "repetido" | "sem_numero"> {
  const number = toE164(to)
  if (!number) return "sem_numero"
  try {
    if (ref) {
      const dup = await db.tx((q) => q.query("select 1 from whatsapp_log where kind = $1 and ref = $2 and status = 'enviado'", [kind, ref]))
      if (dup.rows.length) return "repetido"
    }
    let status: "enviado" | "erro" | "desligado" = "desligado"
    let error = ""
    if (botConfigured()) {
      const base = process.env.EVOLUTION_API_URL!.replace(/\/+$/, "")
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      try {
        const r = await fetcher(`${base}/message/sendText/${encodeURIComponent(process.env.EVOLUTION_INSTANCE!)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
          body: JSON.stringify({ number, text }),
          signal: ctrl.signal,
        })
        status = r.ok ? "enviado" : "erro"
        if (!r.ok) error = `HTTP ${r.status}`
      } catch (e) {
        status = "erro"
        error = e instanceof Error ? e.message.slice(0, 200) : "falha"
      } finally {
        clearTimeout(timer)
      }
    }
    await db.tx((q) =>
      q.query("insert into whatsapp_log (to_number, kind, ref, status, error) values ($1, $2, $3, $4, $5) on conflict do nothing", [number, kind.slice(0, 40), ref.slice(0, 80), status, error]),
    )
    return status
  } catch {
    return "erro"
  }
}

/** Aviso para a equipe (número em ADMIN_WHATSAPP / SALES_WHATSAPP). */
export const notifyAdmin = (text: string, kind: string, ref = "", db?: Db) => sendWhatsApp(adminNumber(), text, kind, ref, db)

export interface BotLog {
  at: string
  to: string
  kind: string
  status: string
  error: string
}
export async function botLog(limit = 30, db: Db = getDb()): Promise<BotLog[]> {
  const r = await db.tx((q) => q.query<Record<string, unknown>>("select * from whatsapp_log order by created_at desc limit $1", [limit]))
  // mostra só o final do número
  return r.rows.map((x) => ({ at: new Date(x.created_at as string).toISOString(), to: `•••${String(x.to_number).slice(-4)}`, kind: String(x.kind), status: String(x.status), error: String(x.error) }))
}

export const MSG = {
  lifetimeRequest: (email: string) => `🔔 *EVOFIT* · Novo pedido de Vitalício\nConta: ${email}\nQuando o Pix cair, confirme no admin.`,
  lifetimeGranted: (name: string) => `✅ Olá, ${name}! Seu plano *Vitalício* do EVOFIT está liberado. Obrigado pela confiança! 💪`,
  newSubscription: (email: string, plan: string) => `💰 *EVOFIT* · Nova assinatura: ${plan}\nConta: ${email}`,
  paymentFailed: (email: string) => `⚠️ *EVOFIT* · Pagamento pendente\nConta: ${email}`,
  newSignup: (name: string, email: string) => `🆕 *EVOFIT* · Novo personal cadastrado\n${name} (${email})`,
  welcome: (name: string) => `Olá, ${name}! 👋 Bem-vindo(a) ao *EVOFIT*. Seus 7 dias grátis já começaram: cadastre seus alunos, monte as fichas e libere o app pra eles. Qualquer dúvida, é só responder aqui.`,
  trialEnding: (name: string, days: number) => `Oi, ${name}! Seu teste grátis do *EVOFIT* acaba em ${days} dia${days > 1 ? "s" : ""}. Pra continuar sem perder nada, escolha seu plano em Studio → Plano. 💪`,
  trialEnded: (name: string) => `Oi, ${name}! Seu teste grátis do *EVOFIT* terminou. Seus dados e os dos seus alunos estão guardados: escolha um plano em Studio → Plano pra voltar a usar.`,
}

/* ---------- Dados do personal para as mensagens ---------- */


export async function trainerContact(trainerId: string, db: Db = getDb()) {
  const t = (await withTenant({ role: "trainer", trainerId }, (q) => q.query<{ name: string; whatsapp: string }>("select name, whatsapp from trainers where id = $1", [trainerId]), db)).rows[0]
  const u = (await db.tx((q) => q.query<{ email: string | null }>("select email from users where trainer_id = $1 and role = 'trainer' limit 1", [trainerId]))).rows[0]
  return { name: (t?.name ?? "").split(" ")[0] || "personal", fullName: t?.name ?? "", whatsapp: t?.whatsapp ?? "", email: u?.email ?? "" }
}

/** Lembretes diários do teste grátis (rodado pelo cron). Cada lembrete sai uma vez só. */
export async function trialReminders(db: Db = getDb(), now = Date.now()) {
  const rows = (
    await db.tx((q) =>
      q.query<Record<string, unknown>>(`select u.trainer_id, u.created_at, to_jsonb(b) as b
        from (select trainer_id, min(created_at) as created_at, bool_or(is_admin) as adm, bool_or(disabled_at is not null) as off from users where role = 'trainer' group by trainer_id) u
        left join billing b on b.trainer_id = u.trainer_id where not u.adm and not u.off`),
    )
  ).rows
  let sent = 0
  for (const r of rows) {
    const st = computeStatus((r.b as Record<string, unknown>) ?? undefined, r.created_at, now)
    const paid = st.lifetime || st.status === "active" || st.status === "past_due" || (st.source === "manual" && st.hasAccess && !st.inTrial)
    if (paid || !st.trialEndsAt) continue
    const left = (Date.parse(st.trialEndsAt) - now) / 86400_000
    const id = String(r.trainer_id)
    const ending = left > 0 && left <= 2
    if (!ending && !(left <= 0 && left > -2)) continue
    const c = await trainerContact(id, db)
    const kind = ending ? "teste_acabando" : "teste_acabou"
    const ref = `${id}:${st.trialEndsAt.slice(0, 10)}`
    if (c.whatsapp && (await sendWhatsApp(c.whatsapp, ending ? MSG.trialEnding(c.name, Math.ceil(left)) : MSG.trialEnded(c.name), kind, ref, db)) === "enviado") sent++
    if (c.email && (await sendLifecycleEmail(c.email, kind, ending ? EMAILS.trialEnding(c.name, Math.ceil(left)) : EMAILS.trialEnded(c.name), ref, db)) === "enviado") sent++
  }
  return { checked: rows.length, sent }
}
