import { test as base, expect } from "@playwright/test"

/** Falha o teste se houver erro de console ou exceção não tratada na página. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on("console", (m) => {
        if (m.type() === "error" && !m.text().includes("status of 404")) errors.push(m.text())
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
