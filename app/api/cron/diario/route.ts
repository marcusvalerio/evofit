import { chatDigest, trialReminders } from "@/lib/server/whatsapp-bot"
import { handle, json } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/** Rodado 1x por dia pelo Vercel Cron (vercel.json). Protegido por CRON_SECRET. */
export const GET = handle(async (req) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "Não autorizado.")
  return json({ trial: await trialReminders(), chat: await chatDigest() })
})
