import { Swell } from "@/components/textures/swell"

export const metadata = { title: "Textura Swell" }

/** Página de prévia: a textura Swell em tela cheia e no tamanho de ícone, para avaliar como símbolo. */
export default function TexturaPage() {
  const ink = { "--texture-ink": "#46B8BA", "--texture-field": "#101012" }
  return (
    <main style={{ background: "#101012", minHeight: "100dvh", color: "#f4f4f5" }}>
      <section style={{ position: "relative", height: 480 }}>
        <Swell tokens={ink} />
      </section>
      <section style={{ display: "flex", gap: 24, alignItems: "end", flexWrap: "wrap", padding: "32px max(16px, 5vw)" }}>
        {[128, 64, 40].map((s) => (
          <figure key={s} style={{ margin: 0, display: "grid", gap: 8, justifyItems: "center", fontSize: 12, opacity: 0.85 }}>
            <div style={{ width: s, height: s, borderRadius: s * 0.24, overflow: "hidden", position: "relative" }}>
              <Swell tokens={{ "--texture-ink": "#F4F4F3", "--texture-field": "#0F5257" }} static />
            </div>
            {s}px
          </figure>
        ))}
      </section>
    </main>
  )
}
