import { getDb, type Db } from "./db"
import { notifyAdmin, sendWhatsApp } from "./whatsapp-bot"
import { PLANS, brl } from "../plans"

/**
 * Vendedor automático no WhatsApp: responde quem pergunta sobre o EVOFIT, apresenta o sistema,
 * os planos e leva para o cadastro. Respostas prontas (sem IA, sem custo).
 *
 * - Para de responder quando a equipe responde manualmente (pausa de 12 h) ou quando o lead pede um humano (24 h).
 * - Avisa a equipe quando o lead está quente (quer o Vitalício ou pediu atendimento).
 */

export const siteUrl = () => (process.env.SITE_URL || "https://evofit-pi.vercel.app").replace(/\/+$/, "")
const signup = () => `${siteUrl()}/criar-conta`

export type Intent = "menu" | "sistema" | "planos" | "teste" | "vitalicio" | "humano" | "aluno" | "migrar" | "obrigado" | "desconhecido"

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/** Entende o que a pessoa quer pela mensagem (número do menu ou palavras-chave). */
export function intentOf(text: string): Intent {
  const t = norm(text)
  if (!t) return "desconhecido"
  const n = t.match(/^([1-5])\b/)
  if (n) return (["sistema", "planos", "teste", "vitalicio", "humano"] as const)[Number(n[1]) - 1]
  const has = (...w: string[]) => w.some((x) => new RegExp(`\\b${x}`).test(t))
  if (has("humano", "atendente", "pessoa", "falar com", "marcus", "ligar", "ligacao")) return "humano"
  if (has("vitalic", "pix", "pagar uma vez", "pra sempre", "para sempre")) return "vitalicio"
  if (has("preco", "valor", "quanto", "plano", "mensalidade", "custa", "assinatura", "anual", "fundador", "desconto", "cupom")) return "planos"
  if (has("teste", "testar", "gratis", "cadastr", "criar conta", "comecar", "quero", "link", "acesso", "experimentar")) return "teste"
  if (has("mfit", "outro app", "migrar", "importar", "trocar de app", "uso outro")) return "migrar"
  if (has("aluno")) return "aluno"
  if (has("como funciona", "funciona", "o que e", "recurso", "o que faz", "sistema", "video", "diferencial")) return "sistema"
  if (has("obrigad", "valeu", "show", "top", "beleza", "ok")) return "obrigado"
  if (has("oi", "ola", "bom dia", "boa tarde", "boa noite", "eai", "e ai", "info", "informac", "duvida", "saber mais")) return "menu"
  return "desconhecido"
}

const MENU = `Me diz o que você quer saber, é só responder com o número:
1️⃣ O que o EVOFIT faz
2️⃣ Planos e valores
3️⃣ Quero testar grátis agora
4️⃣ Plano Vitalício (pague uma vez)
5️⃣ Falar com a equipe`

