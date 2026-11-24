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

/** Retângulo de cantos arredondados (gomos do abdômen). */
const rr = (x: number, y: number, w: number, h: number, r = 3) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`

// Coordenadas no viewBox 0 0 200 440; só o lado esquerdo (x < 100), espelhado em x = 100.
const FRONT: Shape[] = [
  { m: "Pescoço", d: "M93 61 C95 64 97 66 99 67 L99 74 C96 73 93 71 91 69 Z" },
  { m: "Trapézio", d: "M90 66 C84 70 76 73 69 75 C76 77 84 77 91 75 Z" },
  { m: "Ombros", d: "M66 78 C55 80 48 89 47 102 C47 110 49 116 52 121 C55 108 61 97 72 89 C72 83 70 79 66 78 Z" },
  { m: "Peito", d: "M98.5 80 L80 81 C73 87 69 97 70 108 C76 118 89 121 98.5 117 Z" },
  { m: "Bíceps", d: "M53 125 C49 135 48 148 51 160 C57 158 61 148 62 135 C61 127 58 123 53 125 Z" },
  { m: "Antebraço", d: "M50 166 C45 180 41 196 39 212 L46 214 C51 198 55 182 57 166 C55 163 52 163 50 166 Z" },
  { m: "Abdômen", d: rr(89.5, 122, 9, 15) },
  { m: "Abdômen", d: rr(89.5, 140, 9, 15) },
  { m: "Abdômen", d: rr(89.5, 158, 9, 16) },
  { m: "Abdômen", d: "M89.5 180 C89.5 178 90.5 177 92.5 177 L98.5 177 L98.5 214 C94 210 90.5 200 89.5 190 Z" },
  { m: "Abdômen", d: "M86.5 122 C79 132 75 150 76 168 C77 184 80 196 86.5 204 C86 180 86 150 86.5 122 Z" },
  { m: "Abdutores", d: "M74 200 C69 209 66 220 67 232 C71 226 75 218 79 211 C78 206 76 202 74 200 Z" },
  { m: "Quadríceps", d: "M69 238 C66 258 66 284 71 304 C75 307 78 304 79 299 C77 278 76 256 74 240 C72 236 70 236 69 238 Z" },
  { m: "Quadríceps", d: "M80 222 C76 242 77 272 82 296 C85 300 88 300 89 296 C91 270 90 244 86 222 C84 218 81 218 80 222 Z" },
  { m: "Quadríceps", d: "M91.5 272 C88.5 284 88 296 90.5 306 C94 307 96.5 302 96.5 292 C96.5 283 94.5 276 91.5 272 Z" },
  { m: "Adutores", d: "M98.5 236 C94 242 90 254 90 268 C93 262 96 256 98.5 252 Z" },
  { m: "Panturrilha", d: "M71 324 C67 342 68 360 73 378 L79 378 C80 358 80 340 78 324 C76 320 73 320 71 324 Z" },
  { m: "Panturrilha", d: "M84 322 C90 336 92 354 89 372 L85 372 C83 356 82 338 84 322 Z" },
]

const BACK: Shape[] = [
  { m: "Pescoço", d: "M93 60 L99 61 L99 64 C96 64 94 63 92 62 Z" },
  { m: "Trapézio", d: "M98.5 62 C94 66 88 70 80 72 C74 73 70 75 68 77 C76 80 83 86 87 95 C91 108 95 122 98.5 136 Z" },
  { m: "Ombros", d: "M65 79 C55 80 48 89 47 102 C47 110 49 116 52 121 C55 108 61 98 70 91 C70 85 68 81 65 79 Z" },
  { m: "Costas", d: "M85 99 C80 94 74 93 71 97 C70 103 72 107 76 109 C80 110 85 111 89 112 C88 107 87 103 85 99 Z" },
  { m: "Costas", d: "M90 116 C84 115 76 114 70 112 C67 124 68 142 74 158 C80 170 89 176 96 180 C94 160 92 138 90 116 Z" },
  { m: "Tríceps", d: "M53 125 C48 136 48 149 51 160 C57 157 61 147 62 134 C61 127 58 123 53 125 Z" },
  { m: "Antebraço", d: "M50 166 C45 180 41 196 39 212 L46 214 C51 198 55 182 57 166 C55 163 52 163 50 166 Z" },
  { m: "Lombar", d: "M98.5 142 L98.5 208 L90 206 C89 196 92 188 96 184 C96 170 97 156 98.5 142 Z" },
  { m: "Abdutores", d: "M86 196 C78 196 71 202 68 212 C66 220 67 226 68 230 C72 220 78 212 88 208 Z" },
  { m: "Glúteos", d: "M98.5 212 L90 211 C78 214 70 226 70 240 C72 252 84 258 98.5 252 Z" },
  { m: "Posteriores", d: "M70 262 C66 280 67 298 73 312 L81 312 C81 292 80 276 78 262 C76 258 72 258 70 262 Z" },
  { m: "Posteriores", d: "M82 262 C83 280 85 298 85 312 L93 312 C96 294 96 276 94 262 C90 258 85 258 82 262 Z" },
  { m: "Panturrilha", d: "M73 322 C67 336 67 354 75 370 C79 362 80 342 80 324 C78 319 75 319 73 322 Z" },
  { m: "Panturrilha", d: "M83 322 C82 342 84 360 88 368 C94 356 94 338 89 322 C87 319 85 319 83 322 Z" },
]

/** Silhueta (metade esquerda): contorno discreto por trás dos músculos. */
const OUTLINE =
  "M100 10 C88 10 82 20 82 33 C82 45 86 53 92 58 L92 64 C85 69 75 72 64 75 C51 78 45 89 44 102 C43 118 43 134 41 150 C38 170 35 190 34 212 C33 222 31 232 33 244 C35 251 42 251 43 244 C44 236 44 226 46 216 C50 198 55 180 58 162 C60 150 62 138 64 120 C66 140 68 160 66 180 C64 196 63 210 65 222 C63 250 63 280 67 310 C64 332 63 352 68 376 C70 392 70 402 68 412 C67 420 72 426 80 426 L92 426 C95 418 92 406 93 396 C95 370 97 344 95 318 C97 290 98.5 262 99 238 L100 237"

/** Partes sem grupo muscular (sempre neutras), por cima da silhueta. */
const BASE = [
  "M100 14 C90 14 86 22 86 33 C86 44 91 54 100 56 Z", // cabeça
  "M40 218 C36 224 35 234 37 242 C40 245 42 240 43 232 C44 226 44 221 40 218 Z", // mão
  "M71 308 C70 313 70 318 72 321 L79 320 C80 316 80 311 78 307 Z M84 308 C86 312 86 317 85 320 L91 320 C93 316 93 312 92 308 Z", // joelho
  "M73 384 C72 396 71 406 70 414 C70 419 74 422 80 422 L89 422 C91 414 89 402 88 384 Z", // tornozelo e pé
]

export type MuscleLevels = Partial<Record<MuscleKey, number>>

const mirror = "translate(200 0) scale(-1 1)"

function Figure({ shapes, levels, label }: { shapes: Shape[]; levels: MuscleLevels; label: string }) {
  return (
    <figure className="evo-body-fig">
      <svg viewBox="0 0 200 440" role="img" aria-label={label}>
        {[0, 1].map((side) => (
          <g key={side} transform={side ? mirror : undefined}>
            <path d={OUTLINE} className="evo-body-outline" />
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
