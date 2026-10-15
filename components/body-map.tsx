/**
 * Mapa muscular EVOFIT (frente e costas). Cada grupo muscular do catálogo vira uma ou mais formas;
 * o lado esquerdo é desenhado e espelhado. Neutro = não trabalhado.
 */

export type MuscleKey =
  | "Abdômen"
  | "Peito"
  | "Ombros"
  | "Tríceps"
  | "Adutores"
  | "Costas"
  | "Trapézio"
  | "Lombar"
  | "Glúteos"
  | "Panturrilha"
  | "Quadríceps"
  | "Posteriores"
  | "Abdutores"
  | "Antebraço"
  | "Bíceps"
  | "Pescoço"

type Shape = { m: MuscleKey; d: string }

// Coordenadas no viewBox 0 0 200 440; só o lado esquerdo (x < 100), espelhado em x = 100.
const FRONT: Shape[] = [
  { m: "Pescoço", d: "M91 52 L99 54 L99 68 L88 66 Z" },
  { m: "Trapézio", d: "M87 64 L72 73 L88 71 Z" },
  { m: "Ombros", d: "M70 73 C55 73 46 84 46 98 C46 105 49 110 53 113 C57 100 63 90 74 84 Z" },
  { m: "Peito", d: "M98 78 L76 82 C67 90 65 104 70 112 C80 119 92 117 98 112 Z" },
  { m: "Bíceps", d: "M51 116 C46 128 46 142 50 154 C57 153 61 141 62 128 C60 120 56 116 51 116 Z" },
  { m: "Antebraço", d: "M49 160 C43 175 41 191 42 206 L50 208 C56 193 58 177 58 162 Z" },
  { m: "Abdômen", d: "M88 121 L98 121 L98 196 L89 193 C85 178 84 150 88 121 Z" },
  { m: "Abdômen", d: "M84 123 C77 137 75 160 78 183 L85 189 C82 166 82 141 84 123 Z" },
  { m: "Abdutores", d: "M74 190 C67 199 64 211 66 222 L73 214 C73 205 74 197 77 191 Z" },
  { m: "Quadríceps", d: "M77 207 C67 227 66 262 72 292 C80 300 88 298 92 290 C94 262 92 236 91 216 C86 207 81 205 77 207 Z" },
  { m: "Adutores", d: "M97 214 C92 228 90 248 92 266 L98 262 L98 214 Z" },
  { m: "Panturrilha", d: "M75 318 C70 340 72 364 78 384 L86 384 C90 362 90 338 86 318 Z" },
]

const BACK: Shape[] = [
  { m: "Pescoço", d: "M91 52 L99 54 L99 60 L90 60 Z" },
  { m: "Trapézio", d: "M99 60 L88 62 L72 73 L70 80 L99 128 Z" },
  { m: "Ombros", d: "M69 76 C55 75 46 85 46 98 C46 105 49 110 53 113 C57 101 62 92 70 86 Z" },
  { m: "Costas", d: "M96 132 L72 92 C64 106 64 126 70 142 C79 154 90 160 97 163 Z" },
  { m: "Tríceps", d: "M51 116 C45 129 46 143 51 154 C58 150 62 138 62 125 C59 119 55 116 51 116 Z" },
  { m: "Antebraço", d: "M49 160 C43 175 41 191 42 206 L50 208 C56 193 58 177 58 162 Z" },
  { m: "Lombar", d: "M89 166 L98 168 L98 194 L86 192 C84 182 85 173 89 166 Z" },
  { m: "Abdutores", d: "M79 188 C71 190 66 198 66 209 L72 205 C74 199 77 195 82 193 Z" },
  { m: "Glúteos", d: "M98 198 L81 197 C71 205 69 222 74 236 C84 243 94 241 98 235 Z" },
  { m: "Posteriores", d: "M76 245 C68 263 68 289 74 307 L91 307 C94 285 94 263 94 245 C88 240 82 240 76 245 Z" },
  { m: "Panturrilha", d: "M74 316 C66 336 68 356 76 373 L88 373 C92 355 92 335 88 316 Z" },
]

/** Partes do corpo sem grupo muscular (sempre neutras). */
const BASE = [
  "M100 8 C88 8 80 18 80 32 C80 46 89 56 100 56 Z", // cabeça
  "M44 211 C38 216 37 226 42 232 C47 234 51 228 52 220 Z", // mão
  "M73 296 C71 304 72 312 75 316 L88 316 C91 310 92 302 91 296 Z", // joelho
  "M78 388 C72 396 70 404 74 410 L92 410 C92 400 90 393 87 388 Z", // pé
]

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
