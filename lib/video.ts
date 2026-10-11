/**
 * Links de vídeo próprios do personal. Aceitamos apenas provedores conhecidos (incorporados via iframe
 * com domínio fixo) ou arquivos de vídeo diretos via HTTPS. Qualquer outra coisa é rejeitada — nunca
 * incorporamos uma URL arbitrária.
 */
export type VideoSource =
  | { kind: "youtube"; id: string; embed: string; watch: string }
  | { kind: "vimeo"; id: string; embed: string; watch: string }
  | { kind: "drive"; id: string; embed: string; watch: string }
  | { kind: "file"; src: string; watch: string }

const YT_ID = /^[A-Za-z0-9_-]{11}$/
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/

export function parseVideoUrl(input: string): VideoSource | null {
  const raw = input.trim()
  if (!raw || raw.length > 500) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== "https:" || url.username || url.password) return null
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "")
  const parts = url.pathname.split("/").filter(Boolean)

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    let id: string | null = null
    if (host === "youtu.be") id = parts[0] ?? null
    else if (parts[0] === "watch") id = url.searchParams.get("v")
    else if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null
    if (!id || !YT_ID.test(id)) return null
    return { kind: "youtube", id, embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`, watch: `https://www.youtube.com/watch?v=${id}` }
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const nums = parts.filter((p) => /^\d{5,12}$/.test(p))
    const id = nums[0]
    if (!id) return null
    // vídeos "não listados" têm um hash depois do id (vimeo.com/123/abc) ou em ?h=
    const after = parts[parts.indexOf(id) + 1]
    const hash = url.searchParams.get("h") ?? (after && /^[a-f0-9]{6,20}$/.test(after) ? after : null)
    const h = hash && /^[a-f0-9]{6,20}$/.test(hash) ? `&h=${hash}` : ""
    return { kind: "vimeo", id, embed: `https://player.vimeo.com/video/${id}?dnt=1${h}`, watch: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}` }
  }

  if (host === "drive.google.com") {
    const i = parts.indexOf("d")
    const id = parts[0] === "file" && i >= 0 ? parts[i + 1] : url.searchParams.get("id")
    if (!id || !DRIVE_ID.test(id)) return null
    return { kind: "drive", id, embed: `https://drive.google.com/file/d/${id}/preview`, watch: `https://drive.google.com/file/d/${id}/view` }
  }

  if (/\.(mp4|webm|m4v|mov)$/i.test(url.pathname)) {
    url.hash = ""
    return { kind: "file", src: url.toString(), watch: url.toString() }
  }
  return null
}

export const VIDEO_PROVIDERS = "YouTube, Vimeo, Google Drive (compartilhado com “qualquer pessoa com o link”) ou um arquivo .mp4/.webm em HTTPS"

export function validateVideoUrl(input: string): string | null {
  if (!input.trim()) return null
  return parseVideoUrl(input) ? null : `Link não reconhecido. Use ${VIDEO_PROVIDERS}.`
}
