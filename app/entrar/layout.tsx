import type { Metadata } from "next"
import { PublicShell } from "@/components/public-shell"

export const metadata: Metadata = { title: "Entrar", robots: { index: false } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
