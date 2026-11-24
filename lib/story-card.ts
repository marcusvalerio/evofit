import type { DemoData, Session } from "./types"
import type { PersonalRecord } from "./metrics"
import { sessionProgress, sessionVolume } from "./metrics"
import { durationMin } from "./date"
import { muscleVolume, volumeLevels } from "./volume"
import { BACK, BASE, FRONT, type MuscleKey, type Shape } from "./body-shapes"
import { MEDAL_GLYPH, MEDAL_HEX, MEDAL_INNER, MEDAL_LOOK } from "./medal-look"
import { MARK_SHAPES, WORDMARK } from "./brand-mark"

/* ---------- Dados ---------- */

export type StoryTemplate = "vidro" | "recorde" | "ficha"

export const TEMPLATE_INFO: Record<StoryTemplate, { name: string; hint: string }> = {
  vidro: { name: "Vidro", hint: "Resumo e mapa muscular" },
  recorde: { name: "Recorde", hint: "A conquista do dia" },
  ficha: { name: "Ficha", hint: "Exercício a exercício" },
}

export interface StoryExercise {
  name: string
  sets: number
  reps: string
  load: number | null
  record: boolean
}

export interface StoryRecord {
  exerciseName: string
  load: number
  previous: number
  reps: number | null
}

export interface StoryData {
  workoutName: string
  dateLabel: string
  durationMin: number
  setsDone: number
  volumeKg: number
  exercises: StoryExercise[]
  record: StoryRecord | null
  recordCount: number
  levels: Partial<Record<MuscleKey, number>>
  muscles: MuscleKey[]
}

/** 8420 → "8.420"; 22.5 → "22,5". */
export function formatNumber(n: number) {
  const neg = n < 0
  const abs = Math.abs(n)
  const int = Number.isInteger(abs) ? abs : Math.round(abs * 10) / 10
  const [i, dec] = String(int).split(".")
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return (neg ? "-" : "") + grouped + (dec ? "," + dec : "")
}

/** Volume e cargas: "8.420 kg". Volume é arredondado para inteiro. */
export const formatKg = (n: number, round = false) => `${formatNumber(round ? Math.round(n) : n)} kg`

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
export function formatShortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Repetições feitas: "10" se todas iguais, "8–10" se variaram, "" se não houver registro. */
export function repsLabel(reps: (number | null)[]) {
  const r = reps.filter((x): x is number => x !== null && x > 0)
  if (!r.length) return ""
  const lo = Math.min(...r)
  const hi = Math.max(...r)
  return lo === hi ? String(lo) : `${lo}–${hi}`
}

/** Linha do exercício na Ficha: "4×10  62 kg", "3×8–10", "2 séries". */
export function exerciseLine(e: Pick<StoryExercise, "sets" | "reps" | "load">) {
  const base = e.reps ? `${e.sets}×${e.reps}` : `${e.sets} ${e.sets === 1 ? "série" : "séries"}`
  return e.load ? `${base}  ${formatKg(e.load)}` : base
}

/** Junta os dados reais da sessão concluída. Só entra o que foi feito. */
export function buildStoryData(d: DemoData, s: Session, records: PersonalRecord[]): StoryData {
  const recIds = new Set(records.map((r) => r.exerciseId))
  const order: string[] = []
  const by = new Map<string, Session["sets"]>()
  for (const x of s.sets) {
    if (!x.done) continue
    if (!by.has(x.exerciseId)) {
      by.set(x.exerciseId, [])
      order.push(x.exerciseId)
    }
    by.get(x.exerciseId)!.push(x)
  }
  const exercises = order.map((id) => {
    const sets = by.get(id)!
    const loads = sets.map((x) => x.load).filter((x): x is number => x !== null && x > 0)
    return { name: sets[0].exerciseName, sets: sets.length, reps: repsLabel(sets.map((x) => x.reps)), load: loads.length ? Math.max(...loads) : null, record: recIds.has(id) }
  })
  const best = [...records].sort((a, b) => b.load - b.previous - (a.load - a.previous))[0]
  const record = best
    ? {
        exerciseName: best.exerciseName,
        load: best.load,
        previous: best.previous,
        reps: Math.max(0, ...s.sets.filter((x) => x.done && x.exerciseId === best.exerciseId && x.load === best.load).map((x) => x.reps ?? 0)) || null,
      }
    : null
  const vol = muscleVolume(
    d,
    order.map((id) => ({ exerciseId: id, sets: by.get(id)!.length })),
  )
  return {
    workoutName: s.workoutName,
    dateLabel: formatShortDate(s.finishedAt ?? s.startedAt),
    durationMin: durationMin(s.startedAt, s.finishedAt),
    setsDone: sessionProgress(s).done,
    volumeKg: sessionVolume(s),
    exercises,
    record,
    recordCount: records.length,
    levels: volumeLevels(vol),
    muscles: vol.map((v) => v.muscle),
  }
}

