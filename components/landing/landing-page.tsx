"use client"
import { useEffect, useRef } from "react"

type LandingSource = { style: string; body: string; script: string }

/**
 * Renderiza uma landing gerada a partir do protótipo (HTML + CSS + script de animação).
 * O script roda isolado: toda animação e todo timer param quando a página sai da tela.
 */
export function LandingPage({ source }: { source: LandingSource }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    let alive = true
    const frames = new Set<number>()
    const timers = new Set<number>()
    const intervals = new Set<number>()
    const observers: IntersectionObserver[] = []
    const raf = (cb: FrameRequestCallback) => {
      if (!alive) return 0
      const id = window.requestAnimationFrame((t) => {
        frames.delete(id)
        if (alive) cb(t)
      })
      frames.add(id)
      return id
    }
    const st = (cb: () => void, ms?: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id)
        if (alive) cb()
      }, ms)
      timers.add(id)
      return id
    }
    const si = (cb: () => void, ms?: number) => {
      const id = window.setInterval(() => alive && cb(), ms)
      intervals.add(id)
      return id
    }
    class IO extends IntersectionObserver {
      constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        super(cb, opts)
        observers.push(this)
      }
    }
    const $ = (id: string) => el.querySelector<HTMLElement>(`#${CSS.escape(id)}`) ?? document.getElementById(id)
    const run = new Function("requestAnimationFrame", "setTimeout", "setInterval", "IntersectionObserver", "__byId", source.script.replace("const $=id=>document.getElementById(id);", "const $=__byId;"))
    try {
      run(raf, st, si, IO, $)
    } catch (err) {
      console.error("Landing: falha ao iniciar animações", err)
    }
    return () => {
      alive = false
      frames.forEach((id) => window.cancelAnimationFrame(id))
      timers.forEach((id) => window.clearTimeout(id))
      intervals.forEach((id) => window.clearInterval(id))
      observers.forEach((o) => o.disconnect())
    }
  }, [source])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: source.style }} />
      <div ref={root} className="evo-landing" dangerouslySetInnerHTML={{ __html: source.body }} />
    </>
  )
}
