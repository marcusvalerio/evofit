import { handleIncoming, parseEvolution } from "@/lib/server/sales-bot"
import { handle, json, readJson } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/**
 * Webhook da Evolution API (evento MESSAGES_UPSERT). Configure na instância a URL
 * https://SEU-DOMINIO/api/whatsapp/webhook?token=EVOLUTION_WEBHOOK_TOKEN
 */
export const POST = handle(async (req) => {
  const token = process.env.EVOLUTION_WEBHOOK_TOKEN
  if (!token || new URL(req.url).searchParams.get("token") !== token) throw new HttpError(401, "Não autorizado.")
  const m = parseEvolution(await readJson(req, 256 * 1024))
  return json({ result: m ? await handleIncoming(m) : "ignorada" })
})
