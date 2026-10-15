"use client"
import { useEffect, useLayoutEffect, useRef } from "react"
import { CATALOG } from "@/lib/catalog"
import { ExerciseThumb } from "./exercise"

/**
 * Revela elementos com [data-reveal] ao entrarem na tela. Sem JS, ou com "reduzir movimento",
 * tudo aparece normalmente: o estado escondido só existe depois que este componente monta.
 */
export function RevealOnScroll() {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return
    const root = document.documentElement
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")]
    // o que já está na tela ao carregar não pisca: entra direto
    for (const el of els) if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("is-in")
    root.classList.add("reveal-ready")
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in")
            io.unobserve(e.target)
          }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    )
    for (const el of els) if (!el.classList.contains("is-in")) io.observe(el)
    return () => {
      io.disconnect()
      root.classList.remove("reveal-ready")
    }
  }, [])
  return null
}

/** Inclinação sutil do telefone seguindo o ponteiro (só mouse; nunca em toque). */
export function useTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`)
        el.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`)
      })
    }
    const leave = () => {
      el.style.setProperty("--tilt-x", "0deg")
      el.style.setProperty("--tilt-y", "0deg")
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerleave", leave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerleave", leave)
    }
  }, [])
  return ref
}

/** Exercícios reais do catálogo, escolhidos para variar grupos musculares. */
const MARQUEE_IDS = [
  "Barbell_Squat",
  "Barbell_Bench_Press_-_Medium_Grip",
  "Wide-Grip_Lat_Pulldown",
  "Barbell_Hip_Thrust",
  "Dumbbell_Shoulder_Press",
  "Romanian_Deadlift",
  "Hammer_Curls",
  "Plank",
  "Leg_Press",
  "Seated_Cable_Rows",
  "Dumbbell_Lunges",
  "Side_Lateral_Raise",
]

/** Faixa infinita com demonstrações reais do acervo (duotone). Duplicada para o loop sem emenda. */
export function LibraryMarquee() {
  const items = MARQUEE_IDS.map((id) => CATALOG.find((e) => e.id === id)).filter((e) => e && e.frames >= 2)
  const row = (hidden: boolean) => (
    <ul className="lp-marquee-row" aria-hidden={hidden || undefined}>
      {items.map((ex) => (
        <li key={ex!.id} className="lp-marquee-item">
          <ExerciseThumb ex={ex!} className="w-24" />
          <span>{ex!.name}</span>
        </li>
      ))}
    </ul>
  )
  return (
    <div className="lp-marquee" role="region" aria-label="Exemplos da biblioteca de exercícios">
      <div className="lp-marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
