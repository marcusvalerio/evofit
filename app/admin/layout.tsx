import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Brand, DemoBanner, ThemeToggle } from "@/components/chrome"

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <DemoBanner />
      <header className="glass sticky top-[var(--safe-top)] z-30 border-b border-line">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Brand suffix="Admin" />
          <div className="flex items-center gap-1">
            <Link href="/studio" className="btn btn-ghost btn-sm">
              <ArrowLeft size={16} aria-hidden /> Studio
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
        {children}
      </main>
    </div>
  )
}
