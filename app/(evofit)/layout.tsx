import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import './evofit.css'

export const metadata: Metadata = {
  title: { default: 'EVOFIT', template: '%s · EVOFIT' },
  description: 'Gestão de treinos para personal trainers autônomos e seus alunos.',
}

// Zoom liberado de propósito (acessibilidade): diferente do app EVO legado.
export const viewport: Viewport = {
  themeColor: '#06283d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function EvofitRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  )
}
