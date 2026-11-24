"use client"
import { useState } from "react"
import { Clock } from "@/components/icons"
import { useChatHours } from "@/lib/chat-client"
import { DAY_LABELS, hhmm, hoursText, type ChatHours } from "@/lib/chat-hours"
import { useToast } from "./providers"

const toMin = (v: string) => {
  const [h, m] = v.split(":").map(Number)
  return Math.min(1439, Math.max(0, (h || 0) * 60 + (m || 0)))
}

/** Horário de atendimento do personal. Padrão: livre 24h; dá para limitar dias e horas. */
export function ChatHoursForm() {
  const { hours, save } = useChatHours()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ChatHours | null>(null)
  const h = draft ?? hours
  const set = (p: Partial<ChatHours>) => setDraft({ ...h, ...p })
  return (
    <section className="card p-4" aria-labelledby="ch-t">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[12px] bg-[var(--menta)] text-[var(--petroleo)]">
          <Clock size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ch-t" className="font-semibold">Horário de atendimento</h2>
          <p className="text-sm text-muted">{hoursText(hours)}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => (setOpen((o) => !o), setDraft(null))} aria-expanded={open}>
          {open ? "Fechar" : "Ajustar"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={h.always} onChange={(e) => set({ always: e.target.checked })} />
            <span>
              <b>Livre 24h</b> <span className="text-sm text-muted">— recebo mensagens e avisos a qualquer hora (tem aluno que treina em outro horário).</span>
            </span>
          </label>
          {!h.always && (
            <>
              <fieldset>
                <legend className="field-label">Dias</legend>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((l, i) => (
                    <button key={l} type="button" className="chip" aria-pressed={!!(h.days & (1 << i))} onClick={() => set({ days: h.days ^ (1 << i) })}>
                      {l}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid max-w-sm grid-cols-2 gap-3">
                <label className="field-label">
                  Das
                  <input type="time" className="input mt-1" value={hhmm(h.from)} onChange={(e) => set({ from: toMin(e.target.value) })} />
                </label>
                <label className="field-label">
                  Até
                  <input type="time" className="input mt-1" value={hhmm(h.to)} onChange={(e) => set({ to: toMin(e.target.value) })} />
                </label>
              </div>
              <p className="text-sm text-muted">Fora desse horário, o aluno vê que você está fora e você não recebe aviso no celular. As mensagens ficam guardadas.</p>
            </>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!draft}
            onClick={async () => {
              if (!draft) return
              const ok = await save(draft)
              toast(ok ? "Horário salvo." : "Não foi possível salvar.", ok ? "success" : "error")
              if (ok) {
                setDraft(null)
                setOpen(false)
              }
            }}
          >
            Salvar horário
          </button>
        </div>
      )}
    </section>
  )
}
