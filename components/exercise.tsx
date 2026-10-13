"use client"
import { useEffect, useState, useSyncExternalStore } from "react"
import { AlertTriangle, Download, Dumbbell, ExternalLink, Link2, Pause, Play, PlayCircle, Share2, Volume2, VolumeX } from "lucide-react"
import type { DemoData } from "@/lib/types"
import { LEVEL_LABEL } from "@/lib/types"
import { FORCE_LABEL, MECHANIC_LABEL, animUrl, frameUrl, getExercise, libraryUrl, loadDetail, type ExerciseDetail, type ExerciseView } from "@/lib/catalog"
import { parseVideoUrl } from "@/lib/video"
import { cx } from "./ui"
import { useToast } from "./providers"

/* ---------- Ilustrações vetoriais EVOFIT ---------- */

function illustrationFor(ex: ExerciseView): string {
  let hash = 2166136261
  for (const char of ex.id) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  const slug = ex.id.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "exercise"
  const key = slug + "-" + (hash >>> 0).toString(36)
  return `/illustrations/catalog/${key}.svg`
}

/* ---------- Demonstração animada (quadros de início e fim) ---------- */

/**
 * Alterna entre a posição inicial e final do movimento, como um GIF leve.
 * Com "reduzir movimento" ativo, os dois quadros aparecem lado a lado, sem animação.
 */
export function ExerciseDemo({ ex, className, compact }: { ex: ExerciseView; className?: string; compact?: boolean }) {
  const [paused, setPaused] = useState(false)
  if (ex.custom) return <DemoPlaceholder ex={ex} className={className} />
  return (
    <figure className={cx("demo", paused && "demo-paused", className)} aria-label={`Demonstração vetorial: ${ex.name}`}>
      <div className="demo-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG vetorial gerado para cada exercício do catálogo */}
        <img src={illustrationFor(ex)} alt={ex.name + " — duas fases do movimento"} className="size-full object-contain" width={480} height={320} decoding="async" />
      </div>
      {!compact && (
        <button
          type="button"
          className="demo-toggle btn btn-sm btn-icon btn-pill glass"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Retomar animação" : "Pausar animação"}
          aria-pressed={paused}
        >
          {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
        </button>
      )}
    </figure>
  )
}

function DemoPlaceholder({ ex, className }: { ex: ExerciseView; className?: string }) {
  return (
    <div className={cx("demo demo-empty", className)}>
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Dumbbell size={22} aria-hidden />
        </span>
        <p className="text-sm font-semibold">{ex.group}</p>
        <p className="max-w-[16rem] text-xs text-muted">{ex.custom ? "Exercício próprio — adicione um vídeo para o aluno ver a execução." : "Sem imagem no catálogo para este exercício."}</p>
      </div>
    </div>
  )
}

/** Miniatura para listas. Ao passar o mouse (ou focar o card) mostra a posição final. */
export function ExerciseThumb({ ex, className }: { ex: ExerciseView; className?: string }) {
  if (ex.custom)
    return (
      <span className={cx("thumb grid place-items-center bg-accent-soft text-accent", className)} aria-hidden>
        <Dumbbell size={18} />
      </span>
    )
  return (
    <span className={cx("thumb", className)} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG vetorial gerado para cada exercício do catálogo */}
      <img src={illustrationFor(ex)} alt="" loading="lazy" decoding="async" width={480} height={320} />
    </span>
  )
}

/* ---------- GIF da Biblioteca EVOFIT ---------- */

/** Animação com a marca EVOFIT (gerada no servidor). Mostra a demonstração local enquanto carrega ou se falhar. */
export function AnimatedExercise({ ex, className }: { ex: ExerciseView; className?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading")
  if (ex.frames < 2 || ex.custom) return <ExerciseDemo ex={ex} className={className} />
  return (
    <div className={cx("relative overflow-hidden rounded-2xl border border-line bg-brand-cobblestone", className)} style={{ aspectRatio: "480 / 380" }}>
      {state !== "ok" && <ExerciseDemo ex={ex} compact className="!absolute inset-x-0 top-0 !rounded-none !border-0" />}
      {state !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element -- GIF animado gerado pela rota /api/gif
        <img
          src={animUrl(ex.id, "webp")}
          alt={`Animação EVOFIT: ${ex.name}, da posição inicial à final`}
          width={480}
          height={380}
          className={cx("absolute inset-0 size-full transition-opacity duration-500", state === "ok" ? "opacity-100" : "opacity-0")}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
      )}
    </div>
  )
}

