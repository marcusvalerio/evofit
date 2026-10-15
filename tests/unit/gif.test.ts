import { describe, expect, it } from "vitest"
import sharp from "sharp"
import { ANIM_SIZE, animFileName, canAnimate, renderExerciseAnimation } from "@/lib/gif"
import { animUrl } from "@/lib/catalog"

describe("GIF da Biblioteca EVOFIT", () => {
  it("gera GIF animado com a marca, em loop, com pausa no início e no fim", async () => {
    const buf = await renderExerciseAnimation("Barbell_Squat", "gif")
    expect(buf).not.toBeNull()
    const m = await sharp(buf!).metadata()
    expect(m.format).toBe("gif")
    expect(m.pages).toBe(6)
    expect(m.width).toBe(ANIM_SIZE.width)
    expect(m.height).toBe(ANIM_SIZE.height)
    expect(m.loop).toBe(0)
    expect(m.delay).toEqual([900, 90, 90, 900, 90, 90])
    expect(buf!.length).toBeLessThan(900_000)
  }, 20_000)

  it("gera WebP animado leve para exibir no app", async () => {
    const buf = await renderExerciseAnimation("Plank", "webp")
    const m = await sharp(buf!).metadata()
    expect(m.format).toBe("webp")
    expect(m.pages).toBe(6)
    expect(buf!.length).toBeLessThan(250_000)
  }, 20_000)

  it("recusa exercícios inexistentes ou sem imagem", async () => {
    expect(canAnimate("nao-existe")).toBe(false)
    expect(canAnimate("../../etc/passwd")).toBe(false)
    expect(canAnimate("Kettlebell_Halo")).toBe(false) // sem imagem no catálogo
    expect(await renderExerciseAnimation("Kettlebell_Halo", "gif")).toBeNull()
  })

  it("nomes de arquivo e URLs", () => {
    expect(animFileName("Barbell_Squat", "gif")).toBe("evofit-agachamento-com-barra.gif")
    expect(animUrl("Barbell_Squat")).toBe("/api/gif/Barbell_Squat?v=2")
    expect(animUrl("Barbell_Squat", "webp")).toBe("/api/gif/Barbell_Squat?v=2&f=webp")
    expect(animUrl("Barbell_Squat", "gif", true)).toBe("/api/gif/Barbell_Squat?v=2&download")
  })
})
