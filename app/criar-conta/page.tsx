"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { UserPlus } from "@/components/icons"
import { postJson, hardNavigate } from "@/lib/account-client"
import { Field } from "@/components/ui"
import { AuthCard, FormError, PasswordField } from "@/components/auth-form"

export default function CriarContaPage() {
  const [v, setV] = useState({ name: "", email: "", password: "" })
  // vindo da landing: /criar-conta?email=...&perfil=...
  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get("email")
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lido só no navegador, depois da hidratação
    if (email) setV((cur) => (cur.email ? cur : { ...cur, email: email.slice(0, 254) }))
  }, [])
  const [accept, setAccept] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const f: Record<string, string> = {}
    if (v.name.trim().length < 2) f.name = "Informe seu nome."
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) f.email = "Informe um e-mail válido."
    const pw = v.password
    if (pw.length < 10 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw))
      f.password = "Use 10 caracteres ou mais, com letra maiúscula, minúscula, número e símbolo."
    if (!accept) f.accept = "Confirme para continuar."
    setFields(f)
    if (Object.keys(f).length) return
    setBusy(true)
    setError(null)
    const r = await postJson("/api/auth/signup", { ...v, acceptTerms: accept }).catch(() => null)
    if (r?.ok) return hardNavigate("/studio")
    setBusy(false)
    setFields(r?.data.fields ?? {})
    setError(r?.data.fields ? null : (r?.data.error ?? "Sem conexão. Tente de novo."))
  }

  return (
    <AuthCard
      eyebrow="Para personal trainers"
      title="Criar sua conta"
      footer={
        <p>
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-accent hover:underline">
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Seu nome profissional" error={fields.name}>
          {(p) => <input {...p} className="input" autoComplete="name" value={v.name} maxLength={80} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />}
        </Field>
        <Field label="E-mail" error={fields.email}>
          {(p) => <input {...p} className="input" type="email" autoComplete="email" inputMode="email" value={v.email} maxLength={254} onChange={(e) => setV({ ...v, email: e.target.value })} />}
        </Field>
        <PasswordField value={v.password} onChange={(password) => setV({ ...v, password })} error={fields.password} autoComplete="new-password" hint="10+ caracteres, com maiúscula, minúscula, número e símbolo." />
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" checked={accept} onChange={(e) => setAccept(e.target.checked)} aria-invalid={fields.accept ? true : undefined} />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="font-semibold text-accent underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-accent underline">
              Política de Privacidade
            </Link>
            . Sou responsável pelos dados dos meus alunos e só os incluirei com o consentimento deles.
          </span>
        </label>
        {fields.accept && <p className="field-error -mt-2">{fields.accept}</p>}
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden /> : <UserPlus size={18} aria-hidden />} Criar conta
        </button>
        <p className="text-xs text-muted">Sua conta começa vazia: cadastre seus alunos e monte a primeira ficha em minutos.</p>
      </form>
    </AuthCard>
  )
}