/** Baixar o GIF, compartilhar (WhatsApp etc. pelo menu do celular) ou copiar o link da biblioteca pública. */
export function GifActions({ ex, compact }: { ex: ExerciseView; compact?: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (ex.custom || ex.frames < 2) return null
  const pageUrl = () => new URL(libraryUrl(ex.id), window.location.origin).toString()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl())
      toast("Link copiado. Cole no WhatsApp ou onde preferir.")
    } catch {
      toast("Não foi possível copiar o link neste navegador.", "info")
    }
  }

  const share = async () => {
    if (!("share" in navigator)) return copy()
    setBusy(true)
    try {
      const res = await fetch(animUrl(ex.id, "gif"))
      const file = res.ok ? new File([await res.blob()], `evofit-${ex.id.toLowerCase()}.gif`, { type: "image/gif" }) : null
      const data: ShareData = file && navigator.canShare?.({ files: [file] }) ? { files: [file], title: ex.name, text: `${ex.name} — Biblioteca EVOFIT` } : { title: ex.name, text: `${ex.name} — Biblioteca EVOFIT`, url: pageUrl() }
      await navigator.share(data)
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") await copy()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a href={animUrl(ex.id, "gif", true)} download className={cx("btn btn-outline", compact && "btn-sm")}>
        <Download size={16} aria-hidden /> Baixar GIF
      </a>
      <button type="button" className={cx("btn btn-outline", compact && "btn-sm")} onClick={share} disabled={busy}>
        {busy ? <span className="spinner" aria-hidden /> : <Share2 size={16} aria-hidden />} Compartilhar
      </button>
      <button type="button" className={cx("btn btn-ghost", compact && "btn-sm")} onClick={copy}>
        <Link2 size={16} aria-hidden /> Copiar link
      </button>
    </div>
  )
}

/* ---------- Vídeo próprio do personal ---------- */

/** Só carrega o player de terceiros quando a pessoa pede (privacidade e dados móveis). */
export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const [on, setOn] = useState(false)
  const src = parseVideoUrl(url)
  if (!src) return null
  const provider = { youtube: "YouTube", vimeo: "Vimeo", drive: "Google Drive", file: "arquivo de vídeo" }[src.kind]
  return (
    <div>
      <div className="video">
        {!on ? (
          <button type="button" className="video-cover" onClick={() => setOn(true)}>
            <PlayCircle size={52} strokeWidth={1.5} aria-hidden className="video-play" />
            <span className="font-semibold">Assistir vídeo do personal</span>
            <span className="text-xs opacity-80">Carrega o player do {provider}</span>
          </button>
        ) : src.kind === "file" ? (
          <video src={src.src} controls playsInline preload="metadata" autoPlay className="size-full bg-black" aria-label={title} />
        ) : (
          <iframe
            src={src.embed + (src.kind === "youtube" ? "&autoplay=1" : src.kind === "vimeo" ? "&autoplay=1" : "")}
            title={title}
            className="size-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        )}
      </div>
      <a href={src.watch} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg">
        Abrir no {provider} <ExternalLink size={12} aria-hidden />
      </a>
    </div>
  )
}

/* ---------- Passo a passo ---------- */

export function useExerciseDetail(id: string, enabled = true) {
  const [state, setState] = useState<{ id: string; detail: ExerciseDetail | null; done: boolean } | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    loadDetail(id).then((detail) => {
      if (alive) setState({ id, detail, done: true })
    })
    return () => {
      alive = false
    }
  }, [id, enabled])
  const current = state?.id === id ? state : null
  return { detail: current?.detail ?? null, loading: enabled && !current?.done }
}

const subscribeNothing = () => () => {}
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"

