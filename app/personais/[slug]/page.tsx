"use client"
import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BadgeCheck, MapPin, MessageSquare, ShieldCheck } from "lucide-react"
import { update, useDemoState } from "@/lib/store"
import { directoryList } from "@/lib/directory"
import { MODALITY_LABEL } from "@/lib/types"
import { addContactRequest, validateContact, type ContactInput } from "@/lib/actions"
import { Avatar, Field, LoadingScreen, NotFoundState } from "@/components/ui"
import { useToast } from "@/components/providers"

export default function PerfilPublico() {
  const { slug } = useParams<{ slug: string }>()
  const { data } = useDemoState()
  if (!data) return <LoadingScreen label="Carregando perfil" />
  const profile = directoryList(data.profile).find((p) => p.slug === slug)
  // Perfis sem opt-in não são exibidos, mesmo acessando a URL diretamente.
  if (!profile) {
    return (
      <NotFoundState title="Perfil indisponível" href="/personais" cta="Voltar ao diretório">
        Este profissional não existe ou optou por não aparecer no diretório.
      </NotFoundState>
    )
  }
  const own = profile.slug === data.profile.slug

  return (
    <div className="fade-in">
      <Link href="/personais" className="btn btn-ghost btn-sm -ml-3 mb-4">
        <ArrowLeft size={16} aria-hidden /> Diretório
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <article className="card overflow-hidden">
          <div className="h-24 bg-inverse sm:h-32" aria-hidden />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-10 rounded-full sm:-mt-12">
              <span className="inline-block rounded-full ring-4 ring-[var(--surface)]">
                <Avatar name={profile.name} accent={profile.accent} size="xl" />
              </span>
            </div>
            <h1 className="t-h1 mt-3">{profile.name}</h1>
            <p className="mt-1 text-lg">{profile.headline}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin size={15} aria-hidden />
                {profile.region ? `${profile.region} · ` : ""}
                {profile.city}/{profile.state}
              </span>
              <span className="badge badge-accent">{MODALITY_LABEL[profile.modality]}</span>
              {profile.registry && (
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck size={15} aria-hidden /> Registro informado pelo profissional: {profile.registry}
                </span>
              )}
            </p>
            {profile.bio && (
              <section className="mt-6" aria-labelledby="sobre">
                <h2 id="sobre" className="t-eyebrow">
                  Sobre
                </h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{profile.bio}</p>
              </section>
            )}
            <section className="mt-6" aria-labelledby="esp">
              <h2 id="esp" className="t-eyebrow">
                Especialidades
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {profile.specialties.map((s) => (
                  <li key={s} className="badge h-8 px-3 text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
            <p className="mt-6 rounded-xl border border-line px-4 py-3 text-sm text-muted">
              {own ? "Este é o seu perfil de demonstração, editável no Studio → Perfil." : "Perfil fictício criado para demonstrar o diretório. Não representa uma pessoa real."}
            </p>
          </div>
        </article>

        <ContactForm slug={profile.slug} name={profile.name} own={own} />
      </div>
    </div>
  )
}

function ContactForm({ slug, name, own }: { slug: string; name: string; own: boolean }) {
  const toast = useToast()
  const [v, setV] = useState<ContactInput>({ name: "", contact: "", message: "" })
  const [consent, setConsent] = useState(false)
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState(false)
  const errors = validateContact(v)
  const show = tried ? errors : {}

  if (sent) {
    return (
      <aside className="card h-fit p-5" aria-live="polite">
        <ShieldCheck size={28} aria-hidden className="text-success" />
        <h2 className="t-h2 mt-3">Solicitação registrada na demonstração</h2>
        <p className="mt-2 text-sm text-muted">
          {own
            ? "Ela já aparece em Studio → Perfil → Solicitações de contato, neste navegador."
            : "Nada foi enviado: este perfil é fictício e a demonstração não possui envio real de mensagens."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {own && (
            <Link href="/studio/perfil#solicitacoes" className="btn btn-primary">
              Ver no Studio
            </Link>
          )}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSent(false)
              setV({ name: "", contact: "", message: "" })
              setTried(false)
              setConsent(false)
            }}
          >
            Nova solicitação
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="card h-fit p-5" aria-labelledby="contato">
      <h2 id="contato" className="t-h2 flex items-center gap-2">
        <MessageSquare size={20} aria-hidden /> Solicitar contato
      </h2>
      <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-sm">
        <strong>Demonstração:</strong> a mensagem fica salva somente neste navegador e não é enviada a {name.split(" ")[0]}. Não use dados reais.
      </p>
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
          if (Object.keys(errors).length || !consent) return
          update((d) => addContactRequest(d, slug, v))
          setSent(true)
          toast("Solicitação registrada (demonstração).")
        }}
      >
        <Field label="Seu nome" error={show.name}>
          {(p) => <input {...p} className="input" value={v.name} maxLength={80} autoComplete="off" onChange={(e) => setV({ ...v, name: e.target.value })} />}
        </Field>
        <Field label="Como prefere ser contatado" error={show.contact} hint="Ex.: e-mail ou telefone — use um valor fictício.">
          {(p) => <input {...p} className="input" value={v.contact} maxLength={120} autoComplete="off" onChange={(e) => setV({ ...v, contact: e.target.value })} />}
        </Field>
        <Field label="Objetivo (opcional)" error={show.message}>
          {(p) => <textarea {...p} className="input" rows={3} value={v.message} maxLength={500} onChange={(e) => setV({ ...v, message: e.target.value })} />}
        </Field>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={tried && !consent ? true : undefined} />
          <span>Entendo que esta é uma demonstração e autorizo o registro destes dados neste navegador.</span>
        </label>
        {tried && !consent && <p className="field-error -mt-2">Confirme a autorização para continuar.</p>}
        <button type="submit" className="btn btn-primary w-full">
          Registrar solicitação
        </button>
      </form>
    </aside>
  )
}
