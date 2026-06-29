import { expect, test } from '@playwright/test'

const protectedRoutes = [
  { path: '/dashboard', text: /Next Action|Today.s Plan|Weak Areas/i },
  { path: '/quick-study', text: /Start 10-minute drill|Current action/i },
  { path: '/weak-areas', text: /Repair the pattern|Selected repair|No weak area signal/i },
  { path: '/test-mode', text: /Start a serious exam block|exam block/i },
  { path: '/exam-prep', text: /Choose your exam lane|Current Track/i },
  { path: '/my-materials', text: /Your Study Library|Materials library/i },
  { path: '/study-plan', text: /Today first|Next Action/i },
]

test.describe('authenticated protected route smoke', () => {
  for (const route of protectedRoutes) {
    test(`${route.path} renders authenticated app without overflow`, async ({ page }) => {
      const consoleIssues: string[] = []
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) {
          consoleIssues.push(`${message.type()}: ${message.text()}`)
        }
      })
      page.on('pageerror', (error) => {
        consoleIssues.push(`pageerror: ${error.message}`)
      })

      await page.goto(route.path)
      await expect(page).toHaveTitle(/Nurse Command/)
      await expect(page.locator('main').getByText(route.text).first()).toBeVisible()
      await expect(page.getByText(/OPEN BETA TESTING/i)).toHaveCount(0)
      await expect(page.getByText(/Local demo mode/i)).toHaveCount(0)

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyTextLength: document.body.innerText.trim().length,
      }))

      expect(layout.bodyTextLength).toBeGreaterThan(80)
      expect(layout.scrollWidth, `horizontal overflow on ${route.path}`).toBeLessThanOrEqual(
        layout.clientWidth + 1,
      )
      expect(consoleIssues).toEqual([])
    })
  }
})

test.describe('authenticated mobile navigation', () => {
  test('mobile drawer and More sheet open, route, and remain usable', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'mobile navigation smoke only runs in the mobile project')

    const consoleIssues: string[] = []
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        consoleIssues.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.goto('/dashboard')
    await expect(page.locator('main').getByText(/Next Action|Today.s Plan|Weak Areas/i).first()).toBeVisible()

    await page.getByRole('button', { name: /Open navigation/i }).click()
    await expect(page.getByRole('button', { name: /Help & Support/i }).last()).toBeVisible()
    await page.getByRole('link', { name: /Settings/i }).last().click()
    await expect(page).toHaveURL(/\/settings\/?$/)
    await expect(page.locator('main').getByText(/Manage your exam track|Profile picture|Account/i).first()).toBeVisible()

    await page.getByRole('button', { name: /^More$/i }).click()
    await expect(page.getByRole('heading', { name: /Study tools/i })).toBeVisible()
    await page.getByRole('button', { name: /Remediation/i }).click()
    await expect(page).toHaveURL(/\/weak-areas\/?$/)
    await expect(page.locator('main').getByText(/Repair the pattern|Selected repair|No weak area signal/i).first()).toBeVisible()

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
    expect(consoleIssues).toEqual([])
  })
})