/** Lê o passo a passo em voz alta (Web Speech API do próprio navegador). */
function SpeakButton({ text }: { text: string }) {
  const supported = useSyncExternalStore(subscribeNothing, canSpeak, () => false)
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => () => {
    if (canSpeak()) window.speechSynthesis.cancel()
  }, [])
  if (!supported) return null
  const toggle = () => {
    const s = window.speechSynthesis
    if (speaking) {
      s.cancel()
      setSpeaking(false)
      return
    }
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "pt-BR"
    u.rate = 0.95
    const voice = s.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt"))
    if (voice) u.voice = voice
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    s.speak(u)
  }
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={toggle} aria-pressed={speaking}>
      {speaking ? <VolumeX size={15} aria-hidden /> : <Volume2 size={15} aria-hidden />}
      {speaking ? "Parar" : "Ouvir"}
    </button>
  )
}

export function StepList({ ex }: { ex: ExerciseView }) {
  const { detail, loading } = useExerciseDetail(ex.id, !ex.custom)
  const steps = ex.custom ? ex.instructions.split(/\n+|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).map((s) => s.trim()).filter(Boolean) : (detail?.steps ?? [])
  return (
    <section aria-labelledby={`passos-${ex.id}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={`passos-${ex.id}`} className="t-eyebrow">
          Passo a passo
        </h3>
        {steps.length > 0 && <SpeakButton text={`${ex.name}. ${steps.map((s, i) => `Passo ${i + 1}. ${s}`).join(" ")}`} />}
      </div>
      {loading ? (
        <div className="space-y-2" role="status" aria-label="Carregando passo a passo">
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-9/12" />
          <div className="skeleton h-4 w-10/12" />
        </div>
      ) : steps.length ? (
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={i} style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              {s}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">{ex.custom ? "Sem instruções escritas para este exercício." : "Não foi possível carregar o passo a passo. Verifique a conexão e tente de novo."}</p>
      )}
      {detail && (detail.mechanic || detail.force) && (
        <p className="mt-3 flex flex-wrap gap-1.5">
          {detail.mechanic && MECHANIC_LABEL[detail.mechanic] && <span className="badge">{MECHANIC_LABEL[detail.mechanic]}</span>}
          {detail.force && FORCE_LABEL[detail.force] && <span className="badge">{FORCE_LABEL[detail.force]}</span>}
        </p>
      )}
    </section>
  )
}

export function MuscleChips({ ex }: { ex: ExerciseView }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ex.primary.map((m) => (
        <span key={m} className="badge badge-accent">
          {m}
        </span>
      ))}
      {ex.secondary.map((m) => (
        <span key={m} className="badge">
          {m}
        </span>
      ))}
    </div>
  )
}

/* ---------- Guia completo (aluno e personal) ---------- */

export function ExerciseGuide({ d, id, showMeta = true }: { d: DemoData; id: string; showMeta?: boolean }) {
  const ex = getExercise(d, id)
  if (!ex) return <p className="text-muted">Exercício não encontrado.</p>
  const media = d.exerciseMedia[id]
  const hasVideo = !!(media?.videoUrl && parseVideoUrl(media.videoUrl))
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {hasVideo && <VideoPlayer url={media!.videoUrl} title={`Vídeo: ${ex.name}`} />}
        <ExerciseDemo ex={ex} className={hasVideo ? "max-w-sm" : undefined} />
        <GifActions ex={ex} compact />
        {media?.tip && (
          <div className="rounded-2xl border border-line bg-accent-soft p-4">
            <p className="t-eyebrow !text-accent">Dica do seu personal</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed">{media.tip}</p>
          </div>
        )}
      </div>
      <div className="space-y-5">
        {showMeta && (
          <div className="space-y-3">
            <MuscleChips ex={ex} />
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Meta label="Equipamento" value={ex.equipment} />
              {ex.level && <Meta label="Nível" value={LEVEL_LABEL[ex.level]} />}
              <Meta label="Tipo" value={ex.category} />
            </dl>
          </div>
        )}
        <StepList ex={ex} />
        <p className="flex gap-2 rounded-xl bg-warning-soft p-3 text-xs leading-relaxed text-warning">
          <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0" />
          Sentiu dor (não confundir com esforço) ou insegurança na execução? Pare o exercício e fale com seu personal antes de continuar.
        </p>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  )
}