/** Modelos possíveis: o Recorde só aparece quando a sessão tem recorde pessoal. */
export function availableTemplates(data: Pick<StoryData, "record">): StoryTemplate[] {
  return data.record ? ["vidro", "recorde", "ficha"] : ["vidro", "ficha"]
}

/** Texto alternativo da prévia, com os mesmos números do quadro. */
export function storyAlt(t: StoryTemplate, data: StoryData) {
  const vol = data.volumeKg ? formatKg(data.volumeKg, true) : "sem carga registrada"
  const resumo = `${data.workoutName}, ${data.durationMin} min, ${data.setsDone} séries, ${vol}`
  if (t === "recorde" && data.record) {
    const r = data.record
    return `Story modelo Recorde: medalha de ouro, novo recorde de ${formatKg(r.load)} em ${r.exerciseName}${r.reps ? ` com ${r.reps} repetições` : ""}, antes ${formatKg(r.previous)}. ${resumo}.`
  }
  if (t === "ficha") {
    const ex = data.exercises.map((e) => `${e.name} ${exerciseLine(e).replace(/\s+/g, " ")}${e.record ? " (recorde)" : ""}`).join("; ")
    return `Story modelo Ficha: ${resumo}. ${ex || "Nenhum exercício concluído"}.`
  }
  const m = data.muscles.slice(0, 4).join(", ")
  return `Story modelo Vidro: ${resumo}. Mapa muscular de frente e costas${m ? ` com ${m} em destaque` : ""}.`
}

/* ---------- Layout (quadro 1080 × 1920) ---------- */

export const W = 1080
export const H = 1920
/** Área segura dos stories: fora dela ficam a barra do perfil e o campo de resposta. */
export const SAFE = { top: 250, bottom: 1580 }
const BOTTOM = 1560

export const FICHA_ROW = 92
const FICHA_HEAD = 196
const FICHA_FOOT = 60
const FICHA_PILL = 90

export interface StoryLayout {
  top: number
  bottom: number
  card: { x: number; y: number; w: number; h: number }
  /** Ficha: exercícios exibidos e quantos ficaram de fora. */
  rows: number
  more: number
}

/** Posições de cada modelo. Tudo fica entre SAFE.top e SAFE.bottom. */
export function storyLayout(t: StoryTemplate, data: Pick<StoryData, "exercises">): StoryLayout {
  if (t === "vidro") {
    const h = 930
    const y = BOTTOM - h
    return { top: y, bottom: BOTTOM, card: { x: 60, y, w: 960, h }, rows: 0, more: 0 }
  }
  if (t === "recorde") {
    const h = 680
    const y = BOTTOM - h
    // a medalha (260) fica metade para fora do cartão
    return { top: y - 130, bottom: BOTTOM, card: { x: 60, y, w: 960, h }, rows: 0, more: 0 }
  }
  const n = data.exercises.length
  const fit = Math.floor((BOTTOM - FICHA_PILL - FICHA_HEAD - FICHA_FOOT - SAFE.top - 20) / FICHA_ROW)
  const max = Math.min(8, fit)
  const rows = n > max ? max - 1 : Math.max(1, n)
  const more = n - Math.min(n, rows)
  const h = FICHA_HEAD + (rows + (more ? 1 : 0) - 1) * FICHA_ROW + FICHA_FOOT
  const y = BOTTOM - h
  return { top: y - FICHA_PILL, bottom: BOTTOM, card: { x: 60, y, w: 960, h }, rows, more }
}

/* ---------- Desenho (só no navegador) ---------- */

