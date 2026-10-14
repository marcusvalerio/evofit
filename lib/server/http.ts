import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { accountFromToken, SESSION_DAYS, type Account } from "./auth"
import { DbNotConfigured, dbConfigured } from "./db"
import { HttpError, toHttp } from "./workspace"

export const SESSION_COOKIE = "evofit_session"
/** Cookie legível pelo navegador só para saber que existe uma conta logada (não dá acesso a nada). */
export const HINT_COOKIE = "evofit_auth"

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

/** Rejeita requisições de escrita vindas de outro site (proteção extra contra CSRF). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin")
  if (!origin) return
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!host || new URL(origin).host !== host) throw new HttpError(403, "Origem não permitida.")
}

export async function readJson(req: Request, maxBytes = 512 * 1024): Promise<Record<string, unknown>> {
  const text = await req.text()
  if (text.length > maxBytes) throw new HttpError(413, "Requisição muito grande.")
  try {
    const v = JSON.parse(text)
    if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error()
    return v
  } catch {
    throw new HttpError(400, "JSON inválido.")
  }
}

export async function currentAccount(): Promise<Account | null> {
  if (!dbConfigured()) return null
  const jar = await cookies()
  return accountFromToken(jar.get(SESSION_COOKIE)?.value)
}

export async function requireAccount() {
  const a = await currentAccount()
  if (!a) throw new HttpError(401, "Faça login para continuar.")
  return a
}

export async function setSessionCookie(token: string) {
  const jar = await cookies()
  const opts = { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: SESSION_DAYS * 86400 }
  jar.set(SESSION_COOKIE, token, { ...opts, httpOnly: true })
  jar.set(HINT_COOKIE, "1", { ...opts, httpOnly: false })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(HINT_COOKIE)
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local"
}

/** Envolve um handler convertendo erros conhecidos em respostas JSON. */
export function handle(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx)
    } catch (raw) {
      if (raw instanceof DbNotConfigured) return json({ error: "Contas ainda não estão disponíveis neste ambiente.", configured: false }, 503)
      const e = toHttp(raw, "operação")
      if (e instanceof HttpError) return json({ error: e.message, fields: (e as HttpError & { fields?: unknown }).fields }, e.status)
      console.error(raw)
      return json({ error: "Erro inesperado. Tente novamente." }, 500)
    }
  }
}
