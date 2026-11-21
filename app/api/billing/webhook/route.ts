import { handleEvent, parseEvent } from "@/lib/server/billing"
import { handle, json } from "@/lib/server/http"

/** Webhook do Stripe. Cadastre no painel do Stripe apontando para /api/billing/webhook. */
export const POST = handle(async (req) => {
  const event = parseEvent(await req.text(), req.headers.get("stripe-signature"))
  await handleEvent(event)
  return json({ received: true })
})
