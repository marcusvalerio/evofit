"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Play } from "lucide-react"
import { cx } from "./ui"

/**
 * "O EVOFIT em movimento": gravações reais do app (modo demonstração), uma por funcionalidade.
 * No desktop o aparelho fica fixo enquanto os capítulos passam; no celular cada capítulo traz o seu.
 * Vídeos só tocam quando estão na tela; com "reduzir movimento" ficam parados, com controles.
 */

type Chapter = {
  id: string
  device: "phone" | "laptop"
  kicker: string
  title: string
  text: string
  points: string[]
  href: string
  cta: string
  label: string
}

const CHAPTERS: Chapter[] = [
  {
    id: "studio-painel",
    device: "laptop",
    kicker: "Studio",
    title: "Um painel que diz o que fazer hoje.",
    text: "Abre na Central de ações: quem sumiu, quem está sem ficha e quanto da sua receita está em risco — com o botão de chamar no WhatsApp ao lado.",
    points: ["Radar de evasão em R$", "Aderência e frequência calculadas sozinhas", "Check-in de esforço, dor e sono"],
    href: "/studio",
    cta: "Abrir o painel",
    label: "Gravação do painel do Studio: Central de ações, radar de evasão e indicadores",
  },
  {
    id: "studio-ficha",
    device: "laptop",
    kicker: "Prescrição",
    title: "Ficha montada em minutos, com equilíbrio à vista.",
    text: "Busque entre centenas de exercícios demonstrados, ajuste séries, carga e descanso, e veja o mapa muscular da ficha mudar enquanto monta.",
    points: ["Biblioteca com GIF em português", "Mapa de volume por músculo", "Atribua a vários alunos de uma vez"],
    href: "/studio/treinos",
    cta: "Montar uma ficha",
    label: "Gravação do editor de fichas: busca de exercício e mapa de equilíbrio",
  },
  {
    id: "aluno-treino",
    device: "phone",
    kicker: "App do aluno",
    title: "O aluno treina série a série, até sem internet.",
    text: "Toca para marcar a série, o descanso começa sozinho e, no fim, ele conta como foi. Tudo chega no seu painel na hora.",
    points: ["Cronômetro de descanso com vibração", "Recordes pessoais comemorados", "Funciona offline na academia"],
    href: "/aluno",
    cta: "Testar como aluno",
    label: "Gravação do app do aluno no celular: séries, descanso e check-in pós-treino",
  },
  {
    id: "biblioteca",
    device: "phone",
    kicker: "Biblioteca",
    title: "Cada exercício explicado, do jeito certo.",
    text: "Demonstração animada, músculos trabalhados no mapa do corpo e passo a passo em português. Baixe o GIF ou compartilhe o link.",
    points: ["GIF com a sua marca", "Principal e secundário no mapa", "Seu vídeo e sua dica por cima"],
    href: "/biblioteca",
    cta: "Explorar a biblioteca",
    label: "Gravação da biblioteca no celular: busca e página do exercício",
  },
  {
    id: "studio-caixa",
    device: "laptop",
    kicker: "Caixa",
    title: "Mensalidade sem constrangimento.",
    text: "Veja quem pagou, quem vence e quem atrasou. Marque como paga com um toque ou mande o lembrete pronto, com a sua chave Pix.",
    points: ["Recebido, a receber e vencido", "Lembrete educado no WhatsApp", "O dinheiro vai direto para você"],
    href: "/studio/caixa",
    cta: "Ver o Caixa",
    label: "Gravação do Caixa: mensalidades pagas, a vencer e vencidas",
  },
]

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

function Clip({ c, active, decorative = false }: { c: Chapter; active: boolean; decorative?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [still, setStill] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência do sistema lida no cliente
    setStill(reducedMotion())
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!v || still) return
    let visible = false
    const sync = () => {
      if (active && visible) v.play().catch(() => {})
      else v.pause()
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    }, { threshold: 0.25 })
    io.observe(v)
    sync()
    return () => io.disconnect()
  }, [active, still])

  return (
    <div className={cx("lp-device", c.device === "phone" ? "lp-device-phone" : "lp-device-laptop")}>
      <div className="lp-device-screen">
        <video
          ref={ref}
          src={`/media/${c.id}.mp4`}
          poster={`/media/${c.id}.jpg`}
          muted
          loop
          playsInline
          preload="none"
          controls={still && !decorative}
          tabIndex={decorative ? -1 : undefined}
          aria-label={c.label}
        />
        {still && !decorative && (
          <span className="lp-device-hint" aria-hidden>
            <Play size={14} fill="currentColor" /> toque para ver
          </span>
        )}
      </div>
      {c.device === "laptop" && <div className="lp-device-base" aria-hidden />}
    </div>
  )
}

export function ProductReel() {
  const [active, setActive] = useState(0)
  const steps = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    for (const el of steps.current) if (el) io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="lp-reel ink" aria-labelledby="reel-title" data-chapter={CHAPTERS[active].id}>
      <div className="lp-reel-aura" aria-hidden />
      <div className="lp-reel-head" data-reveal>
        <p className="lp-kicker">Veja funcionando</p>
        <h2 id="reel-title" className="lp-h2 t-athletic">
          O sistema inteiro, <em>em movimento.</em>
        </h2>
        <p className="lp-sub">Gravações reais do EVOFIT no computador e no celular — nada de mockup. Role e acompanhe.</p>
      </div>

      <div className="lp-reel-grid">
        <ol className="lp-reel-steps">
          {CHAPTERS.map((c, i) => (
            <li
              key={c.id}
              ref={(el) => {
                steps.current[i] = el
              }}
              data-i={i}
              id={`ver-${c.id}`}
              className={cx("lp-reel-step", i === active && "is-active")}
            >
              <span className="lp-reel-n" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="lp-reel-kicker">{c.kicker}</p>
              <h3>{c.title}</h3>
              <p className="lp-reel-text">{c.text}</p>
              <ul>
                {c.points.map((p) => (
                  <li key={p}>
                    <Check size={16} aria-hidden /> {p}
                  </li>
                ))}
              </ul>
              <Link href={c.href} className="lp-link">
                {c.cta} <ArrowRight size={16} aria-hidden />
              </Link>
              <div className="lp-reel-inline">
                <Clip c={c} active />
              </div>
            </li>
          ))}
        </ol>

        <div className="lp-reel-stage" aria-hidden>
          <div className="lp-reel-sticky">
            {CHAPTERS.map((c, i) => (
              <div key={c.id} className={cx("lp-reel-slot", i === active && "is-active")}>
                <Clip c={c} active={i === active} decorative />
              </div>
            ))}
            <div className="lp-reel-dots">
              {CHAPTERS.map((c, i) => (
                <span key={c.id} className={cx(i === active && "is-on")} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lp-reel-cta">
        <p className="t-athletic">Tudo isso já está pronto para você testar.</p>
        <Link href="/studio" className="btn btn-primary btn-lg btn-pill">
          Abrir o Studio agora <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </section>
  )
}
