"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, BarChart, Bell, Check, ClipboardList, Clock, Dumbbell, Home, LayoutDashboard, Ruler, Share2, UserRound, Users, Wallet, type EvoIcon } from "@/components/icons"
import { BrandMark } from "./chrome"
import { HexMedal } from "./medal"
import { useReducedMotion } from "./motion"
import { cx } from "./ui"
import { MEDAL_RULES } from "@/lib/medals"
import { storySvg } from "@/lib/whats-new-story"
import { WHATS_NEW, WHATS_NEW_KEY, WHATS_NEW_VERSION, whatsNewDecision, type WhatsNewScene, type WhatsNewWho } from "@/lib/whats-new"

const readSeen = () => {
  try {
    return localStorage.getItem(WHATS_NEW_KEY)
  } catch {
    return null
  }
}
const markSeen = () => {
  try {
    localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION)
  } catch {
    // modo privado sem armazenamento: só não lembra
  }
}

/**
 * Caixa de Novidades: folha inferior no celular, modal em 2 colunas no computador.
 * Aparece uma vez por versão; conta criada depois do lançamento só grava a versão.
 */
export function WhatsNew({ who, ready, createdAt }: { who: WhatsNewWho; ready: boolean; createdAt?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!ready) return
    const d = whatsNewDecision(readSeen(), createdAt)
    if (d === "mark") markSeen()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- decisão depende do localStorage, só existe no navegador
    else if (d === "show") setOpen(true)
  }, [ready, createdAt])
  if (!open) return null
  return <WhatsNewDialog who={who} onDone={() => setOpen(false)} />
}

