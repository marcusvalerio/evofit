import { animFileName, canAnimate, renderExerciseAnimation, type AnimFormat } from "@/lib/gif"

export const runtime = "nodejs"

/** Pequeno cache em memória para a mesma instância; a CDN guarda o resto (resposta imutável). */
const cache = new Map<string, Buffer>()
const MAX = 40

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url = new URL(req.url)
  const format: AnimFormat = url.searchParams.get("f") === "webp" ? "webp" : "gif"
  if (!canAnimate(id)) return new Response("Exercício sem animação disponível.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } })

  const key = `${id}.${format}`
  let body = cache.get(key)
  if (!body) {
    const out = await renderExerciseAnimation(id, format)
    if (!out) return new Response("Exercício sem animação disponível.", { status: 404 })
    body = out
    cache.set(key, body)
    if (cache.size > MAX) cache.delete(cache.keys().next().value!)
  }

  const headers: Record<string, string> = {
    "Content-Type": format === "gif" ? "image/gif" : "image/webp",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": String(body.length),
  }
  if (url.searchParams.has("download")) headers["Content-Disposition"] = `attachment; filename="${animFileName(id, format)}"`
  return new Response(new Uint8Array(body), { headers })
}
