import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.E2E_PORT ?? 3200)

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  // Testa o build de produção. Para testar uma URL publicada, defina E2E_BASE_URL.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npm run build && npx next start -p ${PORT}`, port: PORT, timeout: 180_000, reuseExistingServer: !process.env.CI },
})
