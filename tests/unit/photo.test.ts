import { describe, expect, it } from "vitest"
import { isPhotoOrEmpty } from "@/lib/server/workspace"
import { PHOTO_MAX, isPhoto } from "@/lib/validate"

describe("validação da foto do personal", () => {
  const b64 = "/9j/4AAQSkZJRgABAQ=="
  it("aceita JPEG, WebP e PNG em data URL", () => {
    for (const t of ["jpeg", "webp", "png"]) expect(isPhoto(`data:image/${t};base64,${b64}`)).toBe(true)
  })
  it("aceita null/ausente para remover", () => {
    expect(isPhotoOrEmpty(null)).toBe(true)
    expect(isPhotoOrEmpty(undefined)).toBe(true)
  })
  it("recusa outros formatos e conteúdo estranho", () => {
    for (const v of ["data:image/gif;base64,R0lGOD", "data:image/svg+xml;base64,PHN2Zz4=", "https://x.com/a.jpg", "data:image/jpeg;base64,abc<script>", "data:text/html;base64,PGg+", "", 42])
      expect(isPhotoOrEmpty(v)).toBe(false)
  })
  it("respeita o limite de tamanho", () => {
    const head = "data:image/jpeg;base64,"
    expect(isPhoto(head + "A".repeat(PHOTO_MAX - head.length))).toBe(true)
    expect(isPhoto(head + "A".repeat(PHOTO_MAX - head.length + 1))).toBe(false)
  })
})
