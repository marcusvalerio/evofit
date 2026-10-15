"use client"
import { useState } from "react"
import Link from "next/link"
import { Check, ExternalLink, Eye, EyeOff, Inbox, Trash2 } from "lucide-react"
import { update, useData, useIsDemo } from "@/lib/store"
import type { AccentChoice, Modality, TrainerProfile } from "@/lib/types"
import { MODALITY_LABEL, SPECIALTIES } from "@/lib/types"
import { removeContactRequest, saveProfile, validateProfile } from "@/lib/actions"
import { fmtDate, fmtTime } from "@/lib/date"
import { Avatar, ConfirmDialog, Field, PageHeader, cx } from "@/components/ui"
import { useToast } from "@/components/providers"
import { AccountSection } from "@/components/account-section"

const ACCENTS: { id: AccentChoice; label: string }[] = [
  { id: "otan", label: "Ōtan Red" },
  { id: "gravy", label: "Red Gravy" },
  { id: "cobblestone", label: "Cobblestone" },
  { id: "smoke", label: "Midnight Smoke" },
]

export default function PerfilPage() {
  const d = useData()
  return <ProfileForm key={JSON.stringify(d.profile)} profile={d.profile} />
}

function ProfileForm({ profile }: { profile: TrainerProfile }) {
  const d = useData()
  const toast = useToast()
  const [v, setV] = useState<TrainerProfile>(profile)
  const [tried, setTried] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const demo = useIsDemo()
  const errors = validateProfile(v)
  const show = tried ? errors : {}
  const dirty = JSON.stringify(v) !== JSON.stringify(profile)
  const set = <K extends keyof TrainerProfile>(k: K, val: TrainerProfile[K]) => setV((p) => ({ ...p, [k]: val }))
  const inbox = [...d.contactRequests.filter((c) => c.trainerSlug === profile.slug)].reverse()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errors).length) return toast("Revise os campos destacados.", "error")
    update((x) => saveProfile(x, v))
    toast(v.directoryVisible ? "Perfil salvo e visível no diretório." : "Perfil salvo. Ele não aparece no diretório.")
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Perfil profissional"
        description="Informações exibidas no diretório público quando você opta por aparecer nele."
        actions={
          profile.directoryVisible ? (
            <Link href={`/personais/${profile.slug}`} className="btn btn-outline">
              <ExternalLink size={18} aria-hidden /> Ver perfil público
            </Link>
          ) : undefined
        }
      />

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="card grid gap-4 p-5 sm:grid-cols-2" aria-labelledby="dados-title">
            <h2 id="dados-title" className="t-h2 sm:col-span-2">
              Dados profissionais
            </h2>
            <Field label="Nome profissional" error={show.name}>
              {(p) => <input {...p} className="input" value={v.name} maxLength={80} onChange={(e) => set("name", e.target.value)} />}
            </Field>
            <Field label="Registro profissional (opcional)" hint="Ex.: CREF. Exibido apenas se preenchido; é de sua responsabilidade.">
              {(p) => <input {...p} className="input" value={v.registry} maxLength={30} onChange={(e) => set("registry", e.target.value)} />}
            </Field>
            <Field label="Chamada" error={show.headline} className="sm:col-span-2" hint="Uma frase sobre o seu trabalho.">
              {(p) => <input {...p} className="input" value={v.headline} maxLength={100} onChange={(e) => set("headline", e.target.value)} />}
            </Field>
            <Field label="Sobre" error={show.bio} className="sm:col-span-2">
              {(p) => <textarea {...p} className="input" rows={4} value={v.bio} maxLength={600} onChange={(e) => set("bio", e.target.value)} />}
            </Field>
          </section>

          <section className="card grid gap-4 p-5" aria-labelledby="pix-title">
            <div>
              <h2 id="pix-title" className="t-h2">
                Recebimento
              </h2>
              <p className="mt-1 text-sm text-muted">Vai no lembrete de mensalidade que você envia pelo WhatsApp. Não aparece no seu perfil público. O EVOFIT não recebe nem repassa pagamentos.</p>
            </div>
            <Field label="Chave Pix (opcional)" error={show.pixKey} hint="CPF, e-mail, telefone ou chave aleatória.">
              {(p) => <input {...p} className="input" value={v.pixKey} maxLength={140} autoComplete="off" onChange={(e) => set("pixKey", e.target.value)} />}
            </Field>
          </section>

          <section className="card grid gap-4 p-5 sm:grid-cols-3" aria-labelledby="atend-title">
            <h2 id="atend-title" className="t-h2 sm:col-span-3">
              Atendimento
            </h2>
            <Field label="Cidade" error={show.city}>
              {(p) => <input {...p} className="input" value={v.city} maxLength={60} onChange={(e) => set("city", e.target.value)} />}
            </Field>
            <Field label="UF" error={show.state}>
              {(p) => <input {...p} className="input uppercase" value={v.state} maxLength={2} onChange={(e) => set("state", e.target.value)} />}
            </Field>
            <Field label="Região / bairro" hint="Nunca informe endereço completo.">
              {(p) => <input {...p} className="input" value={v.region} maxLength={60} onChange={(e) => set("region", e.target.value)} />}
            </Field>
            <fieldset className="sm:col-span-3">
              <legend className="field-label">Modalidade</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {(Object.keys(MODALITY_LABEL) as Modality[]).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={v.modality === m} className="chip" onClick={() => set("modality", m)}>
                    {MODALITY_LABEL[m]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="sm:col-span-3">
              <legend className="field-label">Especialidades</legend>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => {
                  const on = v.specialties.includes(s)
                  return (
                    <button key={s} type="button" aria-pressed={on} className="chip" onClick={() => set("specialties", on ? v.specialties.filter((x) => x !== s) : [...v.specialties, s])}>
                      {on && <Check size={14} aria-hidden />} {s}
                    </button>
                  )
                })}
              </div>
              {show.specialties && <p className="field-error">{show.specialties}</p>}
            </fieldset>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-5" aria-labelledby="vis-title">
            <h2 id="vis-title" className="t-h2">
              Diretório público
            </h2>
            <label className="mt-3 flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" checked={v.directoryVisible} onChange={(e) => set("directoryVisible", e.target.checked)} />
              <span className="text-sm">
                <strong className="block text-[0.9375rem]">Aparecer em “Encontrar personal”</strong>
                <span className="text-muted">Só nome, chamada, sobre, cidade/região, modalidade, especialidades e registro (se informado) ficam públicos.</span>
              </span>
            </label>
            <p className={cx("mt-3 flex items-center gap-2 text-sm font-medium", profile.directoryVisible ? "text-success" : "text-muted")}>
              {profile.directoryVisible ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
              {profile.directoryVisible ? "Visível no diretório" : "Oculto do diretório"}
            </p>
          </section>

          <section className="card p-5" aria-labelledby="cor-title">
            <h2 id="cor-title" className="t-h2">
              Cor do perfil
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={v.name || "?"} accent={v.accent} size="lg" />
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de destaque">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={v.accent === a.id}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => set("accent", a.id)}
                    className={cx(
                      "size-9 rounded-full border-2",
                      { otan: "bg-brand-otan", gravy: "bg-brand-gravy", cobblestone: "bg-brand-cobblestone", smoke: "bg-brand-smoke" }[a.id],
                      v.accent === a.id ? "border-fg ring-2 ring-[var(--bg)] ring-inset" : "border-transparent",
                    )}
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="card space-y-2 p-5">
            <button type="submit" className="btn btn-primary w-full" disabled={!dirty}>
              <Check size={18} aria-hidden /> Salvar perfil
            </button>
            <button type="button" className="btn btn-outline w-full" disabled={!dirty} onClick={() => setV(profile)}>
              Descartar alterações
            </button>
          </div>
        </aside>
      </form>

      <section id="solicitacoes" className="card mt-6 scroll-mt-24 p-5" aria-labelledby="sol-title">
        <h2 id="sol-title" className="t-h2 flex items-center gap-2">
          <Inbox size={20} aria-hidden /> Solicitações de contato
        </h2>
        <p className="mt-1 text-sm text-muted">Enviadas pelo seu perfil no diretório.{demo ? " Na demonstração, ficam salvas apenas neste navegador." : " Responda pelo contato informado pela pessoa."}</p>
        {inbox.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
            Nenhuma solicitação. Teste o fluxo em{" "}
            <Link href={`/personais/${profile.slug}`} className="font-semibold text-accent underline">
              seu perfil público
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {inbox.map((c) => (
              <li key={c.id} className="flex gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {c.name} <span className="text-sm font-normal text-muted">· {c.contact}</span>
                  </p>
                  {c.message && <p className="mt-1 text-sm">{c.message}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {fmtDate(c.createdAt)} às {fmtTime(c.createdAt)}
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Excluir solicitação de ${c.name}`} onClick={() => setRemoving(c.id)}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AccountSection />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Excluir solicitação?"
        message={demo ? "A solicitação será removida deste navegador." : "A solicitação será removida da sua conta."}
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          if (removing) update((x) => removeContactRequest(x, removing))
          toast("Solicitação excluída.")
        }}
      />
    </div>
  )
}