const C = { navy: "#0f1c1f", pet: "#2f7f81", agua: "#46b8ba", menta: "#dcedec", ouro: "#e6b422", cotton: "#f4f3f1", muted: "#9aa6a8" }
const FONT = {
  display: '"DM Sans Variable", "DM Sans", "Inter Variable", sans-serif',
  num: '"Inter Tight Variable", "Inter Tight", "Inter Variable", sans-serif',
  label: '"Onest Variable", Onest, "Inter Variable", sans-serif',
  sans: '"Inter Variable", Inter, sans-serif',
}
const F = (w: number, s: number, f: keyof typeof FONT) => `${w} ${s}px ${FONT[f]}`
/** Escala de verde-água do mapa muscular (1 a 4) sobre o vidro escuro. */
export const MAP_SCALE = ["rgba(244,243,241,.16)", "#2f7f81", "#3a9c9e", "#46b8ba", "#9ad8d6"]

/** Carrega as fontes do app antes de desenhar no canvas. */
export async function loadStoryFonts() {
  if (typeof document === "undefined" || !document.fonts) return
  const specs = [F(700, 44, "display"), F(800, 60, "num"), F(500, 34, "label"), F(600, 34, "label"), F(700, 34, "label"), F(600, 38, "sans"), F(700, 44, "sans")]
  await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => [])))
}

type Ctx = CanvasRenderingContext2D
const MARK_D = [...MARK_SHAPES.matchAll(/d="([^"]+)"/g)].map((m) => m[1])

function brand(x: Ctx, X: number, Y: number, col: string, s = 1) {
  x.save()
  x.translate(X, Y)
  x.scale(0.56 * s, 0.56 * s)
  x.fillStyle = col
  for (const d of MARK_D) x.fill(new Path2D(d))
  x.restore()
  x.save()
  x.translate(X + 72 * s, Y + 48 * s)
  x.scale(0.05 * s, 0.05 * s)
  x.fillStyle = col
  x.fill(new Path2D(WORDMARK.d))
  x.restore()
}

/** Corta o texto com reticências para caber na largura. */
function fit(x: Ctx, text: string, max: number) {
  if (x.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && x.measureText(t + "…").width > max) t = t.slice(0, -1)
  return t.trimEnd() + "…"
}

function background(x: Ctx, photo: CanvasImageSource & { width: number; height: number } | null) {
  if (photo && photo.width && photo.height) {
    const s = Math.max(W / photo.width, H / photo.height)
    const w = photo.width * s
    const h = photo.height * s
    x.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h)
    return
  }
  const g = x.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, C.pet)
  g.addColorStop(1, C.navy)
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
}

function glass(x: Ctx, r: StoryLayout["card"]) {
  x.save()
  x.beginPath()
  x.roundRect(r.x, r.y, r.w, r.h, 40)
  x.clip()
  if ("filter" in x) {
    x.filter = "blur(40px)"
    x.drawImage(x.canvas, 0, 0)
    x.filter = "none"
  }
  x.fillStyle = "rgba(15,28,31,.6)"
  x.fillRect(r.x, r.y, r.w, r.h)
  x.restore()
}

function figure(x: Ctx, shapes: Shape[], levels: StoryData["levels"], X: number, Y: number, k: number) {
  for (const side of [0, 1]) {
    x.save()
    x.translate(X, Y)
    x.scale(k, k)
    if (side) {
      x.translate(200, 0)
      x.scale(-1, 1)
    }
    x.fillStyle = "rgba(244,243,241,.1)"
    for (const d of BASE) x.fill(new Path2D(d))
    for (const s of shapes) {
      const v = levels[s.m] ?? 0
      x.fillStyle = MAP_SCALE[v > 0 ? Math.min(4, Math.ceil(v)) : 0]
      x.fill(new Path2D(s.d))
    }
    x.restore()
  }
}

function stat(x: Ctx, X: number, Y: number, l: string, v: string) {
  x.fillStyle = C.muted
  x.font = F(500, 34, "label")
  x.fillText(l, X, Y)
  x.fillStyle = C.cotton
  x.font = F(800, 60, "num")
  x.fillText(v, X, Y + 72)
}

