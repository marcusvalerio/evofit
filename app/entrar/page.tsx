"use client"
import { useState } from "react"
import Link from "next/link"
import { LogIn } from "lucide-react"
import { postJson, homeFor, hardNavigate } from "@/lib/account-client"
import { Field } from "@/components/ui"
import { AuthCard, FormError, PasswordField } from "@/components/auth-form"

export default function EntrarPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError("Informe e-mail e senha.")
    setBusy(true)
    setError(null)
    const r = await postJson<{ role: string }>("/api/auth/login", { email, password }).catch(() => null)
    if (r?.ok) return hardNavigate(homeFor(r.data.role))
    setBusy(false)
    setError(r?.data.error ?? "Sem conexão. Tente de novo.")
  }

  return (
    <AuthCard
      eyebrow="Sua conta EVOFIT"
      title="Entrar"
      footer={
        <>
          <p>
            É personal e ainda não tem conta?{" "}
            <Link href="/criar-conta" className="font-semibold text-accent hover:underline">
              Criar conta
            </Link>
          </p>
          <p>Aluno: o acesso é criado pelo link de convite que seu personal envia.</p>
          <p>
            Só quer conhecer?{" "}
            <Link href="/studio" className="font-semibold text-accent hover:underline">
              Abrir a demonstração
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="E-mail">{(p) => <input {...p} className="input" type="email" autoComplete="email" inputMode="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} autoFocus />}</Field>
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden /> : <LogIn size={18} aria-hidden />} Entrar
        </button>
      </form>
    </AuthCard>
  )
}
