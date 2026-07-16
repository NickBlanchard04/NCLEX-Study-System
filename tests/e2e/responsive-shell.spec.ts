import { expect, test, type Page } from '@playwright/test'

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide-desktop', width: 1920, height: 1080 },
] as const

const criticalRoutes = ['/dashboard', '/flashcards', '/social', '/settings'] as const

function recordConsoleIssues(page: Page) {
  const issues: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (
      ['error', 'warning'].includes(message.type())
      && !text.includes('[safe-error:cloud-sync]')
      && !text.includes('[safe-error:cloud-hydrate]')
    ) {
      issues.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  return issues
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyTextLength: document.body.innerText.trim().length,
  }))
  expect(layout.bodyTextLength, `${context} should render meaningful content`).toBeGreaterThan(80)
  expect(layout.scrollWidth, `horizontal overflow at ${context}`).toBeLessThanOrEqual(
    layout.clientWidth + 1,
  )
}

test.describe('responsive application shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('nurse-command-desktop-hub-collapsed', 'false')
    })
  })

  for (const viewport of viewports) {
    test(`${viewport.name} keeps critical routes usable`, async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.includes('desktop'), 'viewport matrix runs once')
      const consoleIssues = recordConsoleIssues(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const route of criticalRoutes) {
        await test.step(route, async () => {
          await page.goto(route)
          await expect(page).toHaveTitle(/Nurse Command/)
          await expect(page.locator('main')).toBeVisible()
          await expectNoHorizontalOverflow(page, `${viewport.name} ${route}`)
        })
      }

      if (viewport.width >= 1024) {
        await page.goto('/flashcards')
        const sidebar = page.getByTestId('desktop-sidebar')
        const toggle = page.getByTestId('desktop-sidebar-toggle')
        const brand = page.getByTestId('desktop-sidebar-brand')
        await expect(sidebar).toBeVisible()
        await expect(page.getByTestId('mobile-tab-bar')).toBeHidden()
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')

        const geometry = await page.evaluate(() => {
          const sidebarBox = document.querySelector('[data-testid="desktop-sidebar"]')?.getBoundingClientRect()
          const toggleBox = document.querySelector('[data-testid="desktop-sidebar-toggle"]')?.getBoundingClientRect()
          const brandBox = document.querySelector('[data-testid="desktop-sidebar-brand"]')?.getBoundingClientRect()
          if (!sidebarBox || !toggleBox || !brandBox) return null
          return {
            sidebarWidth: sidebarBox.width,
            gap: brandBox.left - toggleBox.right,
            rightGutter: sidebarBox.right - brandBox.right,
            overlap: Math.max(0, Math.min(toggleBox.right, brandBox.right) - Math.max(toggleBox.left, brandBox.left)),
          }
        })

        expect(geometry).not.toBeNull()
        expect(geometry?.sidebarWidth).toBeGreaterThanOrEqual(263)
        expect(geometry?.gap).toBeGreaterThanOrEqual(8)
        expect(geometry?.rightGutter).toBeGreaterThanOrEqual(12)
        expect(geometry?.overlap).toBe(0)

        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        await expect(sidebar).toHaveCSS('width', '80px')
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
        await expect(brand).toBeVisible()
      } else {
        await page.goto('/dashboard')
        await expect(page.getByTestId('desktop-sidebar')).toBeHidden()
        const tabBar = page.getByTestId('mobile-tab-bar')
        await expect(tabBar).toBeVisible()

        const tabTargetSizes = await tabBar.locator('button').evaluateAll((buttons) =>
          buttons.map((button) => {
            const box = button.getBoundingClientRect()
            return { width: box.width, height: box.height }
          }),
        )
        expect(tabTargetSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)

        const navigationTrigger = page.getByRole('button', { name: 'Open navigation' })
        await navigationTrigger.click()
        const navigationDialog = page.getByRole('dialog', { name: /Nurse Command/i })
        const navigationClose = page.getByRole('button', { name: 'Close navigation' })
        await expect(navigationDialog).toBeVisible()
        await expect(navigationClose).toBeFocused()
        await expect(navigationClose).toHaveCSS('height', '44px')
        await page.keyboard.press('Escape')
        await expect(navigationDialog).toBeHidden()
        await expect(navigationTrigger).toBeFocused()

        const moreTrigger = page.getByRole('button', { name: 'More', exact: true })
        await moreTrigger.click()
        const moreDialog = page.getByRole('dialog', { name: /Command hub/i })
        const moreClose = page.getByRole('button', { name: 'Close more navigation' })
        await expect(moreDialog).toBeVisible()
        await expect(moreClose).toBeFocused()
        await expect(moreClose).toHaveCSS('height', '44px')
        await page.keyboard.press('Escape')
        await expect(moreDialog).toBeHidden()
        await expect(moreTrigger).toBeFocused()
      }

      expect(consoleIssues).toEqual([])
    })
  }
})
