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
    background_color: "#161D21",
    theme_color: "#1F282E",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
