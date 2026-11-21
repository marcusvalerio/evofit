import { assertAdmin } from "@/lib/server/admin"
import { adminNumber, botConfigured, botLog, notifyAdmin } from "@/lib/server/whatsapp-bot"
import { assertSameOrigin, currentAccount, handle, json } from "@/lib/server/http"

/** Situação do robô de WhatsApp e últimas mensagens. */
export const GET = handle(async () => {
  assertAdmin(await currentAccount())
  const n = adminNumber()
  return json({ configured: botConfigured(), adminNumber: n ? `•••${n.slice(-4)}` : null, log: await botLog() })
})

/** Envia uma mensagem de teste para o número da equipe. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  assertAdmin(await currentAccount())
  const status = await notifyAdmin("✅ *EVOFIT* · Teste do robô de WhatsApp. Está funcionando!", "teste")
  return json({ status })
})
