import type { MedalLevel } from "@/lib/medals"
import { MEDAL_GLYPH, MEDAL_HEX, MEDAL_INNER, MEDAL_LOOK } from "@/lib/medal-look"

/** Medalha em hexágono (Design System · Medalhas): degradê do metal, filete interno e brilho que passa. */
export function HexMedal({ level, size = 96, locked = false, className }: { level: MedalLevel; size?: number; locked?: boolean; className?: string }) {
  const l = locked ? { a: "#F1F2F1", b: "#DDE1E0", c: "#C5CACB", edge: "#B4BABB", ink: "#8A9395" } : MEDAL_LOOK[level]
  const id = `m-${level}${locked ? "-l" : ""}`
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={l.a} />
          <stop offset=".55" stopColor={l.b} />
          <stop offset="1" stopColor={l.c} />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".65" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d={MEDAL_HEX} />
        </clipPath>
      </defs>
      <path d={MEDAL_HEX} fill={`url(#${id}-g)`} stroke={l.edge} strokeWidth="4" strokeLinejoin="round" />
      <path d={MEDAL_INNER} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" strokeLinejoin="round" />
      {!locked && (
        <g clipPath={`url(#${id}-c)`}>
          <rect className="medal-shine" x="-60" y="0" width="40" height="96" fill={`url(#${id}-s)`} />
        </g>
      )}
      <g transform="translate(30 30) scale(1.5)" fill="none" stroke={l.ink} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d={MEDAL_GLYPH[level]} />
      </g>
    </svg>
  )
}
