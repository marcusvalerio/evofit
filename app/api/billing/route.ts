import { billingStatus } from "@/lib/server/billing"
import { handle, json, requireAccount } from "@/lib/server/http"

/** Situação da assinatura do personal logado. */
export const GET = handle(async () => json(await billingStatus(await requireAccount())))
