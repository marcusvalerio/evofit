import type { Metadata } from "next"
import { PublicShell } from "@/components/public-shell"

export const metadata: Metadata = {
  title: "Encontrar personal",
  description: "Diretório de personal trainers por região, modalidade e especialidade.",
}

export default function PersonaisLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
