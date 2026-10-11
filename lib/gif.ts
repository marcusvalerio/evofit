import path from "node:path"
import sharp from "sharp"
import { catalogExercise } from "./catalog"

/**
 * Animação com a marca EVOFIT gerada a partir dos dois quadros do catálogo (posição inicial → final, com
 * transição suave). Gerada sob demanda e guardada em cache pela CDN — nada é armazenado no repositório.
 */
export type AnimFormat = "gif" | "webp"

const W = 480
const H = 320
const BAR = 60
const ROOT = process.cwd()
const FONTS = path.join(ROOT, "node_modules/geist/dist/fonts/geist-sans")
const IMG = path.join(ROOT, "public/exercises/img")

const C = { cobblestone: "#1F282E", cotton: "#E4E3DC", otan: "#FF4E20", gravy: "#B83312", muted: "#BCC2C5" }

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function text(markup: string, font: string, size: number, color: string) {
  return sharp({
    text: { text: `<span foreground="${color}" size="${Math.round(size * 1024)}">${markup}</span>`, fontfile: path.join(FONTS, font), font: "Geist", rgba: true, dpi: 72 },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
}

/** Nome do exercício reduzido até caber na barra (fonte menor e, se preciso, reticências). */
async function fittedName(name: string, maxWidth: number) {
  for (const size of [17, 16, 15, 14]) {
    const r = await text(escape(name), "Geist-Bold.ttf", size, C.cotton)
    if (r.info.width <= maxWidth) return r
  }
  let cut = name
  while (cut.length > 8) {
    cut = cut.slice(0, -1).trimEnd()
    const r = await text(`${escape(cut)}…`, "Geist-Bold.ttf", 14, C.cotton)
    if (r.info.width <= maxWidth) return r
  }
  return text(escape(cut), "Geist-Bold.ttf", 14, C.cotton)
}

async function pill(label: string, bg: string) {
  const t = await text(`<b>${label}</b>`, "Geist-Bold.ttf", 11, C.cotton)
  const w = t.info.width + 16
  const h = 20
  const shape = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="10" fill="${bg}"/></svg>`)
  return sharp(shape)
    .composite([{ input: t.data, left: 8, top: Math.max(0, Math.round((h - t.info.height) / 2)) }])
    .png()
    .toBuffer()
}

export function canAnimate(id: string) {
  return (catalogExercise(id)?.frames ?? 0) >= 2
}

export async function renderExerciseAnimation(id: string, format: AnimFormat): Promise<Buffer | null> {
  const ex = catalogExercise(id)
  if (!ex || ex.frames < 2) return null

  const [a, b] = await Promise.all(
    [0, 1].map((i) => sharp(path.join(IMG, `${id}-${i}.webp`)).resize(W, H, { fit: "cover" }).removeAlpha().raw().toBuffer()),
  )
  const blend = (t: number) => {
    const o = Buffer.alloc(a.length)
    for (let i = 0; i < a.length; i++) o[i] = Math.round(a[i] * (1 - t) + b[i] * t)
    return o
  }

  const [evo, fit, sub, start, end] = await Promise.all([
    text("<b>EVO</b>", "Geist-BlackItalic.ttf", 22, C.cotton),
    text("<b>FIT</b>", "Geist-BlackItalic.ttf", 22, C.otan),
    text("BIBLIOTECA EVOFIT", "Geist-SemiBold.ttf", 10, C.muted),
    pill("INÍCIO", C.cobblestone),
    pill("FIM", C.gravy),
  ])
  const brandW = evo.info.width + fit.info.width
  const name = await fittedName(ex.name, W - 28 - brandW - 16)

  const chrome = [
    { input: sub.data, left: 14, top: H + 12 },
    { input: name.data, left: 14, top: H + 27 },
    { input: evo.data, left: W - 14 - brandW, top: H + 18 },
    { input: fit.data, left: W - 14 - fit.info.width, top: H + 18 },
  ]
  const frame = (raw: Buffer, label: Buffer | null) =>
    sharp({ create: { width: W, height: H + BAR, channels: 3, background: C.cobblestone } })
      .composite([{ input: raw, raw: { width: W, height: H, channels: 3 }, left: 0, top: 0 }, ...(label ? [{ input: label, left: 10, top: 10 }] : []), ...chrome])
      .removeAlpha()
      .raw()
      .toBuffer()

  // início (pausa) → transição → fim (pausa) → transição de volta
  const plan: [Buffer, Buffer | null, number][] = [
    [a, start, 900],
    [blend(0.33), null, 90],
    [blend(0.66), null, 90],
    [b, end, 900],
    [blend(0.66), null, 90],
    [blend(0.33), null, 90],
  ]
  const frames = await Promise.all(plan.map(([raw, label]) => frame(raw, label)))
  const delay = plan.map((p) => p[2])
  const img = sharp(Buffer.concat(frames), { raw: { width: W, height: (H + BAR) * frames.length, channels: 3, pageHeight: H + BAR } })
  return format === "gif" ? img.gif({ delay, loop: 0, effort: 7, colours: 96, dither: 0.5 }).toBuffer() : img.webp({ delay, loop: 0, quality: 72, effort: 4 }).toBuffer()
}

export const ANIM_SIZE = { width: W, height: H + BAR }

/** Nome de arquivo amigável: evofit-agachamento-com-barra.gif */
export function animFileName(id: string, format: AnimFormat) {
  const ex = catalogExercise(id)
  const slug = (ex?.name ?? id)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
  return `evofit-${slug || "exercicio"}.${format}`
}
