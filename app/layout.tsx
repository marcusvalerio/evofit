import type { Metadata, Viewport } from "next"
import "@fontsource-variable/inter/wght.css"
import "@fontsource-variable/outfit/wght.css"
import "@fontsource-variable/archivo/wdth.css"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "EVOFIT — plataforma para personal trainers", template: "%s · EVOFIT" },
  description: "Para personal trainers autônomos: monte fichas, acompanhe a execução série a série pelo celular do aluno e veja quem precisa de atenção. Versão de demonstração.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EVOFIT" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4F5" },
    { media: "(prefers-color-scheme: dark)", color: "#050B2C" },
  ],
}

/** Aplica o tema salvo antes da pintura, evitando flash de tema incorreto. */
const themeScript = `try{var t=localStorage.getItem("evofit:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
