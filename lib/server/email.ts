import { getDb, type Db } from "./db"

/**
 * Envio de e-mail pelo Resend (API HTTP). Variáveis: RESEND_API_KEY e EMAIL_FROM
 * (ex.: "EVOFIT <nao-responda@evofit.com.br>", de um domínio verificado no Resend).
 * Sem elas, nada é enviado e as telas mostram o caminho alternativo (suporte).
 */
export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)

type Fetch = typeof fetch
let fetcher: Fetch = (...a) => fetch(...a)
export function setEmailFetch(f: Fetch | null) {
  fetcher = f ?? ((...a) => fetch(...a))
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!emailConfigured()) return false
  try {
    const r = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
    })
    return r.ok
  } catch {
    return false
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function resetEmail(link: string) {
  const text = `Recebemos um pedido para criar uma nova senha no EVOFIT.\n\nCrie sua nova senha por este link (vale por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#18181b">
  <h2 style="color:#1e2224">EVOFIT</h2>
  <p>Recebemos um pedido para criar uma nova senha no EVOFIT.</p>
  <p><a href="${esc(link)}" style="display:inline-block;background:#46b8ba;color:#061718;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
  <p style="color:#62626a;font-size:13px">O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
</div>`
  return { subject: "Crie sua nova senha do EVOFIT", html, text }
}

/* ---------- E-mails automáticos do ciclo do cliente ---------- */


const site = () => (process.env.SITE_URL || "https://evofit-pi.vercel.app").replace(/\/+$/, "")

function layout(title: string, paragraphs: string[], cta?: { label: string; href: string }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#18181b;line-height:1.5">
  <h2 style="color:#1e2224;margin-bottom:4px">EVOFIT</h2>
  <h3 style="margin-top:0">${esc(title)}</h3>
  ${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n  ")}
  ${cta ? `<p><a href="${esc(cta.href)}" style="display:inline-block;background:#46b8ba;color:#061718;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(cta.label)}</a></p>` : ""}
  <p style="color:#62626a;font-size:12px">Você recebe este e-mail porque tem uma conta no EVOFIT.</p>
</div>`
  const text = `${title}\n\n${paragraphs.join("\n\n")}${cta ? `\n\n${cta.label}: ${cta.href}` : ""}`
  return { html, text }
}

export const EMAILS = {
  welcome: (name: string) => ({
    subject: "Bem-vindo(a) ao EVOFIT 💪",
    ...layout(`Olá, ${name}!`, ["Sua conta está pronta e seus 7 dias grátis já começaram, sem cartão.", "Próximos passos: cadastre seus alunos, monte a primeira ficha e gere o acesso do aluno ao app."], { label: "Abrir meu Studio", href: `${site()}/studio` }),
  }),
  trialEnding: (name: string, days: number) => ({
    subject: `Seu teste do EVOFIT acaba em ${days} dia${days > 1 ? "s" : ""}`,
    ...layout(`Oi, ${name}!`, [`Seu teste grátis termina em ${days} dia${days > 1 ? "s" : ""}.`, "Para continuar sem perder nada (alunos, fichas e avaliações), escolha seu plano. Leva menos de um minuto."], { label: "Escolher meu plano", href: `${site()}/studio/plano` }),
  }),
  trialEnded: (name: string) => ({
    subject: "Seu teste do EVOFIT terminou",
    ...layout(`Oi, ${name}!`, ["Seu teste grátis terminou. Seus dados e os dos seus alunos continuam guardados, e seus alunos seguem usando o app normalmente.", "Escolha um plano para voltar a usar o Studio."], { label: "Ver planos", href: `${site()}/studio/plano` }),
  }),
  subscribed: (name: string, plan: string) => ({
    subject: `Assinatura confirmada: EVOFIT ${plan}`,
    ...layout(`Obrigado, ${name}!`, [`Seu plano ${plan} está ativo. O recibo do pagamento chega pelo Stripe.`, "Para trocar o cartão, ver faturas ou cancelar, use Studio → Plano → Gerenciar assinatura."], { label: "Abrir meu Studio", href: `${site()}/studio` }),
  }),
  lifetime: (name: string) => ({
    subject: "Seu EVOFIT Vitalício está liberado ♾️",
    ...layout(`Bem-vindo(a) ao Vitalício, ${name}!`, ["Recebemos seu Pix e seu acesso ao EVOFIT agora é para sempre, sem mensalidade."], { label: "Abrir meu Studio", href: `${site()}/studio` }),
  }),
}

/** Envia um e-mail automático e registra. Com `ref`, o mesmo (tipo + ref) sai uma vez só. Nunca lança erro. */
export async function sendLifecycleEmail(to: string, kind: keyof typeof EMAILS | string, mail: { subject: string; html: string; text: string }, ref = "", db?: Db) {
  if (!to || !to.includes("@")) return "sem_email"
  try {
    const d = db ?? getDb()
    if (ref) {
      const dup = await d.tx((q) => q.query("select 1 from email_log where kind = $1 and ref = $2 and status = 'enviado'", [kind, ref]))
      if (dup.rows.length) return "repetido"
    }
    const status = !emailConfigured() ? "desligado" : (await sendEmail(to, mail.subject, mail.html, mail.text)) ? "enviado" : "erro"
    await d.tx((q) => q.query("insert into email_log (to_email, kind, ref, status) values ($1, $2, $3, $4) on conflict do nothing", [to.toLowerCase(), kind, ref.slice(0, 80), status]))
    return status
  } catch {
    return "erro"
  }
}
