import { createInvite } from "@/lib/server/auth"
import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"

export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 1024)
  const { code, days } = await createInvite(a, body.studentId)
  return json({ path: `/convite/${code}`, days })
})