/** Texto da resposta para cada intenção. */
export function replyFor(intent: Intent, name: string, first: boolean): string {
  const oi = name ? `, ${name.split(" ")[0]}` : ""
  switch (intent) {
    case "sistema":
      return `O *EVOFIT* é o sistema completo do personal trainer 💪

✅ *Radar de evasão*: mostra quais alunos estão sumindo e quanto de mensalidade está em risco
✅ *Avaliação física* com % de gordura e massa magra calculados na hora
✅ *Fichas* com mapa de equilíbrio muscular e *876 exercícios* demonstrados (com o seu vídeo)
✅ *Financeiro*: mensalidades e lembrete de cobrança pelo WhatsApp
✅ *App do aluno* grátis, pelo celular, sem baixar nada
✅ Seu perfil na busca de personais, pra *novos alunos te acharem*

Quer ver na prática? Cria sua conta e testa grátis com 2 alunos e tudo liberado, sem cartão:
👉 ${signup()}`
    case "planos":
      return `Os planos do *EVOFIT* (alunos ilimitados em todos):

• *Inicial*: ${brl(PLANS.inicial.amount)}/mês, sem fidelidade
• *Anual*: ${brl(PLANS.anual.amount)}/ano (sai ≈ R$ 39,99/mês)
• *Vitalício*: ${brl(PLANS.vitalicio.amount)} uma única vez, no Pix 🔥

O aluno usa de graça. E você começa grátis com 2 alunos e tudo liberado, sem cartão:
👉 ${signup()}

Tem um *código Fundador*? Ele dá o Anual por ${brl(PLANS.fundador.amount)} com 3 meses de bônus. Quer que eu te explique o Vitalício? Responde *4*.`
    case "teste":
      return `Bora! 🚀 Leva menos de 1 minuto:

1. Entra aqui: ${signup()}
2. Coloca nome, e-mail e senha
3. Cadastra seu primeiro aluno e monta a ficha

É grátis com até 2 alunos, sem cartão. Se travar em qualquer passo, me chama aqui que eu te ajudo.`
    case "vitalicio":
      return `O *Vitalício* é a oferta de lançamento 🔥

💰 *${brl(PLANS.vitalicio.amount)} uma única vez*, no Pix
♾️ Use o EVOFIT *pra sempre*, sem mensalidade
👥 Alunos ilimitados

As vagas são limitadas. Já avisei a equipe e vamos te mandar a chave Pix por aqui. Enquanto isso, já pode criar sua conta pra liberarmos assim que o Pix cair:
👉 ${signup()}`
    case "humano":
      return `Perfeito${oi}! Já chamei a equipe do EVOFIT, alguém te responde por aqui em instantes. 🙌`
    case "aluno":
      return `Pro aluno é *grátis* 🎉 Ele treina pelo celular, sem baixar nada: vê a ficha do dia, a demonstração de cada exercício, marca as séries e o descanso conta sozinho. Tudo que ele faz aparece na hora pra você.

Quem assina é o personal. Quer testar grátis com 2 alunos? 👉 ${signup()}`
    case "migrar":
      return `Dá pra trocar sem dor de cabeça 💪 Você cria sua conta, cadastra os alunos e a gente te ajuda a passar as fichas. E no EVOFIT você ganha o que os apps comuns não têm: radar de evasão, mapa de equilíbrio da ficha e perfil na busca de personais.

Testa grátis com 2 alunos, lado a lado: 👉 ${signup()}
Quer ajuda da equipe pra migrar? Responde *5*.`
    case "obrigado":
      return `Eu que agradeço${oi}! 🙌 Qualquer dúvida é só chamar. Seu teste grátis te espera: ${signup()}`
    case "menu":
      return first
        ? `Oi${oi}! 👋 Aqui é do *EVOFIT*, o sistema completo do personal trainer: alunos, fichas, avaliações, financeiro e app do aluno, tudo num só lugar.\n\n${MENU}`
        : MENU
    default:
      return first
        ? `Oi${oi}! 👋 Aqui é do *EVOFIT*, o sistema completo do personal trainer.\n\n${MENU}`
        : `Não entendi muito bem 😅\n\n${MENU}`
  }
}

const STAGE: Partial<Record<Intent, string>> = { sistema: "conhecendo", planos: "planos", teste: "teste", vitalicio: "vitalicio", humano: "humano", migrar: "conhecendo", aluno: "conhecendo" }

type Row = Record<string, unknown>

export interface Incoming {
  number: string
  name: string
  text: string
  fromMe: boolean
  /** Unix (s) da mensagem. Mensagens antigas (reenvio) são ignoradas. */
  timestamp?: number
}

/**
 * Trata uma mensagem recebida. Devolve o que foi feito (para log e testes).
 * Mensagens enviadas por nós (fromMe) que não são do robô pausam o robô naquela conversa.
 */
