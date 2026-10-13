import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "EVOFIT — plataforma para personal trainers", template: "%s · EVOFIT" },
  description: "Gestão de alunos, fichas de treino, execução pelo aluno e diretório de profissionais. Versão de demonstração.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EVOFIT" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F0EC" },
    { media: "(prefers-color-scheme: dark)", color: "#112244" },
  ],
}

/** Aplica o tema salvo antes da pintura, evitando flash de tema incorreto. */
const themeScript = `try{var t=localStorage.getItem("evofit:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
