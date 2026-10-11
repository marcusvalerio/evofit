"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Smartphone } from "lucide-react"
import { postJson, hardNavigate } from "@/lib/account-client"
import { Field, LoadingScreen, NotFoundState } from "@/components/ui"
import { AuthCard, FormError, PasswordField } from "@/components/auth-form"

type Info = { trainerName: string; studentName: string }

export default function ConvitePage() {
  const { code } = useParams<{ code: string }>()
  const [info, setInfo] = useState<{ code: string; info: Info | null; error?: string } | null>(null)
  const [v, setV] = useState({ email: "", password: "" })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/invites/${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: (await r.json().catch(() => ({}))) as Info & { error?: string } }))
      .then((r) => alive && setInfo({ code, info: r.ok ? r.body : null, error: r.body.error }))
      .catch(() => alive && setInfo({ code, info: null, error: "Sem conexão. Recarregue a página." }))
    return () => {
      alive = false
    }
  }, [code])

  if (!info || info.code !== code) return <LoadingScreen label="Verificando convite" />
  if (!info.info)
    return (
      <NotFoundState title="Convite indisponível" href="/" cta="Ir para o início">
        {info.error ?? "Convite inválido ou expirado. Peça um novo ao seu personal."}
      </NotFoundState>
    )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const f: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) f.email = "Informe um e-mail válido."
    if (v.password.length < 8) f.password = "A senha precisa ter pelo menos 8 caracteres."
    setFields(f)
    if (Object.keys(f).length) return
    setBusy(true)
    setError(null)
    const r = await postJson(`/api/invites/${encodeURIComponent(code)}`, v).catch(() => null)
    if (r?.ok) return hardNavigate("/aluno")
    setBusy(false)
    setFields(r?.data.fields ?? {})
    setError(r?.data.fields ? null : (r?.data.error ?? "Sem conexão. Tente de novo."))
  }

  const first = info.info.studentName.split(" ")[0]
  return (
    <AuthCard
      eyebrow={`Convite de ${info.info.trainerName}`}
      title={`Oi, ${first}! Crie seu acesso`}
      footer={
        <p>
          Já criou?{" "}
          <Link href="/entrar" className="font-semibold text-accent hover:underline">
            Entrar
          </Link>
        </p>
      }
    >
      <p className="mb-4 flex gap-2 text-sm text-muted">
        <Smartphone size={18} aria-hidden className="shrink-0 text-accent" />
        Com o acesso você vê os treinos que {info.info.trainerName.split(" ")[0]} montou, registra cargas e séries e acompanha sua evolução.
      </p>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="E-mail" error={fields.email}>
          {(p) => <input {...p} className="input" type="email" autoComplete="email" inputMode="email" value={v.email} maxLength={254} onChange={(e) => setV({ ...v, email: e.target.value })} autoFocus />}
        </Field>
        <PasswordField value={v.password} onChange={(password) => setV({ ...v, password })} error={fields.password} autoComplete="new-password" hint="Mínimo de 8 caracteres." />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
          {busy && <span className="spinner" aria-hidden />} Criar acesso e ver meus treinos
        </button>
      </form>
    </AuthCard>
  )
}
