import { assertAdmin, noteAction } from "@/lib/server/admin"
import { assertSameOrigin, currentAccount, handle, json, readJson } from "@/lib/server/http"

/** Bloco de ideias: { op: "add", text, category } | { op: "toggle" | "delete", id }. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await currentAccount()
  assertAdmin(a)
  await noteAction(a, await readJson(req, 4096))
  return json({ ok: true })
})
