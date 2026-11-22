"use client"
import { useEffect } from "react"

let sent = 0
/** Envia ao servidor um erro do navegador (no máximo 5 por página aberta). */
export function reportError(message: string, stack = "") {
  if (sent >= 5 || !message) return
  sent++
  const body = JSON.stringify({ message: message.slice(0, 500), stack: stack.slice(0, 2000), route: window.location.pathname })
  fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "same-origin" }).catch(() => {})
}

/** Captura erros não tratados no navegador. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // erros de scripts de outros sites chegam sem detalhes: ignora
      if (!e.message || e.message === "Script error.") return
      reportError(e.message, e.error?.stack ?? "")
    }
    const onReject = (e: PromiseRejectionEvent) => {
      const r = e.reason
      const msg = r instanceof Error ? r.message : String(r ?? "")
      // falta de internet não é bug
      if (/Failed to fetch|NetworkError|Load failed|aborted/i.test(msg)) return
      reportError(`Promise: ${msg}`, r instanceof Error ? (r.stack ?? "") : "")
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onReject)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onReject)
    }
  }, [])
  return null
}
