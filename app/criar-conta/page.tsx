"use client"
import { useState } from "react"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { postJson, hardNavigate } from "@/lib/account-client"
import { Field } from "@/components/ui"
import { AuthCard, FormError, PasswordField } from "@/components/auth-form"

export default function CriarContaPage() {
  const [v, setV] = useState({ name: "", email: "", password: "" })
  const [accept, setAccept] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const f: Record<string, string> = {}
    if (v.name.trim().length < 2) f.name = "Informe seu nome."
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) f.email = "Informe um e-mail válido."
    if (v.password.length < 8) f.password = "A senha precisa ter pelo menos 8 caracteres."
    if (!accept) f.accept = "Confirme para continuar."
    setFields(f)
    if (Object.keys(f).length) return
    setBusy(true)
    setError(null)
    const r = await postJson("/api/auth/signup", v).catch(() => null)
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
        <PasswordField value={v.password} onChange={(password) => setV({ ...v, password })} error={fields.password} autoComplete="new-password" hint="Mínimo de 8 caracteres." />
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" checked={accept} onChange={(e) => setAccept(e.target.checked)} aria-invalid={fields.accept ? true : undefined} />
          <span>Sou responsável pelos dados dos meus alunos cadastrados aqui e só os incluirei com o consentimento deles.</span>
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
