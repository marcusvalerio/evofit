import { LEGAL } from "@/lib/legal"

/** Moldura dos documentos legais (Termos e Privacidade). */
export function LegalDoc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="evo-legal mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">EVOFIT</p>
      <h1 className="t-h1 mt-1">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Última atualização: {LEGAL.updated} · Versão {LEGAL.version}
      </p>
      <div className="mt-8 space-y-6 leading-relaxed [&_h2]:t-h2 [&_h2]:mt-8 [&_li]:ml-5 [&_li]:list-disc [&_p]:text-[0.9375rem] [&_ul]:space-y-1">{children}</div>
    </article>
  )
}
