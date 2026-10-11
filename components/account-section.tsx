"use client"
import { useState } from "react"
import { LogOut, ShieldAlert, UserRound } from "lucide-react"
import { useDemoState } from "@/lib/store"
import { hardNavigate, logout, postJson } from "@/lib/account-client"
import { Field, Modal } from "./ui"

/** Conta logada: sair e excluir a conta com todos os dados (LGPD). */
export function AccountSection() {
  const { mode, account } = useDemoState()
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (mode !== "account" || !account) return null
  const trainer = account.role === "trainer"

  const remove = async () => {
    setBusy(true)
    setError(null)
    const r = await postJson("/api/account", { confirm }, "DELETE").catch(() => null)
    if (r?.ok) return hardNavigate("/")
    setBusy(false)
    setError(r?.data.error ?? "Sem conexão. Tente de novo.")
  }

  return (
    <section className="card mt-6 p-5" aria-labelledby="conta-title">
      <h2 id="conta-title" className="t-h2 flex items-center gap-2">
        <UserRound size={20} aria-hidden /> Sua conta
      </h2>
      <p className="mt-1 text-sm text-muted">
        Entrou como <strong className="text-fg">{account.email}</strong>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline" onClick={() => logout()}>
          <LogOut size={16} aria-hidden /> Sair
        </button>
        <button type="button" className="btn btn-danger" onClick={() => setDeleting(true)}>
          <ShieldAlert size={16} aria-hidden /> Excluir conta
        </button>
      </div>

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Excluir conta definitivamente?"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setDeleting(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-inverse" disabled={busy || confirm.trim().toLowerCase() !== account.email.toLowerCase()} onClick={remove}>
              {busy && <span className="spinner" aria-hidden />} Excluir tudo
            </button>
          </>
        }
      >
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          {trainer
            ? "Seu perfil, alunos, fichas, treinos registrados, vídeos e dicas e os acessos dos seus alunos serão apagados. Não é possível desfazer."
            : "Seu acesso ao app será apagado. Os treinos que você registrou continuam com o seu personal."}
        </p>
        <Field label={`Digite ${account.email} para confirmar`} className="mt-4">
          {(p) => <input {...p} className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />}
        </Field>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </Modal>
    </section>
  )
}
