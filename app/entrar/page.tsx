"use client"
import { useState } from "react"
import Link from "next/link"
import { LogIn } from "@/components/icons"
import { postJson, homeFor, hardNavigate } from "@/lib/account-client"
import { Field } from "@/components/ui"
import { AuthCard, FormError, PasswordField } from "@/components/auth-form"
import { useDemoEnabled } from "@/components/providers"

/** Contato do suporte (opcional), configurado no deploy. */
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? ""

export default function EntrarPage() {
  const demo = useDemoEnabled()
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
    if (r?.ok) {
      // volta para a tela que pediu o login, se for da área desta conta
      const home = homeFor(r.data.role)
      const next = new URLSearchParams(window.location.search).get("next") ?? ""
      return hardNavigate(next.startsWith(home) && !next.startsWith("//") ? next : home)
    }
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
          {demo && (
            <p>
              Só quer conhecer?{" "}
              <Link href="/studio" className="font-semibold text-accent hover:underline">
                Abrir a demonstração
              </Link>
            </p>
          )}
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
      <ForgotPassword initial={email.includes("@") ? email : ""} />
    </AuthCard>
  )
}

/** Esqueci minha senha: link por e-mail (quando configurado) ou orientação para o suporte. */
function ForgotPassword({ initial }: { initial: string }) {
  const [mail, setMail] = useState("")
  const [state, setState] = useState<"idle" | "busy" | "sent" | "manual">("idle")
  const [error, setError] = useState<string | null>(null)
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const to = (mail || initial).trim()
    if (!to.includes("@")) return setError("Informe o e-mail da sua conta.")
    setError(null)
    setState("busy")
    const r = await postJson<{ emailEnabled?: boolean }>("/api/auth/forgot", { email: to }).catch(() => null)
    if (!r?.ok) {
      setState("idle")
      return setError(r?.data.error ?? "Sem conexão. Tente de novo.")
    }
    setState(r.data.emailEnabled ? "sent" : "manual")
  }
  return (
    <details className="evo-forgot mt-4">
      <summary>Esqueci minha senha</summary>
      <div className="space-y-3 pt-2 text-sm text-muted">
        {state === "sent" ? (
          <p role="status" className="text-fg">
            Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora. Confira também a caixa de spam.
          </p>
        ) : state === "manual" ? (
          <p role="status">
            A recuperação por e-mail ainda não está ativa. Fale com o suporte do EVOFIT
            {SUPPORT ? (
              <>
                {" "}
                em{" "}
                <a className="font-semibold text-accent hover:underline" href={`mailto:${SUPPORT}?subject=${encodeURIComponent("Nova senha do EVOFIT")}`}>
                  {SUPPORT}
                </a>
              </>
            ) : null}{" "}
            usando o e-mail da sua conta: você recebe uma senha provisória.
          </p>
        ) : (
          <form onSubmit={send} noValidate className="space-y-2">
            <Field label="E-mail da sua conta">
              {(p) => <input {...p} className="input" type="email" autoComplete="email" value={mail || initial} maxLength={254} onChange={(e) => setMail(e.target.value)} />}
            </Field>
            <FormError message={error} />
            <button type="submit" className="btn btn-outline w-full" disabled={state === "busy"}>
              {state === "busy" ? <span className="spinner" aria-hidden /> : null} Enviar link para criar nova senha
            </button>
          </form>
        )}
        <p>
          <b className="text-fg">Aluno sem e-mail:</b> peça ao seu personal uma nova senha provisória. Ele gera na sua ficha, em “Acesso ao app”.
        </p>
      </div>
    </details>
  )
}
