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
  <h2 style="color:#0f5257">EVOFIT</h2>
  <p>Recebemos um pedido para criar uma nova senha no EVOFIT.</p>
  <p><a href="${esc(link)}" style="display:inline-block;background:#46b8ba;color:#061718;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
  <p style="color:#62626a;font-size:13px">O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
</div>`
  return { subject: "Crie sua nova senha do EVOFIT", html, text }
}