export async function handleIncoming(m: Incoming, db: Db = getDb(), now = Date.now()): Promise<"ignorada" | "pausado" | "respondida" | "humano_assumiu"> {
  const number = m.number.replace(/\D/g, "")
  if (number.length < 10 || number.length > 15) return "ignorada"
  if (m.timestamp && now / 1000 - m.timestamp > 180) return "ignorada"
  const text = m.text.trim().slice(0, 300)

  if (m.fromMe) {
    // resposta manual da equipe: o robô sai de cena por 12 h
    const lead = (await db.tx((q) => q.query<Row>("select last_bot_text from whatsapp_leads where number = $1", [number]))).rows[0]
    // eco da mensagem do próprio robô (compara o começo, o texto salvo pode estar cortado)
    const echo = norm(m.text).slice(0, 200)
    if (!lead || !echo || norm(String(lead.last_bot_text)).startsWith(echo)) return "ignorada"
    await db.tx((q) => q.query("update whatsapp_leads set paused_until = now() + interval '12 hours' where number = $1", [number]))
    return "humano_assumiu"
  }
  if (!text) return "ignorada"

  const lead = (
    await db.tx((q) =>
      q.query<Row>(
        `insert into whatsapp_leads (number, name, messages, last_text, last_in_at) values ($1, $2, 1, $3, now())
         on conflict (number) do update set messages = whatsapp_leads.messages + 1, last_text = $3, last_in_at = now(),
           name = case when $2 <> '' then $2 else whatsapp_leads.name end
         returning *, (xmax = 0) as is_new`,
        [number, m.name.trim().slice(0, 80), text],
      ),
    )
  ).rows[0]
  if (lead.paused_until && Date.parse(String(lead.paused_until)) > now) return "pausado"
  // não responde em rajada (mais de 1 resposta a cada 4 s)
  if (lead.last_out_at && now - Date.parse(String(lead.last_out_at)) < 4000) return "ignorada"

  const intent = intentOf(text)
  const first = !!lead.is_new
  const nm = String(lead.name ?? "")
  const specific = intent !== "menu" && intent !== "desconhecido" && intent !== "obrigado"
  // primeiro contato: sempre se apresenta; se a pergunta já for específica, responde junto
  const reply = first && specific ? `Oi${nm ? `, ${nm.split(" ")[0]}` : ""}! 👋 Aqui é do *EVOFIT*.\n\n${replyFor(intent, nm, false)}` : replyFor(first && !specific ? "menu" : intent, nm, first)
  const stage = STAGE[intent]
  // grava antes de enviar: o eco da própria mensagem (fromMe) não pode parecer resposta da equipe
  await db.tx((q) =>
    q.query(
      `update whatsapp_leads set last_bot_text = $2, last_out_at = now(), stage = coalesce($3, stage),
         paused_until = case when $4 then now() + interval '24 hours' else paused_until end where number = $1`,
      [number, reply.slice(0, 1500), stage ?? null, intent === "humano"],
    ),
  )
  await sendWhatsApp(number, reply, "vendas", "", db)
  if (intent === "vitalicio" || intent === "humano") {
    const who = `${String(lead.name || "Sem nome")} (+${number})`
    await notifyAdmin(intent === "vitalicio" ? `🔥 *EVOFIT* · Lead quer o *Vitalício* (Pix)\n${who}\nMande a chave Pix pra fechar.` : `🙋 *EVOFIT* · Lead pediu atendimento\n${who}\nÚltima mensagem: "${text.slice(0, 120)}"`, "lead_quente", "", db)
  }
  return "respondida"
}

export interface Lead {
  number: string
  name: string
  stage: string
  messages: number
  lastText: string
  lastInAt: string | null
  paused: boolean
}

export async function listLeads(limit = 50, db: Db = getDb()): Promise<Lead[]> {
  const r = await db.tx((q) => q.query<Row>("select * from whatsapp_leads order by last_in_at desc nulls last limit $1", [limit]))
  return r.rows.map((x) => ({
    number: String(x.number),
    name: String(x.name),
    stage: String(x.stage),
    messages: Number(x.messages),
    lastText: String(x.last_text),
    lastInAt: x.last_in_at ? new Date(x.last_in_at as string).toISOString() : null,
    paused: !!x.paused_until && Date.parse(String(x.paused_until)) > Date.now(),
  }))
}

/** O robô volta a responder (ou para) numa conversa. */
export async function setLeadPaused(number: unknown, paused: boolean, db: Db = getDb()) {
  const n = String(number ?? "").replace(/\D/g, "")
  await db.tx((q) => q.query(`update whatsapp_leads set paused_until = ${paused ? "now() + interval '30 days'" : "null"} where number = $1`, [n]))
}

/** Lê o formato do webhook da Evolution API (evento messages.upsert). */
export function parseEvolution(body: Record<string, unknown>): Incoming | null {
  const ev = String(body.event ?? "").toLowerCase().replace("_", ".")
  if (ev !== "messages.upsert") return null
  const d = (Array.isArray(body.data) ? body.data[0] : body.data) as Record<string, unknown> | undefined
  const key = (d?.key ?? {}) as Record<string, unknown>
  const jid = String(key.remoteJid ?? "")
  if (!jid.endsWith("@s.whatsapp.net")) return null // grupos, status e listas: ignora
  const msg = (d?.message ?? {}) as Record<string, Record<string, unknown> | string>
  const text =
    (typeof msg.conversation === "string" ? msg.conversation : "") ||
    String((msg.extendedTextMessage as Record<string, unknown> | undefined)?.text ?? "") ||
    String(((msg.buttonsResponseMessage as Record<string, unknown> | undefined)?.selectedDisplayText as string) ?? "")
  return { number: jid.split("@")[0], name: String(d?.pushName ?? ""), text, fromMe: !!key.fromMe, timestamp: Number(d?.messageTimestamp) || undefined }
}

