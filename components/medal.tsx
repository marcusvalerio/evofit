import type { MedalLevel } from "@/lib/medals"

const LOOK: Record<MedalLevel, { a: string; b: string; c: string; edge: string; ink: string }> = {
  bronze: { a: "#F6D3BC", b: "#D08A5E", c: "#9A5534", edge: "#8C4A2A", ink: "#5E2E16" },
  prata: { a: "#FFFFFF", b: "#C9D2D4", c: "#8E9A9D", edge: "#6F7B7E", ink: "#3F4A4D" },
  ouro: { a: "#FFF4C4", b: "#E6B422", c: "#B8860B", edge: "#8A6400", ink: "#5C4300" },
  absoluto: { a: "#2F3A3D", b: "#0F1C1F", c: "#46B8BA", edge: "#0F1C1F", ink: "#F1FF93" },
}
const GLYPH: Record<MedalLevel, string> = {
  bronze: "m5 12.5 4.5 4.5L19 7.5",
  prata: "M12 3.5c.9 3.6 5.5 5.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.8 1.8-3.9 1.8-5.6 1.9.9 2.7 2.8 2.7 2.8s1-3.3 1-7.4Z",
  ouro: "M7.5 4h9v5a4.5 4.5 0 0 1-9 0ZM7.5 6H5v.8A3.2 3.2 0 0 0 7.9 10M16.5 6H19v.8a3.2 3.2 0 0 1-2.9 3.2M12 13.5V17M8.5 20h7M9.5 20l.5-3h4l.5 3",
  absoluto: "M8.5 3 11 8.6M15.5 3 13 8.6M12 9a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z",
}
const HEX = "M48 6 84 27v42L48 90 12 69V27Z"

/** Medalha em hexágono (Design System · Medalhas): degradê do metal, filete interno e brilho que passa. */
export function HexMedal({ level, size = 96, locked = false, className }: { level: MedalLevel; size?: number; locked?: boolean; className?: string }) {
  const l = locked ? { a: "#F1F2F1", b: "#DDE1E0", c: "#C5CACB", edge: "#B4BABB", ink: "#8A9395" } : LOOK[level]
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
          <path d={HEX} />
        </clipPath>
      </defs>
      <path d={HEX} fill={`url(#${id}-g)`} stroke={l.edge} strokeWidth="4" strokeLinejoin="round" />
      <path d="M48 14 77 31v34L48 82 19 65V31Z" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" strokeLinejoin="round" />
      {!locked && (
        <g clipPath={`url(#${id}-c)`}>
          <rect className="medal-shine" x="-60" y="0" width="40" height="96" fill={`url(#${id}-s)`} />
        </g>
      )}
      <g transform="translate(30 30) scale(1.5)" fill="none" stroke={l.ink} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d={GLYPH[level]} />
      </g>
    </svg>
  )
}
