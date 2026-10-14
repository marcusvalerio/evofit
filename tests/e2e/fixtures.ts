import { test as base, expect } from "@playwright/test"

/** Falha o teste se houver erro de console ou exceção não tratada na página. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on("console", (m) => {
        // respostas 4xx esperadas (404, senha errada, sem login) aparecem como "Failed to load resource"
        if (m.type() === "error" && !/status of 4\d\d/.test(m.text())) errors.push(m.text())
      })
      page.on("pageerror", (e) => errors.push(e.message))
      await use(errors)
      expect(errors, "erros de console").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export const isMobile = (w: number | undefined) => (w ?? 1440) < 1024
