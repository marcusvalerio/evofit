"use client"
import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "@/components/icons"
import type { ChatMsg } from "@/lib/chat-client"
import { cx } from "./ui"

const day = (iso: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso))
const hour = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))

/** Conversa 1 a 1 (Design System · Chat): minhas mensagens à direita em navy, as do outro à esquerda em branco. */
export function ChatView({ me, other, messages, loading, error, onSend, placeholder, context, onClearContext, notice }: { me: "trainer" | "student"; other: string; messages: ChatMsg[]; loading: boolean; error: string | null; onSend: (t: string, context?: string | null) => Promise<boolean>; placeholder?: string; context?: string | null; onClearContext?: () => void; notice?: string | null }) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [messages.length])
  const lastMine = [...messages].reverse().find((m) => m.sender === me)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    if (await onSend(text, context)) {
      setText("")
      onClearContext?.()
    }
    setBusy(false)
  }
  let prevDay = ""
  return (
    <div className="chat">
      <div className="chat-list" aria-live="polite">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Carregando conversa…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhuma mensagem ainda. Diga oi para {other}.</p>
        ) : (
          messages.map((m) => {
            const d = day(m.createdAt)
            const sep = d !== prevDay
            prevDay = d
            const mine = m.sender === me
            return (
              <div key={m.id}>
                {sep && <p className="chat-day">{d}</p>}
                <div className={cx("chat-row", mine && "mine")}>
                  <p className="chat-bubble">
                    {m.context && <span className="chat-ctx">{m.context}</span>}
                    {m.body}
                    <span className="chat-time">{hour(m.createdAt)}</span>
                  </p>
                </div>
                {mine && m.id === lastMine?.id && <p className="chat-status">{m.readAt ? "Vista" : "Enviada"}</p>}
              </div>
            )
          })
        )}
        <div ref={end} />
      </div>
      {notice && <p className="chat-notice">{notice}</p>}
      {error && <p className="px-4 pb-2 text-sm text-[var(--danger)]">{error}</p>}
      {context && (
        <div className="chat-pending">
          <span className="chat-ctx">{context}</span>
          <button type="button" className="text-sm font-semibold text-accent" onClick={onClearContext}>
            Remover
          </button>
        </div>
      )}
      <form className="chat-compose" onSubmit={submit}>
        <label htmlFor="chat-input" className="sr-only">
          Mensagem para {other}
        </label>
        <textarea
          id="chat-input"
          rows={1}
          maxLength={2000}
          className="chat-input"
          placeholder={placeholder ?? "Escreva uma mensagem"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void submit(e)
            }
          }}
        />
        <button type="submit" className="chat-send" disabled={!text.trim() || busy} aria-label="Enviar">
          <ArrowUp size={20} aria-hidden />
        </button>
      </form>
    </div>
  )
}
