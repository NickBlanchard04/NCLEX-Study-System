import { expect, test } from '@playwright/test'

test.describe('social messaging entry', () => {
  test('renders a safe friends-only messaging state without side effects', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'social messaging entry runs once')
    const consoleIssues: string[] = []
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) consoleIssues.push(`${message.type()}: ${message.text()}`)
    })
    page.on('pageerror', (error) => consoleIssues.push(`pageerror: ${error.message}`))

    await page.goto('/social')
    await expect(page.getByRole('heading', { name: 'Network' })).toBeVisible()
    await expect(page.getByText('Messages', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel('Search learners by name')).toBeVisible()
    await expect(page.getByText(/Messages unlock with friends|Open conversation/i).first()).toBeVisible()
    await expect(page.getByText(/blocking is available/i).first()).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    expect(consoleIssues).toEqual([])
  })
})
