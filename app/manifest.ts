import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EVOFIT",
    short_name: "EVOFIT",
    description: "Seus treinos, mesmo sem internet na academia.",
    start_url: "/aluno",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1819",
    theme_color: "#0d2224",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
