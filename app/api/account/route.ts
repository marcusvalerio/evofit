import { deleteAccount } from "@/lib/server/auth"
import { assertSameOrigin, clearSessionCookie, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/** Exclui a conta e todos os dados vinculados. Exige digitar o e-mail como confirmação. */
export const DELETE = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 1024)
  if (typeof body.confirm !== "string" || body.confirm.trim().toLowerCase() !== a.email.toLowerCase()) throw new HttpError(400, "Digite seu e-mail para confirmar.")
  await deleteAccount(a)
  await clearSessionCookie()
  return json({ ok: true })
})
