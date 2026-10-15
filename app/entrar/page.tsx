"use client"
import { useState } from "react"
import Link from "next/link"
import { LogIn } from "lucide-react"
import { postJson, homeFor, hardNavigate } from "@/lib/account-client"
import { Field } from "@/components/ui"
import { AuthCard, FormError, PasswordField } from "@/components/auth-form"

/** Contato do suporte (opcional), configurado no deploy. */
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? ""

export default function EntrarPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError("Informe usuário (ou e-mail) e senha.")
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
          <p>Aluno: seu personal envia seu usuário e uma senha provisória (ou um link de convite).</p>
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
        <Field label="E-mail ou usuário" hint="Aluno: use o usuário e a senha que seu personal enviou.">
          {(p) => <input {...p} className="input" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} autoFocus />}
        </Field>
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden /> : <LogIn size={18} aria-hidden />} Entrar
        </button>
      </form>
      <details className="evo-forgot mt-4">
        <summary>Esqueci minha senha</summary>
        <div className="space-y-2 pt-2 text-sm text-muted">
          <p>
            <b className="text-fg">Aluno:</b> peça ao seu personal para gerar uma nova senha provisória — ele faz isso na sua ficha, em “Acesso ao app”.
          </p>
          <p>
            <b className="text-fg">Personal:</b> fale com o suporte do EVOFIT
            {SUPPORT ? (
              <>
                {" "}
                em{" "}
                <a className="font-semibold text-accent hover:underline" href={`mailto:${SUPPORT}?subject=${encodeURIComponent("Nova senha do EVOFIT")}`}>
                  {SUPPORT}
                </a>
              </>
            ) : null}{" "}
            usando o e-mail da sua conta. Você recebe uma senha provisória e cria uma nova no primeiro acesso.
          </p>
        </div>
      </details>
    </AuthCard>
  )
}
