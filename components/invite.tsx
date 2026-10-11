"use client"
import { useEffect, useState } from "react"
import { Copy, MessageCircle, Share2 } from "lucide-react"
import { postJson } from "@/lib/account-client"
import { Modal } from "./ui"
import { useToast } from "./providers"

/** Gera o link de convite para o aluno criar o próprio acesso ao app. */
export function InviteDialog({ studentId, studentName, onClose }: { studentId: string; studentName: string; onClose: () => void }) {
  const toast = useToast()
  const [res, setRes] = useState<{ url?: string; days?: number; error?: string } | null>(null)

  useEffect(() => {
    let alive = true
    postJson<{ path: string; days: number }>("/api/invites", { studentId })
      .then((r) => alive && setRes(r.ok ? { url: new URL(r.data.path, window.location.origin).toString(), days: r.data.days } : { error: r.data.error ?? "Não foi possível gerar o convite." }))
      .catch(() => alive && setRes({ error: "Sem conexão. Tente de novo." }))
    return () => {
      alive = false
    }
  }, [studentId])

  const first = studentName.split(" ")[0]
  const text = res?.url ? `Oi, ${first}! Seus treinos estão no EVOFIT. Crie seu acesso por este link: ${res.url}` : ""

  return (
    <Modal open onClose={onClose} title={`Convidar ${first} para o app`} description="O aluno cria e-mail e senha pelo link e passa a ver os treinos que você atribuir.">
      {!res ? (
        <div className="skeleton h-12" role="status" aria-label="Gerando convite" />
      ) : res.error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {res.error}
        </p>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="field-label">Link de convite</span>
            <input readOnly className="input font-mono text-sm" value={res.url} onFocus={(e) => e.currentTarget.select()} aria-label="Link de convite" />
          </label>
          <p className="text-sm text-muted">Vale por {res.days} dias e pode ser usado uma vez. Gerar outro link cancela este.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(res.url!)
                  toast("Link copiado.")
                } catch {
                  toast("Selecione o link e copie manualmente.", "info")
                }
              }}
            >
              <Copy size={16} aria-hidden /> Copiar link
            </button>
            <a className="btn btn-outline" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden /> WhatsApp
            </a>
            {"share" in navigator && (
              <button type="button" className="btn btn-ghost" onClick={() => navigator.share({ title: "Convite EVOFIT", text }).catch(() => {})}>
                <Share2 size={16} aria-hidden /> Compartilhar
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
