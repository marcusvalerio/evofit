/*
 * Service worker do EVOFIT: o app abre e o treino roda sem internet na academia.
 *  - arquivos do app (/_next/static): cache primeiro (têm hash no nome);
 *  - imagens e animações dos exercícios: usa o cache e atualiza em segundo plano;
 *  - páginas e dados de navegação do Next: rede primeiro (com tempo limite), cache como reserva.
 * Dados da conta NUNCA passam por aqui: /api/* fica fora (exceto as animações públicas).
 */
const VERSION = "v1"
const SHELL = `evofit-shell-${VERSION}`
const PAGES = `evofit-pages-${VERSION}`
const MEDIA = `evofit-media-${VERSION}`
const PRECACHE = ["/", "/aluno", "/aluno/historico", "/entrar", "/manifest.webmanifest", "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("evofit-") && ![SHELL, PAGES, MEDIA].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const isMedia = (url) => url.pathname.startsWith("/exercises/") || url.pathname.startsWith("/api/gif/") || url.pathname.startsWith("/icons/")
const isNextData = (req, url) => req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
}

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)
  try {
    const res = await Promise.race([fetch(req), timeout(4000)])
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    const hit = (await cache.match(req)) ?? (await cache.match(req, { ignoreSearch: true }))
    if (hit) return hit
    if (fallbackUrl) {
      const fb = await cache.match(fallbackUrl)
      if (fb) return fb
    }
    return new Response("Sem internet e esta página ainda não foi aberta neste aparelho.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) cache.put(req, res.clone())
  return res
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(req)
  const net = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone())
      return res
    })
    .catch(() => hit ?? Response.error())
  return hit ?? net
}

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/gif/")) return

  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(req, SHELL))
  if (isMedia(url)) return event.respondWith(staleWhileRevalidate(req, MEDIA))
  if (req.mode === "navigate") return event.respondWith(networkFirst(req, PAGES, url.pathname.startsWith("/aluno") ? "/aluno" : "/"))
  if (isNextData(req, url)) return event.respondWith(networkFirst(req, PAGES))
})

/** O app pede para guardar com antecedência as páginas e imagens dos treinos do aluno. */
self.addEventListener("message", (event) => {
  const { type, pages = [], media = [] } = event.data ?? {}
  if (type !== "precache") return
  event.waitUntil(
    Promise.all([
      caches.open(PAGES).then((c) => Promise.all(pages.map((u) => c.match(u).then((hit) => hit ?? c.add(u)).catch(() => {})))),
      caches.open(MEDIA).then((c) => Promise.all(media.map((u) => c.match(u).then((hit) => hit ?? c.add(u)).catch(() => {})))),
    ]),
  )
})