function drawVidro(x: Ctx, data: StoryData) {
  const L = storyLayout("vidro", data)
  const { x: X0, y: Y, w } = L.card
  glass(x, L.card)
  const X = X0 + 48
  brand(x, X, Y + 48, C.cotton)
  x.fillStyle = C.muted
  x.font = F(500, 34, "label")
  x.textAlign = "right"
  x.fillText(data.dateLabel, X0 + w - 48, Y + 86)
  x.textAlign = "left"
  x.fillStyle = C.cotton
  x.font = F(700, 48, "display")
  x.fillText(fit(x, data.workoutName, w - 96), X, Y + 190)
  const stats: [string, string][] = [
    ["Duração", `${data.durationMin} min`],
    ["Séries", String(data.setsDone)],
    ["Volume", data.volumeKg ? formatKg(data.volumeKg, true) : "—"],
  ]
  stats.forEach(([l, v], i) => stat(x, X + i * 300, Y + 270, l, v))
  x.fillStyle = "rgba(244,243,241,.14)"
  x.fillRect(X, Y + 390, w - 96, 2)
  const k = 0.95
  const top = Y + 420
  figure(x, FRONT, data.levels, 540 - 160 - 100 * k, top, k)
  figure(x, BACK, data.levels, 540 + 160 - 100 * k, top, k)
  x.fillStyle = C.muted
  x.font = F(600, 34, "label")
  x.textAlign = "center"
  x.fillText("Frente", 540 - 160, top + 420 * k + 40)
  x.fillText("Costas", 540 + 160, top + 420 * k + 40)
  x.textAlign = "left"
}

function hexMedal(x: Ctx, cx: number, cy: number, size: number) {
  const l = MEDAL_LOOK.ouro
  x.save()
  x.translate(cx - size / 2, cy - size / 2)
  x.scale(size / 96, size / 96)
  x.shadowColor = "rgba(0,0,0,.35)"
  x.shadowBlur = 30
  x.shadowOffsetY = 10
  const g = x.createLinearGradient(0, 0, 96, 96)
  g.addColorStop(0, l.a)
  g.addColorStop(0.55, l.b)
  g.addColorStop(1, l.c)
  const hex = new Path2D(MEDAL_HEX)
  x.fillStyle = g
  x.fill(hex)
  x.shadowColor = "transparent"
  x.lineJoin = "round"
  x.lineCap = "round"
  x.strokeStyle = l.edge
  x.lineWidth = 4
  x.stroke(hex)
  x.strokeStyle = "rgba(255,255,255,.35)"
  x.lineWidth = 1.5
  x.stroke(new Path2D(MEDAL_INNER))
  x.translate(30, 30)
  x.scale(1.5, 1.5)
  x.strokeStyle = l.ink
  x.lineWidth = 1.1
  x.stroke(new Path2D(MEDAL_GLYPH.ouro))
  x.restore()
}

function drawRecorde(x: Ctx, data: StoryData) {
  const r = data.record
  if (!r) return drawVidro(x, data)
  const L = storyLayout("recorde", data)
  const { y: Y, h, w, x: X0 } = L.card
  glass(x, L.card)
  hexMedal(x, 540, Y, 260)
  x.textAlign = "center"
  x.fillStyle = C.ouro
  x.font = F(700, 34, "label")
  x.save()
  if ("letterSpacing" in x) (x as Ctx & { letterSpacing: string }).letterSpacing = "4px"
  x.fillText(data.recordCount > 1 ? `NOVO RECORDE · 1 DE ${data.recordCount}` : "NOVO RECORDE", 540, Y + 200)
  x.restore()
  // número grande + "kg" centralizados juntos
  const big = formatNumber(r.load)
  x.font = F(800, 200, "num")
  const bw = x.measureText(big).width
  x.font = F(800, 72, "num")
  const kw = x.measureText("kg").width
  const left = 540 - (bw + 16 + kw) / 2
  x.textAlign = "left"
  x.fillStyle = C.cotton
  x.font = F(800, 200, "num")
  x.fillText(big, left, Y + 410)
  x.font = F(800, 72, "num")
  x.fillText("kg", left + bw + 16, Y + 410)
  x.textAlign = "center"
  x.font = F(700, 44, "display")
  x.fillText(fit(x, r.exerciseName, w - 96), 540, Y + 490)
  x.fillStyle = C.muted
  x.font = F(500, 34, "label")
  x.fillText([r.reps ? `${r.reps} reps` : "", `antes ${formatKg(r.previous)}`, `+${formatKg(Math.round((r.load - r.previous) * 10) / 10)}`].filter(Boolean).join("  ·  "), 540, Y + 552)
  x.textAlign = "left"
  brand(x, X0 + 48, Y + h - 92, "rgba(244,243,241,.85)", 0.8)
  x.textAlign = "right"
  x.fillStyle = C.muted
  x.font = F(500, 34, "label")
  x.fillText([`${data.durationMin} min`, data.volumeKg ? formatKg(data.volumeKg, true) : ""].filter(Boolean).join(" · "), X0 + w - 48, Y + h - 50)
  x.textAlign = "left"
}

