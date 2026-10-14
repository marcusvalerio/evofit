import type { Metadata } from "next"
import { PublicShell } from "@/components/public-shell"

export const metadata: Metadata = {
  title: "Biblioteca EVOFIT de exercícios",
  description: "Centenas de exercícios com GIF animado, músculos trabalhados e passo a passo em português. Baixe ou compartilhe com seus alunos.",
}

export default function BibliotecaLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
