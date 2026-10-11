import type { Metadata } from "next"
import { StudioShell } from "@/components/studio-shell"

export const metadata: Metadata = { title: { default: "Studio", template: "%s · EVOFIT Studio" } }

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioShell>{children}</StudioShell>
}
