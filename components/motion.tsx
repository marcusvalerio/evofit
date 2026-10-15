"use client"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"

/* Pequenas peças de movimento. Todas respeitam "reduzir movimento" do sistema. */

const RM = "(prefers-reduced-motion: reduce)"
const subscribeRM = (cb: () => void) => {
  const m = window.matchMedia(RM)
  m.addEventListener("change", cb)
  return () => m.removeEventListener("change", cb)
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribeRM, () => window.matchMedia(RM).matches, () => true)
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Anima a parte numérica inicial de um texto ("12", "3,5 kg", "1.240") de 0 até o valor.
 * O texto final é sempre exatamente o recebido.
 */
export function CountUp({ text, duration = 900 }: { text: string; duration?: number }) {
  const reduced = useReducedMotion()
  const m = /^(\d{1,3}(?:\.\d{3})*|\d+)(,\d+)?/.exec(text)
  const target = m ? parseFloat(m[1].replace(/\./g, "") + (m[2] ? "." + m[2].slice(1) : "")) : NaN
  const decimals = m?.[2] ? m[2].length - 1 : 0
  const [shown, setShown] = useState<{ text: string; v: number }>(() => ({ text, v: 0 }))
  const raf = useRef(0)

  useEffect(() => {
    if (reduced || !Number.isFinite(target) || target === 0) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setShown({ text, v: target * easeOut(t) })
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [text, target, duration, reduced])

  if (reduced || !m || !Number.isFinite(target) || shown.text !== text || shown.v >= target) return <>{text}</>
  const num = shown.v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <>
      <span aria-hidden>{num + text.slice(m[0].length)}</span>
      <span className="sr-only">{text}</span>
    </>
  )
}

/** Anel de progresso (0–100). */
export function Ring({ value, size = 56, stroke = 6, className, children, label }: { value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode; label?: string }) {
  const v = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className ?? ""}`} style={{ width: size, height: size }} role={label ? "progressbar" : undefined} aria-label={label} aria-valuenow={label ? Math.round(v) : undefined} aria-valuemin={label ? 0 : undefined} aria-valuemax={label ? 100 : undefined}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="ring-arc"
        />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  )
}

const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2 + (i % 3) * 0.2
  const dist = 90 + ((i * 37) % 70)
  return {
    x: Math.round(Math.cos(a) * dist),
    y: Math.round(Math.sin(a) * dist * 0.8 - 30),
    r: (i * 47) % 360,
    c: ["var(--mp-otan)", "var(--mp-gravy)", "var(--fg)", "var(--success)"][i % 4],
    d: (i % 5) * 30,
  }
})

/** Explosão de confete decorativa (somente CSS, some sozinha). */
export function Confetti() {
  return (
    <span className="confetti" aria-hidden>
      {CONFETTI.map((p, i) => (
        <i key={i} style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, background: p.c, animationDelay: `${p.d}ms` } as React.CSSProperties} />
      ))}
    </span>
  )
}

/** Vibração curta em celulares compatíveis. */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* sem suporte */
  }
}
