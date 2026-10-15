import { describe, expect, it } from "vitest"
import { demoEnabled } from "@/lib/demo-mode"
import { DIRECTORY_PROFILES, directoryList } from "@/lib/directory"
import { createSeed } from "@/lib/seed"

describe("demonstração × contas reais", () => {
  it("só existe sem banco ou com DEMO_MODE=on", () => {
    expect(demoEnabled({})).toBe(true)
    expect(demoEnabled({ DATABASE_URL: "postgres://x" })).toBe(false)
    expect(demoEnabled({ DATABASE_URL: "postgres://x", DEMO_MODE: "on" })).toBe(true)
  })

  it("com contas reais o diretório não mostra perfis fictícios", () => {
    const own = createSeed().profile
    expect(directoryList(own, [], true).length).toBe(DIRECTORY_PROFILES.length + 1)
    expect(directoryList(own, [], false)).toEqual([])
    const real = { ...own, slug: "real-1", directoryVisible: true }
    const { pixKey: _p, ...pub } = real
    void _p
    expect(directoryList(null, [pub], false).map((p) => p.slug)).toEqual(["real-1"])
  })
})
