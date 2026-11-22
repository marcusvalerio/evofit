"use client"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { KeyRound } from "@/components/icons"
import { postJson, hardNavigate, homeFor } from "@/lib/account-client"
import { AuthCard, FormError, PasswordField } from "@/components/auth-form"

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  )
}

function Reset() {
  const token = useSearchParams().get("token") ?? ""
  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldError(undefined)
    if (pw.length < 8) return setFieldError("A senha precisa ter pelo menos 8 caracteres.")
    if (pw !== pw2) return setError("As senhas não são iguais.")
    setBusy(true)
    const r = await postJson<{ role: string }>("/api/auth/reset", { token, password: pw }).catch(() => null)
    if (r?.ok) return hardNavigate(homeFor(r.data.role))
    setBusy(false)
    if (r?.data.fields?.password) return setFieldError(r.data.fields.password)
    setError(r?.data.error ?? "Sem conexão. Tente de novo.")
  }

  return (
    <AuthCard
      eyebrow="Sua conta EVOFIT"
      title="Criar nova senha"
      footer={
        <p className="text-sm text-muted">
          Lembrou a senha?{" "}
          <Link href="/entrar" className="font-semibold text-accent hover:underline">
            Entrar
          </Link>
        </p>
      }
    >
      {!token ? (
        <p className="text-sm text-muted">Link incompleto. Abra o link do e-mail de novo ou peça um novo em “Esqueci minha senha”.</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <PasswordField value={pw} onChange={setPw} error={fieldError} label="Nova senha" autoComplete="new-password" hint="Pelo menos 8 caracteres." />
          <PasswordField value={pw2} onChange={setPw2} label="Repita a nova senha" autoComplete="new-password" />
          <FormError message={error} />
          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden /> : <KeyRound size={18} aria-hidden />} Salvar e entrar
          </button>
        </form>
      )}
    </AuthCard>
  )
}
