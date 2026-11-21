import { requestLifetime } from "@/lib/server/billing"
import { assertSameOrigin, handle, json, requireAccount } from "@/lib/server/http"

/** Pedido de Vitalício por Pix: registra para o admin e devolve o link do WhatsApp da equipe. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  return json(await requestLifetime(await requireAccount()))
})
