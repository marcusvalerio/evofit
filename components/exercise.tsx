"use client"
import { useEffect, useState, useSyncExternalStore } from "react"
import { AlertTriangle, Dumbbell, ExternalLink, Pause, Play, PlayCircle, Volume2, VolumeX } from "lucide-react"
import type { DemoData } from "@/lib/types"
import { LEVEL_LABEL } from "@/lib/types"
import { FORCE_LABEL, MECHANIC_LABEL, frameUrl, getExercise, loadDetail, type ExerciseDetail, type ExerciseView } from "@/lib/catalog"
import { parseVideoUrl } from "@/lib/video"
import { cx } from "./ui"

/* ---------- Demonstração animada (quadros de início e fim) ---------- */

/**
 * Alterna entre a posição inicial e final do movimento, como um GIF leve.
 * Com "reduzir movimento" ativo, os dois quadros aparecem lado a lado, sem animação.
 */
export function ExerciseDemo({ ex, className, compact }: { ex: ExerciseView; className?: string; compact?: boolean }) {
  const [paused, setPaused] = useState(false)
  if (ex.frames < 2) return <DemoPlaceholder ex={ex} className={className} />
  return (
    <figure className={cx("demo", paused && "demo-paused", className)} aria-label={`Demonstração: ${ex.name}`}>
      <div className="demo-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagens estáticas já otimizadas (webp 480px) */}
        <img src={frameUrl(ex.id, 0)} alt={`${ex.name} — posição inicial`} className="demo-frame demo-a" width={480} height={320} decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frameUrl(ex.id, 1)} alt={`${ex.name} — posição final`} className="demo-frame demo-b" width={480} height={320} decoding="async" />
        <span className="demo-label demo-label-a" aria-hidden>
          Início
        </span>
        <span className="demo-label demo-label-b" aria-hidden>
          Fim
        </span>
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
  if (ex.frames < 2)
    return (
      <span className={cx("thumb grid place-items-center bg-accent-soft text-accent", className)} aria-hidden>
        <Dumbbell size={18} />
      </span>
    )
  return (
    <span className={cx("thumb", className)} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frameUrl(ex.id, 0)} alt="" loading="lazy" decoding="async" width={480} height={320} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frameUrl(ex.id, 1)} alt="" loading="lazy" decoding="async" width={480} height={320} className="thumb-b" />
    </span>
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
