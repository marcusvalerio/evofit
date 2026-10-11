import { cookies } from "next/headers"
import { logout } from "@/lib/server/auth"
import { SESSION_COOKIE, assertSameOrigin, clearSessionCookie, handle, json } from "@/lib/server/http"

export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const jar = await cookies()
  await logout(jar.get(SESSION_COOKIE)?.value).catch(() => {})
  await clearSessionCookie()
  return json({ ok: true })
})
