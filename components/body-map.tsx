/**
 * Mapa muscular EVOFIT (frente e costas). Cada grupo muscular do catálogo vira uma ou mais formas;
 * o lado esquerdo é desenhado e espelhado. Neutro = não trabalhado.
 */

import { BACK, BASE, FRONT, type MuscleKey, type Shape } from "@/lib/body-shapes"

export type { MuscleKey }

export type MuscleLevels = Partial<Record<MuscleKey, number>>

const mirror = "translate(200 0) scale(-1 1)"

function Figure({ shapes, levels, label }: { shapes: Shape[]; levels: MuscleLevels; label: string }) {
  return (
    <figure className="evo-body-fig">
      <svg viewBox="0 0 200 420" role="img" aria-label={label}>
        {[0, 1].map((side) => (
          <g key={side} transform={side ? mirror : undefined}>
            {BASE.map((d, i) => (
              <path key={`b${i}`} d={d} className="evo-body-base" />
            ))}
            {shapes.map((s, i) => {
              const v = levels[s.m] ?? 0
              return <path key={i} d={s.d} className="evo-body-part" data-level={v > 0 ? Math.min(4, Math.ceil(v)) : 0} />
            })}
          </g>
        ))}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

/**
 * Corpo de frente e de costas. `levels` vai de 0 (não trabalhado) a 4 (máximo):
 * no exercício, principal = 4 e secundário = 2; no mapa de volume, a escala é proporcional.
 */
export function BodyMap({ levels, className, compact }: { levels: MuscleLevels; className?: string; compact?: boolean }) {
  return (
    <div className={`evo-body ${compact ? "is-compact" : ""} ${className ?? ""}`}>
      <Figure shapes={FRONT} levels={levels} label="Frente" />
      <Figure shapes={BACK} levels={levels} label="Costas" />
    </div>
  )
}

/** Níveis para um único exercício: principais em destaque, secundários suaves. */
export function exerciseLevels(primary: string[], secondary: string[]): MuscleLevels {
  const out: MuscleLevels = {}
  for (const m of secondary) out[m as MuscleKey] = 2
  for (const m of primary) out[m as MuscleKey] = 4
  return out
}
