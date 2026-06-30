import { defineConfig, devices } from '@playwright/test'
import { loadQaEnv } from './tests/e2e/support/env'

loadQaEnv()

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4179)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`
const shouldStartServer = !process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 12_000,
  },
  reporter: [['list']],
  globalSetup: './tests/e2e/global.setup.ts',
  use: {
    baseURL,
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: shouldStartServer
    ? {
        command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: process.env as Record<string, string>,
      }
    : undefined,
  projects: [
    {
      name: 'desktop-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: 'playwright/.auth/qa-user.json',
      },
    },
    {
      name: 'mobile-authenticated',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
        storageState: 'playwright/.auth/qa-user.json',
      },
    },
  ],
})
