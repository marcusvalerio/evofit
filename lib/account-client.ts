"use client"
import { clearOffline, flush } from "./store"

/** Chamadas do navegador para as rotas de conta. */
export async function postJson<T = Record<string, unknown>>(url: string, body: unknown, method = "POST") {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) })
  const data = (await r.json().catch(() => ({}))) as T & { error?: string; fields?: Record<string, string> }
  return { ok: r.ok, status: r.status, data }
}

export async function logout() {
  await flush().catch(() => {})
  clearOffline()
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {})
  hardNavigate("/")
}

/**
 * Navegação com recarga completa: depois de entrar/sair, o store precisa reiniciar no modo certo
 * (demo × conta), o que uma navegação do cliente não faz.
 */
export function hardNavigate(path: string) {
  window.location.assign(path)
}

/** Para onde ir depois de entrar. */
export const homeFor = (role: string) => (role === "student" ? "/aluno" : "/studio")