function WhatsNewDialog({ who, onDone }: { who: WhatsNewWho; onDone: () => void }) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const content = WHATS_NEW[who]
  const slides = content.slides
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(0)
  const [on, setOn] = useState(false)
  const [phase, setPhase] = useState<"" | "out" | "pre">("")
  const [sweep, setSweep] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const closing = useRef(false)
  const s = slides[shown]
  const last = i === slides.length - 1

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    nextRef.current?.focus()
    const html = document.documentElement
    const overflow = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      cancelAnimationFrame(raf)
      html.style.overflow = overflow
      prev?.focus?.()
    }
  }, [])

  const close = useCallback(
    (href?: string) => {
      if (closing.current) return
      closing.current = true
      markSeen()
      setOn(false)
      setTimeout(
        () => {
          onDone()
          if (href) router.push(href)
        },
        reduced ? 0 : 500,
      )
    },
    [onDone, reduced, router],
  )

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= slides.length || to === i) return
      setI(to)
      if (reduced) {
        setShown(to)
        return
      }
      setSweep((n) => n + 1)
      setPhase("out")
      setTimeout(() => {
        setShown(to)
        setPhase("pre")
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase("")))
      }, 260)
    },
    [i, reduced, slides.length],
  )
  const next = useCallback(() => (last ? close(content.href) : go(i + 1)), [last, close, content.href, go, i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      } else if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") go(i - 1)
      else if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>("button:not([disabled])")]
        if (!f.length) return
        const a = f[0],
          z = f[f.length - 1]
        if (!ref.current.contains(document.activeElement)) {
          e.preventDefault()
          a.focus()
        } else if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [close, next, go, i])

  return (
    <div className={cx("wn", reduced && "wn-rm")}>
      <div className={cx("wn-scrim", on && "on")} onClick={() => close()} aria-hidden />
      <div ref={ref} className={cx("wn-modal", on && "on")} role="dialog" aria-modal="true" aria-labelledby="wn-title">
        <div className="wn-head">
          <div className="wn-brand">
            <BrandMark size={20} className="text-[var(--petroleo)]" />
            Novidades
          </div>
          <button type="button" className="wn-skip" onClick={() => close()}>
            Pular
          </button>
        </div>
        <div className="wn-prog" aria-hidden>
          {slides.map((_, k) => (
            <i key={k} className={k < i ? "done" : k === i ? "now" : undefined} />
          ))}
        </div>
        <div className="wn-body">
          <div className="wn-ill" aria-hidden>
            <div className="wn-aura" />
            <div className="wn-grain" />
            <div key={`${who}-${shown}`} className={cx("wn-scene", reduced ? "wn-static" : "wn-play")}>
              <Scene scene={s.scene} who={who} play={!reduced} />
            </div>
            {!reduced && <div key={sweep} className={cx("wn-faixa", sweep > 0 && "go")} />}
          </div>
          <div className="wn-right">
            <div className="wn-txt">
              <div className={cx("wn-in", phase)}>
                <span className="wn-tag">
                  <span>
                    <i className="dot" />
                    {s.tag}
                  </span>
                </span>
                <h2 id="wn-title">{s.title}</h2>
                <p>{s.text}</p>
              </div>
            </div>
            <p className="sr-only" aria-live="polite">
              Novidade {i + 1} de {slides.length}
            </p>
            <div className="wn-foot">
              <button type="button" className="wn-back" aria-label="Voltar" disabled={i === 0} onClick={() => go(i - 1)}>
                <ArrowLeft size={24} aria-hidden />
              </button>
              <button ref={nextRef} type="button" className="wn-cta" onClick={next}>
                <span>{last ? content.end : "Próximo"}</span>
                <ArrowRight size={24} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Cenas ---------- */

const d = (ms: number) => ({ ["--d" as string]: ms }) as React.CSSProperties

function Scene({ scene, who, play }: { scene: WhatsNewScene; who: WhatsNewWho; play: boolean }) {
  switch (scene) {
    case "chat":
      return (
        <>
          <span className="wn-ex">Exemplo</span>
          <div className="wn-chat">
            <div className="wn-bub ele wn-pop" style={d(200)}>
              Como foi o supino hoje?
            </div>
            <div className="wn-bub eu wn-pop" style={d(800)}>
              <div className="wn-serie">
                <Dumbbell size={16} aria-hidden />
                Supino · série 3 · <span className="wn-num">40 kg × 8</span>
              </div>
              Pesou no fim. Mantenho?
            </div>
            <div className="wn-st wn-pop" style={d(1100)}>
              <span className="env">Enviada</span>
              <span className="vis">
                <Check size={14} aria-hidden /> Vista
              </span>
            </div>
          </div>
        </>
      )
    case "avisos":
      return (
        <>
          <div className="wn-toggle wn-card wn-pop">
            <Bell size={20} aria-hidden />
            Avisos <span className="wn-sw" />
          </div>
          <div className="wn-phone">
            <div className="wn-clock">07:42</div>
            <div className="wn-date">Exemplo</div>
            <div className="wn-notif">
              <span className="app">
                <BrandMark size={16} className="text-[var(--verde-agua)]" />
              </span>
              <span>
                <b>Nova mensagem</b>
                <br />
                Seu personal respondeu no chat.
              </span>
            </div>
          </div>
        </>
      )
    case "medalhas":
      return (
        <div className="wn-meds">
          {MEDAL_RULES.map((m, k) => (
            <div key={m.level} className="medal-card wn-pop" style={d(150 + k * 200)}>
              <HexMedal level={m.level} size={56} />
              <b>{m.title}</b>
              <small>{m.rule}</small>
            </div>
          ))}
        </div>
      )
    case "stories":
      return <StoryScene />
    case "visual":
      return <NavScene who={who} play={play} />
    case "horario":
      return (
        <div className="wn-hrs wn-card wn-pop">
          <div className="row">
            <b>Horário de atendimento</b>
            <Clock size={24} aria-hidden />
          </div>
          <div className="row">
            <span>Livre 24h</span>
            <span className="wn-sw" />
          </div>
          <div className="row muted">
            <span>Seg a sex</span>
            <span className="wn-num">7h – 20h</span>
          </div>
        </div>
      )
    case "central":
      return (
        <div className="wn-alist">
          {[
            ["Dor forte", "var(--danger)", 150],
            ["Aluno sumindo", "#F2B84B", 400],
            ["Recorde", "var(--dourado)", 650],
          ].map(([t, c, ms]) => (
            <div key={t} className="wn-arow wn-card wn-pop" style={d(ms as number)}>
              <i className="dt" style={{ background: c as string }} />
              {t}
              <small>Exemplo</small>
            </div>
          ))}
        </div>
      )
    case "biblio":
      return (
        <div className="wn-desk wn-pop">
          <div className="pane">
            <b>Biblioteca</b>
            <div className="it">
              <Dumbbell size={14} aria-hidden />
              Remada
            </div>
            <div className="it" style={{ opacity: 0 }}>
              .
            </div>
            <div className="it">
              <Dumbbell size={14} aria-hidden />
              Puxada
            </div>
          </div>
          <div className="pane">
            <b>Ficha · Treino A</b>
            <div className="it">
              <Dumbbell size={14} aria-hidden />
              Supino
            </div>
            <div className="it">
              <Dumbbell size={14} aria-hidden />
              Agachamento
            </div>
            <div className="it slot">&nbsp;</div>
          </div>
          <div className="it wn-fly wn-card">
            <Dumbbell size={14} aria-hidden />
            Leg press
          </div>
        </div>
      )
    case "alunos": {
      const c = ["#DCEDEC", "#9AD8D6", "#B6F7FD"]
      return (
        <div className="grid justify-items-center">
          <div className="wn-crowd">
            {"ABCDEFGHIJ".split("").map((n, k) => (
              <div key={n} className="wn-oct wn-pop" style={{ ...d(100 + k * 110), background: c[k % 3] }}>
                {n}
              </div>
            ))}
          </div>
          <span className="wn-tag wn-pop mt-4" style={d(1300)}>
            <span>
              <i className="dot" />
              Beta · sem limite
            </span>
          </span>
        </div>
      )
    }
  }
}

function StoryScene() {
  const svg = useMemo(
    () =>
      storySvg({ tag: "Recorde pessoal", big: "80", unit: "kg", line: "Agachamento", stats: [{ label: "Tempo", value: "52 min" }, { label: "Séries", value: "18" }, { label: "Volume", value: "6.240 kg" }] })
        .replace('id="b"', 'id="wn-sb"')
        .replace("url(#b)", "url(#wn-sb)"),
    [],
  )
  return (
    <>
      <span className="wn-ex">Exemplo</span>
      <div className="relative">
        <div className="wn-story" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="wn-shareb wn-pop" style={d(700)}>
          <Share2 size={24} aria-hidden />
        </div>
      </div>
    </>
  )
}

/* Barra real: aluno usa a GlassNav (.gnav*); o Studio, a barra inferior do celular (studio-shell). */
const STUDENT_NAV: { label: string; icon: EvoIcon }[] = [
  { label: "Treinos", icon: Home },
  { label: "Evolução", icon: BarChart },
  { label: "Perfil", icon: UserRound },
]
const STUDIO_NAV: { label: string; icon: EvoIcon }[] = [
  { label: "Painel", icon: LayoutDashboard },
  { label: "Alunos", icon: Users },
  { label: "Treinos", icon: ClipboardList },
  { label: "Avaliações", icon: Ruler },
  { label: "Caixa", icon: Wallet },
  { label: "Exercícios", icon: Dumbbell },
  { label: "Perfil", icon: UserRound },
]

/** A pílula passeia: 1º → 2º → 3º → 2º, com a mola da própria barra. */
const NAV_SEQ = [0, 1, 2, 1]

function NavScene({ who, play }: { who: WhatsNewWho; play: boolean }) {
  const [k, setK] = useState(0)
  useEffect(() => {
    if (!play) return
    const t = setInterval(() => setK((x) => (x + 1) % NAV_SEQ.length), 1200)
    return () => clearInterval(t)
  }, [play])
  const active = NAV_SEQ[k]
  return (
    <div className="grid justify-items-center">
      <div className="wn-screens">
        {[4, 3, 4].map((n, j) => (
          <div key={j} className="wn-pop" style={d(100 + j * 150)}>
            {Array.from({ length: n }, (_, x) => (
              <i key={x} />
            ))}
          </div>
        ))}
      </div>
      {who === "aluno" ? (
        <div className="gnav wn-gnav" style={{ ["--n" as string]: STUDENT_NAV.length, ["--i" as string]: active }}>
          <span className="gnav-pill" aria-hidden />
          <ul>
            {STUDENT_NAV.map(({ label, icon: Icon }, j) => (
              <li key={label}>
                <span className={cx("gnav-it", j === active && "on")}>
                  <Icon size={22} aria-hidden filled={j === active} />
                  <span className="gnav-l">{label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="glass wn-studio-nav border-t border-line">
          <ul className="grid grid-cols-7">
            {STUDIO_NAV.map(({ label, icon: Icon }, j) => {
              const on = j === active
              return (
                <li key={label}>
                  <span className={cx("flex h-16 flex-col items-center justify-center gap-0.5 text-[0.5625rem] font-semibold tracking-tight transition-colors", on ? "text-accent" : "text-muted")}>
                    <span className={cx("grid h-7 w-10 place-items-center rounded-full transition-all duration-300", on ? "scale-100 bg-accent-soft" : "scale-90")}>
                      <Icon size={20} aria-hidden strokeWidth={on ? 2.25 : 1.75} />
                    </span>
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