function drawFicha(x: Ctx, data: StoryData) {
  const L = storyLayout("ficha", data)
  const { x: X0, y: Y, w, h } = L.card
  x.fillStyle = C.cotton
  x.beginPath()
  x.roundRect(X0, Y, w, h, 48)
  x.fill()
  const X = X0 + 50
  const R = X0 + w - 50
  brand(x, X, Y + 50, C.navy, 0.85)
  x.fillStyle = C.pet
  x.font = F(600, 34, "label")
  x.textAlign = "right"
  x.fillText([`${data.durationMin} min`, data.volumeKg ? formatKg(data.volumeKg, true) : ""].filter(Boolean).join(" · "), R, Y + 92)
  x.textAlign = "left"
  data.exercises.slice(0, L.rows).forEach((e, i) => {
    const b = Y + FICHA_HEAD + i * FICHA_ROW
    x.fillStyle = "rgba(15,28,31,.1)"
    x.fillRect(X, b - 58, R - X, 2)
    const line = exerciseLine(e)
    x.font = F(800, 38, "num")
    const lw = x.measureText(line).width
    x.fillStyle = C.navy
    x.textAlign = "right"
    x.fillText(line, R, b)
    x.textAlign = "left"
    x.font = F(600, 38, "sans")
    x.fillText(fit(x, e.name, R - X - lw - 32), X, b)
    if (e.record) {
      x.fillStyle = C.ouro
      x.beginPath()
      x.arc(X0 + 26, b - 13, 10, 0, Math.PI * 2)
      x.fill()
    }
  })
  if (!data.exercises.length) {
    x.fillStyle = C.navy
    x.font = F(600, 38, "sans")
    x.fillText(`${data.setsDone} séries concluídas`, X, Y + FICHA_HEAD)
  }
  if (L.more) {
    x.fillStyle = C.pet
    x.font = F(600, 34, "label")
    x.fillText(`+${L.more} ${L.more === 1 ? "exercício" : "exercícios"}`, X, Y + FICHA_HEAD + L.rows * FICHA_ROW)
  }
  // rótulo do treino num selo navy logo acima do cartão (sem nada atrás)
  x.font = F(700, 36, "display")
  const label = fit(x, data.workoutName, w - 64)
  const pw = x.measureText(label).width + 64
  x.fillStyle = C.navy
  x.beginPath()
  x.roundRect(X0, Y - FICHA_PILL, pw, 72, 36)
  x.fill()
  x.fillStyle = C.menta
  x.fillText(label, X0 + 32, Y - FICHA_PILL + 49)
}

export type StoryPhoto = (CanvasImageSource & { width: number; height: number }) | null

/** Desenha o modelo no canvas 1080 × 1920. */
export function drawStory(c: HTMLCanvasElement, t: StoryTemplate, data: StoryData, photo: StoryPhoto) {
  c.width = W
  c.height = H
  const x = c.getContext("2d")
  if (!x) return
  x.clearRect(0, 0, W, H)
  x.textAlign = "left"
  x.textBaseline = "alphabetic"
  background(x, photo)
  if (t === "vidro") drawVidro(x, data)
  else if (t === "recorde") drawRecorde(x, data)
  else drawFicha(x, data)
}

export async function renderStory(t: StoryTemplate, data: StoryData, photo: StoryPhoto) {
  await loadStoryFonts()
  const c = document.createElement("canvas")
  drawStory(c, t, data, photo)
  return new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"))
}

/** Compartilha o PNG pelo menu do celular; sem suporte, baixa o arquivo. */
export async function shareStoryPng(blob: Blob, t: StoryTemplate) {
  const file = new File([blob], `evofit-${t}.png`, { type: "image/png" })
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return "shared" as const
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled" as const
    }
  }
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return "downloaded" as const
}
