import { MARK_SHAPES, WORDMARK } from "./brand-mark"

export interface StoryInput {
  tag: string
  big: string
  unit?: string
  line: string
  stats: { label: string; value: string }[]
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)

/** Cartão 9:16 para os stories (1080 × 1920), desenhado em SVG com a aura de conquista. */
export function storySvg(x: StoryInput) {
  const stats = x.stats
    .slice(0, 3)
    .map((s, i) => {
      const w = 920 / x.stats.slice(0, 3).length - 16
      const left = 80 + i * (w + 24)
      return `<rect x="${left}" y="1420" width="${w}" height="180" rx="32" fill="#fff" fill-opacity=".72"/>
<text x="${left + 36}" y="1486" font-family="Onest, Inter, sans-serif" font-size="30" fill="#646C6E">${esc(s.label)}</text>
<text x="${left + 36}" y="1562" font-family="Inter Tight, Inter, sans-serif" font-weight="800" font-size="46" fill="#0F1C1F">${esc(s.value)}</text>`
    })
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<defs><filter id="b"><feGaussianBlur stdDeviation="120"/></filter></defs>
<rect width="1080" height="1920" fill="#DCEDEC"/>
<g filter="url(#b)"><circle cx="160" cy="300" r="520" fill="#46B8BA" fill-opacity=".7"/><circle cx="980" cy="760" r="460" fill="#E6B422" fill-opacity=".55"/><circle cx="300" cy="1600" r="520" fill="#9AD8D6"/><circle cx="1000" cy="1700" r="300" fill="#F26B4E" fill-opacity=".3"/></g>
<g transform="translate(80 110) scale(.9)" fill="#2F7F81"><g transform="translate(0 -11)">${MARK_SHAPES}</g></g>
<svg x="190" y="118" width="260" height="58" viewBox="${WORDMARK.viewBox}"><path fill="#0F1C1F" d="${WORDMARK.d}"/></svg>
<polygon points="80,980 ${120 + x.tag.length * 26},980 ${120 + x.tag.length * 26},1022 ${98 + x.tag.length * 26},1048 80,1048 80,1006" fill="#0F1C1F"/>
<text x="112" y="1028" font-family="Onest, Inter, sans-serif" font-weight="600" font-size="30" letter-spacing="3" fill="#F1FF93">${esc(x.tag.toUpperCase())}</text>
<text x="72" y="1270" font-family="Inter Tight, Inter, sans-serif" font-weight="800" font-size="240" letter-spacing="-8" fill="#0F1C1F">${esc(x.big)}<tspan font-size="90" letter-spacing="0">${x.unit ? " " + esc(x.unit) : ""}</tspan></text>
<text x="80" y="1350" font-family="DM Sans, Inter, sans-serif" font-weight="700" font-size="48" fill="#0F1C1F">${esc(x.line)}</text>
${stats}
<text x="540" y="1820" text-anchor="middle" font-family="Onest, Inter, sans-serif" font-weight="600" font-size="32" fill="#0F1C1F" fill-opacity=".7">evofit · em beta</text>
</svg>`
}

/** Gera o PNG no navegador e compartilha (menu do celular) ou baixa. */
export async function shareStory(x: StoryInput) {
  const svg = storySvg(x)
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  await new Promise<void>((ok, err) => {
    img.onload = () => ok()
    img.onerror = () => err(new Error("imagem"))
    img.src = url
  })
  const c = document.createElement("canvas")
  c.width = 1080
  c.height = 1920
  c.getContext("2d")!.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"))
  if (!blob) return
  const file = new File([blob], "evofit-treino.png", { type: "image/png" })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {})
    return
  }
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
