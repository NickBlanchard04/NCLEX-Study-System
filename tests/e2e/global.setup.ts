import { chromium, expect, type FullConfig } from '@playwright/test'
import { access, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { loadQaEnv, requireQaEnv } from './support/env'

const authStatePath = resolve(process.cwd(), 'playwright/.auth/qa-user.json')
const authenticatedAppSignal = /Start Today|Dashboard|Study Plan/i

async function fileExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const futureDateInputValue = () => {
  const date = new Date()
  date.setDate(date.getDate() + 90)
  return date.toISOString().slice(0, 10)
}

async function globalSetup(config: FullConfig) {
  loadQaEnv()

  const email = requireQaEnv('PLAYWRIGHT_QA_EMAIL')
  const password = requireQaEnv('PLAYWRIGHT_QA_PASSWORD')
  const baseURL = String(config.projects[0].use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL)
  if (!baseURL) throw new Error('Missing Playwright baseURL.')

  await mkdir(dirname(authStatePath), { recursive: true })

  const browser = await chromium.launch()

  try {
    if (await fileExists(authStatePath)) {
      const existingContext = await browser.newContext({
        storageState: authStatePath,
        viewport: { width: 1280, height: 720 },
      })
      const existingPage = await existingContext.newPage()
      try {
        await existingPage.goto(baseURL)
        await expect(existingPage.getByText(authenticatedAppSignal).first()).toBeVisible({ timeout: 8_000 })
        await existingContext.close()
        return
      } catch {
        await existingContext.close()
      }
    }

    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    await page.goto(baseURL)
    await expect(page).toHaveTitle(/Nurse Command/)

    const missingSupabase = page.getByText(/missing Supabase configuration/i)
    if (await missingSupabase.isVisible().catch(() => false)) {
      throw new Error(
        'Local app is missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, or set PLAYWRIGHT_BASE_URL to the deployed site.',
      )
    }

    const emailField = page.getByLabel(/^Email$/i)
    if (!(await emailField.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /^Sign in$/i }).click()
      await expect(emailField).toBeVisible()
    }

    await emailField.fill(email)
    await page.getByLabel(/^Password$/i).fill(password)

    const terms = page.getByLabel(/I agree to the beta terms/i)
    if (await terms.isVisible().catch(() => false)) {
      await terms.check()
    }

    await page.getByRole('button', { name: /^Sign in$/i }).click()

    const authError = page.locator('text=/Invalid login credentials|Email not confirmed|Verification email/i')
    await expect(authError).toHaveCount(0, { timeout: 2_000 }).catch(async () => {
      throw new Error(
        `QA account could not sign in. Confirm ${email} exists, is email-confirmed, and matches PLAYWRIGHT_QA_PASSWORD.`,
      )
    })

    if (await page.getByRole('heading', { name: /Finish profile setup/i }).isVisible({ timeout: 5_000 }).catch(() => false)) {
      await page.getByLabel(/School or program/i).fill('Nurse Command QA Program')
      await page.getByLabel(/Goal date/i).fill(futureDateInputValue())
      await page.getByRole('button', { name: /^Finish setup$/i }).click()
    }

    await expect(
      page.locator('main').getByText(/Start Today|Today.s Mission|Next Action|Weak Areas/i).first(),
    ).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText(/OPEN BETA TESTING/i)).toHaveCount(0)
    await expect(page.getByText(/Local demo mode/i)).toHaveCount(0)

    await page.context().storageState({ path: authStatePath })
  } finally {
    await browser.close()
  }
}

export default globalSetup
