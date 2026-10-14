import type { Metadata } from "next"
import { PublicShell } from "@/components/public-shell"

export const metadata: Metadata = { title: "Convite do seu personal", robots: { index: false } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
