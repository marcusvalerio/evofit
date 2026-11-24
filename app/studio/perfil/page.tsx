"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { Camera, Check, ExternalLink, Eye, EyeOff, Inbox, Trash2 } from "@/components/icons"
import { update, useData, useIsDemo } from "@/lib/store"
import type { AccentChoice, Modality, TrainerProfile } from "@/lib/types"
import { MODALITY_LABEL, SPECIALTIES } from "@/lib/types"
import { PHOTO_MAX } from "@/lib/validate"
import { removeContactRequest, saveProfile, validateProfile } from "@/lib/actions"
import { fmtDate, fmtTime } from "@/lib/date"
import { Avatar, ConfirmDialog, Field, PageHeader, cx, revealFirstError } from "@/components/ui"
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
    if (Object.keys(errors).length) return (revealFirstError(), toast("Revise os campos destacados.", "error"))
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

          <section className="card grid gap-4 p-5 sm:grid-cols-2" aria-labelledby="social-title">
            <div className="sm:col-span-2">
              <h2 id="social-title" className="t-h2">
                Contato no perfil público
              </h2>
              <p className="mt-1 text-sm text-muted">Quem encontrar você no diretório chama no WhatsApp ou conhece seu trabalho no Instagram com um toque. Deixe em branco para não exibir.</p>
            </div>
            <Field label="WhatsApp (opcional)" error={show.whatsapp} hint="Com DDD. Ex.: (11) 98765-4321">
              {(p) => <input {...p} className="input" inputMode="tel" autoComplete="tel" value={v.whatsapp} maxLength={20} onChange={(e) => set("whatsapp", e.target.value)} />}
            </Field>
            <Field label="Instagram (opcional)" error={show.instagram} hint="Seu usuário, com ou sem @.">
              {(p) => <input {...p} className="input" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={v.instagram} maxLength={60} placeholder="@seuperfil" onChange={(e) => set("instagram", e.target.value)} />}
            </Field>
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
                <span className="text-muted">Só nome, chamada, sobre, cidade/região, modalidade, especialidades, registro, WhatsApp e Instagram (se informados) ficam públicos. A chave Pix nunca aparece.</span>
              </span>
            </label>
            <p className={cx("mt-3 flex items-center gap-2 text-sm font-medium", profile.directoryVisible ? "text-success" : "text-muted")}>
              {profile.directoryVisible ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
              {profile.directoryVisible ? "Visível no diretório" : "Oculto do diretório"}
            </p>
          </section>

          <PhotoBlock name={v.name} accent={v.accent} photo={v.photo ?? null} onChange={(photo) => set("photo", photo)} />

          <section className="card p-5" aria-labelledby="cor-title">
            <h2 id="cor-title" className="t-h2">
              Cor do perfil
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={v.name || "?"} accent={v.accent} src={v.photo} size="lg" />
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

const READ_MAX = 15 * 1024 * 1024
const PHOTO_SIDE = 320

/** Corta o quadrado central e reduz para 320×320 em JPEG (qualidade 0.82). */
async function toSquareJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    if (!side) throw new Error("decode")
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = PHOTO_SIDE
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas")
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE)
    return canvas.toDataURL("image/jpeg", 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function PhotoBlock({ name, accent, photo, onChange }: { name: string; accent: AccentChoice; photo: string | null; onChange: (p: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    if (!file.type.startsWith("image/")) return setError("Esse arquivo não é uma imagem. Escolha uma foto (JPEG, PNG, WebP ou HEIC).")
    if (file.size > READ_MAX) return setError("Essa imagem é grande demais para ler (mais de 15 MB). Escolha outra ou tire uma nova foto.")
    setBusy(true)
    try {
      const data = await toSquareJpeg(file)
      if (data.length > PHOTO_MAX) return setError("Não foi possível reduzir essa foto para menos de 300 KB. Tente outra imagem.")
      onChange(data)
    } catch {
      setError("Não foi possível abrir essa imagem. Tente outro arquivo.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-5" aria-labelledby="foto-title">
      <h2 id="foto-title" className="t-h2">
        Foto
      </h2>
      <p className="mt-1 text-sm text-muted">Aparece no app e para os seus alunos. Cortamos no centro em formato quadrado.</p>
      <div className="mt-3 flex items-center gap-4">
        <Avatar name={name || "?"} accent={accent} src={photo} size="xl" />
        <div className="flex flex-col gap-2">
          <button type="button" className="btn btn-outline min-h-11" onClick={() => input.current?.click()} disabled={busy}>
            <Camera size={18} aria-hidden /> {busy ? "Processando…" : photo ? "Trocar foto" : "Escolher foto"}
          </button>
          {photo && (
            <button type="button" className="btn btn-ghost min-h-11" onClick={() => (setError(null), onChange(null))}>
              <Trash2 size={18} aria-hidden /> Remover
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={pick} />
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {photo && !error && <p className="mt-3 text-sm text-muted">Prévia. Toque em Salvar perfil para aplicar.</p>}
    </section>
  )
}
