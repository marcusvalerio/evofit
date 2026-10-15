"use client"
import { useState } from "react"
import { KeyRound } from "lucide-react"
import { hardNavigate, postJson } from "@/lib/account-client"
import { AuthCard, FormError, PasswordField } from "./auth-form"

/** Primeiro acesso com senha provisória: o aluno cria a própria senha antes de ver os treinos. */
export function FirstAccessPassword({ login }: { login: string }) {
  const [pw, setPw] = useState("")
  const [again, setAgain] = useState("")
  const [errors, setErrors] = useState<{ password?: string; again?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (pw.length < 8) next.password = "A senha precisa ter pelo menos 8 caracteres."
    if (pw !== again) next.again = "As senhas não são iguais."
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    setError(null)
    const r = await postJson<{ ok: boolean }>("/api/account/password", { password: pw }).catch(() => null)
    if (r?.ok) return hardNavigate("/aluno")
    setBusy(false)
    if (r?.data.fields?.password) setErrors({ password: r.data.fields.password })
    else setError(r?.data.error ?? "Sem conexão. Tente de novo.")
  }

  return (
    <AuthCard eyebrow="Primeiro acesso" title="Crie sua senha">
      <p className="mb-4 text-sm text-muted">
        Você entrou como <b className="text-fg">{login}</b> com uma senha provisória. Crie uma senha só sua para ver seus treinos — seu personal não terá acesso a ela.
      </p>
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordField label="Nova senha" value={pw} onChange={setPw} error={errors.password} autoComplete="new-password" hint="Mínimo de 8 caracteres." />
        <PasswordField label="Repita a nova senha" value={again} onChange={setAgain} error={errors.again} autoComplete="new-password" />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden /> : <KeyRound size={18} aria-hidden />} Salvar senha e entrar
        </button>
      </form>
    </AuthCard>
  )
}
