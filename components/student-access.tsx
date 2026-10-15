"use client"
import { useCallback, useEffect, useState } from "react"
import { Ban, Check, Copy, KeyRound, Link2, MessageCircle, RefreshCw, ShieldCheck, UserRoundPlus } from "lucide-react"
import { postJson } from "@/lib/account-client"
import { relativeDays } from "@/lib/date"
import { whatsappLink } from "@/lib/whatsapp"
import { ConfirmDialog, Modal } from "./ui"
import { useToast } from "./providers"
import { InviteDialog } from "./invite"

type Access = { status: "none" | "pending" | "active"; login: string | null; lastLoginAt: string | null }
type Issued = { login: string; password: string }

/**
 * Acesso do aluno ao app: o personal gera usuário + senha provisória, o aluno troca a senha
 * no primeiro acesso e o personal pode gerar nova senha ou revogar a qualquer momento.
 */
export function StudentAccessDialog({ studentId, studentName, phone, onClose }: { studentId: string; studentName: string; phone: string; onClose: () => void }) {
  const toast = useToast()
  const first = studentName.split(" ")[0]
  const [access, setAccess] = useState<Access | null>(null)
  const [issued, setIssued] = useState<Issued | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<"reset" | "revoke" | null>(null)
  const [invite, setInvite] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch(`/api/students/${encodeURIComponent(studentId)}/access`, { credentials: "same-origin", cache: "no-store" }).catch(() => null)
    if (!r?.ok) return setError("Não foi possível consultar o acesso. Tente de novo.")
    setAccess((await r.json()) as Access)
  }, [studentId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega a situação ao abrir
    void load()
  }, [load])

  const act = async (action: "create" | "reset" | "revoke") => {
    setBusy(true)
    setError(null)
    const r = await postJson<Partial<Issued>>(`/api/students/${encodeURIComponent(studentId)}/access`, { action }).catch(() => null)
    setBusy(false)
    if (!r?.ok) return setError(r?.data.error ?? "Sem conexão. Tente de novo.")
    if (action === "revoke") {
      setIssued(null)
      toast(`Acesso de ${first} revogado.`)
    } else setIssued({ login: r.data.login!, password: r.data.password! })
    await load()
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const message = issued
    ? `Oi, ${first}! Seus treinos estão no EVOFIT.\n\nEntre em ${origin}/entrar\nUsuário: ${issued.login}\nSenha provisória: ${issued.password}\n\nNo primeiro acesso você cria sua própria senha.`
    : ""

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${what} copiado.`)
    } catch {
      toast("Selecione e copie manualmente.", "info")
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={`Acesso de ${first} ao app`} description="Você gera o login; o aluno cria a própria senha no primeiro acesso.">
        {!access && !error ? (
          <div className="skeleton h-24" role="status" aria-label="Consultando acesso" />
        ) : (
          <div className="space-y-4">
            {access && (
              <div className="evo-access-status" data-status={access.status}>
                <span className="evo-access-icon">{access.status === "active" ? <ShieldCheck size={18} aria-hidden /> : access.status === "pending" ? <KeyRound size={18} aria-hidden /> : <UserRoundPlus size={18} aria-hidden />}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {access.status === "none" ? "Sem acesso ao app" : access.status === "pending" ? "Aguardando o primeiro acesso" : "Acesso ativo"}
                  </p>
                  <p className="text-sm text-muted">
                    {access.status === "none"
                      ? "Gere um usuário e uma senha provisória para enviar ao aluno."
                      : `Usuário: ${access.login}${access.lastLoginAt ? ` · último acesso ${relativeDays(access.lastLoginAt)}` : " · ainda não entrou"}`}
                  </p>
                </div>
              </div>
            )}

            {issued && (
              <section className="evo-access-issued" aria-labelledby="issued-title">
                <p id="issued-title" className="text-sm font-semibold">
                  Envie para {first} agora — a senha não aparece de novo.
                </p>
                <dl className="mt-3 grid gap-2">
                  {[
                    ["Usuário", issued.login],
                    ["Senha provisória", issued.password],
                  ].map(([k, v]) => (
                    <div key={k} className="evo-access-cred">
                      <dt>{k}</dt>
                      <dd className="font-mono tabular">{v}</dd>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Copiar ${k.toLowerCase()}`} onClick={() => copy(v, k)}>
                        <Copy size={15} />
                      </button>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="btn btn-primary" href={whatsappLink(phone, message)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={16} aria-hidden /> Enviar no WhatsApp
                  </a>
                  <button type="button" className="btn btn-outline" onClick={() => copy(message, "Texto")}>
                    <Copy size={16} aria-hidden /> Copiar mensagem
                  </button>
                </div>
              </section>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}

            {access?.status === "none" ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act("create")}>
                  {busy ? <span className="spinner" aria-hidden /> : <KeyRound size={16} aria-hidden />} Gerar acesso
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setInvite(true)}>
                  <Link2 size={16} aria-hidden /> Prefiro enviar um link de convite
                </button>
              </div>
            ) : access ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setConfirm("reset")}>
                  <RefreshCw size={16} aria-hidden /> Gerar nova senha
                </button>
                <button type="button" className="btn btn-ghost text-danger" disabled={busy} onClick={() => setConfirm("revoke")}>
                  <Ban size={16} aria-hidden /> Revogar acesso
                </button>
              </div>
            ) : null}

            <p className="flex gap-2 text-xs text-muted">
              <Check size={14} aria-hidden className="mt-0.5 shrink-0" /> A senha provisória vale até o primeiro acesso. Você nunca vê a senha que o aluno criar.
            </p>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        title="Gerar nova senha?"
        message={`A senha atual de ${first} deixa de funcionar e ele(a) sai de todos os aparelhos. No próximo acesso, cria uma senha nova.`}
        confirmLabel="Gerar nova senha"
        onConfirm={() => act("reset")}
      />
      <ConfirmDialog
        open={confirm === "revoke"}
        onClose={() => setConfirm(null)}
        title="Revogar acesso?"
        message={`${first} sai do app na hora e não consegue mais entrar. Treinos e histórico continuam com você, e você pode gerar um novo acesso depois.`}
        confirmLabel="Revogar acesso"
        danger
        onConfirm={() => act("revoke")}
      />
      {invite && <InviteDialog studentId={studentId} studentName={studentName} onClose={() => setInvite(false)} />}
    </>
  )
}
