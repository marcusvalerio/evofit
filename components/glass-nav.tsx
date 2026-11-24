"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { EvoIcon } from "@/components/icons"

export type GlassNavItem = { href: string; label: string; icon: EvoIcon; on: boolean }

/**
 * Barra de navegação de vidro (Design System · Barra de navegação).
 * Pílula do item ativo encaixada (respiro de 6 px, raio concêntrico) que desliza com mola.
 * Ao rolar para baixo afina e mostra só os ícones; ao subir ou parar, os nomes voltam.
 */
export function GlassNav({ items, label }: { items: GlassNavItem[]; label: string }) {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let t: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) > 6) setCompact(y > last && y > 80)
      last = y
      clearTimeout(t)
      t = setTimeout(() => setCompact(false), 700)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      clearTimeout(t)
    }
  }, [])
  const active = Math.max(0, items.findIndex((i) => i.on))
  return (
    <nav aria-label={label} className="gnav-wrap pb-safe">
      <div className={compact ? "gnav compact" : "gnav"} style={{ ["--n" as string]: items.length, ["--i" as string]: active }}>
        <span className="gnav-pill" aria-hidden />
        <ul>
          {items.map(({ href, label: l, icon: Icon, on }) => (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} aria-label={l} className={on ? "on" : undefined}>
                <Icon size={22} aria-hidden filled={on} />
                <span className="gnav-l">{l}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
