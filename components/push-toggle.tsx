"use client"
import { useState } from "react"
import { Bell } from "@/components/icons"
import { usePush } from "@/lib/chat-client"

/** Liga/desliga os avisos no celular deste aparelho. Some quando o aparelho não suporta. */
export function PushToggle() {
  const p = usePush()
  const [msg, setMsg] = useState<string | null>(null)
  if (!p.available) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={p.on ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
        onClick={async () => {
          if (p.on) return void p.disable()
          const ok = await p.enable()
          setMsg(ok ? null : "Não deu para ligar. Confira se o navegador permite notificações.")
        }}
      >
        <Bell size={16} aria-hidden /> {p.on ? "Avisos no celular ligados" : "Ligar avisos no celular"}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  )
}
